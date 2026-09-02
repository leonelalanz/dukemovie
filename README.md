# Duke Movie

Aplicación web responsive tipo PWA para la gestión de venta y renovación de servicios digitales de streaming.

## Características

- **Autenticación** con Supabase (inicio de sesión, registro, recuperación de contraseña)
- **Dashboard** con tarjetas de resumen, gráficos de ventas e ingresos
- **Gestión de clientes** con búsqueda, filtros, historial completo y exportación a CSV
- **Catálogo de servicios** configurable (Netflix, Disney+, Spotify, etc.)
- **Ventas y suscripciones** con cálculo automático de vencimiento
- **Pagos** con verificación, comprobantes y múltiples métodos
- **Renovaciones** con filtros por días restantes y mensajes de WhatsApp
- **Soporte** con tickets, prioridades, mensajes y verificación de garantía
- **Configuración** del negocio, tasas de cambio, métodos de pago y empleados
- **Diseño mobile first** con menú lateral en escritorio y navegación inferior en móviles
- **Instalable como PWA**

## Tecnologías

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (base de datos, autenticación, almacenamiento)
- React Router
- Lucide React (iconos)
- Recharts (gráficos)
- vite-plugin-pwa

## Configuración

### Variables de entorno

El proyecto incluye un archivo `.env` con las credenciales de Supabase preconfiguradas:

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave-anon>
```

### Base de datos

La base de datos de Supabase ya está configurada con todas las tablas, políticas RLS y datos de ejemplo. Las tablas incluyen:

- `profiles`, `roles`, `permissions`, `role_permissions`
- `clients`, `services`, `subscriptions`, `renewals`
- `payments`, `payment_methods`, `exchange_rates`
- `provider_accounts`, `account_slots`, `assignments`
- `support_tickets`, `ticket_messages`
- `notifications`, `business_settings`, `audit_logs`

### Instalación

```bash
npm install
npm run dev
```

### Compilar para producción

```bash
npm run build
npm run preview
```

## Uso

1. Crea una cuenta desde la página de registro (el primer usuario puede asignarse como administrador desde Supabase)
2. Accede al dashboard para ver el resumen general
3. Registra clientes, servicios y ventas
4. Gestiona renovaciones y soporte
5. Configura el negocio desde la sección de ajustes

## Datos de contacto

- WhatsApp: 0414-0265515
- Horario: Lunes a domingo, de 10:00 a. m. a 10:00 p. m.
