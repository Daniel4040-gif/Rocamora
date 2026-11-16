import React from 'react';
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  Plus,
  Wrench,
} from 'lucide-react';
import {
  ESTADOS_TURNO,
  type ConfiguracionTaller,
  type EstadoTurno,
  type Trabajo,
  type Turno,
} from '../types/workshop';
import {
  EmptyState,
  EstadoBadge,
  formatDateES,
  getTodayStr,
  PatenteBadge,
} from './ui';

interface DashboardViewProps {
  turnos: Turno[];
  trabajos: Trabajo[];
  config: ConfiguracionTaller | null;
  onNewTurno: () => void;
  onEditTurno: (turno: Turno) => void;
  onChangeEstado: (turno: Turno, estado: EstadoTurno) => Promise<void>;
  onNavigateTurnos: () => void;
}

export function DashboardView({
  turnos,
  trabajos,
  config,
  onNewTurno,
  onEditTurno,
  onChangeEstado,
  onNavigateTurnos,
}: DashboardViewProps) {
  const today = getTodayStr();

  const agendaHoy = turnos
    .filter((t) => t.fecha === today && t.estado !== 'Cancelado')
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const turnosHoy = agendaHoy.length;
  const turnosPendientes = turnos.filter((t) => t.estado === 'Pendiente').length;
  const vehiculosEnTaller = turnos.filter(
    (t) => t.estado === 'En taller' || t.estado === 'En reparación'
  ).length;
  const trabajosFinalizados = trabajos.length;

  const proximosTurnos = turnos
    .filter((t) => t.fecha >= today && t.estado !== 'Cancelado' && t.estado !== 'Finalizado')
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Panel operativo del taller
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {config?.nombre_taller || 'Mecánica Rocamora'} · Jornada del {formatDateES(today)}
            {config ? ` · Atención ${config.hora_apertura} a ${config.hora_cierre}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewTurno}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nuevo turno
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Turnos de hoy</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-900 font-mono-tabular font-display">
            {turnosHoy}
          </div>
          <div className="mt-1 text-xs text-slate-500">Programados para la jornada</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Turnos pendientes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-900 font-mono-tabular font-display">
            {turnosPendientes}
          </div>
          <div className="mt-1 text-xs text-slate-500">Requieren confirmación</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Vehículos en el taller</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-900 font-mono-tabular font-display">
            {vehiculosEnTaller}
          </div>
          <div className="mt-1 text-xs text-slate-500">En taller o en reparación</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Trabajos finalizados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-900 font-mono-tabular font-display">
            {trabajosFinalizados}
          </div>
          <div className="mt-1 text-xs text-slate-500">Registrados en el historial</div>
        </div>
      </div>

      {/* Cronograma rápido de hoy */}
      {agendaHoy.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-display">
                Actividad programada para hoy
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Secuencia horaria de ingresos y reparaciones en curso
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateTurnos}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Abrir agenda
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {agendaHoy.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEditTurno(t)}
                className="text-left p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all duration-150 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold font-mono-tabular text-slate-900">
                    {t.hora}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({t.duracion_minutos}m)
                    </span>
                  </span>
                  <EstadoBadge estado={t.estado} />
                </div>
                <div className="flex items-center gap-2">
                  <PatenteBadge patente={t.vehiculo_patente || ''} />
                  <span className="text-xs text-slate-600 truncate">
                    {t.vehiculo_marca} {t.vehiculo_modelo}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-800 truncate">
                  {t.cliente_nombre} · <span className="font-normal text-slate-600">{t.servicio_nombre}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Próximos turnos */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-display">Próximos turnos</h2>
              <p className="text-xs text-slate-500">
                Turnos activos ordenados cronológicamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateTurnos}
            className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
          >
            Ver agenda completa
          </button>
        </div>

        {proximosTurnos.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Calendar className="w-5 h-5" />}
              title="No hay próximos turnos programados"
              description="Agendá un nuevo turno para organizar la entrada de vehículos al taller."
              actionLabel="Crear nuevo turno"
              onAction={onNewTurno}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Hora</th>
                  <th className="py-3 px-4 whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Vehículo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Patente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Servicio</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {proximosTurnos.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono-tabular font-semibold text-slate-900">{t.hora}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">
                        {t.fecha === today ? 'Hoy' : formatDateES(t.fecha)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {t.cliente_nombre}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {t.vehiculo_marca} {t.vehiculo_modelo}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PatenteBadge patente={t.vehiculo_patente || ''} />
                    </td>
                    <td className="py-3 px-4 text-slate-700">{t.servicio_nombre}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <EstadoBadge estado={t.estado} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <select
                          aria-label={`Cambiar estado del turno de ${t.cliente_nombre}`}
                          value={t.estado}
                          onChange={(e) => onChangeEstado(t, e.target.value as EstadoTurno)}
                          className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:border-blue-600"
                        >
                          {ESTADOS_TURNO.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onEditTurno(t)}
                          className="text-xs font-medium text-blue-700 hover:underline px-1.5 py-1"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
