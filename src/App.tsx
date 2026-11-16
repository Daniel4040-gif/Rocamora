import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Car,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { api } from './lib/api';
import type {
  AdminUser,
  Cliente,
  ConfiguracionTaller,
  EstadoTurno,
  SeccionNavegacion,
  Servicio,
  Trabajo,
  Turno,
  Vehiculo,
} from './types/workshop';
import { ClientesView } from './components/ClientesView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import {
  ClienteModal,
  ServicioModal,
  TrabajoModal,
  TurnoModal,
  VehiculoModal,
} from './components/Modals';
import { ServiciosView } from './components/ServiciosView';
import { TrabajosView } from './components/TrabajosView';
import { TurnosView } from './components/TurnosView';
import { ConfirmDialog, ToastContainer, type ToastMessage } from './components/ui';
import { VehiculosView } from './components/VehiculosView';

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{
    id: SeccionNavegacion;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}> = [
  {
    title: 'Operación diaria',
    items: [
      { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
      { id: 'turnos', label: 'Turnos', icon: CalendarDays },
      { id: 'historial', label: 'Historial de trabajos', icon: ClipboardList },
    ],
  },
  {
    title: 'Base del taller',
    items: [
      { id: 'clientes', label: 'Clientes', icon: Users },
      { id: 'vehiculos', label: 'Vehículos', icon: Car },
      { id: 'servicios', label: 'Servicios', icon: Wrench },
    ],
  },
  {
    title: 'Sistema',
    items: [{ id: 'configuracion', label: 'Configuración', icon: Settings }],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [seccion, setSeccion] = useState<SeccionNavegacion>('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Domain state
  const [loadingData, setLoadingData] = useState(false);
  const [config, setConfig] = useState<ConfiguracionTaller | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);

  // Detail navigation state
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notify = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Modals state
  const [turnoModal, setTurnoModal] = useState<{
    open: boolean;
    initial?: Turno | null;
    defaultFecha?: string;
    defaultHora?: string;
    defaultClienteId?: string;
    defaultVehiculoId?: string;
  }>({ open: false });

  const [clienteModal, setClienteModal] = useState<{
    open: boolean;
    initial?: Cliente | null;
  }>({ open: false });

  const [vehiculoModal, setVehiculoModal] = useState<{
    open: boolean;
    initial?: Vehiculo | null;
    defaultClienteId?: string;
  }>({ open: false });

  const [servicioModal, setServicioModal] = useState<{
    open: boolean;
    initial?: Servicio | null;
  }>({ open: false });

  const [trabajoModal, setTrabajoModal] = useState<{
    open: boolean;
    initial?: Trabajo | null;
    linkedTurno?: Turno | null;
    defaultClienteId?: string;
    defaultVehiculoId?: string;
  }>({ open: false });

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    title: string;
    description: string;
    loading: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [cfg, cli, veh, svc, tur, trab] = await Promise.all([
        api.configuracion.get(),
        api.clientes.list(),
        api.vehiculos.list(),
        api.servicios.list(),
        api.turnos.list(),
        api.trabajos.list(),
      ]);
      setConfig(cfg);
      setClientes(cli);
      setVehiculos(veh);
      setServicios(svc);
      setTurnos(tur);
      setTrabajos(trab);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'No se pudieron cargar los datos del taller.'
      );
    } finally {
      setLoadingData(false);
    }
  }, [notify]);

  useEffect(() => {
    api.auth
      .me()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleNavigate = (target: SeccionNavegacion) => {
    setSeccion(target);
    if (target !== 'clientes') setSelectedClienteId(null);
    if (target !== 'vehiculos') setSelectedVehiculoId(null);
    setMobileMenuOpen(false);
  };

  const handleOpenClienteFicha = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setSeccion('clientes');
  };

  const handleOpenVehiculoFicha = (vehiculoId: string) => {
    setSelectedVehiculoId(vehiculoId);
    setSeccion('vehiculos');
  };

  const handleChangeEstadoTurno = async (turno: Turno, estado: EstadoTurno) => {
    try {
      await api.turnos.update(turno.id, { estado });
      notify('success', `Estado del turno actualizado a "${estado}".`);
      await loadAllData();
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'No se pudo cambiar el estado del turno.'
      );
    }
  };

  const handleToggleServicioActivo = async (servicio: Servicio) => {
    try {
      await api.servicios.update(servicio.id, { activo: !servicio.activo });
      notify(
        'success',
        servicio.activo ? 'Servicio desactivado.' : 'Servicio activado.'
      );
      await loadAllData();
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'No se pudo actualizar el servicio.'
      );
    }
  };

  const askDelete = (title: string, description: string, action: () => Promise<void>) => {
    setConfirmDelete({
      open: true,
      title,
      description,
      loading: false,
      onConfirm: async () => {
        setConfirmDelete((prev) => (prev ? { ...prev, loading: true } : null));
        try {
          await action();
          setConfirmDelete(null);
          await loadAllData();
        } catch (err) {
          setConfirmDelete(null);
          notify(
            'error',
            err instanceof Error ? err.message : 'No se pudo eliminar el registro.'
          );
        }
      },
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#EEF1F5] flex items-center justify-center text-sm text-slate-500">
        Cargando sistema...
      </div>
    );
  }

  if (!user) {
    return <LoginView onSuccess={(u) => setUser(u)} />;
  }

  const currentNavLabel = ALL_NAV_ITEMS.find((n) => n.id === seccion)?.label || 'Inicio';

  return (
    <div className="min-h-screen bg-[#EEF1F5] text-[#0F172A] flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* High-Contrast Architectural Dark Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white rounded-lg px-2 py-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/assets/aistudio/6ba1a408-87ba-416a-8a71-7188e0083c17_7d5209b2.png"
                alt="Mecánica Rocamora"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate font-display tracking-tight">
                {config?.nombre_taller || 'Mecánica Rocamora'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">Panel de gestión</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto" aria-label="Menú principal">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-medium text-slate-500">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = seccion === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="px-2.5 py-1.5 text-xs text-slate-400 truncate">{user.email}</div>
          <button
            type="button"
            onClick={async () => {
              await api.auth.logout();
              setUser(null);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400">Gestión</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="font-semibold text-slate-900 truncate font-display">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {config && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {config.hora_apertura} – {config.hora_cierre}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setTurnoModal({ open: true })}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo turno
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loadingData && !config ? (
            <div className="space-y-4">
              <div className="h-8 w-56 bg-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {seccion === 'inicio' && (
                <DashboardView
                  turnos={turnos}
                  trabajos={trabajos}
                  config={config}
                  onNewTurno={() => setTurnoModal({ open: true })}
                  onEditTurno={(t) => setTurnoModal({ open: true, initial: t })}
                  onChangeEstado={handleChangeEstadoTurno}
                  onNavigateTurnos={() => handleNavigate('turnos')}
                />
              )}

              {seccion === 'turnos' && (
                <TurnosView
                  turnos={turnos}
                  config={config}
                  onNewTurno={(fecha, hora) =>
                    setTurnoModal({ open: true, defaultFecha: fecha, defaultHora: hora })
                  }
                  onEditTurno={(t) => setTurnoModal({ open: true, initial: t })}
                  onChangeEstado={handleChangeEstadoTurno}
                  onDeleteTurno={(t) =>
                    askDelete(
                      'Eliminar turno',
                      `¿Estás seguro de eliminar el turno del ${t.fecha} a las ${t.hora} (${t.vehiculo_patente})?`,
                      async () => {
                        await api.turnos.delete(t.id);
                        notify('success', 'Turno eliminado.');
                      }
                    )
                  }
                  onRegistrarTrabajo={(t) =>
                    setTrabajoModal({ open: true, linkedTurno: t })
                  }
                />
              )}

              {seccion === 'clientes' && (
                <ClientesView
                  clientes={clientes}
                  vehiculos={vehiculos}
                  turnos={turnos}
                  trabajos={trabajos}
                  selectedClienteId={selectedClienteId}
                  onSelectCliente={setSelectedClienteId}
                  onNewCliente={() => setClienteModal({ open: true })}
                  onEditCliente={(c) => setClienteModal({ open: true, initial: c })}
                  onDeleteCliente={(c) =>
                    askDelete(
                      'Eliminar cliente',
                      `¿Confirmás eliminar a "${c.nombre_apellido}"? Esta acción no se puede deshacer.`,
                      async () => {
                        await api.clientes.delete(c.id);
                        if (selectedClienteId === c.id) setSelectedClienteId(null);
                        notify('success', 'Cliente eliminado.');
                      }
                    )
                  }
                  onNewVehiculoForCliente={(clienteId) =>
                    setVehiculoModal({ open: true, defaultClienteId: clienteId })
                  }
                  onSelectVehiculo={handleOpenVehiculoFicha}
                  onNewTurnoForCliente={(clienteId) =>
                    setTurnoModal({ open: true, defaultClienteId: clienteId })
                  }
                />
              )}

              {seccion === 'vehiculos' && (
                <VehiculosView
                  vehiculos={vehiculos}
                  clientes={clientes}
                  turnos={turnos}
                  trabajos={trabajos}
                  selectedVehiculoId={selectedVehiculoId}
                  onSelectVehiculo={setSelectedVehiculoId}
                  onSelectCliente={handleOpenClienteFicha}
                  onNewVehiculo={() => setVehiculoModal({ open: true })}
                  onEditVehiculo={(v) => setVehiculoModal({ open: true, initial: v })}
                  onDeleteVehiculo={(v) =>
                    askDelete(
                      'Eliminar vehículo',
                      `¿Confirmás eliminar el vehículo patente ${v.patente} (${v.marca} ${v.modelo})?`,
                      async () => {
                        await api.vehiculos.delete(v.id);
                        if (selectedVehiculoId === v.id) setSelectedVehiculoId(null);
                        notify('success', 'Vehículo eliminado.');
                      }
                    )
                  }
                  onNewTurnoForVehiculo={(v) =>
                    setTurnoModal({
                      open: true,
                      defaultClienteId: v.cliente_id,
                      defaultVehiculoId: v.id,
                    })
                  }
                  onNewTrabajoForVehiculo={(v) =>
                    setTrabajoModal({
                      open: true,
                      defaultClienteId: v.cliente_id,
                      defaultVehiculoId: v.id,
                    })
                  }
                />
              )}

              {seccion === 'servicios' && (
                <ServiciosView
                  servicios={servicios}
                  onNewServicio={() => setServicioModal({ open: true })}
                  onEditServicio={(s) => setServicioModal({ open: true, initial: s })}
                  onToggleActivo={handleToggleServicioActivo}
                  onDeleteServicio={(s) =>
                    askDelete(
                      'Eliminar servicio',
                      `¿Confirmás eliminar el servicio "${s.nombre}"?`,
                      async () => {
                        await api.servicios.delete(s.id);
                        notify('success', 'Servicio eliminado.');
                      }
                    )
                  }
                />
              )}

              {seccion === 'historial' && (
                <TrabajosView
                  trabajos={trabajos}
                  clientes={clientes}
                  servicios={servicios}
                  onNewTrabajo={() => setTrabajoModal({ open: true })}
                  onEditTrabajo={(w) => setTrabajoModal({ open: true, initial: w })}
                  onDeleteTrabajo={(w) =>
                    askDelete(
                      'Eliminar registro de trabajo',
                      `¿Confirmás eliminar el trabajo del ${w.fecha} (${w.vehiculo_patente})?`,
                      async () => {
                        await api.trabajos.delete(w.id);
                        notify('success', 'Registro de trabajo eliminado.');
                      }
                    )
                  }
                  onSelectCliente={handleOpenClienteFicha}
                  onSelectVehiculo={handleOpenVehiculoFicha}
                />
              )}

              {seccion === 'configuracion' && (
                <ConfiguracionView
                  config={config}
                  onUpdated={(updated) => setConfig(updated)}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Domain Modals */}
      <TurnoModal
        open={turnoModal.open}
        initial={turnoModal.initial}
        defaultFecha={turnoModal.defaultFecha}
        defaultHora={turnoModal.defaultHora}
        defaultClienteId={turnoModal.defaultClienteId}
        defaultVehiculoId={turnoModal.defaultVehiculoId}
        clientes={clientes}
        vehiculos={vehiculos}
        servicios={servicios}
        config={config}
        onClose={() => setTurnoModal({ open: false })}
        onSaved={loadAllData}
        onQuickCreated={loadAllData}
        onNotify={notify}
      />

      <ClienteModal
        open={clienteModal.open}
        initial={clienteModal.initial}
        onClose={() => setClienteModal({ open: false })}
        onSaved={loadAllData}
        onNotify={notify}
      />

      <VehiculoModal
        open={vehiculoModal.open}
        initial={vehiculoModal.initial}
        defaultClienteId={vehiculoModal.defaultClienteId}
        clientes={clientes}
        onClose={() => setVehiculoModal({ open: false })}
        onSaved={loadAllData}
        onNotify={notify}
      />

      <ServicioModal
        open={servicioModal.open}
        initial={servicioModal.initial}
        onClose={() => setServicioModal({ open: false })}
        onSaved={loadAllData}
        onNotify={notify}
      />

      <TrabajoModal
        open={trabajoModal.open}
        initial={trabajoModal.initial}
        linkedTurno={trabajoModal.linkedTurno}
        defaultClienteId={trabajoModal.defaultClienteId}
        defaultVehiculoId={trabajoModal.defaultVehiculoId}
        clientes={clientes}
        vehiculos={vehiculos}
        servicios={servicios}
        turnos={turnos}
        onClose={() => setTrabajoModal({ open: false })}
        onSaved={loadAllData}
        onNotify={notify}
      />

      {confirmDelete && (
        <ConfirmDialog
          open={confirmDelete.open}
          title={confirmDelete.title}
          description={confirmDelete.description}
          loading={confirmDelete.loading}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDelete.onConfirm}
        />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
