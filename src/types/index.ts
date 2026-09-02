export type Role = 'administrador' | 'empleado' | 'cliente';

export type Currency = 'BS' | 'USD' | 'EUR';

export type SubscriptionStatus =
  | 'pendiente'
  | 'activa'
  | 'proxima_vencer'
  | 'vencida'
  | 'suspendida'
  | 'cancelada';

export type PaymentStatus = 'pendiente' | 'verificado' | 'rechazado' | 'reembolsado';

export type TicketStatus =
  | 'abierto'
  | 'en_revision'
  | 'esperando_cliente'
  | 'resuelto'
  | 'cerrado';

export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: RoleData;
}

export interface RoleData {
  id: string;
  name: Role;
  description: string | null;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string | null;
  id_number: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  status: 'activo' | 'inactivo';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Service {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  category: string | null;
  price: number;
  currency: Currency;
  duration_days: number;
  access_type: string;
  quantity_available: number;
  status: 'activo' | 'inactivo';
  instructions: string | null;
  warranty_days: number;
  internal_cost: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Subscription {
  id: string;
  operation_number: string;
  client_id: string;
  service_id: string;
  modality: string;
  price: number;
  currency: Currency;
  payment_method: string | null;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  assigned_access: string | null;
  warranty_days: number;
  employee_id: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  service?: Service;
  employee?: Pick<Profile, 'id' | 'full_name'>;
}

export interface Renewal {
  id: string;
  subscription_id: string;
  client_id: string;
  price: number;
  currency: Currency;
  payment_method: string | null;
  start_date: string;
  end_date: string;
  processed_by: string | null;
  created_at: string;
  client?: Client;
  service?: Service;
  subscription?: Subscription;
}

export interface PaymentMethod {
  id: string;
  name: string;
  status: 'activo' | 'inactivo';
}

export interface Payment {
  id: string;
  client_id: string;
  subscription_id: string | null;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  bs_equivalent: number;
  payment_method: string | null;
  reference: string | null;
  bank: string | null;
  status: PaymentStatus;
  verified_by: string | null;
  observations: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  subscription?: Subscription;
}

export interface ExchangeRate {
  id: string;
  currency: 'USD' | 'EUR';
  rate: number;
  updated_by: string | null;
  created_at: string;
}

export interface ProviderAccount {
  id: string;
  service_id: string | null;
  email: string;
  account_type: string;
  total_slots: number;
  occupied_slots: number;
  acquired_date: string | null;
  provider_expiry: string | null;
  cost: number;
  status: 'activo' | 'inactivo' | 'vencido';
  notes: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export interface AccountSlot {
  id: string;
  provider_account_id: string;
  slot_number: number;
  status: 'disponible' | 'ocupado' | 'bloqueado';
  assigned_to: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  subscription_id: string;
  provider_account_id: string;
  slot_id: string | null;
  status: 'activa' | 'liberada';
  created_at: string;
  released_at: string | null;
}

export interface SupportTicket {
  id: string;
  code: string;
  client_id: string;
  service_id: string | null;
  problem_type: string;
  description: string | null;
  image_url: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  responsible_id: string | null;
  solution: string | null;
  created_at: string;
  closed_at: string | null;
  client?: Client;
  service?: Service;
  responsible?: Pick<Profile, 'id' | 'full_name'>;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  sent_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  user_id: string | null;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  name: string;
  logo_url: string | null;
  whatsapp_number: string;
  schedule: string;
  main_currency: Currency;
  default_duration: number;
  default_warranty: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}
