import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Tv, AlertTriangle, AlertCircle, Users,
  LifeBuoy, RefreshCw, ShoppingCart, UserPlus, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysRemaining } from '@/lib/utils';
import { Skeleton } from '@/components/ui';
import type { Subscription, Payment, Client, SupportTicket } from '@/types';

interface DashboardData {
  todaySales: number;
  monthRevenue: number;
  monthProviderCost: number;
  activeSubs: number;
  expiringSoon: number;
  expired: number;
  totalClients: number;
  pendingTickets: number;
  monthRenewals: number;
  salesByDay: { day: string; total: number }[];
  revenueByMonth: { month: string; total: number }[];
  salesByService: { name: string; value: number }[];
  upcomingRenewals: Subscription[];
  recentPayments: Payment[];
}

const PIE_COLORS = ['#00BFFF', '#D9A928', '#33CCFF', '#E8BE4A', '#66D9FF', '#F0D075', '#123a63'];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);

      const [
        subsRes, paymentsRes, clientsRes, ticketsRes, renewalsRes, ratesRes,
      ] = await Promise.all([
        supabase.from('subscriptions').select('*, client:clients(*), service:services(*)').order('created_at', { ascending: false }),
        supabase.from('payments').select('*, client:clients(*)').order('created_at', { ascending: false }).limit(10),
        supabase.from('clients').select('id, status, deleted_at').is('deleted_at', null),
        supabase.from('support_tickets').select('id, status'),
        supabase.from('renewals').select('created_at').gte('created_at', monthStart),
        supabase.from('exchange_rates').select('currency, rate').order('created_at', { ascending: false }),
      ]);

      const subs = (subsRes.data ?? []) as Subscription[];
      const payments = (paymentsRes.data ?? []) as Payment[];
      const clients = (clientsRes.data ?? []) as Client[];
      const tickets = (ticketsRes.data ?? []) as SupportTicket[];
      const renewals = renewalsRes.data ?? [];

      const ratesMap = new Map<string, number>();
      (ratesRes.data ?? []).forEach((r: any) => {
        if (!ratesMap.has(r.currency)) ratesMap.set(r.currency, r.rate);
      });

      const todaySales = subs.filter(s => s.created_at.slice(0, 10) === todayStr).length;

      const monthSubs = subs.filter(s => s.created_at.slice(0, 10) >= monthStart);

      const monthRevenue = monthSubs.reduce((sum, s) => {
        const rate = s.currency === 'BS' ? 1 : (ratesMap.get(s.currency) ?? 1);
        const revenue = s.price * rate;
        const cost = (s.service?.internal_cost ?? 0) * rate;
        const profit = revenue - cost;
        return sum + profit;
      }, 0);

      const monthProviderCost = monthSubs.reduce((sum, s) => {
        const rate = s.currency === 'BS' ? 1 : (ratesMap.get(s.currency) ?? 1);
        const cost = (s.service?.internal_cost ?? 0) * rate;
        return sum + cost;
      }, 0);
      const activeSubs = subs.filter(s => s.status === 'activa' || s.status === 'proxima_vencer').length;
      const expiringSoon = subs.filter(s => {
        const days = daysRemaining(s.end_date);
        return days >= 0 && days <= 7 && s.status !== 'vencida' && s.status !== 'cancelada';
      }).length;
      const expired = subs.filter(s => s.status === 'vencida').length;
      const totalClients = clients.filter(c => c.status === 'activo').length;
      const pendingTickets = tickets.filter(t => t.status === 'abierto' || t.status === 'en_revision').length;
      const monthRenewals = renewals.length;

      // Sales by day (last 7 days)
      const salesByDay: { day: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const dStr = d.toISOString().slice(0, 10);
        const count = subs.filter(s => s.created_at.slice(0, 10) === dStr).length;
        salesByDay.push({
          day: d.toLocaleDateString('es-VE', { weekday: 'short' }),
          total: count,
        });
      }

      // Revenue by month (last 6 months)
      const revenueByMonth: { month: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mStart = d.toISOString().slice(0, 10);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
        const total = subs
          .filter(s => s.created_at.slice(0, 10) >= mStart && s.created_at.slice(0, 10) <= mEnd)
          .reduce((sum, s) => {
            const rate = s.currency === 'BS' ? 1 : (ratesMap.get(s.currency) ?? 1);
            const revenue = s.price * rate;
            const cost = (s.service?.internal_cost ?? 0) * rate;
            const profit = revenue - cost;
            return sum + profit;
          }, 0);
        revenueByMonth.push({
          month: d.toLocaleDateString('es-VE', { month: 'short' }),
          total,
        });
      }

      // Sales by service
      const serviceMap = new Map<string, number>();
      subs.forEach(s => {
        const name = s.service?.name ?? 'Otro';
        serviceMap.set(name, (serviceMap.get(name) ?? 0) + 1);
      });
      const salesByService = Array.from(serviceMap.entries()).map(([name, value]) => ({ name, value }));

      // Upcoming renewals
      const upcomingRenewals = subs
        .filter(s => {
          const days = daysRemaining(s.end_date);
          return days >= 0 && days <= 7 && s.status !== 'vencida' && s.status !== 'cancelada';
        })
        .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        .slice(0, 5);

      setData({
        todaySales, monthRevenue, monthProviderCost, activeSubs, expiringSoon, expired,
        totalClients, pendingTickets, monthRenewals,
        salesByDay, revenueByMonth, salesByService,
        upcomingRenewals, recentPayments: payments.slice(0, 5),
      });
      setLoading(false);
    };

  useEffect(() => {
    loadDashboard();

    const subscription = supabase
      .channel('subscriptions_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => loadDashboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => loadDashboard()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cards = useMemo(() => [
    { label: 'Ventas de hoy', value: data?.todaySales ?? 0, icon: ShoppingCart, color: 'text-[#00BFFF]', bg: 'bg-[#00BFFF]/10' },
    { label: 'Ganancia del mes', value: formatCurrency(data?.monthRevenue ?? 0, 'BS'), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Dinero al proveedor', value: formatCurrency(data?.monthProviderCost ?? 0, 'BS'), icon: DollarSign, color: 'text-[#D9A928]', bg: 'bg-[#D9A928]/10' },
    { label: 'Servicios activos', value: data?.activeSubs ?? 0, icon: Tv, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Por vencer', value: data?.expiringSoon ?? 0, icon: AlertTriangle, color: 'text-[#D9A928]', bg: 'bg-[#D9A928]/10' },
    { label: 'Vencidos', value: data?.expired ?? 0, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Clientes', value: data?.totalClients ?? 0, icon: Users, color: 'text-[#00BFFF]', bg: 'bg-[#00BFFF]/10' },
    { label: 'Tickets pendientes', value: data?.pendingTickets ?? 0, icon: LifeBuoy, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Renovaciones del mes', value: data?.monthRenewals ?? 0, icon: RefreshCw, color: 'text-[#D9A928]', bg: 'bg-[#D9A928]/10' },
  ], [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Panel principal</h1>
        <p className="text-white/50 text-sm mt-1">Resumen general del sistema</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card card-hover p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-white/50 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/ventas/nueva" className="btn-primary inline-flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Registrar venta
        </Link>
        <Link to="/clientes/nuevo" className="btn-secondary inline-flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo cliente
        </Link>
        <Link to="/renovaciones" className="btn-gold inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Procesar renovación
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00BFFF]" />
            Ventas de los últimos 7 días
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.salesByDay}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00BFFF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00BFFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e2a4d" />
              <XAxis dataKey="day" stroke="#ffffff40" fontSize={12} />
              <YAxis stroke="#ffffff40" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0a1f3a', border: '1px solid #0e2a4d', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#00BFFF' }}
              />
              <Area type="monotone" dataKey="total" stroke="#00BFFF" strokeWidth={2} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#D9A928]" />
            Ingresos mensuales
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e2a4d" />
              <XAxis dataKey="month" stroke="#ffffff40" fontSize={12} />
              <YAxis stroke="#ffffff40" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#0a1f3a', border: '1px solid #0e2a4d', borderRadius: '8px', color: '#fff' }}
                formatter={(v) => formatCurrency(Number(v), 'BS')}
              />
              <Bar dataKey="total" fill="#D9A928" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales distribution + upcoming renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Distribución de ventas por servicio</h3>
          {data?.salesByService.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.salesByService} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                  {data.salesByService.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0a1f3a', border: '1px solid #0e2a4d', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">Sin datos suficientes</div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#D9A928]" />
              Renovaciones próximas
            </h3>
            <Link to="/renovaciones" className="text-xs text-[#00BFFF] hover:text-[#33CCFF] flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data?.upcomingRenewals.length ? (
            <div className="space-y-2">
              {data.upcomingRenewals.map((sub) => {
                const days = daysRemaining(sub.end_date);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                    <div>
                      <p className="text-sm font-medium text-white">{sub.client?.first_name} {sub.client?.last_name}</p>
                      <p className="text-xs text-white/50">{sub.service?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${days <= 3 ? 'text-red-400' : 'text-[#D9A928]'}`}>
                        {days === 0 ? 'Hoy' : `${days} días`}
                      </p>
                      <p className="text-xs text-white/40">{formatDate(sub.end_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">No hay renovaciones próximas</div>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-4">Movimientos recientes</h3>
        {data?.recentPayments.length ? (
          <div className="space-y-2">
            {data.recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[#061528] border border-[#0e2a4d]">
                <div>
                  <p className="text-sm font-medium text-white">{p.client?.first_name} {p.client?.last_name}</p>
                  <p className="text-xs text-white/50">{p.payment_method} — {formatDate(p.created_at)}</p>
                </div>
                <p className="text-sm font-semibold text-[#D9A928]">{formatCurrency(p.amount, p.currency)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-white/30 text-sm">Sin movimientos recientes</div>
        )}
      </div>
    </div>
  );
}
