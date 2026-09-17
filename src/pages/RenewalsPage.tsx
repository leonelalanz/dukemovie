import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, MessageCircle, Copy, Check, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, daysRemaining, addDays, buildWhatsAppUrl } from '@/lib/utils';
import { StatusBadge, EmptyState, Skeleton, Modal } from '@/components/ui';
import type { Subscription, PaymentMethod } from '@/types';

type FilterTab = 'hoy' | '1' | '3' | '5' | '7' | 'todas';

export function RenewalsPage() {
  const toast = useToast();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectSub = searchParams.get('sub');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('hoy');
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);
  const [renewPrice, setRenewPrice] = useState('');
  const [renewMethod, setRenewMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    const [s, m, r] = await Promise.all([
      supabase.from('subscriptions').select('*, client:clients(*), service:services(*)').in('status', ['activa', 'proxima_vencer', 'vencida']).order('end_date'),
      supabase.from('payment_methods').select('*').eq('status', 'activo'),
      supabase.from('exchange_rates').select('currency, rate').order('created_at', { ascending: false }),
    ]);
    setSubs((s.data ?? []) as Subscription[]);
    setMethods((m.data ?? []) as PaymentMethod[]);
    const rates: Record<string, number> = {};
    for (const row of (r.data ?? []) as { currency: string; rate: number }[]) {
      if (!(row.currency in rates)) rates[row.currency] = row.rate;
    }
    setExchangeRates(rates);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (preselectSub) {
      supabase.from('subscriptions').select('*, client:clients(*), service:services(*)').eq('id', preselectSub).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setRenewSub(data as Subscription);
            setRenewPrice(String((data as Subscription).price));
          }
        });
    }
  }, [preselectSub]);

  const filtered = useMemo(() => {
    if (tab === 'todas') return subs;
    const days = parseInt(tab);
    return subs.filter(s => {
      const d = daysRemaining(s.end_date);
      if (days === 0) return d === 0;
      return d >= 0 && d <= days;
    });
  }, [subs, tab]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: '1', label: '1 día' },
    { key: '3', label: '3 días' },
    { key: '5', label: '5 días' },
    { key: '7', label: '7 días' },
    { key: 'todas', label: 'Todas' },
  ];

  const buildMessage = (sub: Subscription) => {
    const name = sub.client?.first_name ?? '';
    const service = sub.service?.name ?? '';
    const date = formatDate(sub.end_date);
    const rate = exchangeRates[sub.currency];
    const price = sub.currency !== 'BS' && rate
      ? formatCurrency(sub.price * rate, 'BS')
      : formatCurrency(sub.price, sub.currency);
    return `Hola, ${name}. Tu servicio de ${service} vence el ${date}. Puedes renovarlo por ${price}. Escríbenos para mantener tu acceso activo. Duke Movie.`;
  };

  const handleCopy = (id: string, msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast('Mensaje copiado', 'success');
  };

  const handleRenew = async () => {
    if (!renewSub) return;
    setSaving(true);
    const svc = renewSub.service;
    const duration = svc?.duration_days ?? 30;
    const newEnd = addDays(new Date(), duration);

    const { error: subError } = await supabase.from('subscriptions').update({
      end_date: newEnd.toISOString().slice(0, 10),
      start_date: new Date().toISOString().slice(0, 10),
      status: 'activa',
      price: parseFloat(renewPrice),
      payment_method: renewMethod || null,
    }).eq('id', renewSub.id);

    if (subError) {
      toast('Error al renovar', 'error');
      setSaving(false);
      return;
    }

    await supabase.from('renewals').insert({
      subscription_id: renewSub.id,
      client_id: renewSub.client_id,
      price: parseFloat(renewPrice),
      currency: renewSub.currency,
      payment_method: renewMethod || null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: newEnd.toISOString().slice(0, 10),
      processed_by: profile?.id,
    });

    toast('Suscripción renovada', 'success');
    setSaving(false);
    setRenewSub(null);
    load();
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Renovaciones</h1>
        <p className="text-white/50 text-sm mt-1">Suscripciones próximas a vencer</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20' : 'text-white/50 hover:text-white hover:bg-[#0e2a4d]/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<RefreshCw className="w-8 h-8" />} title="Sin renovaciones" message="No hay suscripciones en este período." />
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const days = daysRemaining(sub.end_date);
            const msg = buildMessage(sub);
            return (
              <div key={sub.id} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">{sub.client?.first_name} {sub.client?.last_name}</p>
                      <StatusBadge status={sub.status} />
                    </div>
                    <p className="text-xs text-white/50">{sub.service?.name} — {sub.operation_number}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vence: {formatDate(sub.end_date)} · {days === 0 ? 'Hoy' : days < 0 ? `Hace ${Math.abs(days)} días` : `${days} días`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(sub.price, sub.currency)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setRenewSub(sub); setRenewPrice(String(sub.price)); }}
                    className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Renovar
                  </button>
                  <a
                    href={buildWhatsAppUrl(sub.client?.phone ?? '', msg)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp text-xs px-3 py-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <button
                    onClick={() => handleCopy(sub.id, msg)}
                    className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                  >
                    {copied === sub.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === sub.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Renew modal */}
      <Modal open={!!renewSub} onClose={() => setRenewSub(null)} title="Renovar suscripción" size="md">
        {renewSub && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
              <p className="text-sm text-white"><span className="text-white/50">Cliente:</span> {renewSub.client?.first_name} {renewSub.client?.last_name}</p>
              <p className="text-sm text-white"><span className="text-white/50">Servicio:</span> {renewSub.service?.name}</p>
              <p className="text-sm text-white"><span className="text-white/50">Vencimiento actual:</span> {formatDate(renewSub.end_date)}</p>
              <p className="text-sm text-white"><span className="text-white/50">Nuevo vencimiento:</span> {formatDate(addDays(new Date(), renewSub.service?.duration_days ?? 30))}</p>
            </div>
            <div>
              <label className="label">Precio de renovación</label>
              <input type="number" step="0.01" value={renewPrice} onChange={(e) => setRenewPrice(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select value={renewMethod} onChange={(e) => setRenewMethod(e.target.value)} className="input">
                <option value="">Selecciona...</option>
                {methods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRenewSub(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleRenew} disabled={saving} className="btn-gold">{saving ? 'Procesando...' : 'Confirmar renovación'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
