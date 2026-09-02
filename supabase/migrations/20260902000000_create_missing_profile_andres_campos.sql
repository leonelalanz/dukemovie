-- Fix: Crear perfil faltante para Andres Campos
-- Andres Campos fue creado en auth.users pero su perfil nunca se creó
-- Este script inserta el perfil faltante con los datos correctos

INSERT INTO profiles (id, full_name, phone, role_id, is_active)
SELECT
  '74e39443-c6fa-4abe-9548-e290bf4e5b0b'::uuid as id,
  'Andres Campos' as full_name,
  NULL as phone,
  roles.id as role_id,
  true as is_active
FROM roles
WHERE roles.name = 'administrador'
ON CONFLICT (id) DO NOTHING;
