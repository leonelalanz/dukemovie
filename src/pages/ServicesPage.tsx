import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Pencil, Search, Trash2, Tv } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import type { Service } from '@/types';

const serviceIcons: Record<string, string> = {
  'Netflix': '🎬', 'YouTube Premium': '▶️', 'Disney+': '🏰', 'Max': '🎭',
  'Prime Video': '📦', 'Crunchyroll': '🎌', 'Spotify': '🎵',
};

export function ServicesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').is('deleted_at', null).order('name');
    setServices((data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q));
  }, [services, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { data: subs } = await supabase.from('subscriptions').select('id').eq('service_id', deleteId).limit(1);
    if (subs && subs.length > 0) {
      toast('No se puede eliminar: tiene suscripciones asociadas', 'error');
      return;
    }
    const { error } = await supabase.from('services').update({ deleted_at: new Date().toISOString(), status: 'inactivo' }).eq('id', deleteId);
    if (error) {
      toast('Error al eliminar servicio', 'error');
    } else {
      toast('Servicio eliminado', 'success');
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Servicios</h1>
          <p className="text-white/50 text-sm mt-1">{filtered.length} servicio(s)</p>
        </div>
        <button onClick={() => navigate('/servicios/nuevo')} className="btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
          placeholder="Buscar servicio..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Sin servicios"
          message="No hay servicios registrados. Agrega uno para empezar a vender."
          action={<button onClick={() => navigate('/servicios/nuevo')} className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar servicio</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <div key={service.id} className="card card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#0e2a4d] to-[#061528] flex items-center justify-center text-2xl">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <span>{serviceIcons[service.name] ?? '📺'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    <p className="text-xs text-white/40">{service.category}</p>
                  </div>
                </div>
                <StatusBadge status={service.status} />
              </div>
              {service.description && <p className="text-xs text-white/50 mb-3 line-clamp-2">{service.description}</p>}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div>
                  <p className="text-white/40">Precio</p>
                  <p className="text-white font-semibold">{formatCurrency(service.price, service.currency)}</p>
                </div>
                <div>
                  <p className="text-white/40">Duración</p>
                  <p className="text-white">{service.duration_days} días</p>
                </div>
                <div>
                  <p className="text-white/40">Tipo</p>
                  <p className="text-white capitalize">{service.access_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-white/40">Garantía</p>
                  <p className="text-white">{service.warranty_days} días</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/servicios/${service.id}/editar`)} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 flex-1 justify-center">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => setDeleteId(service.id)} className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" />
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
        title="Eliminar servicio"
        message="¿Seguro que deseas eliminar este servicio? No se podrá eliminar si tiene suscripciones asociadas."
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

export function ServiceFormPage({ serviceId }: { serviceId?: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = !!serviceId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: '', image_url: '', description: '', category: '',
    price: '0', currency: 'BS' as 'BS' | 'USD' | 'EUR', duration_days: '30',
    access_type: 'perfil', quantity_available: '0', status: 'activo' as 'activo' | 'inactivo',
    instructions: '', warranty_days: '7', internal_cost: '0',
  });

  useEffect(() => {
    async function loadExchangeRates() {
      const { data } = await supabase.from('exchange_rates').select('currency, rate').order('created_at', { ascending: false });
      if (data) {
        const rates: Record<string, number> = {};
        data.forEach(row => {
          if (!rates[row.currency]) rates[row.currency] = row.rate;
        });
        setExchangeRates(rates);
      }
    }
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    supabase.from('services').select('*').eq('id', serviceId).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as Service;
        setForm({
          name: d.name, image_url: d.image_url ?? '', description: d.description ?? '',
          category: d.category ?? '', price: String(d.price), currency: d.currency,
          duration_days: String(d.duration_days), access_type: d.access_type,
          quantity_available: String(d.quantity_available), status: d.status,
          instructions: d.instructions ?? '', warranty_days: String(d.warranty_days),
          internal_cost: String(d.internal_cost),
        });
      }
      setLoading(false);
    });
  }, [serviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
      duration_days: parseInt(form.duration_days),
      quantity_available: parseInt(form.quantity_available),
      warranty_days: parseInt(form.warranty_days),
      internal_cost: parseFloat(form.internal_cost),
    };
    const { error } = isEdit
      ? await supabase.from('services').update(payload).eq('id', serviceId!)
      : await supabase.from('services').insert(payload);
    setSaving(false);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      toast(isEdit ? 'Servicio actualizado' : 'Servicio creado', 'success');
      navigate('/servicios');
    }
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="Streaming, Música..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL del logo/imagen</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
          </div>
          <div>
            <label className="label">Precio *</label>
            <div className="space-y-2">
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" required />
              {form.currency === 'USD' && exchangeRates.USD && (
                <div className="text-sm text-white/70 bg-[#0e2a4d] p-2 rounded">
                  Equivalente en BS: {formatCurrency(parseFloat(form.price || '0') * exchangeRates.USD, 'BS')}
                </div>
              )}
              {form.currency === 'EUR' && exchangeRates.EUR && (
                <div className="text-sm text-white/70 bg-[#0e2a4d] p-2 rounded">
                  Equivalente en BS: {formatCurrency(parseFloat(form.price || '0') * exchangeRates.EUR, 'BS')}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="label">Moneda</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'BS' | 'USD' | 'EUR' })} className="input">
              <option value="BS">Bolívares (Bs)</option>
              <option value="USD">Dólares ($) {exchangeRates.USD && `- BCV: ${exchangeRates.USD}`}</option>
              <option value="EUR">Euros (€) {exchangeRates.EUR && `- BCV: ${exchangeRates.EUR}`}</option>
            </select>
          </div>
          <div>
            <label className="label">Duración (días) *</label>
            <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Tipo de acceso</label>
            <select value={form.access_type} onChange={(e) => setForm({ ...form, access_type: e.target.value })} className="input">
              <option value="perfil">Perfil</option>
              <option value="cuenta_completa">Cuenta completa</option>
              <option value="plan_familiar">Plan familiar</option>
              <option value="cupo">Cupo</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad disponible</label>
            <input type="number" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Garantía (días)</label>
            <input type="number" value={form.warranty_days} onChange={(e) => setForm({ ...form, warranty_days: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Costo interno</label>
            <input type="number" step="0.01" value={form.internal_cost} onChange={(e) => setForm({ ...form, internal_cost: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'activo' | 'inactivo' })} className="input">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Instrucciones para el cliente</label>
            <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="input min-h-[60px]" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/servicios')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
