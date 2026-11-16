import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import type { EstadoTurno } from '../types/workshop';

export function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateES(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatKm(km: number): string {
  return `${new Intl.NumberFormat('es-AR').format(km || 0)} km`;
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AvatarInitials({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm'
      ? 'w-7 h-7 text-[11px] rounded-md'
      : size === 'lg'
        ? 'w-11 h-11 text-sm rounded-lg'
        : 'w-8 h-8 text-xs rounded-lg';

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex items-center justify-center bg-slate-900 text-slate-50 font-semibold tracking-tight shrink-0`}
    >
      {getInitials(name)}
    </span>
  );
}

export function PatenteBadge({ patente }: { patente: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border border-slate-300/90 font-mono-tabular text-xs font-semibold tracking-wider text-slate-900 whitespace-nowrap shrink-0">
      {patente}
    </span>
  );
}

const ESTADO_CLASSES: Record<EstadoTurno, string> = {
  Pendiente: 'bg-amber-50/90 text-amber-800 border-amber-200',
  Confirmado: 'bg-sky-50/90 text-sky-800 border-sky-200',
  'En taller': 'bg-indigo-50/90 text-indigo-800 border-indigo-200',
  'En reparación': 'bg-blue-50 text-blue-900 border-blue-300',
  Finalizado: 'bg-emerald-50/90 text-emerald-800 border-emerald-200',
  Cancelado: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${
        ESTADO_CLASSES[estado] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {estado}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-xl',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white border border-slate-200/90 rounded-xl shadow-xl flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200/80">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-display">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidthClass="max-w-md">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed pt-0.5">{description}</p>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl py-12 px-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/80 mb-3.5">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 font-display">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm ${
            t.type === 'success'
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-white border-red-200 text-slate-900'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{t.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className={
              t.type === 'success'
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-400 hover:text-slate-600'
            }
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
