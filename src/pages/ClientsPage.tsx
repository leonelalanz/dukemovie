import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Users, MessageCircle, Eye, Pencil, Download, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, buildWhatsAppUrl, downloadCSV, normalizePhone, subscriptionStatus } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import type { Client, Subscription, Payment, SupportTicket, Renewal } from '@/types';

export function ClientsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'inactivo'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setClients((data ?? []) as Client[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = clients;
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.first_name.toLowerCase().includes(q) ||
        (c.last_name ?? '').toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.id_number ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [clients, search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString(), status: 'inactivo' }).eq('id', deleteId);
    if (error) {
      toast('Error al eliminar cliente', 'error');
    } else {
      toast('Cliente eliminado', 'success');
      load();
    }
  };

  const handleExport = () => {
    const rows: string[][] = [
      ['Nombre', 'Apellido', 'Cédula', 'Teléfono', 'Email', 'Dirección', 'Estado', 'Fecha registro'],
      ...filtered.map(c => [
        c.first_name, c.last_name ?? '', c.id_number ?? '', c.phone,
        c.email ?? '', c.address ?? '', c.status, formatDate(c.created_at),
      ]),
    ];
    downloadCSV('clientes_duke_movie.csv', rows);
    toast('Lista exportada', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-white/50 text-sm mt-1">{filtered.length} cliente(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <Link to="/clientes/nuevo" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nuevo cliente
          </Link>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
            placeholder="Buscar por nombre, teléfono, cédula o correo..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'activo' | 'inactivo')}
          className="input sm:w-48"
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Sin clientes"
          message="No se encontraron clientes con los criterios seleccionados."
          action={<Link to="/clientes/nuevo" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar cliente</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="card card-hover p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0e2a4d] flex items-center justify-center text-sm font-semibold text-[#00BFFF]">
                    {client.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{client.first_name} {client.last_name}</h3>
                    <p className="text-xs text-white/50">{client.phone}</p>
                  </div>
                </div>
                <StatusBadge status={client.status} />
              </div>
              {client.email && <p className="text-xs text-white/40 mb-1">{client.email}</p>}
              {client.id_number && <p className="text-xs text-white/40 mb-3">CI: {client.id_number}</p>}
              {!client.email && !client.id_number && <div className="mb-3" />}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/clientes/${client.id}`)}
                  className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 flex-1 justify-center"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver
                </button>
                <a
                  href={buildWhatsAppUrl(client.phone, 'Hola, te contactamos de Duke Movie.')}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-green-600/15 text-green-400 border border-green-500/30 rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1 hover:bg-green-600/25"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => navigate(`/clientes/${client.id}/editar`)}
                  className="bg-[#0e2a4d] text-white/60 border border-[#123a63] rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1 hover:text-white"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(client.id)}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs hover:bg-red-500/20"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message="¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

export function ClientFormPage({ clientId }: { clientId?: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const isEdit = !!clientId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', id_number: '', phone: '',
    email: '', address: '', status: 'activo' as 'activo' | 'inactivo', notes: '',
  });
  const [phoneExists, setPhoneExists] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle().then(({ data }) => {
      if (data) setForm(data as typeof form & { id: string });
      setLoading(false);
    });
  }, [clientId]);

  const checkPhone = async (phone: string) => {
    if (phone.length < 7) { setPhoneExists(false); return; }
    const normalized = normalizePhone(phone);
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .neq('id', clientId ?? '')
      .maybeSingle();
    setPhoneExists(!!data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneExists) {
      toast('Ya existe un cliente con este teléfono', 'error');
      return;
    }
    setSaving(true);
    const payload = { ...form, created_by: isEdit ? undefined : profile?.id };
    const { error } = isEdit
      ? await supabase.from('clients').update(payload).eq('id', clientId!)
      : await supabase.from('clients').insert(payload);
    setSaving(false);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      toast(isEdit ? 'Cliente actualizado' : 'Cliente creado', 'success');
      navigate('/clientes');
    }
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
        <p className="text-white/50 text-sm mt-1">{isEdit ? 'Actualiza los datos del cliente' : 'Registra un nuevo cliente'}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Cédula</label>
            <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} className="input" placeholder="V-12345678" />
          </div>
          <div>
            <label className="label">Teléfono (WhatsApp) *</label>
            <input
              value={form.phone}
              onChange={(e) => { setForm({ ...form, phone: e.target.value }); checkPhone(e.target.value); }}
              className={`input ${phoneExists ? 'border-red-500' : ''}`}
              placeholder="0414-1234567"
              required
            />
            {phoneExists && <p className="text-xs text-red-400 mt-1">Este teléfono ya está registrado</p>}
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="cliente@correo.com" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'activo' | 'inactivo' })} className="input">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Dirección</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Notas internas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[80px]" />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'compras' | 'pagos' | 'renovaciones' | 'soporte'>('compras');

  useEffect(() => {
    async function load() {
      const [c, s, p, t, r] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
        supabase.from('subscriptions').select('*, service:services(*)').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('support_tickets').select('*, service:services(*)').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('renewals').select('*, subscription:subscriptions(*), service:services(*)').eq('client_id', clientId).order('created_at', { ascending: false }),
      ]);
      setClient(c.data as Client | null);
      setSubs((s.data ?? []) as Subscription[]);
      setPayments((p.data ?? []) as Payment[]);
      setTickets((t.data ?? []) as SupportTicket[]);
      setRenewals((r.data ?? []) as Renewal[]);
      setLoading(false);
    }
    load();
  }, [clientId]);

  if (loading) return <Skeleton className="h-96" />;
  if (!client) return <EmptyState icon={<Users className="w-8 h-8" />} title="Cliente no encontrado" message="El cliente solicitado no existe." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#0e2a4d] flex items-center justify-center text-xl font-bold text-[#00BFFF]">
            {client.first_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.first_name} {client.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={client.status} />
              <span className="text-xs text-white/40">Desde {formatDate(client.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={buildWhatsAppUrl(client.phone, `Hola, ${client.first_name}. Te contactamos de Duke Movie.`)}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp text-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <button onClick={() => navigate(`/clientes/${client.id}/editar`)} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4" /> Editar
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-white/40 mb-1">Teléfono</p>
          <p className="text-sm text-white flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#00BFFF]" /> {client.phone}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Email</p>
          <p className="text-sm text-white">{client.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Cédula</p>
          <p className="text-sm text-white">{client.id_number || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Dirección</p>
          <p className="text-sm text-white">{client.address || '—'}</p>
        </div>
        {client.notes && (
          <div className="col-span-full">
            <p className="text-xs text-white/40 mb-1">Notas internas</p>
            <p className="text-sm text-white/70">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#0e2a4d] overflow-x-auto">
        {([
          ['compras', `Compras (${subs.length})`],
          ['pagos', `Pagos (${payments.length})`],
          ['renovaciones', `Renovaciones (${renewals.length})`],
          ['soporte', `Soporte (${tickets.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === key ? 'text-[#00BFFF] border-[#00BFFF]' : 'text-white/50 border-transparent hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-2">
        {tab === 'compras' && (
          subs.length ? subs.map(s => (
            <div key={s.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{s.service?.name}</p>
                <p className="text-xs text-white/50">{s.operation_number} — {formatDate(s.start_date)} a {formatDate(s.end_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(s.price, s.currency)}</p>
                <StatusBadge status={subscriptionStatus(s.status, s.end_date)} />
              </div>
            </div>
          )) : <p className="text-white/30 text-sm text-center py-8">Sin compras registradas</p>
        )}
        {tab === 'pagos' && (
          payments.length ? payments.map(p => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{formatCurrency(p.amount, p.currency)}</p>
                <p className="text-xs text-white/50">{p.payment_method} — {formatDate(p.created_at)}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          )) : <p className="text-white/30 text-sm text-center py-8">Sin pagos registrados</p>
        )}
        {tab === 'renovaciones' && (
          renewals.length ? renewals.map(r => (
            <div key={r.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{r.subscription?.service?.name ?? r.service?.name ?? 'Servicio'}</p>
                <p className="text-xs text-white/50">{formatDate(r.start_date)} a {formatDate(r.end_date)}</p>
              </div>
              <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(r.price, r.currency)}</p>
            </div>
          )) : <p className="text-white/30 text-sm text-center py-8">Sin renovaciones registradas</p>
        )}
        {tab === 'soporte' && (
          tickets.length ? tickets.map(t => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{t.code} — {t.problem_type}</p>
                <p className="text-xs text-white/50">{formatDate(t.created_at)}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          )) : <p className="text-white/30 text-sm text-center py-8">Sin tickets de soporte</p>
        )}
      </div>
    </div>
  );
}
