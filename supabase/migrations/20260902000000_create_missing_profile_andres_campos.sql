-- Fix: Mejorar trigger handle_new_user para crear perfiles automáticamente
-- El problema: el trigger original no crea perfiles para usuarios registrados
-- La solución: recrear el trigger con mejor manejo de errores y permisos

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Obtener el rol de administrador para nuevos usuarios staff
  SELECT id INTO v_role_id FROM roles WHERE name = 'administrador' LIMIT 1;

  -- Si no encuentra el rol, usa el de cliente como fallback
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE name = 'cliente' LIMIT 1;
  END IF;

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
  -- Log the error but don't fail the user creation
  RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que el trigger existe y está activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
