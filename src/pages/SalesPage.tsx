import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Search, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, daysRemaining, generateOperationNumber, addDays, downloadCSV, subscriptionStatus } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, Modal, ConfirmDialog } from '@/components/ui';
import type { Subscription, Client, Service, PaymentMethod, ExchangeRate, BusinessSettings } from '@/types';

export function SalesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewSub, setViewSub] = useState<Subscription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*, client:clients(*), service:services(*), employee:profiles(*)')
      .order('created_at', { ascending: false });
    setSubs((data ?? []) as Subscription[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = subs;
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.operation_number.toLowerCase().includes(q) ||
        (s.client?.first_name ?? '').toLowerCase().includes(q) ||
        (s.client?.last_name ?? '').toLowerCase().includes(q) ||
        (s.service?.name ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [subs, search, statusFilter]);

  const handleExport = () => {
    const rows: string[][] = [
      ['Operación', 'Cliente', 'Servicio', 'Modalidad', 'Inicio', 'Vencimiento', 'Días restantes', 'Precio', 'Moneda', 'Método pago', 'Estado'],
      ...filtered.map(s => [
        s.operation_number,
        `${s.client?.first_name ?? ''} ${s.client?.last_name ?? ''}`,
        s.service?.name ?? '',
        s.modality,
        formatDate(s.start_date), formatDate(s.end_date),
        String(daysRemaining(s.end_date)),
        String(s.price), s.currency, s.payment_method ?? '',
        s.status,
      ]),
    ];
    downloadCSV('ventas_duke_movie.csv', rows);
    toast('Lista exportada', 'success');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('subscriptions').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) {
      toast('Error al eliminar venta', 'error');
    } else {
      toast('Venta eliminada', 'success');
      setSubs(subs.filter(s => s.id !== deleteId));
      setViewSub(null);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ventas y suscripciones</h1>
          <p className="text-white/50 text-sm mt-1">{filtered.length} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <Link to="/ventas/nueva" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nueva venta
          </Link>
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
            placeholder="Buscar por operación, cliente o servicio..."
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="proxima_vencer">Próximas a vencer</option>
          <option value="vencida">Vencidas</option>
          <option value="pendiente">Pendientes</option>
          <option value="suspendida">Suspendidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Sin ventas"
          message="No hay ventas registradas. Crea la primera venta."
          action={<Link to="/ventas/nueva" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva venta</Link>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const days = daysRemaining(sub.end_date);
            return (
              <div key={sub.id} className="card card-hover p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{sub.client?.first_name} {sub.client?.last_name}</p>
                    <StatusBadge status={subscriptionStatus(sub.status, sub.end_date)} />
                  </div>
                  <p className="text-xs text-white/50">{sub.operation_number} — {sub.service?.name} ({sub.modality})</p>
                  <p className="text-xs text-white/40">
                    Vence: {formatDate(sub.end_date)}
                    {days >= 0 ? ` · ${days === 0 ? 'Hoy' : `${days} días`}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(sub.price, sub.currency)}</p>
                  <button onClick={() => setViewSub(sub)} className="text-xs text-[#00BFFF] hover:text-[#33CCFF] mt-1 inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar venta"
        message="¿Seguro que deseas eliminar esta venta? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        isLoading={deleting}
        danger
      />

      <Modal open={!!viewSub} onClose={() => setViewSub(null)} title={`Operación ${viewSub?.operation_number ?? ''}`} size="lg">
        {viewSub && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Info label="Cliente" value={`${viewSub.client?.first_name ?? ''} ${viewSub.client?.last_name ?? ''}`} />
              <Info label="Servicio" value={viewSub.service?.name ?? ''} />
              <Info label="Modalidad" value={viewSub.modality} />
              <Info label="Precio" value={formatCurrency(viewSub.price, viewSub.currency)} />
              <Info label="Método de pago" value={viewSub.payment_method ?? '—'} />
              <Info label="Estado" value={<StatusBadge status={subscriptionStatus(viewSub.status, viewSub.end_date)} />} />
              <Info label="Fecha inicio" value={formatDate(viewSub.start_date)} />
              <Info label="Fecha vencimiento" value={formatDate(viewSub.end_date)} />
              <Info label="Días restantes" value={String(daysRemaining(viewSub.end_date))} />
              <Info label="Garantía" value={`${viewSub.warranty_days} días`} />
              <Info label="Acceso asignado" value={viewSub.assigned_access ?? '—'} />
              <Info label="Empleado" value={viewSub.employee?.full_name ?? '—'} />
            </div>
            {viewSub.observations && (
              <div>
                <p className="text-xs text-white/40 mb-1">Observaciones</p>
                <p className="text-sm text-white/70">{viewSub.observations}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2 flex-wrap">
              <button onClick={() => navigate(`/renovaciones?sub=${viewSub.id}`)} className="btn-gold inline-flex items-center gap-2 text-sm">
                Renovar
              </button>
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify({ op: viewSub.operation_number, client: viewSub.client?.first_name, service: viewSub.service?.name, price: viewSub.price, end: viewSub.end_date }, null, 2)); toast('Datos copiados'); }} className="btn-secondary text-sm">
                Copiar datos
              </button>
              <button onClick={() => navigate(`/ventas/${viewSub.id}/editar`)} className="btn-secondary inline-flex items-center gap-2 text-sm">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={() => setDeleteId(viewSub.id)} className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/20 inline-flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function EditSalePage({ saleId }: { saleId: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const [form, setForm] = useState({
    modality: 'perfil',
    price: '0',
    currency: 'BS' as 'BS' | 'USD' | 'EUR',
    payment_method: '',
    start_date: '',
    status: 'activa' as 'activa' | 'pendiente' | 'proxima_vencer' | 'vencida' | 'suspendida' | 'cancelada',
    assigned_access: '',
    observations: '',
  });

  const [computedEnd, setComputedEnd] = useState('');
  const [duration, setDuration] = useState(30);
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    async function load() {
      const [s, pm, r, st] = await Promise.all([
        supabase.from('subscriptions').select('*, client:clients(*), service:services(*)').eq('id', saleId).maybeSingle(),
        supabase.from('payment_methods').select('*').eq('status', 'activo'),
        supabase.from('exchange_rates').select('*').order('created_at', { ascending: false }),
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (s.data) {
        setSub(s.data as Subscription);
        setForm({
          modality: s.data.modality,
          price: String(s.data.price),
          currency: s.data.currency,
          payment_method: s.data.payment_method || '',
          start_date: s.data.start_date,
          status: s.data.status,
          assigned_access: s.data.assigned_access || '',
          observations: s.data.observations || '',
        });
        setDuration(s.data.service?.duration_days ?? 30);
        setComputedEnd(s.data.end_date);
      }

      setPaymentMethods((pm.data ?? []) as PaymentMethod[]);
      setRates((r.data ?? []) as ExchangeRate[]);
      setSettings(st.data as BusinessSettings | null);
      setLoading(false);
    }
    load();
  }, [saleId]);

  useEffect(() => {
    if (!form.start_date) return;
    const end = new Date(form.start_date + 'T00:00:00Z');
    end.setDate(end.getDate() + duration);
    setComputedEnd(end.toISOString().slice(0, 10));
  }, [form.start_date, duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub) return;
    setSaving(true);

    const { error } = await supabase.from('subscriptions').update({
      modality: form.modality,
      price: parseFloat(form.price),
      currency: form.currency,
      payment_method: form.payment_method,
      start_date: form.start_date,
      end_date: computedEnd,
      status: form.status,
      assigned_access: form.assigned_access || null,
      observations: form.observations || null,
    }).eq('id', saleId);

    setSaving(false);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      toast('Venta actualizada', 'success');
      navigate('/ventas');
    }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!sub) return <div className="text-white">Venta no encontrada</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Editar venta</h1>
        <p className="text-white/50 text-sm mt-1">Operación: {sub.operation_number}</p>
        <p className="text-white/50 text-sm">Cliente: {sub.client?.first_name} {sub.client?.last_name}</p>
        <p className="text-white/50 text-sm">Servicio: {sub.service?.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modalidad</label>
            <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} className="input">
              <option value="perfil">Perfil</option>
              <option value="cuenta_completa">Cuenta completa</option>
              <option value="plan_familiar">Plan familiar</option>
              <option value="cupo">Cupo</option>
            </select>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input">
              <option value="">Selecciona...</option>
              {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Precio *</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'BS' | 'USD' | 'EUR' })} className="input">
              <option value="BS">Bolívares (Bs)</option>
              <option value="USD">Dólares ($)</option>
              <option value="EUR">Euros (€)</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha de inicio *</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Duración (días)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} className="input" />
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input type="date" value={computedEnd} readOnly className="input bg-[#061528] text-[#00BFFF] font-semibold" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="input">
              <option value="activa">Activa</option>
              <option value="pendiente">Pendiente</option>
              <option value="proxima_vencer">Próxima a vencer</option>
              <option value="vencida">Vencida</option>
              <option value="suspendida">Suspendida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Acceso asignado</label>
          <input value={form.assigned_access} onChange={(e) => setForm({ ...form, assigned_access: e.target.value })} className="input" placeholder="Correo/perfil asignado" />
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="input min-h-[60px]" />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/ventas')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
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

export function NewSalePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: '', phone: '' });

  const [form, setForm] = useState({
    client_id: '', service_id: '', modality: 'perfil',
    price: '0', currency: 'BS' as 'BS' | 'USD' | 'EUR',
    payment_method: '', start_date: new Date().toISOString().slice(0, 10),
    assigned_access: '', observations: '',
  });

  const [computedEnd, setComputedEnd] = useState('');

  useEffect(() => {
    async function load() {
      const [c, s, pm, r, st] = await Promise.all([
        supabase.from('clients').select('*').is('deleted_at', null).eq('status', 'activo').order('first_name'),
        supabase.from('services').select('*').is('deleted_at', null).eq('status', 'activo').order('name'),
        supabase.from('payment_methods').select('*').eq('status', 'activo'),
        supabase.from('exchange_rates').select('*').order('created_at', { ascending: false }),
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
      ]);
      setClients((c.data ?? []) as Client[]);
      setServices((s.data ?? []) as Service[]);
      setPaymentMethods((pm.data ?? []) as PaymentMethod[]);
      setRates((r.data ?? []) as ExchangeRate[]);
      setSettings(st.data as BusinessSettings | null);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const svc = services.find(s => s.id === form.service_id);
    if (svc) {
      setForm(f => ({
        ...f,
        price: String(svc.price),
        currency: svc.currency,
        modality: svc.access_type,
      }));
    }
  }, [form.service_id, services]);

  useEffect(() => {
    const svc = services.find(s => s.id === form.service_id);
    const duration = svc?.duration_days ?? settings?.default_duration ?? 30;
    const end = addDays(form.start_date, duration);
    setComputedEnd(end.toISOString().slice(0, 10));
  }, [form.start_date, form.service_id, services, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.service_id) {
      toast('Selecciona cliente y servicio', 'error');
      return;
    }
    setSaving(true);
    const opNum = generateOperationNumber();
    const svc = services.find(s => s.id === form.service_id);

    // Calculate BS equivalent
    let bsEquiv = parseFloat(form.price);
    if (form.currency !== 'BS') {
      const rate = rates.find(r => r.currency === form.currency);
      if (rate) bsEquiv = parseFloat(form.price) * rate.rate;
    }

    const { data, error } = await supabase.from('subscriptions').insert({
      operation_number: opNum,
      client_id: form.client_id,
      service_id: form.service_id,
      modality: form.modality,
      price: parseFloat(form.price),
      currency: form.currency,
      payment_method: form.payment_method,
      start_date: form.start_date,
      end_date: computedEnd,
      status: 'activa',
      assigned_access: form.assigned_access || null,
      warranty_days: svc?.warranty_days ?? settings?.default_warranty ?? 7,
      employee_id: profile?.id,
      observations: form.observations || null,
    }).select().single();

    if (error) {
      toast(`Error: ${error.message}`, 'error');
      setSaving(false);
      return;
    }

    // Also create a payment record
    if (form.payment_method) {
      await supabase.from('payments').insert({
        client_id: form.client_id,
        subscription_id: data.id,
        amount: parseFloat(form.price),
        currency: form.currency,
        exchange_rate: form.currency !== 'BS' ? (rates.find(r => r.currency === form.currency)?.rate ?? 1) : 1,
        bs_equivalent: bsEquiv,
        payment_method: form.payment_method,
        status: 'verificado',
        verified_by: profile?.id,
      });
    }

    toast(`Venta registrada: ${opNum}`, 'success');
    setSaving(false);
    navigate('/ventas');
  };

  const handleQuickClient = async () => {
    if (!newClient.first_name || !newClient.phone) {
      toast('Nombre y teléfono son obligatorios', 'error');
      return;
    }
    const { data, error } = await supabase.from('clients').insert({
      first_name: newClient.first_name,
      phone: newClient.phone,
      status: 'activo',
      created_by: profile?.id,
    }).select().single();
    if (error) {
      toast(`Error: ${error.message}`, 'error');
      return;
    }
    setClients([...clients, data as Client]);
    setForm({ ...form, client_id: data.id });
    setNewClient({ first_name: '', phone: '' });
    setShowNewClient(false);
    toast('Cliente creado', 'success');
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva venta</h1>
        <p className="text-white/50 text-sm mt-1">Registra una nueva suscripción</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* Client selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Cliente *</label>
            <button type="button" onClick={() => setShowNewClient(!showNewClient)} className="text-xs text-[#00BFFF] hover:text-[#33CCFF]">
              + Crear nuevo
            </button>
          </div>
          {showNewClient ? (
            <div className="space-y-2 p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
              <input value={newClient.first_name} onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })} className="input" placeholder="Nombre" />
              <input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="input" placeholder="0414-1234567" />
              <div className="flex gap-2">
                <button type="button" onClick={handleQuickClient} className="btn-primary text-sm">Crear</button>
                <button type="button" onClick={() => setShowNewClient(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          ) : (
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input" required>
              <option value="">Selecciona un cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''} — {c.phone}</option>)}
            </select>
          )}
        </div>

        {/* Service */}
        <div>
          <label className="label">Servicio *</label>
          <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="input" required>
            <option value="">Selecciona un servicio...</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price, s.currency)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modalidad</label>
            <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} className="input">
              <option value="perfil">Perfil</option>
              <option value="cuenta_completa">Cuenta completa</option>
              <option value="plan_familiar">Plan familiar</option>
              <option value="cupo">Cupo</option>
            </select>
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input">
              <option value="">Selecciona...</option>
              {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Precio *</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'BS' | 'USD' | 'EUR' })} className="input">
              <option value="BS">Bolívares (Bs)</option>
              <option value="USD">Dólares ($)</option>
              <option value="EUR">Euros (€)</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha de inicio *</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input type="date" value={computedEnd} readOnly className="input bg-[#061528] text-[#00BFFF] font-semibold" />
          </div>
        </div>

        <div>
          <label className="label">Acceso asignado</label>
          <input value={form.assigned_access} onChange={(e) => setForm({ ...form, assigned_access: e.target.value })} className="input" placeholder="Correo/perfil asignado" />
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="input min-h-[60px]" />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/ventas')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Confirmar venta'}</button>
        </div>
      </form>
    </div>
  );
}
