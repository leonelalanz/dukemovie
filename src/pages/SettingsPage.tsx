import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Plus, DollarSign, Phone, Clock, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Skeleton, StatusBadge } from '@/components/ui';
import type { BusinessSettings, PaymentMethod, ExchangeRate, Profile } from '@/types';

export function SettingsPage() {
  const toast = useToast();
  const { profile } = useAuth();
  const [tab, setTab] = useState<'negocio' | 'tasas' | 'pagos' | 'empleados'>('negocio');
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [newRate, setNewRate] = useState({ currency: 'USD' as 'USD' | 'EUR', rate: '' });

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [newMethod, setNewMethod] = useState('');

  const [staff, setStaff] = useState<Profile[]>([]);

  useEffect(() => {
    async function load() {
      const [s, r, m, p] = await Promise.all([
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
        supabase.from('exchange_rates').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('payment_methods').select('*').order('name'),
        supabase.from('profiles').select('*, role:roles(*)').order('created_at', { ascending: false }),
      ]);
      setSettings(s.data as BusinessSettings | null);
      setRates((r.data ?? []) as ExchangeRate[]);
      setMethods((m.data ?? []) as PaymentMethod[]);
      setStaff((p.data ?? []) as Profile[]);
      setLoading(false);
    }
    load();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from('business_settings').update({
      name: settings.name,
      whatsapp_number: settings.whatsapp_number,
      schedule: settings.schedule,
      main_currency: settings.main_currency,
      default_duration: settings.default_duration,
      default_warranty: settings.default_warranty,
    }).eq('id', settings.id);
    setSavingSettings(false);
    if (error) { toast('Error al guardar', 'error'); return; }
    toast('Configuración guardada', 'success');
  };

  const addRate = async () => {
    const rateVal = parseFloat(newRate.rate);
    if (!rateVal || rateVal <= 0) { toast('Ingresa una tasa válida', 'error'); return; }
    const { data, error } = await supabase.from('exchange_rates').insert({
      currency: newRate.currency,
      rate: rateVal,
      updated_by: profile?.id,
    }).select().single();
    if (error) { toast('Error al guardar tasa', 'error'); return; }
    setRates([data as ExchangeRate, ...rates]);
    setNewRate({ ...newRate, rate: '' });
    toast('Tasa actualizada', 'success');
  };

  const addMethod = async () => {
    if (!newMethod.trim()) return;
    const { data, error } = await supabase.from('payment_methods').insert({ name: newMethod.trim(), status: 'activo' }).select().single();
    if (error) { toast('Error o ya existe', 'error'); return; }
    setMethods([...methods, data as PaymentMethod]);
    setNewMethod('');
    toast('Método agregado', 'success');
  };

  const toggleMethod = async (id: string, status: string) => {
    const newStatus = status === 'activo' ? 'inactivo' : 'activo';
    await supabase.from('payment_methods').update({ status: newStatus }).eq('id', id);
    setMethods(methods.map(m => m.id === id ? { ...m, status: newStatus as 'activo' | 'inactivo' } : m));
  };

  const tabs = [
    { key: 'negocio' as const, label: 'Datos del negocio', icon: Building2 },
    { key: 'tasas' as const, label: 'Tasas de cambio', icon: DollarSign },
    { key: 'pagos' as const, label: 'Métodos de pago', icon: CreditCardIcon },
    { key: 'empleados' as const, label: 'Empleados', icon: UsersIcon },
  ];

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-white/50 text-sm mt-1">Administra el sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#0e2a4d]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              tab === t.key ? 'text-[#00BFFF] border-[#00BFFF]' : 'text-white/50 border-transparent hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Business settings */}
      {tab === 'negocio' && settings && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <div>
            <label className="label">Nombre del negocio</label>
            <input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Número de WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} className="input pl-11" />
            </div>
          </div>
          <div>
            <label className="label">Horario</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input value={settings.schedule} onChange={(e) => setSettings({ ...settings, schedule: e.target.value })} className="input pl-11" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Moneda principal</label>
              <select value={settings.main_currency} onChange={(e) => setSettings({ ...settings, main_currency: e.target.value as 'BS' | 'USD' | 'EUR' })} className="input">
                <option value="BS">Bolívares</option>
                <option value="USD">Dólares</option>
                <option value="EUR">Euros</option>
              </select>
            </div>
            <div>
              <label className="label">Duración por defecto (días)</label>
              <input type="number" value={settings.default_duration} onChange={(e) => setSettings({ ...settings, default_duration: parseInt(e.target.value) || 30 })} className="input" />
            </div>
            <div>
              <label className="label">Garantía por defecto (días)</label>
              <input type="number" value={settings.default_warranty} onChange={(e) => setSettings({ ...settings, default_warranty: parseInt(e.target.value) || 7 })} className="input" />
            </div>
          </div>
          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {savingSettings ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Exchange rates */}
      {tab === 'tasas' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Actualizar tasa</h3>
            <div className="flex gap-3">
              <select value={newRate.currency} onChange={(e) => setNewRate({ ...newRate, currency: e.target.value as 'USD' | 'EUR' })} className="input w-32">
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
              <input type="number" step="0.01" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} className="input flex-1" placeholder="Tasa en Bs" />
              <button onClick={addRate} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Actualizar
              </button>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Historial de tasas</h3>
            {rates.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">Sin tasas registradas</p>
            ) : (
              <div className="space-y-2">
                {rates.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                    <div>
                      <p className="text-sm font-medium text-white">{r.currency === 'USD' ? 'Dólar' : 'Euro'}</p>
                      <p className="text-xs text-white/40">{formatDateTime(r.created_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#D9A928]">Bs {r.rate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment methods */}
      {tab === 'pagos' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Agregar método de pago</h3>
            <div className="flex gap-3">
              <input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} className="input flex-1" placeholder="Ej: Pago móvil" />
              <button onClick={addMethod} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Métodos configurados</h3>
            <div className="space-y-2">
              {methods.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                  <p className="text-sm text-white">{m.name}</p>
                  <button onClick={() => toggleMethod(m.id, m.status)}>
                    <StatusBadge status={m.status} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff */}
      {tab === 'empleados' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Empleados registrados</h3>
            {staff.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">Sin empleados registrados</p>
            ) : (
              <div className="space-y-2">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0e2a4d] flex items-center justify-center text-sm font-semibold text-[#00BFFF]">
                        {s.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{s.full_name}</p>
                        <p className="text-xs text-white/40">{s.phone ?? 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50 capitalize">{s.role?.name ?? 'Sin rol'}</span>
                      <StatusBadge status={s.is_active ? 'activo' : 'inactivo'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreditCardIcon() {
  return <span className="text-xs">💳</span>;
}
function UsersIcon() {
  return <span className="text-xs">👤</span>;
}
