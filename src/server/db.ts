import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminUser,
  Cliente,
  ConfiguracionTaller,
  EstadoTurno,
  Servicio,
  Trabajo,
  Turno,
  Vehiculo,
} from '../types/workshop.ts';
import { hashPassword, verifyPassword } from './auth.ts';

export class DomainError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getTodayDateString(offsetDays = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWorkingDateString(workingDays: number[], startOffset = 0): string {
  for (let offset = startOffset; offset < startOffset + 14; offset++) {
    const dStr = getTodayDateString(offset);
    const day = new Date(`${dStr}T12:00:00`).getDay();
    if (workingDays.includes(day)) return dStr;
  }
  return getTodayDateString(startOffset);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizePatente(patente: string): string {
  return patente.trim().toUpperCase().replace(/\s+/g, '');
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const useSupabase = Boolean(supabaseUrl && supabaseKey);

let supabaseClient: SupabaseClient | null = null;
if (useSupabase && supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Local SQLite relational database (also stores admin_users fallback if Supabase lacks it)
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const sqlitePath = path.join(dataDir, 'taller.db');
const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nombre_apellido TEXT NOT NULL,
    dni_cuit TEXT NOT NULL,
    telefono TEXT NOT NULL,
    whatsapp TEXT DEFAULT '',
    email TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    observaciones TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehiculos (
    id TEXT PRIMARY KEY,
    patente TEXT NOT NULL UNIQUE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio INTEGER NOT NULL,
    kilometraje INTEGER NOT NULL DEFAULT 0,
    motor TEXT DEFAULT '',
    tipo_combustible TEXT NOT NULL DEFAULT 'Nafta',
    color TEXT DEFAULT '',
    cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    observaciones TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS servicios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    duracion_minutos INTEGER NOT NULL DEFAULT 60,
    precio_orientativo REAL NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS turnos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
    servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 60,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    observaciones TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trabajos (
    id TEXT PRIMARY KEY,
    turno_id TEXT REFERENCES turnos(id) ON DELETE SET NULL,
    cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
    servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    fecha TEXT NOT NULL,
    kilometraje INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL,
    observaciones TEXT DEFAULT '',
    importe REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nombre_taller TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT NOT NULL,
    hora_apertura TEXT NOT NULL,
    hora_cierre TEXT NOT NULL,
    dias_laborables TEXT NOT NULL,
    duracion_predeterminada INTEGER NOT NULL DEFAULT 60,
    updated_at TEXT NOT NULL
  );
`);

function seedAdminUser(): void {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@taller.local').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'taller2026';
  const existing = sqlite.prepare('SELECT id FROM admin_users LIMIT 1').get();
  if (!existing) {
    sqlite
      .prepare(
        'INSERT INTO admin_users (id, email, nombre, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        crypto.randomUUID(),
        adminEmail,
        'Administrador del Taller',
        hashPassword(adminPassword),
        new Date().toISOString()
      );
  }
}

function seedSqliteInitialData(): void {
  const nowIso = new Date().toISOString();
  const configExists = sqlite.prepare('SELECT id FROM configuracion WHERE id = 1').get();
  if (!configExists) {
    sqlite
      .prepare(
        `INSERT INTO configuracion (id, nombre_taller, telefono, direccion, hora_apertura, hora_cierre, dias_laborables, duracion_predeterminada, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'Mecánica Rocamora',
        '+54 11 4582-9100',
        'Av. San Martín 2450, CABA',
        '08:00',
        '18:30',
        JSON.stringify([1, 2, 3, 4, 5, 6]),
        60,
        nowIso
      );
  } else {
    sqlite
      .prepare("UPDATE configuracion SET nombre_taller = 'Mecánica Rocamora' WHERE id = 1 AND nombre_taller = 'Taller Mecánico Integral San Martín'")
      .run();
  }

  const servicesCount = (sqlite.prepare('SELECT COUNT(*) as c FROM servicios').get() as { c: number }).c;
  const serviceIds: Record<string, string> = {};
  if (servicesCount === 0) {
    const initialServices = [
      {
        nombre: 'Cambio de aceite y filtros',
        descripcion: 'Reemplazo de aceite sintético/semisintético, filtro de aceite, aire y habitáculo.',
        duracion_minutos: 60,
        precio_orientativo: 68000,
      },
      {
        nombre: 'Frenos',
        descripcion: 'Revisión y recambio de pastillas, discos, cintas y purgado de circuito hidráulico.',
        duracion_minutos: 90,
        precio_orientativo: 95000,
      },
      {
        nombre: 'Tren delantero',
        descripcion: 'Control y cambio de rótulas, extremos, bujes, amortiguadores y alineación.',
        duracion_minutos: 120,
        precio_orientativo: 125000,
      },
      {
        nombre: 'Distribución',
        descripcion: 'Kit de correa o cadena de distribución, tensores y bomba de agua.',
        duracion_minutos: 240,
        precio_orientativo: 290000,
      },
      {
        nombre: 'Electricidad',
        descripcion: 'Control de batería, alternador, motor de arranque, fusibles e iluminación.',
        duracion_minutos: 60,
        precio_orientativo: 55000,
      },
      {
        nombre: 'Diagnóstico',
        descripcion: 'Escaneo computarizado OBD-II, lectura de códigos de falla y diagnóstico integral.',
        duracion_minutos: 45,
        precio_orientativo: 42000,
      },
      {
        nombre: 'Mecánica general',
        descripcion: 'Reparaciones generales de motor, refrigeración, embrague y transmisión.',
        duracion_minutos: 120,
        precio_orientativo: 110000,
      },
      {
        nombre: 'Otros servicios',
        descripcion: 'Tareas específicas o inspecciones pre-compra / pre-VTV a coordinar.',
        duracion_minutos: 60,
        precio_orientativo: 50000,
      },
    ];

    const insertSvc = sqlite.prepare(
      'INSERT INTO servicios (id, nombre, descripcion, duracion_minutos, precio_orientativo, activo, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
    );
    for (const svc of initialServices) {
      const id = crypto.randomUUID();
      serviceIds[svc.nombre] = id;
      insertSvc.run(id, svc.nombre, svc.descripcion, svc.duracion_minutos, svc.precio_orientativo, nowIso);
    }
  }

  const clientesCount = (sqlite.prepare('SELECT COUNT(*) as c FROM clientes').get() as { c: number }).c;
  if (clientesCount === 0 && Object.keys(serviceIds).length > 0) {
    const c1 = crypto.randomUUID();
    const c2 = crypto.randomUUID();
    const c3 = crypto.randomUUID();
    const c4 = crypto.randomUUID();

    const insertCliente = sqlite.prepare(
      'INSERT INTO clientes (id, nombre_apellido, dni_cuit, telefono, whatsapp, email, direccion, observaciones, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertCliente.run(c1, 'Martín Gómez', '31.458.920', '11-5432-8810', '5491154328810', 'martin.gomez@email.com', 'Rivadavia 4120, CABA', 'Cliente habitual. Prefiere contacto por WhatsApp.', nowIso);
    insertCliente.run(c2, 'Laura Fernández', '27.890.114', '11-6210-3345', '5491162103345', 'laura.fernandez@email.com', 'Cabildo 1850, CABA', 'Solicita presupuesto previo si supera el valor orientativo.', nowIso);
    insertCliente.run(c3, 'Carlos Pereyra', '20-25419830-4', '11-4901-7721', '5491149017721', 'cpereyra@empresa.com', 'Av. Córdoba 3290, CABA', 'Flota utilitaria de 2 vehículos.', nowIso);
    insertCliente.run(c4, 'Sofía Martínez', '35.102.448', '11-5119-0042', '5491151190042', 'sofia.martinez@email.com', 'Juramento 2100, CABA', '', nowIso);

    const v1 = crypto.randomUUID();
    const v2 = crypto.randomUUID();
    const v3 = crypto.randomUUID();
    const v4 = crypto.randomUUID();
    const v5 = crypto.randomUUID();

    const insertVehiculo = sqlite.prepare(
      'INSERT INTO vehiculos (id, patente, marca, modelo, anio, kilometraje, motor, tipo_combustible, color, cliente_id, observaciones, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertVehiculo.run(v1, 'AF482KL', 'Toyota', 'Corolla XEi', 2022, 48500, '2.0 Dual VVT-i', 'Nafta', 'Gris Plata', c1, 'Usa aceite 0W-20 sintético.', nowIso);
    insertVehiculo.run(v2, 'AE194MP', 'Volkswagen', 'Amarok Highline', 2021, 92300, '2.0 TDI Biturbo', 'Diésel', 'Azul Noche', c2, 'Revisar pastillas delanteras en próximo service.', nowIso);
    insertVehiculo.run(v3, 'AD720RT', 'Renault', 'Kangoo Express', 2019, 134200, '1.6 SCe', 'Nafta', 'Blanco', c3, 'Vehículo de reparto.', nowIso);
    insertVehiculo.run(v4, 'AC315BV', 'Ford', 'Ranger XLT', 2018, 165000, '3.2 TDCi', 'Diésel', 'Gris Grafito', c3, '', nowIso);
    insertVehiculo.run(v5, 'AG091XZ', 'Peugeot', '208 Feline', 2023, 21400, '1.6 VTi', 'Nafta', 'Gris Artense', c4, '', nowIso);

    const workingDays = [1, 2, 3, 4, 5, 6];
    const today = nextWorkingDateString(workingDays, 0);
    const nextDay = nextWorkingDateString(workingDays, 1);
    const pastDay1 = getTodayDateString(-5);
    const pastDay2 = getTodayDateString(-12);

    const t1 = crypto.randomUUID();
    const t2 = crypto.randomUUID();
    const t3 = crypto.randomUUID();
    const t4 = crypto.randomUUID();
    const t5 = crypto.randomUUID();
    const tPast1 = crypto.randomUUID();

    const insertTurno = sqlite.prepare(
      'INSERT INTO turnos (id, cliente_id, vehiculo_id, servicio_id, fecha, hora, duracion_minutos, estado, observaciones, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    insertTurno.run(t1, c1, v1, serviceIds['Cambio de aceite y filtros'], today, '08:30', 60, 'En reparación', 'Service completo de 50.000 km.', nowIso);
    insertTurno.run(t2, c2, v2, serviceIds['Frenos'], today, '10:00', 90, 'En taller', 'Ruido metálico al frenar en baja velocidad.', nowIso);
    insertTurno.run(t3, c3, v3, serviceIds['Diagnóstico'], today, '14:00', 45, 'Confirmado', 'Testigo de inyección encendido.', nowIso);
    insertTurno.run(t4, c4, v5, serviceIds['Cambio de aceite y filtros'], today, '16:00', 60, 'Pendiente', 'Primer mantenimiento fuera de concesionario.', nowIso);
    insertTurno.run(t5, c3, v4, serviceIds['Tren delantero'], nextDay, '09:00', 120, 'Confirmado', 'Vibración en dirección a 100 km/h.', nowIso);
    insertTurno.run(tPast1, c1, v1, serviceIds['Diagnóstico'], pastDay1, '11:00', 45, 'Finalizado', 'Control preventivo pre-viaje.', nowIso);

    const insertTrabajo = sqlite.prepare(
      'INSERT INTO trabajos (id, turno_id, cliente_id, vehiculo_id, servicio_id, fecha, kilometraje, descripcion, observaciones, importe, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertTrabajo.run(
      crypto.randomUUID(),
      tPast1,
      c1,
      v1,
      serviceIds['Diagnóstico'],
      pastDay1,
      47900,
      'Escaneo completo sin códigos de error activos. Revisión de niveles y presión de neumáticos.',
      'Próximo cambio de aceite recomendado a los 50.000 km.',
      42000,
      nowIso
    );
    insertTrabajo.run(
      crypto.randomUUID(),
      null,
      c3,
      v3,
      serviceIds['Frenos'],
      pastDay2,
      131800,
      'Recambio de juego de pastillas delanteras y rectificado de discos ventilados.',
      'Líquido de frenos en nivel correcto.',
      98500,
      nowIso
    );
    insertTrabajo.run(
      crypto.randomUUID(),
      null,
      c2,
      v2,
      serviceIds['Electricidad'],
      getTodayDateString(-20),
      89400,
      'Reemplazo de batería 12V 75Ah y control de carga de alternador (14.2V nominal).',
      'Garantía de batería 12 meses.',
      145000,
      nowIso
    );
  }
}

seedAdminUser();
if (!useSupabase) {
  seedSqliteInitialData();
}

// ============================================================================
// AUTH OPERATIONS
// ============================================================================
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const normalized = email.trim().toLowerCase();
  const row = sqlite
    .prepare('SELECT id, email, nombre, password_hash FROM admin_users WHERE lower(email) = ?')
    .get(normalized) as { id: string; email: string; nombre: string; password_hash: string } | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, nombre: row.nombre };
}

export async function updateAdminPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const row = sqlite
    .prepare('SELECT id, password_hash FROM admin_users WHERE id = ?')
    .get(userId) as { id: string; password_hash: string } | undefined;

  if (!row) throw new DomainError('Usuario administrativo no encontrado.', 404);
  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw new DomainError('La contraseña actual es incorrecta.', 400);
  }
  if (newPassword.trim().length < 6) {
    throw new DomainError('La nueva contraseña debe tener al menos 6 caracteres.', 400);
  }
  sqlite
    .prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
    .run(hashPassword(newPassword), userId);
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
export async function getConfiguracion(): Promise<ConfiguracionTaller> {
  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new DomainError(`Error al leer configuración en Supabase: ${error.message}`, 500);
    if (data) {
      return {
        ...data,
        dias_laborables: Array.isArray(data.dias_laborables)
          ? data.dias_laborables
          : JSON.parse(data.dias_laborables || '[1,2,3,4,5,6]'),
      };
    }
    const defaults: ConfiguracionTaller = {
      id: 1,
      nombre_taller: 'Mecánica Rocamora',
      telefono: '',
      direccion: '',
      hora_apertura: '08:00',
      hora_cierre: '18:30',
      dias_laborables: [1, 2, 3, 4, 5, 6],
      duracion_predeterminada: 60,
      updated_at: new Date().toISOString(),
    };
    await supabaseClient.from('configuracion').upsert(defaults);
    return defaults;
  }

  const row = sqlite.prepare('SELECT * FROM configuracion WHERE id = 1').get() as
    | (Omit<ConfiguracionTaller, 'dias_laborables'> & { dias_laborables: string })
    | undefined;
  if (!row) {
    throw new DomainError('Configuración inicial no encontrada.', 500);
  }
  return {
    ...row,
    dias_laborables: JSON.parse(row.dias_laborables) as number[],
  };
}

export async function updateConfiguracion(
  input: Partial<Omit<ConfiguracionTaller, 'id' | 'updated_at'>>
): Promise<ConfiguracionTaller> {
  const current = await getConfiguracion();
  const nombre_taller = (input.nombre_taller ?? current.nombre_taller).trim();
  if (!nombre_taller) throw new DomainError('El nombre del taller es obligatorio.');

  const hora_apertura = (input.hora_apertura ?? current.hora_apertura).trim();
  const hora_cierre = (input.hora_cierre ?? current.hora_cierre).trim();
  const openMin = timeToMinutes(hora_apertura);
  const closeMin = timeToMinutes(hora_cierre);
  if (openMin < 0 || closeMin < 0 || openMin >= closeMin) {
    throw new DomainError('El horario de cierre debe ser posterior al horario de apertura.');
  }

  const duracion_predeterminada = Number(
    input.duracion_predeterminada ?? current.duracion_predeterminada
  );
  if (!Number.isFinite(duracion_predeterminada) || duracion_predeterminada < 15) {
    throw new DomainError('La duración predeterminada debe ser de al menos 15 minutos.');
  }

  const dias_laborables = Array.isArray(input.dias_laborables)
    ? input.dias_laborables.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : current.dias_laborables;
  if (dias_laborables.length === 0) {
    throw new DomainError('Debe seleccionar al menos un día laborable.');
  }

  const updated: ConfiguracionTaller = {
    id: 1,
    nombre_taller,
    telefono: (input.telefono ?? current.telefono).trim(),
    direccion: (input.direccion ?? current.direccion).trim(),
    hora_apertura,
    hora_cierre,
    dias_laborables,
    duracion_predeterminada,
    updated_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('configuracion')
      .upsert(updated)
      .select('*')
      .single();
    if (error) throw new DomainError(`Error al guardar configuración: ${error.message}`, 500);
    return data as ConfiguracionTaller;
  }

  sqlite
    .prepare(
      `UPDATE configuracion
       SET nombre_taller = ?, telefono = ?, direccion = ?, hora_apertura = ?, hora_cierre = ?, dias_laborables = ?, duracion_predeterminada = ?, updated_at = ?
       WHERE id = 1`
    )
    .run(
      updated.nombre_taller,
      updated.telefono,
      updated.direccion,
      updated.hora_apertura,
      updated.hora_cierre,
      JSON.stringify(updated.dias_laborables),
      updated.duracion_predeterminada,
      updated.updated_at
    );

  return updated;
}

// ============================================================================
// CLIENTES
// ============================================================================
export async function listClientes(search = ''): Promise<Cliente[]> {
  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .order('nombre_apellido', { ascending: true });
    if (error) throw new DomainError(error.message, 500);
    const rows = (data || []) as Cliente[];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (c) =>
        c.nombre_apellido.toLowerCase().includes(q) ||
        c.dni_cuit.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q)
    );
  }

  if (search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    return sqlite
      .prepare(
        `SELECT * FROM clientes
         WHERE lower(nombre_apellido) LIKE ? OR lower(dni_cuit) LIKE ? OR lower(telefono) LIKE ?
         ORDER BY nombre_apellido ASC`
      )
      .all(q, q, q) as Cliente[];
  }
  return sqlite.prepare('SELECT * FROM clientes ORDER BY nombre_apellido ASC').all() as Cliente[];
}

