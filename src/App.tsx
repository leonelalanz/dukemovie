import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { RecoveryPage } from '@/pages/auth/RecoveryPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClientsPage, ClientFormPage, ClientDetailPage } from '@/pages/ClientsPage';
import { ServicesPage, ServiceFormPage } from '@/pages/ServicesPage';
import { SalesPage, NewSalePage, EditSalePage } from '@/pages/SalesPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { RenewalsPage } from '@/pages/RenewalsPage';
import { SupportPage } from '@/pages/SupportPage';
import { SettingsPage } from '@/pages/SettingsPage';

function ClientDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ClientDetailPage clientId={id ?? ''} />;
}

function ClientEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <ClientFormPage clientId={id ?? ''} />;
}

function ServiceEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <ServiceFormPage serviceId={id ?? ''} />;
}

function SaleEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <EditSalePage saleId={id ?? ''} />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<SignupPage />} />
            <Route path="/recuperar" element={<RecoveryPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><AppLayout><ClientsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/nuevo" element={<ProtectedRoute><AppLayout><ClientFormPage /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><AppLayout><ClientDetailRoute /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/:id/editar" element={<ProtectedRoute><AppLayout><ClientEditRoute /></AppLayout></ProtectedRoute>} />
            <Route path="/servicios" element={<ProtectedRoute><AppLayout><ServicesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/servicios/nuevo" element={<ProtectedRoute><AppLayout><ServiceFormPage /></AppLayout></ProtectedRoute>} />
            <Route path="/servicios/:id/editar" element={<ProtectedRoute><AppLayout><ServiceEditRoute /></AppLayout></ProtectedRoute>} />
            <Route path="/ventas" element={<ProtectedRoute><AppLayout><SalesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/ventas/nueva" element={<ProtectedRoute><AppLayout><NewSalePage /></AppLayout></ProtectedRoute>} />
            <Route path="/ventas/:id/editar" element={<ProtectedRoute><AppLayout><SaleEditRoute /></AppLayout></ProtectedRoute>} />
            <Route path="/pagos" element={<ProtectedRoute><AppLayout><PaymentsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/renovaciones" element={<ProtectedRoute><AppLayout><RenewalsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/soporte" element={<ProtectedRoute><AppLayout><SupportPage /></AppLayout></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
