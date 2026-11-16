import React, { useEffect, useState } from 'react';
import { Check, Save, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import type { ConfiguracionTaller } from '../types/workshop';

const DIAS_SEMANA = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

interface ConfiguracionViewProps {
  config: ConfiguracionTaller | null;
  onUpdated: (config: ConfiguracionTaller) => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export function ConfiguracionView({
  config,
  onUpdated,
  onNotify,
}: ConfiguracionViewProps) {
  const [nombre_taller, setNombreTaller] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [hora_apertura, setHoraApertura] = useState('08:00');
  const [hora_cierre, setHoraCierre] = useState('18:30');
  const [dias_laborables, setDiasLaborables] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [duracion_predeterminada, setDuracionPredeterminada] = useState('60');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!config) return;
    setNombreTaller(config.nombre_taller);
    setTelefono(config.telefono);
    setDireccion(config.direccion);
    setHoraApertura(config.hora_apertura);
    setHoraCierre(config.hora_cierre);
    setDiasLaborables(config.dias_laborables);
    setDuracionPredeterminada(String(config.duracion_predeterminada));
  }, [config]);

  const toggleDia = (dayId: number) => {
    setDiasLaborables((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.configuracion.update({
        nombre_taller,
        telefono,
        direccion,
        hora_apertura,
        hora_cierre,
        dias_laborables,
        duracion_predeterminada: Number(duracion_predeterminada),
      });
      onUpdated(updated);
      onNotify('success', 'Configuración del taller guardada correctamente.');
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'No se pudo guardar la configuración.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onNotify('error', 'La confirmación de la nueva contraseña no coincide.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('success', 'Contraseña administrativa actualizada.');
    } catch (err) {
      onNotify(
        'error',
        err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 text-sm bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors';

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight font-display">
          Configuración
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Datos generales, horarios de atención y disponibilidad del taller
        </p>
      </div>

      {/* Datos del taller - 2-column modern layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-slate-900 font-display">
            Parámetros operativos
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Estos horarios y días laborables controlan automáticamente la validación de disponibilidad al agendar o reprogramar turnos.
          </p>
        </div>

        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nombre del taller *
              </label>
              <input
                type="text"
                value={nombre_taller}
                onChange={(e) => setNombreTaller(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={`${inputClass} font-mono-tabular`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Horario de apertura *
              </label>
              <input
                type="time"
                value={hora_apertura}
                onChange={(e) => setHoraApertura(e.target.value)}
                className={`${inputClass} font-mono-tabular`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Horario de cierre *
              </label>
              <input
                type="time"
                value={hora_cierre}
                onChange={(e) => setHoraCierre(e.target.value)}
                className={`${inputClass} font-mono-tabular`}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Duración predeterminada de turnos (minutos) *
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={duracion_predeterminada}
                onChange={(e) => setDuracionPredeterminada(e.target.value)}
                className={`${inputClass} font-mono-tabular max-w-xs`}
                required
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              Días laborables
            </span>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => {
                const checked = dias_laborables.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDia(d.id)}
                      className="sr-only"
                    />
                    {checked && <Check className="w-3 h-3" />}
                    {d.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>

      {/* Seguridad administrativa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-6 border-t border-slate-200/80">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-slate-900 font-display flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            Acceso administrativo
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Actualizá la contraseña del administrador del taller para mantener protegido el ingreso al sistema.
          </p>
        </div>

        <form
          onSubmit={handleSavePassword}
          className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Contraseña actual *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nueva contraseña *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Repetir contraseña *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
            >
              {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