export async function createCliente(
  input: Omit<Cliente, 'id' | 'created_at'>
): Promise<Cliente> {
  const nombre_apellido = (input.nombre_apellido || '').trim();
  const dni_cuit = (input.dni_cuit || '').trim();
  const telefono = (input.telefono || '').trim();

  if (!nombre_apellido) throw new DomainError('El nombre y apellido del cliente es obligatorio.');
  if (!dni_cuit) throw new DomainError('El DNI o CUIT del cliente es obligatorio.');
  if (!telefono) throw new DomainError('El teléfono del cliente es obligatorio.');

  const record: Cliente = {
    id: crypto.randomUUID(),
    nombre_apellido,
    dni_cuit,
    telefono,
    whatsapp: (input.whatsapp || '').trim(),
    email: (input.email || '').trim(),
    direccion: (input.direccion || '').trim(),
    observaciones: (input.observaciones || '').trim(),
    created_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient.from('clientes').insert(record).select('*').single();
    if (error) throw new DomainError(error.message, 500);
    return data as Cliente;
  }

  sqlite
    .prepare(
      `INSERT INTO clientes (id, nombre_apellido, dni_cuit, telefono, whatsapp, email, direccion, observaciones, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.nombre_apellido,
      record.dni_cuit,
      record.telefono,
      record.whatsapp,
      record.email,
      record.direccion,
      record.observaciones,
      record.created_at
    );
  return record;
}

export async function updateCliente(
  id: string,
  input: Partial<Omit<Cliente, 'id' | 'created_at'>>
): Promise<Cliente> {
  const nombre_apellido = (input.nombre_apellido || '').trim();
  const dni_cuit = (input.dni_cuit || '').trim();
  const telefono = (input.telefono || '').trim();

  if (!nombre_apellido) throw new DomainError('El nombre y apellido del cliente es obligatorio.');
  if (!dni_cuit) throw new DomainError('El DNI o CUIT del cliente es obligatorio.');
  if (!telefono) throw new DomainError('El teléfono del cliente es obligatorio.');

  const payload = {
    nombre_apellido,
    dni_cuit,
    telefono,
    whatsapp: (input.whatsapp ?? '').trim(),
    email: (input.email ?? '').trim(),
    direccion: (input.direccion ?? '').trim(),
    observaciones: (input.observaciones ?? '').trim(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('clientes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new DomainError(error.message, 500);
    if (!data) throw new DomainError('Cliente no encontrado.', 404);
    return data as Cliente;
  }

  const info = sqlite
    .prepare(
      `UPDATE clientes
       SET nombre_apellido = ?, dni_cuit = ?, telefono = ?, whatsapp = ?, email = ?, direccion = ?, observaciones = ?
       WHERE id = ?`
    )
    .run(
      payload.nombre_apellido,
      payload.dni_cuit,
      payload.telefono,
      payload.whatsapp,
      payload.email,
      payload.direccion,
      payload.observaciones,
      id
    );
  if (info.changes === 0) throw new DomainError('Cliente no encontrado.', 404);
  return sqlite.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as Cliente;
}

export async function deleteCliente(id: string): Promise<void> {
  if (useSupabase && supabaseClient) {
    const { count: vCount } = await supabaseClient
      .from('vehiculos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', id);
    if ((vCount || 0) > 0) {
      throw new DomainError(
        'No se puede eliminar el cliente porque tiene vehículos registrados. Reasigná o eliminá sus vehículos primero.',
        409
      );
    }
    const { count: tCount } = await supabaseClient
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', id);
    if ((tCount || 0) > 0) {
      throw new DomainError(
        'No se puede eliminar el cliente porque posee turnos registrados en el historial.',
        409
      );
    }
    const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    return;
  }

  const veh = sqlite.prepare('SELECT id FROM vehiculos WHERE cliente_id = ? LIMIT 1').get(id);
  if (veh) {
    throw new DomainError(
      'No se puede eliminar el cliente porque tiene vehículos registrados. Eliminá o reasigná sus vehículos primero.',
      409
    );
  }
  const tur = sqlite.prepare('SELECT id FROM turnos WHERE cliente_id = ? LIMIT 1').get(id);
  if (tur) {
    throw new DomainError(
      'No se puede eliminar el cliente porque tiene turnos registrados.',
      409
    );
  }
  const trab = sqlite.prepare('SELECT id FROM trabajos WHERE cliente_id = ? LIMIT 1').get(id);
  if (trab) {
    throw new DomainError(
      'No se puede eliminar el cliente porque tiene trabajos en el historial.',
      409
    );
  }
  const info = sqlite.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  if (info.changes === 0) throw new DomainError('Cliente no encontrado.', 404);
}

// ============================================================================
// VEHÍCULOS
// ============================================================================
export async function listVehiculos(search = '', clienteId = ''): Promise<Vehiculo[]> {
  if (useSupabase && supabaseClient) {
    let query = supabaseClient
      .from('vehiculos')
      .select('*, clientes(nombre_apellido)')
      .order('created_at', { ascending: false });
    if (clienteId) query = query.eq('cliente_id', clienteId);
    const { data, error } = await query;
    if (error) throw new DomainError(error.message, 500);
    let rows = (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes?.nombre_apellido || '',
    })) as Vehiculo[];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (v) =>
          v.patente.toLowerCase().includes(q) ||
          v.marca.toLowerCase().includes(q) ||
          v.modelo.toLowerCase().includes(q) ||
          (v.cliente_nombre || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (clienteId) {
    conditions.push('v.cliente_id = ?');
    params.push(clienteId);
  }
  if (search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      '(lower(v.patente) LIKE ? OR lower(v.marca) LIKE ? OR lower(v.modelo) LIKE ? OR lower(c.nombre_apellido) LIKE ?)'
    );
    params.push(q, q, q, q);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return sqlite
    .prepare(
      `SELECT v.*, c.nombre_apellido as cliente_nombre
       FROM vehiculos v
       JOIN clientes c ON v.cliente_id = c.id
       ${whereClause}
       ORDER BY v.patente ASC`
    )
    .all(...params) as Vehiculo[];
}

export async function createVehiculo(
  input: Omit<Vehiculo, 'id' | 'created_at' | 'cliente_nombre'>
): Promise<Vehiculo> {
  const patente = normalizePatente(input.patente || '');
  const marca = (input.marca || '').trim();
  const modelo = (input.modelo || '').trim();
  const cliente_id = (input.cliente_id || '').trim();
  const anio = Number(input.anio);
  const kilometraje = Number(input.kilometraje || 0);

  if (!patente) throw new DomainError('La patente del vehículo es obligatoria.');
  if (!marca) throw new DomainError('La marca del vehículo es obligatoria.');
  if (!modelo) throw new DomainError('El modelo del vehículo es obligatorio.');
  if (!cliente_id) throw new DomainError('Debe asociar el vehículo a un propietario.');
  if (!Number.isFinite(anio) || anio < 1950 || anio > new Date().getFullYear() + 1) {
    throw new DomainError('El año del vehículo no es válido.');
  }
  if (!Number.isFinite(kilometraje) || kilometraje < 0) {
    throw new DomainError('El kilometraje no puede ser negativo.');
  }

  const record = {
    id: crypto.randomUUID(),
    patente,
    marca,
    modelo,
    anio,
    kilometraje,
    motor: (input.motor || '').trim(),
    tipo_combustible: (input.tipo_combustible || 'Nafta').trim(),
    color: (input.color || '').trim(),
    cliente_id,
    observaciones: (input.observaciones || '').trim(),
    created_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data: dup } = await supabaseClient
      .from('vehiculos')
      .select('id')
      .eq('patente', patente)
      .maybeSingle();
    if (dup) {
      throw new DomainError(`Ya existe un vehículo registrado con la patente ${patente}.`, 409);
    }
    const { data, error } = await supabaseClient
      .from('vehiculos')
      .insert(record)
      .select('*, clientes(nombre_apellido)')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new DomainError(`Ya existe un vehículo registrado con la patente ${patente}.`, 409);
      }
      throw new DomainError(error.message, 500);
    }
    return { ...(data as any), cliente_nombre: (data as any).clientes?.nombre_apellido || '' };
  }

  const owner = sqlite.prepare('SELECT id, nombre_apellido FROM clientes WHERE id = ?').get(cliente_id) as
    | { id: string; nombre_apellido: string }
    | undefined;
  if (!owner) throw new DomainError('El propietario seleccionado no existe.', 404);

  const dup = sqlite.prepare('SELECT id FROM vehiculos WHERE upper(patente) = ?').get(patente);
  if (dup) {
    throw new DomainError(`Ya existe un vehículo registrado con la patente ${patente}.`, 409);
  }

  sqlite
    .prepare(
      `INSERT INTO vehiculos (id, patente, marca, modelo, anio, kilometraje, motor, tipo_combustible, color, cliente_id, observaciones, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.patente,
      record.marca,
      record.modelo,
      record.anio,
      record.kilometraje,
      record.motor,
      record.tipo_combustible,
      record.color,
      record.cliente_id,
      record.observaciones,
      record.created_at
    );

  return { ...record, cliente_nombre: owner.nombre_apellido };
}

export async function updateVehiculo(
  id: string,
  input: Partial<Omit<Vehiculo, 'id' | 'created_at' | 'cliente_nombre'>>
): Promise<Vehiculo> {
  const patente = normalizePatente(input.patente || '');
  const marca = (input.marca || '').trim();
  const modelo = (input.modelo || '').trim();
  const cliente_id = (input.cliente_id || '').trim();
  const anio = Number(input.anio);
  const kilometraje = Number(input.kilometraje || 0);

  if (!patente) throw new DomainError('La patente del vehículo es obligatoria.');
  if (!marca) throw new DomainError('La marca del vehículo es obligatoria.');
  if (!modelo) throw new DomainError('El modelo del vehículo es obligatorio.');
  if (!cliente_id) throw new DomainError('Debe asociar el vehículo a un propietario.');
  if (!Number.isFinite(anio) || anio < 1950 || anio > new Date().getFullYear() + 1) {
    throw new DomainError('El año del vehículo no es válido.');
  }
  if (!Number.isFinite(kilometraje) || kilometraje < 0) {
    throw new DomainError('El kilometraje no puede ser negativo.');
  }

  const payload = {
    patente,
    marca,
    modelo,
    anio,
    kilometraje,
    motor: (input.motor ?? '').trim(),
    tipo_combustible: (input.tipo_combustible ?? 'Nafta').trim(),
    color: (input.color ?? '').trim(),
    cliente_id,
    observaciones: (input.observaciones ?? '').trim(),
  };

  if (useSupabase && supabaseClient) {
    const { data: dup } = await supabaseClient
      .from('vehiculos')
      .select('id')
      .eq('patente', patente)
      .neq('id', id)
      .maybeSingle();
    if (dup) {
      throw new DomainError(`Ya existe otro vehículo con la patente ${patente}.`, 409);
    }
    const { data, error } = await supabaseClient
      .from('vehiculos')
      .update(payload)
      .eq('id', id)
      .select('*, clientes(nombre_apellido)')
      .maybeSingle();
    if (error) throw new DomainError(error.message, 500);
    if (!data) throw new DomainError('Vehículo no encontrado.', 404);
    return { ...(data as any), cliente_nombre: (data as any).clientes?.nombre_apellido || '' };
  }

  const dup = sqlite
    .prepare('SELECT id FROM vehiculos WHERE upper(patente) = ? AND id != ?')
    .get(patente, id);
  if (dup) {
    throw new DomainError(`Ya existe otro vehículo registrado con la patente ${patente}.`, 409);
  }
  const owner = sqlite.prepare('SELECT id, nombre_apellido FROM clientes WHERE id = ?').get(cliente_id) as
    | { id: string; nombre_apellido: string }
    | undefined;
  if (!owner) throw new DomainError('El propietario seleccionado no existe.', 404);

  const info = sqlite
    .prepare(
      `UPDATE vehiculos
       SET patente = ?, marca = ?, modelo = ?, anio = ?, kilometraje = ?, motor = ?, tipo_combustible = ?, color = ?, cliente_id = ?, observaciones = ?
       WHERE id = ?`
    )
    .run(
      payload.patente,
      payload.marca,
      payload.modelo,
      payload.anio,
      payload.kilometraje,
      payload.motor,
      payload.tipo_combustible,
      payload.color,
      payload.cliente_id,
      payload.observaciones,
      id
    );
  if (info.changes === 0) throw new DomainError('Vehículo no encontrado.', 404);
  const updated = sqlite.prepare('SELECT * FROM vehiculos WHERE id = ?').get(id) as Vehiculo;
  return { ...updated, cliente_nombre: owner.nombre_apellido };
}

export async function deleteVehiculo(id: string): Promise<void> {
  if (useSupabase && supabaseClient) {
    const { count: tCount } = await supabaseClient
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('vehiculo_id', id);
    if ((tCount || 0) > 0) {
      throw new DomainError('No se puede eliminar el vehículo porque tiene turnos asociados.', 409);
    }
    const { count: wCount } = await supabaseClient
      .from('trabajos')
      .select('id', { count: 'exact', head: true })
      .eq('vehiculo_id', id);
    if ((wCount || 0) > 0) {
      throw new DomainError('No se puede eliminar el vehículo porque posee historial de trabajos.', 409);
    }
    const { error } = await supabaseClient.from('vehiculos').delete().eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    return;
  }

  const t = sqlite.prepare('SELECT id FROM turnos WHERE vehiculo_id = ? LIMIT 1').get(id);
  if (t) throw new DomainError('No se puede eliminar el vehículo porque tiene turnos asociados.', 409);
  const w = sqlite.prepare('SELECT id FROM trabajos WHERE vehiculo_id = ? LIMIT 1').get(id);
  if (w) throw new DomainError('No se puede eliminar el vehículo porque posee historial de trabajos.', 409);

  const info = sqlite.prepare('DELETE FROM vehiculos WHERE id = ?').run(id);
  if (info.changes === 0) throw new DomainError('Vehículo no encontrado.', 404);
}

// ============================================================================
// SERVICIOS
// ============================================================================
export async function listServicios(onlyActive = false): Promise<Servicio[]> {
  if (useSupabase && supabaseClient) {
    let query = supabaseClient.from('servicios').select('*').order('nombre', { ascending: true });
    if (onlyActive) query = query.eq('activo', true);
    const { data, error } = await query;
    if (error) throw new DomainError(error.message, 500);
    return (data || []) as Servicio[];
  }

  const sql = onlyActive
    ? 'SELECT * FROM servicios WHERE activo = 1 ORDER BY nombre ASC'
    : 'SELECT * FROM servicios ORDER BY nombre ASC';
  const rows = sqlite.prepare(sql).all() as Array<Omit<Servicio, 'activo'> & { activo: number }>;
  return rows.map((r) => ({ ...r, activo: Boolean(r.activo) }));
}

export async function createServicio(
  input: Omit<Servicio, 'id' | 'created_at'>
): Promise<Servicio> {
  const nombre = (input.nombre || '').trim();
  const duracion_minutos = Number(input.duracion_minutos);
  const precio_orientativo = Number(input.precio_orientativo || 0);

  if (!nombre) throw new DomainError('El nombre del servicio es obligatorio.');
  if (!Number.isFinite(duracion_minutos) || duracion_minutos < 15) {
    throw new DomainError('La duración estimada debe ser de al menos 15 minutos.');
  }
  if (!Number.isFinite(precio_orientativo) || precio_orientativo < 0) {
    throw new DomainError('El precio orientativo no puede ser negativo.');
  }

  const record: Servicio = {
    id: crypto.randomUUID(),
    nombre,
    descripcion: (input.descripcion || '').trim(),
    duracion_minutos,
    precio_orientativo,
    activo: input.activo !== false,
    created_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient.from('servicios').insert(record).select('*').single();
    if (error) throw new DomainError(error.message, 500);
    return data as Servicio;
  }

  sqlite
    .prepare(
      `INSERT INTO servicios (id, nombre, descripcion, duracion_minutos, precio_orientativo, activo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.nombre,
      record.descripcion,
      record.duracion_minutos,
      record.precio_orientativo,
      record.activo ? 1 : 0,
      record.created_at
    );
  return record;
}

export async function updateServicio(
  id: string,
  input: Partial<Omit<Servicio, 'id' | 'created_at'>>
): Promise<Servicio> {
  const currentList = await listServicios(false);
  const current = currentList.find((s) => s.id === id);
  if (!current) throw new DomainError('Servicio no encontrado.', 404);

  const nombre = (input.nombre ?? current.nombre).trim();
  const duracion_minutos = Number(input.duracion_minutos ?? current.duracion_minutos);
  const precio_orientativo = Number(input.precio_orientativo ?? current.precio_orientativo);
  const activo = input.activo !== undefined ? Boolean(input.activo) : current.activo;

  if (!nombre) throw new DomainError('El nombre del servicio es obligatorio.');
  if (!Number.isFinite(duracion_minutos) || duracion_minutos < 15) {
    throw new DomainError('La duración estimada debe ser de al menos 15 minutos.');
  }
  if (!Number.isFinite(precio_orientativo) || precio_orientativo < 0) {
    throw new DomainError('El precio orientativo no puede ser negativo.');
  }

  const payload = {
    nombre,
    descripcion: (input.descripcion ?? current.descripcion).trim(),
    duracion_minutos,
    precio_orientativo,
    activo,
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('servicios')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new DomainError(error.message, 500);
    return data as Servicio;
  }

  sqlite
    .prepare(
      `UPDATE servicios
       SET nombre = ?, descripcion = ?, duracion_minutos = ?, precio_orientativo = ?, activo = ?
       WHERE id = ?`
    )
    .run(
      payload.nombre,
      payload.descripcion,
      payload.duracion_minutos,
      payload.precio_orientativo,
      payload.activo ? 1 : 0,
      id
    );

  return { ...current, ...payload };
}

export async function deleteServicio(id: string): Promise<void> {
  if (useSupabase && supabaseClient) {
    const { count: tCount } = await supabaseClient
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('servicio_id', id);
    const { count: wCount } = await supabaseClient
      .from('trabajos')
      .select('id', { count: 'exact', head: true })
      .eq('servicio_id', id);
    if ((tCount || 0) > 0 || (wCount || 0) > 0) {
      throw new DomainError(
        'Este servicio tiene turnos o trabajos asociados. Desactivalo en lugar de eliminarlo para conservar el historial.',
        409
      );
    }
    const { error } = await supabaseClient.from('servicios').delete().eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    return;
  }

  const t = sqlite.prepare('SELECT id FROM turnos WHERE servicio_id = ? LIMIT 1').get(id);
  const w = sqlite.prepare('SELECT id FROM trabajos WHERE servicio_id = ? LIMIT 1').get(id);
  if (t || w) {
    throw new DomainError(
      'Este servicio tiene turnos o trabajos asociados. Desactivalo en lugar de eliminarlo para conservar el historial.',
      409
    );
  }
  const info = sqlite.prepare('DELETE FROM servicios WHERE id = ?').run(id);
  if (info.changes === 0) throw new DomainError('Servicio no encontrado.', 404);
}

// ============================================================================
// TURNOS
// ============================================================================
export async function listTurnos(filters?: {
  fecha?: string;
  desde?: string;
  hasta?: string;
  cliente_id?: string;
  vehiculo_id?: string;
  estado?: string;
}): Promise<Turno[]> {
  if (useSupabase && supabaseClient) {
    let query = supabaseClient
      .from('turnos')
      .select(
        '*, clientes(nombre_apellido, telefono), vehiculos(patente, marca, modelo), servicios(nombre)'
      )
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (filters?.fecha) query = query.eq('fecha', filters.fecha);
    if (filters?.desde) query = query.gte('fecha', filters.desde);
    if (filters?.hasta) query = query.lte('fecha', filters.hasta);
    if (filters?.cliente_id) query = query.eq('cliente_id', filters.cliente_id);
    if (filters?.vehiculo_id) query = query.eq('vehiculo_id', filters.vehiculo_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);

    const { data, error } = await query;
    if (error) throw new DomainError(error.message, 500);
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes?.nombre_apellido || '',
      cliente_telefono: r.clientes?.telefono || '',
      vehiculo_patente: r.vehiculos?.patente || '',
      vehiculo_marca: r.vehiculos?.marca || '',
      vehiculo_modelo: r.vehiculos?.modelo || '',
      servicio_nombre: r.servicios?.nombre || '',
    })) as Turno[];
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.fecha) {
    conditions.push('t.fecha = ?');
    params.push(filters.fecha);
  }
  if (filters?.desde) {
    conditions.push('t.fecha >= ?');
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    conditions.push('t.fecha <= ?');
    params.push(filters.hasta);
  }
  if (filters?.cliente_id) {
    conditions.push('t.cliente_id = ?');
    params.push(filters.cliente_id);
  }
  if (filters?.vehiculo_id) {
    conditions.push('t.vehiculo_id = ?');
    params.push(filters.vehiculo_id);
  }
  if (filters?.estado) {
    conditions.push('t.estado = ?');
    params.push(filters.estado);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return sqlite
    .prepare(
      `SELECT t.*,
              c.nombre_apellido as cliente_nombre,
              c.telefono as cliente_telefono,
              v.patente as vehiculo_patente,
              v.marca as vehiculo_marca,
              v.modelo as vehiculo_modelo,
              s.nombre as servicio_nombre
       FROM turnos t
       JOIN clientes c ON t.cliente_id = c.id
       JOIN vehiculos v ON t.vehiculo_id = v.id
       JOIN servicios s ON t.servicio_id = s.id
       ${whereClause}
       ORDER BY t.fecha ASC, t.hora ASC`
    )
    .all(...params) as Turno[];
}

async function validateTurnoConstraints(
  input: {
    cliente_id: string;
    vehiculo_id: string;
    servicio_id: string;
    fecha: string;
    hora: string;
    duracion_minutos: number;
    estado: EstadoTurno;
  },
  excludeTurnoId?: string
): Promise<void> {
  if (!input.cliente_id) throw new DomainError('Debe seleccionar un cliente.');
  if (!input.vehiculo_id) throw new DomainError('Debe seleccionar un vehículo.');
  if (!input.servicio_id) throw new DomainError('Debe seleccionar un servicio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    throw new DomainError('La fecha del turno debe tener el formato AAAA-MM-DD.');
  }

  const startMin = timeToMinutes(input.hora);
  if (startMin < 0) throw new DomainError('La hora del turno no es válida.');
  if (!Number.isFinite(input.duracion_minutos) || input.duracion_minutos < 15) {
    throw new DomainError('La duración estimada debe ser de al menos 15 minutos.');
  }

  // Verify vehicle belongs to client
  const vehiculos = await listVehiculos('', input.cliente_id);
  const veh = vehiculos.find((v) => v.id === input.vehiculo_id);
  if (!veh) {
    throw new DomainError('El vehículo seleccionado no pertenece al cliente indicado.');
  }

  // If cancelled, skip overlap/working-hour blocking
  if (input.estado === 'Cancelado') return;

  const config = await getConfiguracion();
  const dayOfWeek = new Date(`${input.fecha}T12:00:00`).getDay();
  if (!config.dias_laborables.includes(dayOfWeek)) {
    throw new DomainError(
      'El día seleccionado no es laborable según la configuración del taller.'
    );
  }

  const openMin = timeToMinutes(config.hora_apertura);
  const closeMin = timeToMinutes(config.hora_cierre);
  const endMin = startMin + input.duracion_minutos;
  if (startMin < openMin || endMin > closeMin) {
    throw new DomainError(
      `El turno (${input.hora} - ${minutesToTime(endMin)}) está fuera del horario de atención (${config.hora_apertura} - ${config.hora_cierre}).`
    );
  }

  const sameDayTurnos = await listTurnos({ fecha: input.fecha });
  for (const existing of sameDayTurnos) {
    if (excludeTurnoId && existing.id === excludeTurnoId) continue;
    if (existing.estado === 'Cancelado') continue;
    const exStart = timeToMinutes(existing.hora);
    const exEnd = exStart + existing.duracion_minutos;
    if (startMin < exEnd && endMin > exStart) {
      throw new DomainError(
        `Superposición horaria: ya existe un turno de ${existing.hora} a ${minutesToTime(exEnd)} (${existing.vehiculo_patente} - ${existing.cliente_nombre}).`,
        409
      );
    }
  }
}

export async function createTurno(
  input: Omit<Turno, 'id' | 'created_at' | 'cliente_nombre' | 'cliente_telefono' | 'vehiculo_patente' | 'vehiculo_marca' | 'vehiculo_modelo' | 'servicio_nombre'>
): Promise<Turno> {
  const duracion = Number(input.duracion_minutos || 60);
  const estado: EstadoTurno = input.estado || 'Pendiente';

  await validateTurnoConstraints({
    cliente_id: input.cliente_id,
    vehiculo_id: input.vehiculo_id,
    servicio_id: input.servicio_id,
    fecha: input.fecha,
    hora: input.hora,
    duracion_minutos: duracion,
    estado,
  });

  const record = {
    id: crypto.randomUUID(),
    cliente_id: input.cliente_id,
    vehiculo_id: input.vehiculo_id,
    servicio_id: input.servicio_id,
    fecha: input.fecha,
    hora: input.hora,
    duracion_minutos: duracion,
    estado,
    observaciones: (input.observaciones || '').trim(),
    created_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient.from('turnos').insert(record).select('id').single();
    if (error) throw new DomainError(error.message, 500);
    const all = await listTurnos({ fecha: record.fecha });
    return all.find((t) => t.id === data.id)!;
  }

  sqlite
    .prepare(
      `INSERT INTO turnos (id, cliente_id, vehiculo_id, servicio_id, fecha, hora, duracion_minutos, estado, observaciones, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.cliente_id,
      record.vehiculo_id,
      record.servicio_id,
      record.fecha,
      record.hora,
      record.duracion_minutos,
      record.estado,
      record.observaciones,
      record.created_at
    );

  const created = (await listTurnos({ fecha: record.fecha })).find((t) => t.id === record.id);
  if (!created) throw new DomainError('Error al recuperar el turno creado.', 500);
  return created;
}

export async function updateTurno(
  id: string,
  input: Partial<Omit<Turno, 'id' | 'created_at'>>
): Promise<Turno> {
  const existingList = await listTurnos();
  const current = existingList.find((t) => t.id === id);
  if (!current) throw new DomainError('Turno no encontrado.', 404);

  const next = {
    cliente_id: input.cliente_id ?? current.cliente_id,
    vehiculo_id: input.vehiculo_id ?? current.vehiculo_id,
    servicio_id: input.servicio_id ?? current.servicio_id,
    fecha: input.fecha ?? current.fecha,
    hora: input.hora ?? current.hora,
    duracion_minutos: Number(input.duracion_minutos ?? current.duracion_minutos),
    estado: (input.estado ?? current.estado) as EstadoTurno,
    observaciones: (input.observaciones ?? current.observaciones).trim(),
  };

  // Validate schedule when changing date, time, duration, or un-cancelling
  const scheduleTouched =
    next.fecha !== current.fecha ||
    next.hora !== current.hora ||
    next.duracion_minutos !== current.duracion_minutos ||
    next.cliente_id !== current.cliente_id ||
    next.vehiculo_id !== current.vehiculo_id ||
    (current.estado === 'Cancelado' && next.estado !== 'Cancelado');

  if (scheduleTouched) {
    await validateTurnoConstraints(next, id);
  }

  if (useSupabase && supabaseClient) {
    const { error } = await supabaseClient.from('turnos').update(next).eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    const refreshed = await listTurnos();
    return refreshed.find((t) => t.id === id)!;
  }

  sqlite
    .prepare(
      `UPDATE turnos
       SET cliente_id = ?, vehiculo_id = ?, servicio_id = ?, fecha = ?, hora = ?, duracion_minutos = ?, estado = ?, observaciones = ?
       WHERE id = ?`
    )
    .run(
      next.cliente_id,
      next.vehiculo_id,
      next.servicio_id,
      next.fecha,
      next.hora,
      next.duracion_minutos,
      next.estado,
      next.observaciones,
      id
    );

  const refreshed = await listTurnos();
  return refreshed.find((t) => t.id === id)!;
}

export async function deleteTurno(id: string): Promise<void> {
  if (useSupabase && supabaseClient) {
    const { error } = await supabaseClient.from('turnos').delete().eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    return;
  }
  const info = sqlite.prepare('DELETE FROM turnos WHERE id = ?').run(id);
  if (info.changes === 0) throw new DomainError('Turno no encontrado.', 404);
}

// ============================================================================
// HISTORIAL DE TRABAJOS
// ============================================================================
export async function listTrabajos(filters?: {
  desde?: string;
  hasta?: string;
  cliente_id?: string;
  vehiculo_id?: string;
  servicio_id?: string;
  patente?: string;
}): Promise<Trabajo[]> {
  if (useSupabase && supabaseClient) {
    let query = supabaseClient
      .from('trabajos')
      .select('*, clientes(nombre_apellido), vehiculos(patente, marca, modelo), servicios(nombre)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.desde) query = query.gte('fecha', filters.desde);
    if (filters?.hasta) query = query.lte('fecha', filters.hasta);
    if (filters?.cliente_id) query = query.eq('cliente_id', filters.cliente_id);
    if (filters?.vehiculo_id) query = query.eq('vehiculo_id', filters.vehiculo_id);
    if (filters?.servicio_id) query = query.eq('servicio_id', filters.servicio_id);

    const { data, error } = await query;
    if (error) throw new DomainError(error.message, 500);
    let rows = (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes?.nombre_apellido || '',
      vehiculo_patente: r.vehiculos?.patente || '',
      vehiculo_marca: r.vehiculos?.marca || '',
      vehiculo_modelo: r.vehiculos?.modelo || '',
      servicio_nombre: r.servicios?.nombre || '',
    })) as Trabajo[];

    if (filters?.patente?.trim()) {
      const q = filters.patente.trim().toLowerCase();
      rows = rows.filter((t) => (t.vehiculo_patente || '').toLowerCase().includes(q));
    }
    return rows;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.desde) {
    conditions.push('w.fecha >= ?');
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    conditions.push('w.fecha <= ?');
    params.push(filters.hasta);
  }
  if (filters?.cliente_id) {
    conditions.push('w.cliente_id = ?');
    params.push(filters.cliente_id);
  }
  if (filters?.vehiculo_id) {
    conditions.push('w.vehiculo_id = ?');
    params.push(filters.vehiculo_id);
  }
  if (filters?.servicio_id) {
    conditions.push('w.servicio_id = ?');
    params.push(filters.servicio_id);
  }
  if (filters?.patente?.trim()) {
    conditions.push('lower(v.patente) LIKE ?');
    params.push(`%${filters.patente.trim().toLowerCase()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return sqlite
    .prepare(
      `SELECT w.*,
              c.nombre_apellido as cliente_nombre,
              v.patente as vehiculo_patente,
              v.marca as vehiculo_marca,
              v.modelo as vehiculo_modelo,
              s.nombre as servicio_nombre
       FROM trabajos w
       JOIN clientes c ON w.cliente_id = c.id
       JOIN vehiculos v ON w.vehiculo_id = v.id
       JOIN servicios s ON w.servicio_id = s.id
       ${whereClause}
       ORDER BY w.fecha DESC, w.created_at DESC`
    )
    .all(...params) as Trabajo[];
}

export async function createTrabajo(
  input: Omit<Trabajo, 'id' | 'created_at' | 'cliente_nombre' | 'vehiculo_patente' | 'vehiculo_marca' | 'vehiculo_modelo' | 'servicio_nombre'> & {
    finalizar_turno?: boolean;
  }
): Promise<Trabajo> {
  if (!input.cliente_id) throw new DomainError('Debe seleccionar un cliente.');
  if (!input.vehiculo_id) throw new DomainError('Debe seleccionar un vehículo.');
  if (!input.servicio_id) throw new DomainError('Debe seleccionar un servicio realizado.');
  if (!input.fecha) throw new DomainError('La fecha es obligatoria.');
  const descripcion = (input.descripcion || '').trim();
  if (!descripcion) throw new DomainError('La descripción del trabajo es obligatoria.');

  const kilometraje = Number(input.kilometraje || 0);
  const importe = Number(input.importe || 0);
  if (!Number.isFinite(kilometraje) || kilometraje < 0) {
    throw new DomainError('El kilometraje no puede ser negativo.');
  }
  if (!Number.isFinite(importe) || importe < 0) {
    throw new DomainError('El importe no puede ser negativo.');
  }

  const record = {
    id: crypto.randomUUID(),
    turno_id: input.turno_id || null,
    cliente_id: input.cliente_id,
    vehiculo_id: input.vehiculo_id,
    servicio_id: input.servicio_id,
    fecha: input.fecha,
    kilometraje,
    descripcion,
    observaciones: (input.observaciones || '').trim(),
    importe,
    created_at: new Date().toISOString(),
  };

  if (useSupabase && supabaseClient) {
    const { data, error } = await supabaseClient.from('trabajos').insert(record).select('id').single();
    if (error) throw new DomainError(error.message, 500);

    // Sync vehicle mileage if higher
    const { data: veh } = await supabaseClient
      .from('vehiculos')
      .select('kilometraje')
      .eq('id', record.vehiculo_id)
      .maybeSingle();
    if (veh && kilometraje > Number(veh.kilometraje)) {
      await supabaseClient
        .from('vehiculos')
        .update({ kilometraje })
        .eq('id', record.vehiculo_id);
    }

    // Mark linked turno as Finalizado if requested
    if (record.turno_id && input.finalizar_turno !== false) {
      await supabaseClient
        .from('turnos')
        .update({ estado: 'Finalizado' })
        .eq('id', record.turno_id);
    }

    const list = await listTrabajos();
    return list.find((w) => w.id === data.id)!;
  }

  sqlite
    .prepare(
      `INSERT INTO trabajos (id, turno_id, cliente_id, vehiculo_id, servicio_id, fecha, kilometraje, descripcion, observaciones, importe, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.turno_id,
      record.cliente_id,
      record.vehiculo_id,
      record.servicio_id,
      record.fecha,
      record.kilometraje,
      record.descripcion,
      record.observaciones,
      record.importe,
      record.created_at
    );

  // Sync vehicle mileage if higher
  const veh = sqlite
    .prepare('SELECT kilometraje FROM vehiculos WHERE id = ?')
    .get(record.vehiculo_id) as { kilometraje: number } | undefined;
  if (veh && kilometraje > veh.kilometraje) {
    sqlite.prepare('UPDATE vehiculos SET kilometraje = ? WHERE id = ?').run(kilometraje, record.vehiculo_id);
  }

  // Optionally mark linked turno as Finalizado
  if (record.turno_id && input.finalizar_turno !== false) {
    sqlite.prepare("UPDATE turnos SET estado = 'Finalizado' WHERE id = ?").run(record.turno_id);
  }

  const list = await listTrabajos();
  return list.find((w) => w.id === record.id)!;
}

export async function updateTrabajo(
  id: string,
  input: Partial<Omit<Trabajo, 'id' | 'created_at'>>
): Promise<Trabajo> {
  const all = await listTrabajos();
  const current = all.find((w) => w.id === id);
  if (!current) throw new DomainError('Registro de trabajo no encontrado.', 404);

  const descripcion = (input.descripcion ?? current.descripcion).trim();
  if (!descripcion) throw new DomainError('La descripción del trabajo es obligatoria.');

  const kilometraje = Number(input.kilometraje ?? current.kilometraje);
  const importe = Number(input.importe ?? current.importe);
  if (!Number.isFinite(kilometraje) || kilometraje < 0) {
    throw new DomainError('El kilometraje no puede ser negativo.');
  }
  if (!Number.isFinite(importe) || importe < 0) {
    throw new DomainError('El importe no puede ser negativo.');
  }

  const next = {
    turno_id: input.turno_id !== undefined ? input.turno_id : current.turno_id,
    cliente_id: input.cliente_id ?? current.cliente_id,
    vehiculo_id: input.vehiculo_id ?? current.vehiculo_id,
    servicio_id: input.servicio_id ?? current.servicio_id,
    fecha: input.fecha ?? current.fecha,
    kilometraje,
    descripcion,
    observaciones: (input.observaciones ?? current.observaciones).trim(),
    importe,
  };

  if (useSupabase && supabaseClient) {
    const { error } = await supabaseClient.from('trabajos').update(next).eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    const updatedList = await listTrabajos();
    return updatedList.find((w) => w.id === id)!;
  }

  sqlite
    .prepare(
      `UPDATE trabajos
       SET turno_id = ?, cliente_id = ?, vehiculo_id = ?, servicio_id = ?, fecha = ?, kilometraje = ?, descripcion = ?, observaciones = ?, importe = ?
       WHERE id = ?`
    )
    .run(
      next.turno_id,
      next.cliente_id,
      next.vehiculo_id,
      next.servicio_id,
      next.fecha,
      next.kilometraje,
      next.descripcion,
      next.observaciones,
      next.importe,
      id
    );

  const updatedList = await listTrabajos();
  return updatedList.find((w) => w.id === id)!;
}

export async function deleteTrabajo(id: string): Promise<void> {
  if (useSupabase && supabaseClient) {
    const { error } = await supabaseClient.from('trabajos').delete().eq('id', id);
    if (error) throw new DomainError(error.message, 500);
    return;
  }
  const info = sqlite.prepare('DELETE FROM trabajos WHERE id = ?').run(id);
  if (info.changes === 0) throw new DomainError('Registro de trabajo no encontrado.', 404);
}
