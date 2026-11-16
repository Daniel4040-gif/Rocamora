import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  Plus,
  Search,
  Trash2,
  XOctagon,
} from 'lucide-react';
import {
  ESTADOS_TURNO,
  type ConfiguracionTaller,
  type EstadoTurno,
  type Turno,
} from '../types/workshop';
import {
  addDays,
  EmptyState,
  EstadoBadge,
  formatDateES,
  getTodayStr,
  PatenteBadge,
} from './ui';

type VistaAgenda = 'diaria' | 'semanal' | 'mensual' | 'listado';

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function addMinutesToTime(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(
    2,
    '0'
  )}`;
}

interface TurnosViewProps {
  turnos: Turno[];
  config: ConfiguracionTaller | null;
  onNewTurno: (fecha?: string, hora?: string) => void;
  onEditTurno: (turno: Turno) => void;
  onChangeEstado: (turno: Turno, estado: EstadoTurno) => Promise<void>;
  onDeleteTurno: (turno: Turno) => void;
  onRegistrarTrabajo: (turno: Turno) => void;
}

export function TurnosView({
  turnos,
  config,
  onNewTurno,
  onEditTurno,
  onChangeEstado,
  onDeleteTurno,
  onRegistrarTrabajo,
}: TurnosViewProps) {
  const [vista, setVista] = useState<VistaAgenda>('diaria');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  const filteredTurnos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return turnos.filter((t) => {
      if (estadoFilter !== 'todos' && t.estado !== estadoFilter) return false;
      if (!q) return true;
      return (
        (t.cliente_nombre || '').toLowerCase().includes(q) ||
        (t.vehiculo_patente || '').toLowerCase().includes(q) ||
        (t.vehiculo_marca || '').toLowerCase().includes(q) ||
        (t.vehiculo_modelo || '').toLowerCase().includes(q) ||
        (t.servicio_nombre || '').toLowerCase().includes(q)
      );
    });
  }, [turnos, search, estadoFilter]);

  const handleNavigateDate = (dir: -1 | 1) => {
    if (vista === 'diaria') {
      setSelectedDate((d) => addDays(d, dir));
    } else if (vista === 'semanal') {
      setSelectedDate((d) => addDays(d, dir * 7));
    } else if (vista === 'mensual') {
      const d = new Date(`${selectedDate}T12:00:00`);
      d.setMonth(d.getMonth() + dir);
      setSelectedDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`
      );
    }
  };

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const monthCalendar = useMemo(() => {
    const ref = new Date(`${selectedDate}T12:00:00`);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstOfMonth = new Date(year, month, 1, 12, 0, 0);
    const startWeekday = firstOfMonth.getDay();
    const offsetMonday = startWeekday === 0 ? 6 : startWeekday - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < offsetMonday; i++) cells.push({ dateStr: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d });
    }
    return { year, month, cells };
  }, [selectedDate]);

  const dailyTurnos = useMemo(
    () =>
      filteredTurnos
        .filter((t) => t.fecha === selectedDate)
        .sort((a, b) => a.hora.localeCompare(b.hora)),
    [filteredTurnos, selectedDate]
  );

  const selectedDayOfWeek = new Date(`${selectedDate}T12:00:00`).getDay();
  const isWorkingDay = !config || config.dias_laborables.includes(selectedDayOfWeek);

  const headerDateLabel = useMemo(() => {
    if (vista === 'diaria') {
      return `${DIAS_SEMANA_CORTO[selectedDayOfWeek]} ${formatDateES(selectedDate)}`;
    }
    if (vista === 'semanal') {
      return `Semana del ${formatDateES(weekDays[0])} al ${formatDateES(weekDays[6])}`;
    }
    if (vista === 'mensual') {
      return `${MESES[monthCalendar.month]} ${monthCalendar.year}`;
    }
    return 'Todos los turnos (actuales y anteriores)';
  }, [vista, selectedDate, selectedDayOfWeek, weekDays, monthCalendar]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
            Gestión de turnos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Agenda con control de disponibilidad y superposiciones horarias
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNewTurno(selectedDate)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nuevo turno
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              ['diaria', 'Diaria'],
              ['semanal', 'Semanal'],
              ['mensual', 'Mensual'],
              ['listado', 'Listado / Historial'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setVista(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                vista === key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {vista !== 'listado' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => handleNavigateDate(-1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-r border-slate-200"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleNavigateDate(1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l border-slate-200"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg bg-white text-slate-800"
            />
            <span className="text-sm font-semibold text-slate-800 ml-1 font-display">
              {headerDateLabel}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o patente..."
              className="w-full sm:w-52 pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50/70 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS_TURNO.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VISTA DIARIA (Timeline arquitectónico) */}
      {vista === 'diaria' && (
        <div className="space-y-3">
          {!isWorkingDay && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              Este día figura como no laborable en la configuración del taller.
            </div>
          )}
          {dailyTurnos.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-5 h-5" />}
              title={`Sin turnos para el ${formatDateES(selectedDate)}`}
              description="No hay turnos agendados para esta fecha con los filtros actuales."
              actionLabel="Agendar turno en esta fecha"
              onAction={() => onNewTurno(selectedDate)}
            />
          ) : (
            <div className="space-y-3">
              {dailyTurnos.map((t) => {
                const horaFin = addMinutesToTime(t.hora, t.duracion_minutos);
                return (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-all duration-150"
                  >
                    <div className="flex items-start gap-4">
                      {/* Time Block */}
                      <div className="px-3 py-2 rounded-lg bg-slate-900 text-white text-center min-w-[88px] shrink-0">
                        <div className="text-sm font-semibold font-mono-tabular">{t.hora}</div>
                        <div className="text-[11px] text-slate-300 font-mono-tabular">
                          a {horaFin}
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900">
                            {t.cliente_nombre}
                          </span>
                          <PatenteBadge patente={t.vehiculo_patente || ''} />
                          <span className="text-xs text-slate-600">
                            {t.vehiculo_marca} {t.vehiculo_modelo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="font-medium text-slate-800">{t.servicio_nombre}</span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono-tabular text-slate-500">
                            <Clock className="w-3 h-3" />
                            {t.duracion_minutos} min
                          </span>
                          {t.observaciones && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-slate-500">{t.observaciones}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <EstadoBadge estado={t.estado} />
                      <select
                        aria-label="Cambiar estado"
                        value={t.estado}
                        onChange={(e) => onChangeEstado(t, e.target.value as EstadoTurno)}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                      >
                        {ESTADOS_TURNO.map((est) => (
                          <option key={est} value={est}>
                            {est}
                          </option>
                        ))}
                      </select>
                      {t.estado !== 'Cancelado' && (
                        <button
                          type="button"
                          onClick={() => onRegistrarTrabajo(t)}
                          title="Registrar trabajo realizado"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Registrar trabajo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditTurno(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      {t.estado !== 'Cancelado' && t.estado !== 'Finalizado' && (
                        <button
                          type="button"
                          onClick={() => onChangeEstado(t, 'Cancelado')}
                          title="Cancelar turno"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap"
                        >
                          <XOctagon className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteTurno(t)}
                        aria-label="Eliminar turno"
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA SEMANAL */}
      {vista === 'semanal' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayStr) => {
            const dObj = new Date(`${dayStr}T12:00:00`);
            const dow = dObj.getDay();
            const laborable = !config || config.dias_laborables.includes(dow);
            const dayItems = filteredTurnos
              .filter((t) => t.fecha === dayStr)
              .sort((a, b) => a.hora.localeCompare(b.hora));
            const isToday = dayStr === getTodayStr();

            return (
              <div
                key={dayStr}
                className={`border rounded-xl flex flex-col min-h-[260px] overflow-hidden ${
                  isToday
                    ? 'bg-white border-blue-400 ring-1 ring-blue-500/20'
                    : laborable
                      ? 'bg-white border-slate-200/90'
                      : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div
                  className={`px-3 py-2.5 border-b flex items-center justify-between ${
                    isToday ? 'bg-blue-50/70 border-blue-200' : 'border-slate-200/80 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900 font-display">
                      {DIAS_SEMANA_CORTO[dow]}
                    </div>
                    <div className="text-xs font-mono-tabular text-slate-500">
                      {formatDateES(dayStr).slice(0, 5)}
                    </div>
                  </div>
                  {laborable && (
                    <button
                      type="button"
                      onClick={() => onNewTurno(dayStr)}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                      title="Agregar turno este día"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {!laborable && dayItems.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-8">Cerrado</div>
                  )}
                  {dayItems.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onEditTurno(t)}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50/70 hover:bg-white transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono-tabular font-semibold text-slate-900">
                          {t.hora}
                        </span>
                        <EstadoBadge estado={t.estado} />
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {t.cliente_nombre}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono-tabular truncate">
                        {t.vehiculo_patente} · {t.servicio_nombre}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA MENSUAL */}
      {vista === 'mensual' && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="py-2.5 px-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {monthCalendar.cells.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={`empty-${idx}`} className="min-h-[104px] bg-slate-50/50" />;
              }
              const dayItems = filteredTurnos
                .filter((t) => t.fecha === cell.dateStr)
                .sort((a, b) => a.hora.localeCompare(b.hora));
              const isToday = cell.dateStr === getTodayStr();
              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[112px] p-2 flex flex-col ${
                    isToday ? 'bg-blue-50/40' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(cell.dateStr!);
                        setVista('diaria');
                      }}
                      className={`text-xs font-mono-tabular w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        isToday
                          ? 'bg-blue-700 text-white font-semibold'
                          : 'font-medium text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cell.dayNum}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNewTurno(cell.dateStr!)}
                      className="text-slate-400 hover:text-blue-700 p-0.5 rounded"
                      title="Nuevo turno"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayItems.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onEditTurno(t)}
                        className="w-full text-left px-1.5 py-1 rounded bg-slate-100/90 hover:bg-blue-50 border border-slate-200/80 text-[11px] text-slate-800 truncate block transition-colors"
                      >
                        <span className="font-mono-tabular font-semibold">{t.hora}</span>{' '}
                        {t.vehiculo_patente}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(cell.dateStr!);
                          setVista('diaria');
                        }}
                        className="text-[11px] text-blue-700 font-medium px-1 hover:underline"
                      >
                        +{dayItems.length - 3} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA LISTADO / HISTORIAL DE TURNOS */}
      {vista === 'listado' && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden">
          {filteredTurnos.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Calendar className="w-5 h-5" />}
                title="No se encontraron turnos"
                description="Probá ajustando los filtros de búsqueda o agendá un nuevo turno."
                actionLabel="Nuevo turno"
                onAction={() => onNewTurno()}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4 whitespace-nowrap">Fecha / Hora</th>
                    <th className="py-3 px-4 whitespace-nowrap">Cliente</th>
                    <th className="py-3 px-4 whitespace-nowrap">Vehículo</th>
                    <th className="py-3 px-4 whitespace-nowrap">Patente</th>
                    <th className="py-3 px-4 whitespace-nowrap">Servicio</th>
                    <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {[...filteredTurnos]
                    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 whitespace-nowrap font-mono-tabular">
                          <span className="font-semibold text-slate-900">
                            {formatDateES(t.fecha)}
                          </span>{' '}
                          <span className="text-slate-500">{t.hora}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{t.cliente_nombre}</td>
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
                          <div className="inline-flex items-center gap-3">
                            {t.estado !== 'Cancelado' && (
                              <button
                                type="button"
                                onClick={() => onRegistrarTrabajo(t)}
                                className="text-xs font-medium text-emerald-700 hover:underline"
                              >
                                Registrar trabajo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEditTurno(t)}
                              className="text-xs font-medium text-blue-700 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTurno(t)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Eliminar
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
      )}
    </div>
  );
}
