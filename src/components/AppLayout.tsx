import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  LifeBuoy,
  Settings,
  LogOut,
  Bell,
  Film,
  Menu,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

const navItems = [
  { to: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicios', label: 'Servicios', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/renovaciones', label: 'Renovaciones', icon: RefreshCw },
  { to: '/soporte', label: 'Soporte', icon: LifeBuoy },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

const bottomNavItems = [
  { to: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/renovaciones', label: 'Renovar', icon: RefreshCw },
  { to: '/configuracion', label: 'Ajustes', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast('Sesión cerrada', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#020B1A]">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#061528] border-r border-[#0e2a4d] hidden md:flex flex-col z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#0e2a4d]">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00BFFF] to-[#0066AA] flex items-center justify-center">
            <Film className="w-6 h-6 text-[#020B1A]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Duke Movie</h1>
            <p className="text-xs text-[#00BFFF] mt-0.5">Streaming Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20'
                    : 'text-white/60 hover:text-white hover:bg-[#0e2a4d]/50'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[#0e2a4d]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-[#0e2a4d] flex items-center justify-center text-sm font-semibold text-[#00BFFF]">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-white/40 capitalize">{profile?.role?.name}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#061528] border-b border-[#0e2a4d] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00BFFF] to-[#0066AA] flex items-center justify-center">
            <Film className="w-5 h-5 text-[#020B1A]" />
          </div>
          <span className="font-bold text-white">Duke Movie</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#061528] border-l border-[#0e2a4d] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-[#0e2a4d] flex items-center justify-between">
              <span className="font-bold text-white">Menú</span>
              <button onClick={() => setMobileOpen(false)} className="text-white/50"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-[#00BFFF]/10 text-[#00BFFF]'
                        : 'text-white/60 hover:text-white hover:bg-[#0e2a4d]/50'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-[#0e2a4d]">
              <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-red-400 w-full">
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#061528] border-t border-[#0e2a4d] flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all',
                isActive ? 'text-[#00BFFF]' : 'text-white/50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
