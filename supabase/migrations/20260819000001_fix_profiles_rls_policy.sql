-- Fix: Actualiza la política RLS de profiles para permitir que el trigger inserte
-- El problema: el trigger handle_new_user() no puede insertar en profiles debido a RLS
-- La solución: permitir INSERT cuando auth.uid() = id (el usuario siendo creado)

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
