import React, { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { api } from '../lib/api';
import type { AdminUser } from '../types/workshop';

interface LoginViewProps {
  onSuccess: (user: AdminUser) => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('admin@taller.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresá correo electrónico y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const user = await api.auth.login(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF1F5] flex flex-col lg:flex-row">
      {/* Left Architectural Showcase Panel */}
      <div className="relative lg:w-[46%] min-h-[240px] lg:min-h-screen bg-[#0B1120] overflow-hidden flex flex-col justify-between p-7 lg:p-12">
        {!imgError && (
          <img
            src="/src/assets/images/workshop_login_hero_1794867601878.jpg"
            alt="Bahía de servicio automotriz"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/40"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm inline-flex items-center">
            <img
              src="/assets/aistudio/6ba1a408-87ba-416a-8a71-7188e0083c17_7d5209b2.png"
              alt="Mecánica Rocamora"
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-md mt-12 lg:mt-0 space-y-4">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight leading-snug text-balance font-display">
            Mecánica Rocamora · Gestión integral del taller.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Centralizá la agenda sin superposiciones horarias, consultá la ficha técnica por patente y registrá cada trabajo realizado.
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-8 shadow-sm">
          <div className="pb-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                Iniciar sesión
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Acceso administrativo · Mecánica Rocamora
              </p>
            </div>
            <img
              src="/assets/aistudio/6ba1a408-87ba-416a-8a71-7188e0083c17_7d5209b2.png"
              alt="Logo Mecánica Rocamora"
              className="h-11 w-auto object-contain shrink-0"
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Correo administrativo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="admin@taller.local"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Ingresá tu contraseña"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Verificando...' : 'Ingresar al sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Acceso inicial:{' '}
              <span className="font-mono-tabular text-slate-700">admin@taller.local</span> ·{' '}
              <span className="font-mono-tabular text-slate-700">taller2026</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@taller.local');
                setPassword('taller2026');
              }}
              className="text-blue-700 hover:underline font-medium whitespace-nowrap shrink-0"
            >
              Completar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
