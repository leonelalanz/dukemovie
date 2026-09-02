import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  activa: { label: 'Activa', color: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  proxima_vencer: { label: 'Próxima a vencer', color: 'bg-[#D9A928]/15 text-[#D9A928] border border-[#D9A928]/30' },
  vencida: { label: 'Vencida', color: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  pendiente: { label: 'Pendiente', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  suspendida: { label: 'Suspendida', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  verificado: { label: 'Verificado', color: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  rechazado: { label: 'Rechazado', color: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  reembolsado: { label: 'Reembolsado', color: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
  abierto: { label: 'Abierto', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  en_revision: { label: 'En revisión', color: 'bg-[#D9A928]/15 text-[#D9A928] border border-[#D9A928]/30' },
  esperando_cliente: { label: 'Esperando cliente', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  resuelto: { label: 'Resuelto', color: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  cerrado: { label: 'Cerrado', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  activo: { label: 'Activo', color: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  inactivo: { label: 'Inactivo', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  disponible: { label: 'Disponible', color: 'bg-green-500/15 text-green-400 border border-green-500/30' },
  ocupado: { label: 'Ocupado', color: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  bloqueado: { label: 'Bloqueado', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  baja: { label: 'Baja', color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  media: { label: 'Media', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  alta: { label: 'Alta', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  critica: { label: 'Crítica', color: 'bg-red-500/15 text-red-400 border border-red-500/30' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, color: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' };
  return (
    <span className={cn('badge', config.color, className)}>
      {config.label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#0e2a4d] flex items-center justify-center mb-4 text-white/30">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-white/50 text-sm mb-4 max-w-sm">{message}</p>
      {action}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn('w-full card max-h-[90vh] overflow-y-auto', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#0e2a4d] sticky top-0 bg-[#0a1f3a] z-10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-white/70 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
