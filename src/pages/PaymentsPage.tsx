import { useEffect, useState, useMemo } from 'react';
import { CreditCard, Search, Eye, Check, X, Download, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, formatDateTime, downloadCSV } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, Modal } from '@/components/ui';
import type { Payment, PaymentMethod } from '@/types';

export function PaymentsPage() {
  const toast = useToast();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewPay, setViewPay] = useState<Payment | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function load() {
    setLoading(true);
    const [p, m] = await Promise.all([
      supabase.from('payments').select('*, client:clients(*), subscription:subscriptions(*)').order('created_at', { ascending: false }),
      supabase.from('payment_methods').select('*').eq('status', 'activo'),
    ]);
    setPayments((p.data ?? []) as Payment[]);
    setMethods((m.data ?? []) as PaymentMethod[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = payments;
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.client?.first_name ?? '').toLowerCase().includes(q) ||
        (p.client?.last_name ?? '').toLowerCase().includes(q) ||
        (p.reference ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [payments, search, statusFilter]);

  const updateStatus = async (id: string, status: Payment['status']) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from('payments').update({
      status,
      verified_by: status === 'verificado' ? profile?.id : null,
    }).eq('id', id);
    setUpdatingStatus(false);
    if (error) {
      toast('Error al actualizar pago', 'error');
    } else {
      toast('Pago actualizado', 'success');
      if (viewPay?.id === id) {
        setViewPay({ ...viewPay, status });
      }
      load();
    }
  };

  const handleExport = () => {
    const rows: string[][] = [
      ['Cliente', 'Monto', 'Moneda', 'Tasa', 'Equiv. Bs', 'Método', 'Referencia', 'Banco', 'Estado', 'Fecha'],
      ...filtered.map(p => [
        `${p.client?.first_name ?? ''} ${p.client?.last_name ?? ''}`,
        String(p.amount), p.currency, String(p.exchange_rate), String(p.bs_equivalent),
        p.payment_method ?? '', p.reference ?? '', p.bank ?? '', p.status, formatDateTime(p.created_at),
      ]),
    ];
    downloadCSV('pagos_duke_movie.csv', rows);
    toast('Lista exportada', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagos</h1>
          <p className="text-white/50 text-sm mt-1">{filtered.length} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4" /> Registrar pago
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
            placeholder="Buscar por cliente o referencia..."
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="verificado">Verificados</option>
          <option value="rechazado">Rechazados</option>
          <option value="reembolsado">Reembolsados</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-8 h-8" />} title="Sin pagos" message="No hay pagos registrados." />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="card card-hover p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{p.client?.first_name} {p.client?.last_name}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-white/50">{p.payment_method} — {formatDateTime(p.created_at)}</p>
                {p.reference && <p className="text-xs text-white/40">Ref: {p.reference}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(p.amount, p.currency)}</p>
                {p.currency !== 'BS' && <p className="text-xs text-white/40">≈ {formatCurrency(p.bs_equivalent, 'BS')}</p>}
                <div className="flex gap-1 mt-1">
                  <button onClick={() => setViewPay(p)} className="text-xs text-[#00BFFF] hover:text-[#33CCFF]"><Eye className="w-3.5 h-3.5" /></button>
                  {p.status === 'pendiente' && (
                    <>
                      <button onClick={() => updateStatus(p.id, 'verificado')} className="text-xs text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => updateStatus(p.id, 'rechazado')} className="text-xs text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewPay} onClose={() => setViewPay(null)} title="Detalle del pago" size="md">
        {viewPay && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Info label="Cliente" value={`${viewPay.client?.first_name ?? ''} ${viewPay.client?.last_name ?? ''}`} />
              <Info label="Monto" value={formatCurrency(viewPay.amount, viewPay.currency)} />
              <Info label="Equivalente Bs" value={formatCurrency(viewPay.bs_equivalent, 'BS')} />
              <Info label="Tasa de cambio" value={String(viewPay.exchange_rate)} />
              <Info label="Método" value={viewPay.payment_method ?? '—'} />
              <Info label="Referencia" value={viewPay.reference ?? '—'} />
              <Info label="Banco/Plataforma" value={viewPay.bank ?? '—'} />
              <Info label="Estado" value={<StatusBadge status={viewPay.status} />} />
              <Info label="Fecha" value={formatDateTime(viewPay.created_at)} />
              <Info label="Verificado por" value={viewPay.verified_by ?? '—'} />
            </div>
            {viewPay.observations && (
              <div>
                <p className="text-xs text-white/40 mb-1">Observaciones</p>
                <p className="text-sm text-white/70">{viewPay.observations}</p>
              </div>
            )}
            {viewPay.receipt_url && (
              <div>
                <p className="text-xs text-white/40 mb-1">Comprobante</p>
                <img src={viewPay.receipt_url} alt="Comprobante" className="rounded-lg max-h-60" />
              </div>
            )}
            <div className="flex gap-2 pt-2 flex-wrap">
              {viewPay.status === 'pendiente' && (
                <>
                  <button onClick={() => updateStatus(viewPay.id, 'verificado')} disabled={updatingStatus} className="btn-primary inline-flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5" /> Verificar
                  </button>
                  <button onClick={() => updateStatus(viewPay.id, 'rechazado')} disabled={updatingStatus} className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/20">
                    <X className="w-3.5 h-3.5 inline-block mr-1" /> Rechazar
                  </button>
                </>
              )}
              {viewPay.status === 'verificado' && (
                <>
                  <button onClick={() => updateStatus(viewPay.id, 'rechazado')} disabled={updatingStatus} className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/20">
                    <X className="w-3.5 h-3.5 inline-block mr-1" /> Desverificar
                  </button>
                  <button onClick={() => updateStatus(viewPay.id, 'reembolsado')} disabled={updatingStatus} className="btn-secondary text-sm">
                    <RotateCcw className="w-3.5 h-3.5 inline-block mr-1" /> Reembolsar
                  </button>
                </>
              )}
              {viewPay.status === 'rechazado' && (
                <button onClick={() => updateStatus(viewPay.id, 'pendiente')} disabled={updatingStatus} className="btn-secondary text-sm">
                  Volver a pendiente
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {showAdd && <AddPaymentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} methods={methods} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function AddPaymentModal({ onClose, onSaved, methods }: { onClose: () => void; onSaved: () => void; methods: PaymentMethod[] }) {
  const toast = useToast();
  const { profile } = useAuth();
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '', amount: '0', currency: 'BS' as 'BS' | 'USD' | 'EUR',
    payment_method: '', reference: '', bank: '', observations: '',
  });

  useEffect(() => {
    supabase.from('clients').select('id, first_name, last_name').is('deleted_at', null).eq('status', 'activo').order('first_name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { toast('Selecciona un cliente', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      client_id: form.client_id,
      amount: parseFloat(form.amount),
      currency: form.currency,
      exchange_rate: 1,
      bs_equivalent: form.currency === 'BS' ? parseFloat(form.amount) : parseFloat(form.amount),
      payment_method: form.payment_method || null,
      reference: form.reference || null,
      bank: form.bank || null,
      observations: form.observations || null,
      status: 'pendiente',
    });
    setSaving(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    toast('Pago registrado', 'success');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Registrar pago" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Cliente *</label>
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input" required>
            <option value="">Selecciona...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monto *</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'BS' | 'USD' | 'EUR' })} className="input">
              <option value="BS">Bolívares</option>
              <option value="USD">Dólares</option>
              <option value="EUR">Euros</option>
            </select>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input">
              <option value="">Selecciona...</option>
              {methods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Referencia</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Banco/Plataforma</label>
            <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Observaciones</label>
          <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="input min-h-[60px]" />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Registrar'}</button>
        </div>
      </form>
    </Modal>
  );
}
