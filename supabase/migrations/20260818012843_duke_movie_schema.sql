/*
# Duke Movie - Esquema completo de base de datos

## Resumen
Crea el esquema completo para la gestión de venta y renovación de servicios
digitales de streaming. Incluye autenticación, clientes, servicios, suscripciones,
renovaciones, pagos, inventario de accesos, soporte, notificaciones y configuración.

## Tablas nuevas
- roles, permissions, role_permissions
- profiles (extiende auth.users con rol y datos)
- clients (clientes con datos de contacto e historial)
- services (catálogo de servicios de streaming)
- subscriptions (suscripciones/ventas activas)
- renewals (historial de renovaciones)
- payment_methods (métodos configurables)
- payments (pagos con comprobante y tasa de cambio)
- exchange_rates (tasa del dólar y euro)
- provider_accounts (cuentas del proveedor con cupos)
- account_slots (perfiles/cupos individuales)
- assignments (asignación de cupo a suscripción)
- support_tickets (tickets de soporte y garantías)
- ticket_messages (mensajes de tickets)
- notifications (centro de notificaciones)
- business_settings (datos del negocio)
- audit_logs (bitácora de acciones sensibles)

## Seguridad
- RLS habilitado en todas las tablas.
- Usuarios autenticados (staff) con acceso completo a datos operacionales.
- Perfiles: cada usuario lee/actualiza el suyo.

## Notas
- Claves primarias UUID.
- created_at y updated_at en todas las tablas.
- Soft delete (deleted_at) en clients y services.
- Índices en columnas de búsqueda frecuente.
- Datos de ejemplo incluidos.
*/

-- ============================================================
-- ROLES Y PERMISOS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  key text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role_id uuid REFERENCES roles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  id_number text,
  phone text NOT NULL,
  email text,
  address text,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','inactivo')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(lower(first_name), lower(last_name));
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_id_number ON clients(id_number);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  description text,
  category text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BS' CHECK (currency IN ('BS','USD','EUR')),
  duration_days integer NOT NULL DEFAULT 30,
  access_type text NOT NULL DEFAULT 'perfil' CHECK (access_type IN ('perfil','cuenta_completa','plan_familiar','cupo','otro')),
  quantity_available integer DEFAULT 0,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','inactivo')),
  instructions text,
  warranty_days integer DEFAULT 0,
  internal_cost numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(lower(name));

