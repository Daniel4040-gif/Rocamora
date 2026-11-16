import React, { useEffect, useMemo, useState } from 'react';
import { Car, Plus, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import {
  ESTADOS_TURNO,
  TIPOS_COMBUSTIBLE,
  type Cliente,
  type ConfiguracionTaller,
  type EstadoTurno,
  type Servicio,
  type Trabajo,
  type Turno,
  type Vehiculo,
} from '../types/workshop';
import { getTodayStr, Modal } from './ui';

const inputClass =
  'w-full px-3 py-2 text-sm bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors';
const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

// ============================================================================
// MODAL CLIENTE
// ============================================================================
interface ClienteModalProps {
  open: boolean;
  initial?: Cliente | null;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function ClienteModal({
  open,
  initial,
  onClose,
  onSaved,
  onNotify,
}: ClienteModalProps) {
  const [nombre_apellido, setNombre] = useState('');
  const [dni_cuit, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setNombre(initial?.nombre_apellido || '');
    setDni(initial?.dni_cuit || '');
    setTelefono(initial?.telefono || '');
    setWhatsapp(initial?.whatsapp || '');
    setEmail(initial?.email || '');
    setDireccion(initial?.direccion || '');
    setObservaciones(initial?.observaciones || '');
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre_apellido.trim() || !dni_cuit.trim() || !telefono.trim()) {
      setError('Completá nombre y apellido, DNI/CUIT y teléfono.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre_apellido: nombre_apellido.trim(),
        dni_cuit: dni_cuit.trim(),
        telefono: telefono.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        observaciones: observaciones.trim(),
      };
      const saved = initial
        ? await api.clientes.update(initial.id, payload)
        : await api.clientes.create(payload);
      onNotify('success', initial ? 'Cliente actualizado.' : 'Cliente registrado.');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar cliente' : 'Nuevo cliente'}
      subtitle="Los campos marcados con * son obligatorios."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre y apellido *</label>
            <input
              type="text"
              value={nombre_apellido}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej. Martín Gómez"
              required
            />
          </div>
          <div>
            <label className={labelClass}>DNI o CUIT *</label>
            <input
              type="text"
              value={dni_cuit}
              onChange={(e) => setDni(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              placeholder="Ej. 31.458.920"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              placeholder="Ej. 11-5432-8810"
              required
            />
          </div>
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              placeholder="Ej. 5491154328810"
            />
          </div>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="cliente@email.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className={inputClass}
              placeholder="Calle, altura, localidad"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={inputClass}
              placeholder="Notas útiles sobre el cliente"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// MODAL VEHÍCULO
// ============================================================================
interface VehiculoModalProps {
  open: boolean;
  initial?: Vehiculo | null;
  defaultClienteId?: string;
  clientes: Cliente[];
  onClose: () => void;
  onSaved: (vehiculo: Vehiculo) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function VehiculoModal({
  open,
  initial,
  defaultClienteId = '',
  clientes,
  onClose,
  onSaved,
  onNotify,
}: VehiculoModalProps) {
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<string>(String(new Date().getFullYear()));
  const [kilometraje, setKilometraje] = useState<string>('0');
  const [motor, setMotor] = useState('');
  const [tipo_combustible, setCombustible] = useState<string>('Nafta');
  const [color, setColor] = useState('');
  const [cliente_id, setClienteId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPatente(initial?.patente || '');
    setMarca(initial?.marca || '');
    setModelo(initial?.modelo || '');
    setAnio(String(initial?.anio || new Date().getFullYear()));
    setKilometraje(String(initial?.kilometraje ?? 0));
    setMotor(initial?.motor || '');
    setCombustible(initial?.tipo_combustible || 'Nafta');
    setColor(initial?.color || '');
    setClienteId(initial?.cliente_id || defaultClienteId || clientes[0]?.id || '');
    setObservaciones(initial?.observaciones || '');
  }, [open, initial, defaultClienteId, clientes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patente.trim() || !marca.trim() || !modelo.trim() || !cliente_id) {
      setError('Completá patente, marca, modelo y propietario.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patente: patente.trim().toUpperCase(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: Number(anio),
        kilometraje: Number(kilometraje || 0),
        motor: motor.trim(),
        tipo_combustible,
        color: color.trim(),
        cliente_id,
        observaciones: observaciones.trim(),
      };
      const saved = initial
        ? await api.vehiculos.update(initial.id, payload)
        : await api.vehiculos.create(payload);
      onNotify('success', initial ? 'Vehículo actualizado.' : 'Vehículo registrado.');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el vehículo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar vehículo' : 'Registrar vehículo'}
      subtitle="La patente es única en el sistema."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Patente *</label>
            <input
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono-tabular uppercase`}
              placeholder="Ej. AF482KL"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Propietario *</label>
            <select
              value={cliente_id}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_apellido} ({c.dni_cuit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Marca *</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className={inputClass}
              placeholder="Ej. Toyota"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Modelo *</label>
            <input
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className={inputClass}
              placeholder="Ej. Corolla XEi"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Año *</label>
            <input
              type="number"
              min={1950}
              max={new Date().getFullYear() + 1}
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Kilometraje actual</label>
            <input
              type="number"
              min={0}
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
            />
          </div>
          <div>
            <label className={labelClass}>Motor</label>
            <input
              type="text"
              value={motor}
              onChange={(e) => setMotor(e.target.value)}
              className={inputClass}
              placeholder="Ej. 1.6 16v / 2.0 TDI"
            />
          </div>
          <div>
            <label className={labelClass}>Combustible *</label>
            <select
              value={tipo_combustible}
              onChange={(e) => setCombustible(e.target.value)}
              className={inputClass}
            >
              {TIPOS_COMBUSTIBLE.map((tc) => (
                <option key={tc} value={tc}>
                  {tc}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Color</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={inputClass}
              placeholder="Ej. Gris Plata"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={inputClass}
              placeholder="Especificaciones técnicas o detalles de mantenimiento"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar vehículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// MODAL SERVICIO
// ============================================================================
interface ServicioModalProps {
  open: boolean;
  initial?: Servicio | null;
  onClose: () => void;
  onSaved: (servicio: Servicio) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function ServicioModal({
  open,
  initial,
  onClose,
  onSaved,
  onNotify,
}: ServicioModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [duracion_minutos, setDuracion] = useState('60');
  const [precio_orientativo, setPrecio] = useState('0');
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setNombre(initial?.nombre || '');
    setDescripcion(initial?.descripcion || '');
    setDuracion(String(initial?.duracion_minutos ?? 60));
    setPrecio(String(initial?.precio_orientativo ?? 0));
    setActivo(initial ? initial.activo : true);
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) {
      setError('El nombre del servicio es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        duracion_minutos: Number(duracion_minutos),
        precio_orientativo: Number(precio_orientativo || 0),
        activo,
      };
      const saved = initial
        ? await api.servicios.update(initial.id, payload)
        : await api.servicios.create(payload);
      onNotify('success', initial ? 'Servicio actualizado.' : 'Servicio agregado.');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar servicio' : 'Nuevo servicio'}
      subtitle="Definí la duración estimada y el valor orientativo de referencia."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        <div>
          <label className={labelClass}>Nombre del servicio *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
            placeholder="Ej. Cambio de aceite y filtros"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClass}
            placeholder="Detalle de tareas incluidas"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Duración estimada (minutos) *</label>
            <input
              type="number"
              min={15}
              step={15}
              value={duracion_minutos}
              onChange={(e) => setDuracion(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Precio orientativo ($)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={precio_orientativo}
              onChange={(e) => setPrecio(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          Servicio activo (disponible para nuevos turnos)
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// MODAL TRABAJO REALIZADO
// ============================================================================
interface TrabajoModalProps {
  open: boolean;
  initial?: Trabajo | null;
  linkedTurno?: Turno | null;
  defaultClienteId?: string;
  defaultVehiculoId?: string;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  turnos: Turno[];
  onClose: () => void;
  onSaved: () => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function TrabajoModal({
  open,
  initial,
  linkedTurno,
  defaultClienteId = '',
  defaultVehiculoId = '',
  clientes,
  vehiculos,
  servicios,
  turnos,
  onClose,
  onSaved,
  onNotify,
}: TrabajoModalProps) {
  const [turno_id, setTurnoId] = useState<string>('');
  const [cliente_id, setClienteId] = useState('');
  const [vehiculo_id, setVehiculoId] = useState('');
  const [servicio_id, setServicioId] = useState('');
  const [fecha, setFecha] = useState(getTodayStr());
  const [kilometraje, setKilometraje] = useState('0');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [importe, setImporte] = useState('0');
  const [finalizarTurno, setFinalizarTurno] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initial) {
      setTurnoId(initial.turno_id || '');
      setClienteId(initial.cliente_id);
      setVehiculoId(initial.vehiculo_id);
      setServicioId(initial.servicio_id);
      setFecha(initial.fecha);
      setKilometraje(String(initial.kilometraje));
      setDescripcion(initial.descripcion);
      setObservaciones(initial.observaciones);
      setImporte(String(initial.importe));
      setFinalizarTurno(false);
    } else if (linkedTurno) {
      setTurnoId(linkedTurno.id);
      setClienteId(linkedTurno.cliente_id);
      setVehiculoId(linkedTurno.vehiculo_id);
      setServicioId(linkedTurno.servicio_id);
      setFecha(linkedTurno.fecha || getTodayStr());
      const veh = vehiculos.find((v) => v.id === linkedTurno.vehiculo_id);
      const svc = servicios.find((s) => s.id === linkedTurno.servicio_id);
      setKilometraje(String(veh?.kilometraje ?? 0));
      setDescripcion(linkedTurno.observaciones || svc?.nombre || '');
      setObservaciones('');
      setImporte(String(svc?.precio_orientativo ?? 0));
      setFinalizarTurno(true);
    } else {
      const targetVeh = vehiculos.find((v) => v.id === defaultVehiculoId);
      const cid = targetVeh?.cliente_id || defaultClienteId || clientes[0]?.id || '';
      const clientVehicles = vehiculos.filter((v) => v.cliente_id === cid);
      const vid = targetVeh?.id || clientVehicles[0]?.id || '';
      const vObj = vehiculos.find((v) => v.id === vid);
      setTurnoId('');
      setClienteId(cid);
      setVehiculoId(vid);
      setServicioId(servicios[0]?.id || '');
      setFecha(getTodayStr());
      setKilometraje(String(vObj?.kilometraje ?? 0));
      setDescripcion('');
      setObservaciones('');
      setImporte(String(servicios[0]?.precio_orientativo ?? 0));
      setFinalizarTurno(true);
    }
  }, [open, initial, linkedTurno, defaultClienteId, defaultVehiculoId, clientes, vehiculos, servicios]);

  const vehiculosCliente = useMemo(
    () => vehiculos.filter((v) => v.cliente_id === cliente_id),
    [vehiculos, cliente_id]
  );

  const linkableTurnos = useMemo(
    () =>
      turnos.filter(
        (t) =>
          t.estado !== 'Cancelado' &&
          (!cliente_id || t.cliente_id === cliente_id)
      ),
    [turnos, cliente_id]
  );

  const handleSelectTurno = (tid: string) => {
    setTurnoId(tid);
    const t = turnos.find((x) => x.id === tid);
    if (t) {
      setClienteId(t.cliente_id);
      setVehiculoId(t.vehiculo_id);
      setServicioId(t.servicio_id);
      setFecha(t.fecha);
      const veh = vehiculos.find((v) => v.id === t.vehiculo_id);
      if (veh) setKilometraje(String(veh.kilometraje));
      const svc = servicios.find((s) => s.id === t.servicio_id);
      if (svc && (!importe || importe === '0')) setImporte(String(svc.precio_orientativo));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cliente_id || !vehiculo_id || !servicio_id || !fecha || !descripcion.trim()) {
      setError('Completá cliente, vehículo, servicio, fecha y descripción del trabajo.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        turno_id: turno_id || null,
        cliente_id,
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje: Number(kilometraje || 0),
        descripcion: descripcion.trim(),
        observaciones: observaciones.trim(),
        importe: Number(importe || 0),
      };
      if (initial) {
        await api.trabajos.update(initial.id, payload);
        onNotify('success', 'Trabajo actualizado.');
      } else {
        await api.trabajos.create({ ...payload, finalizar_turno: finalizarTurno });
        onNotify('success', 'Trabajo registrado en el historial.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el trabajo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar registro de trabajo' : 'Registrar trabajo realizado'}
      subtitle="El kilometraje del vehículo se actualizará automáticamente si es superior al actual."
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Vincular con turno (opcional)</label>
            <select
              value={turno_id}
              onChange={(e) => handleSelectTurno(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin turno vinculado (registro directo)</option>
              {linkableTurnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fecha} {t.hora} — {t.vehiculo_patente} · {t.cliente_nombre} ({t.servicio_nombre})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cliente *</label>
            <select
              value={cliente_id}
              onChange={(e) => {
                const cid = e.target.value;
                setClienteId(cid);
                const firstV = vehiculos.find((v) => v.cliente_id === cid);
                setVehiculoId(firstV?.id || '');
                if (firstV) setKilometraje(String(firstV.kilometraje));
              }}
              className={inputClass}
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_apellido}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Vehículo *</label>
            <select
              value={vehiculo_id}
              onChange={(e) => {
                const vid = e.target.value;
                setVehiculoId(vid);
                const v = vehiculos.find((x) => x.id === vid);
                if (v) setKilometraje(String(v.kilometraje));
              }}
              className={inputClass}
              required
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculosCliente.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Servicio realizado *</label>
            <select
              value={servicio_id}
              onChange={(e) => {
                const sid = e.target.value;
                setServicioId(sid);
                const svc = servicios.find((s) => s.id === sid);
                if (svc && !initial) setImporte(String(svc.precio_orientativo));
              }}
              className={inputClass}
              required
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Kilometraje al momento del trabajo</label>
            <input
              type="number"
              min={0}
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
            />
          </div>
          <div>
            <label className={labelClass}>Importe ($)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descripción del trabajo realizado *</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputClass}
              placeholder="Detalle de tareas efectuadas, repuestos utilizados y controles realizados"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={inputClass}
              placeholder="Recomendaciones para el próximo control"
            />
          </div>
        </div>

        {!initial && turno_id && (
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={finalizarTurno}
              onChange={(e) => setFinalizarTurno(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            Marcar el turno vinculado como Finalizado
          </label>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Registrar trabajo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// MODAL TURNO (CON ALTA RÁPIDA DE CLIENTE Y VEHÍCULO SIN SALIR)
// ============================================================================
interface TurnoModalProps {
  open: boolean;
  initial?: Turno | null;
  defaultFecha?: string;
  defaultHora?: string;
  defaultClienteId?: string;
  defaultVehiculoId?: string;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  config: ConfiguracionTaller | null;
  onClose: () => void;
  onSaved: () => void;
  onQuickCreated: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function TurnoModal({
  open,
  initial,
  defaultFecha,
  defaultHora,
  defaultClienteId,
  defaultVehiculoId,
  clientes,
  vehiculos,
  servicios,
  config,
  onClose,
  onSaved,
  onQuickCreated,
  onNotify,
}: TurnoModalProps) {
  const [cliente_id, setClienteId] = useState('');
  const [vehiculo_id, setVehiculoId] = useState('');
  const [servicio_id, setServicioId] = useState('');
  const [fecha, setFecha] = useState(getTodayStr());
  const [hora, setHora] = useState('09:00');
  const [duracion_minutos, setDuracion] = useState('60');
  const [estado, setEstado] = useState<EstadoTurno>('Pendiente');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Quick-create subpanels
  const [showNewClient, setShowNewClient] = useState(false);
  const [qcNombre, setQcNombre] = useState('');
  const [qcDni, setQcDni] = useState('');
  const [qcTel, setQcTel] = useState('');
  const [qcSaving, setQcSaving] = useState(false);

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [qvPatente, setQvPatente] = useState('');
  const [qvMarca, setQvMarca] = useState('');
  const [qvModelo, setQvModelo] = useState('');
  const [qvAnio, setQvAnio] = useState(String(new Date().getFullYear()));
  const [qvSaving, setQvSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setShowNewClient(false);
    setShowNewVehicle(false);

    if (initial) {
      setClienteId(initial.cliente_id);
      setVehiculoId(initial.vehiculo_id);
      setServicioId(initial.servicio_id);
      setFecha(initial.fecha);
      setHora(initial.hora);
      setDuracion(String(initial.duracion_minutos));
      setEstado(initial.estado);
      setObservaciones(initial.observaciones || '');
    } else {
      const targetVeh = vehiculos.find((v) => v.id === defaultVehiculoId);
      const cid = targetVeh?.cliente_id || defaultClienteId || clientes[0]?.id || '';
      const cVehs = vehiculos.filter((v) => v.cliente_id === cid);
      const vid = targetVeh?.id || cVehs[0]?.id || '';
      const activeServices = servicios.filter((s) => s.activo);
      const firstSvc = activeServices[0] || servicios[0];
      setClienteId(cid);
      setVehiculoId(vid);
      setServicioId(firstSvc?.id || '');
      setFecha(defaultFecha || getTodayStr());
      setHora(defaultHora || config?.hora_apertura || '09:00');
      setDuracion(
        String(firstSvc?.duracion_minutos || config?.duracion_predeterminada || 60)
      );
      setEstado('Pendiente');
      setObservaciones('');
    }
  }, [open, initial, defaultFecha, defaultHora, defaultClienteId, defaultVehiculoId]);

  const vehiculosDelCliente = useMemo(
    () => vehiculos.filter((v) => v.cliente_id === cliente_id),
    [vehiculos, cliente_id]
  );

  const vehiculoSeleccionado = useMemo(
    () => vehiculos.find((v) => v.id === vehiculo_id) || null,
    [vehiculos, vehiculo_id]
  );

  const activeOrSelectedServicios = useMemo(
    () => servicios.filter((s) => s.activo || s.id === servicio_id),
    [servicios, servicio_id]
  );

  const handleQuickCreateClient = async () => {
    if (!qcNombre.trim() || !qcDni.trim() || !qcTel.trim()) {
      setError('Para crear el cliente rápido completá nombre, DNI/CUIT y teléfono.');
      return;
    }
    setError('');
    setQcSaving(true);
    try {
      const created = await api.clientes.create({
        nombre_apellido: qcNombre.trim(),
        dni_cuit: qcDni.trim(),
        telefono: qcTel.trim(),
        whatsapp: '',
        email: '',
        direccion: '',
        observaciones: '',
      });
      await onQuickCreated();
      setClienteId(created.id);
      setVehiculoId('');
      setShowNewClient(false);
      setShowNewVehicle(true); // Automatically offer registering their vehicle
      setQcNombre('');
      setQcDni('');
      setQcTel('');
      onNotify('success', `Cliente ${created.nombre_apellido} creado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally {
      setQcSaving(false);
    }
  };

  const handleQuickCreateVehicle = async () => {
    if (!cliente_id) {
      setError('Primero seleccioná o creá un cliente para asociar el vehículo.');
      return;
    }
    if (!qvPatente.trim() || !qvMarca.trim() || !qvModelo.trim()) {
      setError('Para crear el vehículo rápido completá patente, marca y modelo.');
      return;
    }
    setError('');
    setQvSaving(true);
    try {
      const created = await api.vehiculos.create({
        patente: qvPatente.trim().toUpperCase(),
        marca: qvMarca.trim(),
        modelo: qvModelo.trim(),
        anio: Number(qvAnio || new Date().getFullYear()),
        kilometraje: 0,
        motor: '',
        tipo_combustible: 'Nafta',
        color: '',
        cliente_id,
        observaciones: '',
      });
      await onQuickCreated();
      setVehiculoId(created.id);
      setShowNewVehicle(false);
      setQvPatente('');
      setQvMarca('');
      setQvModelo('');
      onNotify('success', `Vehículo ${created.patente} registrado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el vehículo.');
    } finally {
      setQvSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cliente_id || !vehiculo_id || !servicio_id || !fecha || !hora) {
      setError('Completá todos los campos obligatorios del turno.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cliente_id,
        vehiculo_id,
        servicio_id,
        fecha,
        hora,
        duracion_minutos: Number(duracion_minutos || 60),
        estado,
        observaciones: observaciones.trim(),
      };
      if (initial) {
        await api.turnos.update(initial.id, payload);
        onNotify('success', 'Turno actualizado.');
      } else {
        await api.turnos.create(payload);
        onNotify('success', 'Turno agendado correctamente.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el turno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar / Reprogramar turno' : 'Nuevo turno'}
      subtitle={
        config
          ? `Horario del taller: ${config.hora_apertura} a ${config.hora_cierre}`
          : undefined
      }
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* CLIENTE */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Cliente *</label>
            <button
              type="button"
              onClick={() => setShowNewClient((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {showNewClient ? 'Cerrar alta rápida' : 'Nuevo cliente'}
            </button>
          </div>
          <select
            value={cliente_id}
            onChange={(e) => {
              const cid = e.target.value;
              setClienteId(cid);
              const firstVeh = vehiculos.find((v) => v.cliente_id === cid);
              setVehiculoId(firstVeh?.id || '');
            }}
            className={inputClass}
            required
          >
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_apellido} — {c.dni_cuit}
              </option>
            ))}
          </select>

          {showNewClient && (
            <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                Alta rápida de cliente
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={qcNombre}
                  onChange={(e) => setQcNombre(e.target.value)}
                  placeholder="Nombre y apellido *"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={qcDni}
                  onChange={(e) => setQcDni(e.target.value)}
                  placeholder="DNI / CUIT *"
                  className={`${inputClass} font-mono-tabular`}
                />
                <input
                  type="text"
                  value={qcTel}
                  onChange={(e) => setQcTel(e.target.value)}
                  placeholder="Teléfono *"
                  className={`${inputClass} font-mono-tabular`}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuickCreateClient}
                  disabled={qcSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {qcSaving ? 'Guardando...' : 'Guardar y seleccionar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VEHÍCULO */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Vehículo del cliente *</label>
            <button
              type="button"
              onClick={() => setShowNewVehicle((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              <Car className="w-3.5 h-3.5" />
              {showNewVehicle ? 'Cerrar alta rápida' : 'Nuevo vehículo'}
            </button>
          </div>
          <select
            value={vehiculo_id}
            onChange={(e) => setVehiculoId(e.target.value)}
            className={inputClass}
            required
            disabled={!cliente_id}
          >
            <option value="">
              {!cliente_id
                ? 'Seleccioná primero un cliente...'
                : vehiculosDelCliente.length === 0
                  ? 'Este cliente no tiene vehículos registrados'
                  : 'Seleccionar vehículo...'}
            </option>
            {vehiculosDelCliente.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} — {v.marca} {v.modelo} ({v.anio})
              </option>
            ))}
          </select>

          {vehiculoSeleccionado && (
            <p className="mt-1.5 text-xs text-slate-600">
              Vehículo seleccionado:{' '}
              <span className="font-medium text-slate-900">
                {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
              </span>{' '}
              · Patente{' '}
              <span className="font-mono-tabular font-medium text-slate-900">
                {vehiculoSeleccionado.patente}
              </span>
            </p>
          )}

          {showNewVehicle && (
            <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                Alta rápida de vehículo para el cliente seleccionado
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  value={qvPatente}
                  onChange={(e) => setQvPatente(e.target.value.toUpperCase())}
                  placeholder="Patente *"
                  className={`${inputClass} font-mono-tabular uppercase`}
                />
                <input
                  type="text"
                  value={qvMarca}
                  onChange={(e) => setQvMarca(e.target.value)}
                  placeholder="Marca *"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={qvModelo}
                  onChange={(e) => setQvModelo(e.target.value)}
                  placeholder="Modelo *"
                  className={inputClass}
                />
                <input
                  type="number"
                  value={qvAnio}
                  onChange={(e) => setQvAnio(e.target.value)}
                  placeholder="Año"
                  className={`${inputClass} font-mono-tabular`}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuickCreateVehicle}
                  disabled={qvSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {qvSaving ? 'Guardando...' : 'Guardar y seleccionar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SERVICIO Y ESTADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Servicio solicitado *</label>
            <select
              value={servicio_id}
              onChange={(e) => {
                const sid = e.target.value;
                setServicioId(sid);
                const svc = servicios.find((s) => s.id === sid);
                if (svc && !initial) setDuracion(String(svc.duracion_minutos));
              }}
              className={inputClass}
              required
            >
              <option value="">Seleccionar servicio...</option>
              {activeOrSelectedServicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.duracion_minutos} min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Estado *</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoTurno)}
              className={inputClass}
            >
              {ESTADOS_TURNO.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FECHA, HORA, DURACIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className={labelClass}>Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Hora *</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Duración estimada (min) *</label>
            <input
              type="number"
              min={15}
              step={15}
              value={duracion_minutos}
              onChange={(e) => setDuracion(e.target.value)}
              className={`${inputClass} font-mono-tabular`}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Observaciones</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputClass}
            placeholder="Motivo de ingreso, síntomas reportados o indicaciones"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Agendar turno'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
