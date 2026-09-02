import { useEffect, useState, useMemo } from 'react';
import { LifeBuoy, Plus, Search, Eye, MessageCircle, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, daysRemaining, generateTicketCode, buildWhatsAppUrl } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, Modal } from '@/components/ui';
import type { SupportTicket, Client, Service, TicketMessage } from '@/types';

const problemTypes = [
  'No puede iniciar sesión',
  'Contraseña incorrecta',
  'Perfil bloqueado',
  'Cuenta suspendida',
  'Cambio de dispositivo',
  'Problema de pago',
  'Otro',
];

const priorities = ['baja', 'media', 'alta', 'critica'];
const statuses = ['abierto', 'en_revision', 'esperando_cliente', 'resuelto', 'cerrado'];

export function SupportPage() {
  const toast = useToast();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  async function load() {
    setLoading(true);
    const [t, c, s] = await Promise.all([
      supabase.from('support_tickets').select('*, client:clients(*), service:services(*), responsible:profiles(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').is('deleted_at', null).eq('status', 'activo').order('first_name'),
      supabase.from('services').select('*').is('deleted_at', null).eq('status', 'activo').order('name'),
    ]);
    setTickets((t.data ?? []) as SupportTicket[]);
    setClients((c.data ?? []) as Client[]);
    setServices((s.data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = tickets;
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.code.toLowerCase().includes(q) ||
        (t.client?.first_name ?? '').toLowerCase().includes(q) ||
        t.problem_type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, search, statusFilter]);

  const openTicket = async (ticket: SupportTicket) => {
    setViewTicket(ticket);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at');
    setMessages((data ?? []) as TicketMessage[]);
  };

  const updateStatus = async (id: string, status: SupportTicket['status']) => {
    const updates: Partial<SupportTicket> = { status };
    if (status === 'cerrado') updates.closed_at = new Date().toISOString();
    if (status === 'resuelto' || status === 'cerrado') updates.responsible_id = profile?.id;
    const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
    if (error) { toast('Error al actualizar', 'error'); return; }
    toast('Ticket actualizado', 'success');
    load();
    if (viewTicket?.id === id) setViewTicket({ ...viewTicket, ...updates } as SupportTicket);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !viewTicket) return;
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: viewTicket.id,
      message: newMsg,
      sent_by: profile?.id,
    });
    if (error) { toast('Error al enviar', 'error'); return; }
    setNewMsg('');
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', viewTicket.id).order('created_at');
    setMessages((data ?? []) as TicketMessage[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Soporte y garantías</h1>
          <p className="text-white/50 text-sm mt-1">{filtered.length} ticket(s)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo ticket
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
            placeholder="Buscar por código, cliente o problema..."
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Todos los estados</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="w-8 h-8" />} title="Sin tickets" message="No hay tickets de soporte." />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const subDays = t.service ? null : null;
            return (
              <div key={t.id} className="card card-hover p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-white">{t.code}</p>
                    <StatusBadge status={t.status} />
                    <StatusBadge status={t.priority} />
                  </div>
                  <p className="text-xs text-white/50">{t.client?.first_name} {t.client?.last_name} — {t.problem_type}</p>
                  <p className="text-xs text-white/40">{formatDate(t.created_at)}</p>
                </div>
                <button onClick={() => openTicket(t)} className="text-xs text-[#00BFFF] hover:text-[#33CCFF] shrink-0">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* View ticket */}
      <Modal open={!!viewTicket} onClose={() => setViewTicket(null)} title={viewTicket?.code ?? ''} size="lg">
        {viewTicket && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Info label="Cliente" value={`${viewTicket.client?.first_name ?? ''} ${viewTicket.client?.last_name ?? ''}`} />
              <Info label="Servicio" value={viewTicket.service?.name ?? '—'} />
              <Info label="Tipo de problema" value={viewTicket.problem_type} />
              <Info label="Prioridad" value={<StatusBadge status={viewTicket.priority} />} />
              <Info label="Estado" value={<StatusBadge status={viewTicket.status} />} />
              <Info label="Responsable" value={viewTicket.responsible?.full_name ?? 'Sin asignar'} />
              <Info label="Creado" value={formatDate(viewTicket.created_at)} />
              {viewTicket.closed_at && <Info label="Cerrado" value={formatDate(viewTicket.closed_at)} />}
            </div>
            {viewTicket.description && (
              <div>
                <p className="text-xs text-white/40 mb-1">Descripción</p>
                <p className="text-sm text-white/70">{viewTicket.description}</p>
              </div>
            )}
            {viewTicket.solution && (
              <div>
                <p className="text-xs text-white/40 mb-1">Solución aplicada</p>
                <p className="text-sm text-white/70">{viewTicket.solution}</p>
              </div>
            )}

            {/* Warranty check */}
            {viewTicket.service && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                <Shield className="w-4 h-4 text-[#D9A928]" />
                <p className="text-xs text-white/60">Garantía del servicio: {viewTicket.service.warranty_days} días</p>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`p-3 rounded-lg ${m.sent_by === profile?.id ? 'bg-[#00BFFF]/10 ml-8' : 'bg-[#0e2a4d] mr-8'}`}>
                  <p className="text-sm text-white">{m.message}</p>
                  <p className="text-xs text-white/30 mt-1">{formatDate(m.created_at)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="input"
                placeholder="Escribe un mensaje..."
              />
              <button onClick={sendMessage} className="btn-primary px-4">Enviar</button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#0e2a4d]">
              <select
                value={viewTicket.status}
                onChange={(e) => updateStatus(viewTicket.id, e.target.value as SupportTicket['status'])}
                className="input flex-1 min-w-[150px]"
              >
                {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              {viewTicket.client?.phone && (
                <a
                  href={buildWhatsAppUrl(viewTicket.client.phone, `Hola, ${viewTicket.client.first_name}. Te contactamos sobre tu ticket ${viewTicket.code}. Duke Movie.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp text-sm"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {showAdd && (
        <AddTicketModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
          clients={clients}
          services={services}
        />
      )}
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

function AddTicketModal({ onClose, onSaved, clients, services }: {
  onClose: () => void; onSaved: () => void; clients: Client[]; services: Service[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '', service_id: '', problem_type: problemTypes[0],
    description: '', priority: 'media' as 'baja' | 'media' | 'alta' | 'critica',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) { toast('Selecciona un cliente', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('support_tickets').insert({
      code: generateTicketCode(),
      client_id: form.client_id,
      service_id: form.service_id || null,
      problem_type: form.problem_type,
      description: form.description || null,
      priority: form.priority,
      status: 'abierto',
    });
    setSaving(false);
    if (error) { toast(`Error: ${error.message}`, 'error'); return; }
    toast('Ticket creado', 'success');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Nuevo ticket de soporte" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Cliente *</label>
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input" required>
            <option value="">Selecciona...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Servicio relacionado</label>
          <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className="input">
            <option value="">Sin servicio</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo de problema</label>
          <select value={form.problem_type} onChange={(e) => setForm({ ...form, problem_type: e.target.value })} className="input">
            {problemTypes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'baja' | 'media' | 'alta' | 'critica' })} className="input">
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Crear ticket'}</button>
        </div>
      </form>
    </Modal>
  );
}
