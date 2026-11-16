import React, { useMemo, useState } from 'react';
import { Clock, Plus, Search, Trash2, Wrench } from 'lucide-react';
import type { Servicio } from '../types/workshop';
import { EmptyState, formatCurrency } from './ui';

interface ServiciosViewProps {
  servicios: Servicio[];
  onNewServicio: () => void;
  onEditServicio: (servicio: Servicio) => void;
  onToggleActivo: (servicio: Servicio) => Promise<void>;
  onDeleteServicio: (servicio: Servicio) => void;
}

export function ServiciosView({
  servicios,
  onNewServicio,
  onEditServicio,
  onToggleActivo,
  onDeleteServicio,
}: ServiciosViewProps) {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return servicios.filter((s) => {
      if (filtro === 'activos' && !s.activo) return false;
      if (filtro === 'inactivos' && s.activo) return false;
      if (!q) return true;
      return (
        s.nombre.toLowerCase().includes(q) || s.descripcion.toLowerCase().includes(q)
      );
    });
  }, [servicios, search, filtro]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Catálogo de servicios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Servicios disponibles para seleccionar en turnos y trabajos
          </p>
        </div>
        <button
          type="button"
          onClick={onNewServicio}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nuevo servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/70 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              ['todos', 'Todos'],
              ['activos', 'Activos'],
              ['inactivos', 'Inactivos'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                filtro === key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-5 h-5" />}
          title="No hay servicios para mostrar"
          description="Agregá un nuevo servicio o ajustá el filtro aplicado."
          actionLabel="Agregar servicio"
          onAction={onNewServicio}
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Servicio</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Duración est.</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Precio orientativo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {s.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      {s.descripcion || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {s.duracion_minutos} min
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(s.precio_orientativo)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
                          s.activo
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {s.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleActivo(s)}
                          className="text-xs font-medium text-slate-700 hover:underline"
                        >
                          {s.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditServicio(s)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteServicio(s)}
                          aria-label="Eliminar servicio"
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
