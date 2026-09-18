import type { Currency } from '@/types';

export function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    BS: 'Bs',
    USD: '$',
    EUR: '€',
  };
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbols[currency]} ${formatted}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysBetween(start: string | Date, end: string | Date): number {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function daysRemaining(endDate: string | Date): number {
  return daysBetween(new Date(), endDate);
}

export function subscriptionStatus(status: string, endDate: string | Date): string {
  if (status !== 'activa' && status !== 'proxima_vencer' && status !== 'vencida') return status;
  const days = daysRemaining(endDate);
  if (days < 0) return 'vencida';
  if (days <= 7) return 'proxima_vencer';
  return 'activa';
}

export function addDays(date: string | Date, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function generateOperationNumber(): string {
  const now = new Date();
  const stamp = now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return `DM-${stamp}`;
}

export function generateTicketCode(): string {
  const now = new Date();
  const stamp = now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TK-${stamp}-${rand}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

export function phoneToWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '58' + cleaned.slice(1);
  }
  return cleaned;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const num = phoneToWhatsApp(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
