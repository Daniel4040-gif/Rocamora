export type EstadoTurno =
  | 'Pendiente'
  | 'Confirmado'
  | 'En taller'
  | 'En reparación'
  | 'Finalizado'
  | 'Cancelado';

export const ESTADOS_TURNO: EstadoTurno[] = [
  'Pendiente',
  'Confirmado',
  'En taller',
  'En reparación',
  'Finalizado',
  'Cancelado',
];

export const TIPOS_COMBUSTIBLE = [
  'Nafta',
  'Diésel',
  'GNC',
  'Híbrido',
  'Eléctrico',
] as const;

export interface Cliente {
  id: string;
  nombre_apellido: string;
  dni_cuit: string;
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  observaciones: string;
  created_at: string;
}

export interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  motor: string;
  tipo_combustible: string;
  color: string;
  cliente_id: string;
  observaciones: string;
  created_at: string;
  cliente_nombre?: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  precio_orientativo: number;
  activo: boolean;
  created_at: string;
}

export interface Turno {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  servicio_id: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracion_minutos: number;
  estado: EstadoTurno;
  observaciones: string;
  created_at: string;
  // Joined fields for convenience
  cliente_nombre?: string;
  cliente_telefono?: string;
  vehiculo_patente?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  servicio_nombre?: string;
}

export interface Trabajo {
  id: string;
  turno_id: string | null;
  cliente_id: string;
  vehiculo_id: string;
  servicio_id: string;
  fecha: string; // YYYY-MM-DD
  kilometraje: number;
  descripcion: string;
  observaciones: string;
  importe: number;
  created_at: string;
  // Joined fields
  cliente_nombre?: string;
  vehiculo_patente?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  servicio_nombre?: string;
}

export interface ConfiguracionTaller {
  id: number;
  nombre_taller: string;
  telefono: string;
  direccion: string;
  hora_apertura: string;
  hora_cierre: string;
  dias_laborables: number[]; // 0=Dom, 1=Lun ... 6=Sab
  duracion_predeterminada: number;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
}

export type SeccionNavegacion =
  | 'inicio'
  | 'turnos'
  | 'clientes'
  | 'vehiculos'
  | 'servicios'
  | 'historial'
  | 'configuracion';
