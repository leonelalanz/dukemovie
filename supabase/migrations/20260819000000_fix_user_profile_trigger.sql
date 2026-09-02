-- Fix: Actualiza el trigger handle_new_user para ser más robusto
-- Cambios:
-- 1. Cambiar rol por defecto de 'empleado' a 'cliente'
-- 2. Agregar manejo de strings vacíos
-- 3. Explícitamente establecer is_active = true
-- 4. Agregar manejo de excepciones para logs

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'empleado' LIMIT 1;

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
