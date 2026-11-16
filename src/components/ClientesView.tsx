import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Car,
  Edit3,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import type { Cliente, Trabajo, Turno, Vehiculo } from '../types/workshop';
import {
  AvatarInitials,
  EmptyState,
  EstadoBadge,
  formatCurrency,
  formatDateES,
  formatKm,
  PatenteBadge,
} from './ui';

interface ClientesViewProps {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  turnos: Turno[];
  trabajos: Trabajo[];
  selectedClienteId: string | null;
  onSelectCliente: (id: string | null) => void;
  onNewCliente: () => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (cliente: Cliente) => void;
  onNewVehiculoForCliente: (clienteId: string) => void;
  onSelectVehiculo: (vehiculoId: string) => void;
  onNewTurnoForCliente: (clienteId: string) => void;
}

export function ClientesView({
  clientes,
  vehiculos,
  turnos,
  trabajos,
  selectedClienteId,
  onSelectCliente,
  onNewCliente,
  onEditCliente,
  onDeleteCliente,
  onNewVehiculoForCliente,
  onSelectVehiculo,
  onNewTurnoForCliente,
}: ClientesViewProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre_apellido.toLowerCase().includes(q) ||
        c.dni_cuit.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const selectedCliente = useMemo(
    () => clientes.find((c) => c.id === selectedClienteId) || null,
    [clientes, selectedClienteId]
  );

  // ============================================================================
  // FICHA INDIVIDUAL DEL CLIENTE
  // ============================================================================
  if (selectedCliente) {
    const clientVehicles = vehiculos.filter((v) => v.cliente_id === selectedCliente.id);
    const clientTurnos = turnos
      .filter((t) => t.cliente_id === selectedCliente.id)
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const clientTrabajos = trabajos
      .filter((w) => w.cliente_id === selectedCliente.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return (
      <div className="space-y-5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => onSelectCliente(null)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Volver al listado"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <AvatarInitials name={selectedCliente.nombre_apellido} size="lg" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 font-display">
                {selectedCliente.nombre_apellido}
              </h1>
              <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                DNI/CUIT: {selectedCliente.dni_cuit} · Tel: {selectedCliente.telefono}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNewTurnoForCliente(selectedCliente.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo turno
            </button>
            <button
              type="button"
              onClick={() => onEditCliente(selectedCliente)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar ficha
            </button>
          </div>
        </div>

        {/* Datos de contacto */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3.5 font-display">
            Información de contacto
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Teléfono</dt>
              <dd className="font-mono-tabular text-slate-900 mt-0.5">{selectedCliente.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">WhatsApp</dt>
              <dd className="font-mono-tabular text-slate-900 mt-0.5">
                {selectedCliente.whatsapp || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Correo electrónico</dt>
              <dd className="text-slate-900 mt-0.5">{selectedCliente.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Dirección</dt>
              <dd className="text-slate-900 mt-0.5">{selectedCliente.direccion || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Observaciones</dt>
              <dd className="text-slate-700 mt-0.5">{selectedCliente.observaciones || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Vehículos asociados */}
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
            <h2 className="text-sm font-semibold text-slate-900 font-display">
              Vehículos asociados ({clientVehicles.length})
            </h2>
            <button
              type="button"
              onClick={() => onNewVehiculoForCliente(selectedCliente.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
            >
              <Car className="w-3.5 h-3.5" />
              Agregar vehículo
            </button>
          </div>
          {clientVehicles.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Este cliente todavía no tiene vehículos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Patente</th>
                    <th className="py-3 px-4">Marca y modelo</th>
                    <th className="py-3 px-4">Año</th>
                    <th className="py-3 px-4">Kilometraje</th>
                    <th className="py-3 px-4 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clientVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <PatenteBadge patente={v.patente} />
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {v.marca} {v.modelo}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-600">{v.anio}</td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-600">
                        {formatKm(v.kilometraje)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectVehiculo(v.id)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Ver vehículo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Turnos & Trabajos del cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200/80">
              <h2 className="text-sm font-semibold text-slate-900 font-display">
                Historial de turnos ({clientTurnos.length})
              </h2>
            </div>
            {clientTurnos.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Sin turnos registrados.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {clientTurnos.map((t) => (
                  <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {t.servicio_nombre}
                      </div>
                      <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                        {formatDateES(t.fecha)} {t.hora} · {t.vehiculo_patente}
                      </div>
                    </div>
                    <EstadoBadge estado={t.estado} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200/80">
              <h2 className="text-sm font-semibold text-slate-900 font-display">
                Historial de trabajos ({clientTrabajos.length})
              </h2>
            </div>
            {clientTrabajos.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Sin trabajos realizados.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {clientTrabajos.map((w) => (
                  <div key={w.id} className="px-5 py-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {w.servicio_nombre}
                      </span>
                      <span className="text-sm font-mono-tabular font-semibold text-slate-900">
                        {formatCurrency(w.importe)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono-tabular">
                      {formatDateES(w.fecha)} · {w.vehiculo_patente} · {formatKm(w.kilometraje)}
                    </div>
                    <p className="text-xs text-slate-600">{w.descripcion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // LISTADO DE CLIENTES
  // ============================================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administrá la base de clientes, sus vehículos e historial
          </p>
        </div>
        <button
          type="button"
          onClick={onNewCliente}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
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
            placeholder="Buscar por nombre, DNI/CUIT o teléfono..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/70 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono-tabular">
          {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<User className="w-5 h-5" />}
          title="No hay clientes para mostrar"
          description={
            search
              ? 'No se encontraron clientes con ese criterio de búsqueda.'
              : 'Registrá tu primer cliente para asociar vehículos y turnos.'
          }
          actionLabel={!search ? 'Registrar primer cliente' : undefined}
          onAction={!search ? onNewCliente : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Nombre y apellido</th>
                  <th className="py-3 px-4 whitespace-nowrap">DNI / CUIT</th>
                  <th className="py-3 px-4 whitespace-nowrap">Teléfono</th>
                  <th className="py-3 px-4 whitespace-nowrap">Correo</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Vehículos</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((c) => {
                  const vCount = vehiculos.filter((v) => v.cliente_id === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectCliente(c.id)}
                          className="inline-flex items-center gap-2.5 text-left font-medium text-slate-900 hover:text-blue-700"
                        >
                          <AvatarInitials name={c.nombre_apellido} size="sm" />
                          <span>{c.nombre_apellido}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-700">{c.dni_cuit}</td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-700">{c.telefono}</td>
                      <td className="py-3 px-4 text-slate-600">{c.email || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-medium text-slate-800">
                        {vCount}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onSelectCliente(c.id)}
                            className="text-xs font-medium text-blue-700 hover:underline"
                          >
                            Ver ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditCliente(c)}
                            className="text-xs font-medium text-slate-700 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCliente(c)}
                            aria-label="Eliminar cliente"
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
