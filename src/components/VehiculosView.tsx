import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Car,
  ClipboardCheck,
  Edit3,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Cliente, Trabajo, Turno, Vehiculo } from '../types/workshop';
import {
  EmptyState,
  EstadoBadge,
  formatCurrency,
  formatDateES,
  formatKm,
  PatenteBadge,
} from './ui';

interface VehiculosViewProps {
  vehiculos: Vehiculo[];
  clientes: Cliente[];
  turnos: Turno[];
  trabajos: Trabajo[];
  selectedVehiculoId: string | null;
  onSelectVehiculo: (id: string | null) => void;
  onSelectCliente: (clienteId: string) => void;
  onNewVehiculo: () => void;
  onEditVehiculo: (vehiculo: Vehiculo) => void;
  onDeleteVehiculo: (vehiculo: Vehiculo) => void;
  onNewTurnoForVehiculo: (vehiculo: Vehiculo) => void;
  onNewTrabajoForVehiculo: (vehiculo: Vehiculo) => void;
}

export function VehiculosView({
  vehiculos,
  clientes,
  turnos,
  trabajos,
  selectedVehiculoId,
  onSelectVehiculo,
  onSelectCliente,
  onNewVehiculo,
  onEditVehiculo,
  onDeleteVehiculo,
  onNewTurnoForVehiculo,
  onNewTrabajoForVehiculo,
}: VehiculosViewProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter(
      (v) =>
        v.patente.toLowerCase().includes(q) ||
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        (v.cliente_nombre || '').toLowerCase().includes(q)
    );
  }, [vehiculos, search]);

  const selectedVehiculo = useMemo(
    () => vehiculos.find((v) => v.id === selectedVehiculoId) || null,
    [vehiculos, selectedVehiculoId]
  );

  // ============================================================================
  // FICHA INDIVIDUAL DEL VEHÍCULO
  // ============================================================================
  if (selectedVehiculo) {
    const propietario = clientes.find((c) => c.id === selectedVehiculo.cliente_id);
    const vehTurnos = turnos
      .filter((t) => t.vehiculo_id === selectedVehiculo.id)
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const vehTrabajos = trabajos
      .filter((w) => w.vehiculo_id === selectedVehiculo.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return (
      <div className="space-y-5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => onSelectVehiculo(null)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Volver al listado"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <PatenteBadge patente={selectedVehiculo.patente} />
                <h1 className="text-xl font-semibold text-slate-900 font-display">
                  {selectedVehiculo.marca} {selectedVehiculo.modelo}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono-tabular">
                Año {selectedVehiculo.anio} · {formatKm(selectedVehiculo.kilometraje)} ·{' '}
                {selectedVehiculo.tipo_combustible}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNewTrabajoForVehiculo(selectedVehiculo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Registrar trabajo
            </button>
            <button
              type="button"
              onClick={() => onNewTurnoForVehiculo(selectedVehiculo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo turno
            </button>
            <button
              type="button"
              onClick={() => onEditVehiculo(selectedVehiculo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
        </div>

        {/* Datos técnicos y propietario */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3.5 font-display">
            Ficha técnica
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Propietario</dt>
              <dd className="mt-0.5">
                {propietario ? (
                  <button
                    type="button"
                    onClick={() => onSelectCliente(propietario.id)}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {propietario.nombre_apellido}
                  </button>
                ) : (
                  selectedVehiculo.cliente_nombre || '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Motor</dt>
              <dd className="text-slate-900 mt-0.5">{selectedVehiculo.motor || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Combustible</dt>
              <dd className="text-slate-900 mt-0.5">{selectedVehiculo.tipo_combustible}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Color</dt>
              <dd className="text-slate-900 mt-0.5">{selectedVehiculo.color || '—'}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs text-slate-500">Observaciones</dt>
              <dd className="text-slate-700 mt-0.5">{selectedVehiculo.observaciones || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Historial de trabajos */}
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80">
            <h2 className="text-sm font-semibold text-slate-900 font-display">
              Historial de trabajos realizados ({vehTrabajos.length})
            </h2>
          </div>
          {vehTrabajos.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No hay trabajos registrados para este vehículo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Servicio</th>
                    <th className="py-3 px-4">Kilometraje</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {vehTrabajos.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-tabular whitespace-nowrap text-slate-900">
                        {formatDateES(w.fecha)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{w.servicio_nombre}</td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatKm(w.kilometraje)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{w.descripcion}</div>
                        {w.observaciones && (
                          <div className="text-xs text-slate-500 mt-0.5">{w.observaciones}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(w.importe)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Turnos del vehículo */}
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80">
            <h2 className="text-sm font-semibold text-slate-900 font-display">
              Turnos asociados ({vehTurnos.length})
            </h2>
          </div>
          {vehTurnos.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Sin turnos asociados a este vehículo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vehTurnos.map((t) => (
                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.servicio_nombre}</div>
                    <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                      {formatDateES(t.fecha)} · {t.hora} ({t.duracion_minutos} min)
                    </div>
                  </div>
                  <EstadoBadge estado={t.estado} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // LISTADO DE VEHÍCULOS
  // ============================================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Vehículos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Parque automotor registrado con patente única y ficha de mantenimiento
          </p>
        </div>
        <button
          type="button"
          onClick={onNewVehiculo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Registrar vehículo
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por patente, marca o modelo..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/70 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono-tabular">
          {filtered.length} {filtered.length === 1 ? 'vehículo' : 'vehículos'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Car className="w-5 h-5" />}
          title="No hay vehículos para mostrar"
          description={
            search
              ? 'No se encontraron vehículos con esa patente, marca o modelo.'
              : 'Registrá el primer vehículo asociándolo a un cliente.'
          }
          actionLabel={!search ? 'Registrar primer vehículo' : undefined}
          onAction={!search ? onNewVehiculo : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Patente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Marca y modelo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Año</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kilometraje</th>
                  <th className="py-3 px-4 whitespace-nowrap">Combustible</th>
                  <th className="py-3 px-4 whitespace-nowrap">Propietario</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectVehiculo(v.id)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <PatenteBadge patente={v.patente} />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {v.marca} {v.modelo}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600">{v.anio}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {formatKm(v.kilometraje)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{v.tipo_combustible}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectCliente(v.cliente_id)}
                        className="text-blue-700 hover:underline font-medium text-left"
                      >
                        {v.cliente_nombre}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectVehiculo(v.id)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditVehiculo(v)}
                          className="text-xs font-medium text-slate-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteVehiculo(v)}
                          aria-label="Eliminar vehículo"
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
