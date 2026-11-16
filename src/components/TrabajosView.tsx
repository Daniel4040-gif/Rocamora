import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Trash2 } from 'lucide-react';
import type { Cliente, Servicio, Trabajo } from '../types/workshop';
import {
  EmptyState,
  formatCurrency,
  formatDateES,
  formatKm,
  PatenteBadge,
} from './ui';

interface TrabajosViewProps {
  trabajos: Trabajo[];
  clientes: Cliente[];
  servicios: Servicio[];
  onNewTrabajo: () => void;
  onEditTrabajo: (trabajo: Trabajo) => void;
  onDeleteTrabajo: (trabajo: Trabajo) => void;
  onSelectCliente: (clienteId: string) => void;
  onSelectVehiculo: (vehiculoId: string) => void;
}

export function TrabajosView({
  trabajos,
  clientes,
  servicios,
  onNewTrabajo,
  onEditTrabajo,
  onDeleteTrabajo,
  onSelectCliente,
  onSelectVehiculo,
}: TrabajosViewProps) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [patente, setPatente] = useState('');

  const filtered = useMemo(() => {
    const patQ = patente.trim().toLowerCase();
    return trabajos.filter((w) => {
      if (desde && w.fecha < desde) return false;
      if (hasta && w.fecha > hasta) return false;
      if (clienteId && w.cliente_id !== clienteId) return false;
      if (servicioId && w.servicio_id !== servicioId) return false;
      if (patQ && !(w.vehiculo_patente || '').toLowerCase().includes(patQ)) return false;
      return true;
    });
  }, [trabajos, desde, hasta, clienteId, servicioId, patente]);

  const totalImporte = useMemo(
    () => filtered.reduce((acc, item) => acc + (Number(item.importe) || 0), 0),
    [filtered]
  );

  const hasFilters = Boolean(desde || hasta || clienteId || servicioId || patente);

  const clearFilters = () => {
    setDesde('');
    setHasta('');
    setClienteId('');
    setServicioId('');
    setPatente('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Historial de trabajos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro técnico de reparaciones y servicios efectuados por vehículo
          </p>
        </div>
        <button
          type="button"
          onClick={onNewTrabajo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Registrar trabajo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Patente
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={patente}
                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                placeholder="Ej. AF482KL"
                className="w-full pl-8 pr-2.5 py-2 text-xs font-mono-tabular border border-slate-300 rounded-lg bg-slate-50/70 focus:bg-white text-slate-900 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Cliente
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_apellido}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Servicio
            </label>
            <select
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">Todos los servicios</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-mono-tabular border border-slate-300 rounded-lg bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-mono-tabular border border-slate-300 rounded-lg bg-white text-slate-800"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono-tabular">
            {filtered.length} {filtered.length === 1 ? 'trabajo listado' : 'trabajos listados'}
          </span>
          <span>
            Suma orientativa del filtro:{' '}
            <strong className="font-mono-tabular text-slate-900">
              {formatCurrency(totalImporte)}
            </strong>
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-5 h-5" />}
          title="No hay trabajos registrados"
          description={
            hasFilters
              ? 'No se encontraron trabajos con los filtros seleccionados.'
              : 'Registrá un trabajo realizado o finalizá un turno para comenzar el historial.'
          }
          actionLabel={!hasFilters ? 'Registrar primer trabajo' : undefined}
          onAction={!hasFilters ? onNewTrabajo : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-4 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Vehículo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Patente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Servicio</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Kilometraje</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Importe</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono-tabular whitespace-nowrap text-slate-900">
                      {formatDateES(w.fecha)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectCliente(w.cliente_id)}
                        className="font-medium text-blue-700 hover:underline text-left"
                      >
                        {w.cliente_nombre}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {w.vehiculo_marca} {w.vehiculo_modelo}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectVehiculo(w.vehiculo_id)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <PatenteBadge patente={w.vehiculo_patente || ''} />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-800 whitespace-nowrap font-medium">
                      {w.servicio_nombre}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                      {formatKm(w.kilometraje)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      <div className="truncate" title={w.descripcion}>
                        {w.descripcion}
                      </div>
                      {w.observaciones && (
                        <div className="text-xs text-slate-400 truncate" title={w.observaciones}>
                          {w.observaciones}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(w.importe)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onEditTrabajo(w)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTrabajo(w)}
                          aria-label="Eliminar registro"
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