-- ============================================================
-- SUBSCRIPTIONS (Suscripciones / Ventas)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  modality text NOT NULL DEFAULT 'perfil',
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BS' CHECK (currency IN ('BS','USD','EUR')),
  payment_method text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','activa','proxima_vencer','vencida','suspendida','cancelada')),
  assigned_access text,
  warranty_days integer DEFAULT 0,
  employee_id uuid REFERENCES profiles(id),
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subs_service ON subscriptions(service_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subs_operation ON subscriptions(operation_number);

-- ============================================================
-- RENEWALS
-- ============================================================
CREATE TABLE IF NOT EXISTS renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BS' CHECK (currency IN ('BS','USD','EUR')),
  payment_method text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  processed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewals_sub ON renewals(subscription_id);
CREATE INDEX IF NOT EXISTS idx_renewals_client ON renewals(client_id);

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','inactivo')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BS' CHECK (currency IN ('BS','USD','EUR')),
  exchange_rate numeric(12,4) DEFAULT 1,
  bs_equivalent numeric(12,2) DEFAULT 0,
  payment_method text,
  reference text,
  bank text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','verificado','rechazado','reembolsado')),
  verified_by uuid REFERENCES profiles(id),
  observations text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_sub ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- ============================================================
-- EXCHANGE RATES
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL CHECK (currency IN ('USD','EUR')),
  rate numeric(12,4) NOT NULL,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_currency ON exchange_rates(currency, created_at DESC);

-- ============================================================
-- PROVIDER ACCOUNTS (Inventario de accesos)
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  email text NOT NULL,
  account_type text NOT NULL DEFAULT 'cuenta_completa',
  total_slots integer NOT NULL DEFAULT 1,
  occupied_slots integer NOT NULL DEFAULT 0,
  acquired_date date,
  provider_expiry date,
  cost numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','inactivo','vencido')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_service ON provider_accounts(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_status ON provider_accounts(status);

-- ============================================================
-- ACCOUNT SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS account_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_account_id uuid NOT NULL REFERENCES provider_accounts(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','ocupado','bloqueado')),
  assigned_to uuid REFERENCES clients(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slots_provider ON account_slots(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON account_slots(status);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  provider_account_id uuid NOT NULL REFERENCES provider_accounts(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES account_slots(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','liberada')),
  created_at timestamptz DEFAULT now(),
  released_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assign_sub ON assignments(subscription_id);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  problem_type text NOT NULL DEFAULT 'otro',
  description text,
  image_url text,
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baja','media','alta','critica')),
  status text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','en_revision','esperando_cliente','resuelto','cerrado')),
  responsible_id uuid REFERENCES profiles(id),
  solution text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_client ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON support_tickets(code);

-- ============================================================
-- TICKET MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message text NOT NULL,
  sent_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_ticket ON ticket_messages(ticket_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- ============================================================
-- BUSINESS SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Duke Movie',
  logo_url text,
  whatsapp_number text NOT NULL DEFAULT '0414-0265515',
  schedule text NOT NULL DEFAULT 'Lunes a domingo, de 10:00 a. m. a 10:00 p. m.',
  main_currency text NOT NULL DEFAULT 'BS',
  default_duration integer DEFAULT 30,
  default_warranty integer DEFAULT 7,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated ON clients;
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated ON services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_subs_updated ON subscriptions;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_provider_updated ON provider_accounts;
CREATE TRIGGER trg_provider_updated BEFORE UPDATE ON provider_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated ON business_settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: ¿es staff?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
SELECT EXISTS (
  SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
  WHERE p.id = auth.uid() AND r.name IN ('administrador','empleado')
);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: ¿es admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
SELECT EXISTS (
  SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
  WHERE p.id = auth.uid() AND r.name = 'administrador'
);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: cada usuario lee/actualiza su propio perfil; staff lee todos
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_staff());

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

-- Roles y permisos: solo staff lee
DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "perms_select" ON permissions;
CREATE POLICY "perms_select" ON permissions FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "role_perms_select" ON role_permissions;
CREATE POLICY "role_perms_select" ON role_permissions FOR SELECT
  TO authenticated USING (is_staff());

-- Clients: staff CRUD completo
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE
  TO authenticated USING (is_staff());

-- Services: staff CRUD; activos visibles para todos
DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services FOR SELECT
  TO authenticated USING (is_staff() OR status = 'activo');

DROP POLICY IF EXISTS "services_insert" ON services;
CREATE POLICY "services_insert" ON services FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "services_update" ON services;
CREATE POLICY "services_update" ON services FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "services_delete" ON services;
CREATE POLICY "services_delete" ON services FOR DELETE
  TO authenticated USING (is_staff());

-- Subscriptions: staff CRUD
DROP POLICY IF EXISTS "subs_select" ON subscriptions;
CREATE POLICY "subs_select" ON subscriptions FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "subs_insert" ON subscriptions;
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "subs_update" ON subscriptions;
CREATE POLICY "subs_update" ON subscriptions FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "subs_delete" ON subscriptions;
CREATE POLICY "subs_delete" ON subscriptions FOR DELETE
  TO authenticated USING (is_staff());

-- Renewals: staff CRUD
DROP POLICY IF EXISTS "renewals_select" ON renewals;
CREATE POLICY "renewals_select" ON renewals FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "renewals_insert" ON renewals;
CREATE POLICY "renewals_insert" ON renewals FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "renewals_update" ON renewals;
CREATE POLICY "renewals_update" ON renewals FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "renewals_delete" ON renewals;
CREATE POLICY "renewals_delete" ON renewals FOR DELETE
  TO authenticated USING (is_staff());

-- Payment methods: staff CRUD
DROP POLICY IF EXISTS "pm_select" ON payment_methods;
CREATE POLICY "pm_select" ON payment_methods FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "pm_insert" ON payment_methods;
CREATE POLICY "pm_insert" ON payment_methods FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "pm_update" ON payment_methods;
CREATE POLICY "pm_update" ON payment_methods FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "pm_delete" ON payment_methods;
CREATE POLICY "pm_delete" ON payment_methods FOR DELETE
  TO authenticated USING (is_staff());

-- Payments: staff CRUD
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE
  TO authenticated USING (is_staff());

-- Exchange rates: staff CRUD
DROP POLICY IF EXISTS "er_select" ON exchange_rates;
CREATE POLICY "er_select" ON exchange_rates FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "er_insert" ON exchange_rates;
CREATE POLICY "er_insert" ON exchange_rates FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "er_update" ON exchange_rates;
CREATE POLICY "er_update" ON exchange_rates FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "er_delete" ON exchange_rates;
CREATE POLICY "er_delete" ON exchange_rates FOR DELETE
  TO authenticated USING (is_staff());

-- Provider accounts: staff CRUD
DROP POLICY IF EXISTS "pa_select" ON provider_accounts;
CREATE POLICY "pa_select" ON provider_accounts FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "pa_insert" ON provider_accounts;
CREATE POLICY "pa_insert" ON provider_accounts FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "pa_update" ON provider_accounts;
CREATE POLICY "pa_update" ON provider_accounts FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "pa_delete" ON provider_accounts;
CREATE POLICY "pa_delete" ON provider_accounts FOR DELETE
  TO authenticated USING (is_staff());

-- Account slots: staff CRUD
DROP POLICY IF EXISTS "slots_select" ON account_slots;
CREATE POLICY "slots_select" ON account_slots FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "slots_insert" ON account_slots;
CREATE POLICY "slots_insert" ON account_slots FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "slots_update" ON account_slots;
CREATE POLICY "slots_update" ON account_slots FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "slots_delete" ON account_slots;
CREATE POLICY "slots_delete" ON account_slots FOR DELETE
  TO authenticated USING (is_staff());

-- Assignments: staff CRUD
DROP POLICY IF EXISTS "assign_select" ON assignments;
CREATE POLICY "assign_select" ON assignments FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "assign_insert" ON assignments;
CREATE POLICY "assign_insert" ON assignments FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "assign_update" ON assignments;
CREATE POLICY "assign_update" ON assignments FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "assign_delete" ON assignments;
CREATE POLICY "assign_delete" ON assignments FOR DELETE
  TO authenticated USING (is_staff());

-- Support tickets: staff CRUD
DROP POLICY IF EXISTS "tickets_select" ON support_tickets;
CREATE POLICY "tickets_select" ON support_tickets FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "tickets_update" ON support_tickets;
CREATE POLICY "tickets_update" ON support_tickets FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "tickets_delete" ON support_tickets;
CREATE POLICY "tickets_delete" ON support_tickets FOR DELETE
  TO authenticated USING (is_staff());

-- Ticket messages: staff CRUD
DROP POLICY IF EXISTS "tmsg_select" ON ticket_messages;
CREATE POLICY "tmsg_select" ON ticket_messages FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "tmsg_insert" ON ticket_messages;
CREATE POLICY "tmsg_insert" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "tmsg_update" ON ticket_messages;
CREATE POLICY "tmsg_update" ON ticket_messages FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "tmsg_delete" ON ticket_messages;
CREATE POLICY "tmsg_delete" ON ticket_messages FOR DELETE
  TO authenticated USING (is_staff());

-- Notifications: staff ve todas; cada usuario ve las suyas
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (is_staff() OR user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (is_staff() OR user_id = auth.uid()) WITH CHECK (is_staff() OR user_id = auth.uid());

DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  TO authenticated USING (is_staff() OR user_id = auth.uid());

-- Business settings: staff lee; staff update
DROP POLICY IF EXISTS "settings_select" ON business_settings;
CREATE POLICY "settings_select" ON business_settings FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "settings_insert" ON business_settings;
CREATE POLICY "settings_insert" ON business_settings FOR INSERT
  TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "settings_update" ON business_settings;
CREATE POLICY "settings_update" ON business_settings FOR UPDATE
  TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "settings_delete" ON business_settings;
CREATE POLICY "settings_delete" ON business_settings FOR DELETE
  TO authenticated USING (is_staff());

-- Audit logs: staff lee; staff insert
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (is_staff());

-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO roles (name, description) VALUES
  ('administrador', 'Acceso completo al sistema'),
  ('empleado', 'Acceso limitado configurable'),
  ('cliente', 'Acceso al portal del cliente')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, key, description) VALUES
  ('Gestionar clientes', 'manage_clients', 'Crear, editar y eliminar clientes'),
  ('Gestionar servicios', 'manage_services', 'Administrar catálogo de servicios'),
  ('Registrar ventas', 'manage_sales', 'Registrar nuevas ventas y suscripciones'),
  ('Gestionar pagos', 'manage_payments', 'Verificar y gestionar pagos'),
  ('Gestionar renovaciones', 'manage_renewals', 'Procesar renovaciones'),
  ('Ver credenciales', 'view_credentials', 'Ver credenciales sensibles'),
  ('Gestionar soporte', 'manage_support', 'Administrar tickets de soporte'),
  ('Gestionar empleados', 'manage_staff', 'Administrar empleados y permisos'),
  ('Ver reportes', 'view_reports', 'Acceder a reportes y estadísticas'),
  ('Configurar sistema', 'manage_settings', 'Configurar el sistema')
ON CONFLICT (key) DO NOTHING;

-- Asignar todos los permisos al rol administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'administrador'
ON CONFLICT DO NOTHING;

-- Métodos de pago
INSERT INTO payment_methods (name, status) VALUES
  ('Pago móvil', 'activo'),
  ('Transferencia bancaria', 'activo'),
  ('Efectivo', 'activo'),
  ('Zelle', 'activo'),
  ('Binance', 'activo'),
  ('PayPal', 'activo'),
  ('Otro', 'activo')
ON CONFLICT (name) DO NOTHING;

-- Servicios de ejemplo
INSERT INTO services (name, description, category, price, currency, duration_days, access_type, quantity_available, status, warranty_days, instructions) VALUES
  ('Netflix', 'Streaming de películas y series', 'Streaming', 3900, 'BS', 30, 'perfil', 5, 'activo', 7, 'Se entrega perfil individual con acceso a todo el catálogo'),
  ('YouTube Premium', 'Sin anuncios y música de fondo', 'Streaming', 2500, 'BS', 30, 'cuenta_completa', 3, 'activo', 7, 'Acceso completo a YouTube sin anuncios'),
  ('Disney+', 'Películas de Disney, Marvel y Star Wars', 'Streaming', 3500, 'BS', 30, 'perfil', 4, 'activo', 7, 'Perfil individual del plan familiar'),
  ('Max', 'Contenido de HBO y Warner', 'Streaming', 3200, 'BS', 30, 'perfil', 4, 'activo', 7, 'Perfil individual con acceso completo'),
  ('Prime Video', 'Películas y series de Amazon', 'Streaming', 2800, 'BS', 30, 'perfil', 4, 'activo', 7, 'Perfil individual del plan familiar'),
  ('Crunchyroll', 'Anime y contenido japonés', 'Streaming', 2000, 'BS', 30, 'cuenta_completa', 3, 'activo', 7, 'Acceso completo a Crunchyroll'),
  ('Spotify', 'Música sin anuncios y offline', 'Música', 1800, 'BS', 30, 'cuenta_completa', 6, 'activo', 7, 'Cuenta completa con música premium')
ON CONFLICT DO NOTHING;

-- Configuración del negocio
INSERT INTO business_settings (name, whatsapp_number, schedule, main_currency, default_duration, default_warranty)
VALUES ('Duke Movie', '0414-0265515', 'Lunes a domingo, de 10:00 a. m. a 10:00 p. m.', 'BS', 30, 7)
ON CONFLICT DO NOTHING;

-- Tasa de cambio inicial
INSERT INTO exchange_rates (currency, rate) VALUES
  ('USD', 150.00),
  ('EUR', 165.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'cliente' LIMIT 1;

  INSERT INTO profiles (id, full_name, phone, role_id, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Usuario'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    v_role_id,
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();