-- =========================================================================================
--  FIT APP V2 - SUPABASE SQL SCHEMA
--  Execute esse script inteiro no "SQL Editor" do seu painel do Supabase.
-- =========================================================================================

-- Limpeza caso rode múltiplas vezes (Atenção, drops nas tabelas apagará dados nelas)
-- DROP TABLE IF EXISTS execution_logs, exercises, workout_groups, workout_plans, profiles;

-- 1. Criação da Tabela de Perfis
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('ADMIN', 'PROFESSOR', 'ALUNO')),
  full_name text,
  professor_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- Se for aluno, tem um professor atrelado
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Planos de Treino (Periodização)
CREATE TABLE workout_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Grupos de Exercícios (Ex: "Bíceps e Tríceps")
CREATE TABLE workout_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Exercícios DENTRO de cada grupo
CREATE TABLE exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES workout_groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sets text,
  reps text,
  load text,
  rest text,
  obs text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Log de Execução (Modo Foco Finalizado)
CREATE TABLE execution_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES workout_groups(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes text
);

-- =========================================================================================
-- TRIGGER AUTOMÁTICA: AO CADASTRAR UM NOVO LOGIN NO SUPABASE -> INSERIR EM PROFILES
-- =========================================================================================
-- Esta função extrai o perfil escolhido do metadata preenchido no React (ex: role = 'ALUNO')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, professor_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'ALUNO'),
    NULLIF(NEW.raw_user_meta_data->>'professor_id', '')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho de fato:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =========================================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- =========================================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- ADMIN PODE FAZER TUDO
-- Função para burlar o Loop infinito de segurança:
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Admins podem ver e editar tudo" ON profiles
    FOR ALL
    USING ( public.get_my_role() = 'ADMIN' );

CREATE POLICY "Admins ver tudo: workout_plans" ON workout_plans FOR ALL USING ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')));
CREATE POLICY "Admins ver tudo: workout_groups" ON workout_groups FOR ALL USING ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')));
CREATE POLICY "Admins ver tudo: exercises" ON exercises FOR ALL USING ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')));
CREATE POLICY "Admins ver tudo: logs" ON execution_logs FOR ALL USING ((EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')));

-- PERFIS BÁSICOS: Ver o próprio profile
CREATE POLICY "Usuarios podem ver proprios perfis" ON profiles FOR SELECT USING ( auth.uid() = id );
-- Professores podem ver os perfis dos seus alunos atrelados a eles
CREATE POLICY "Professores veem seus alunos" ON profiles FOR SELECT USING ( auth.uid() = professor_id );

-- WORKOUT PLANS
CREATE POLICY "Alunos veem os próprios planos" ON workout_plans FOR SELECT USING ( aluno_id = auth.uid() );
CREATE POLICY "Professores gerenciam planos de seus alunos" ON workout_plans FOR ALL USING ( professor_id = auth.uid() );

-- WORKOUT GROUPS
CREATE POLICY "Visualizar grupos do plano" ON workout_groups FOR SELECT USING ( 
  EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND (wp.aluno_id = auth.uid() OR wp.professor_id = auth.uid()))
);
CREATE POLICY "Professor insere grupos" ON workout_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND wp.professor_id = auth.uid())
);

-- EXERCISES
CREATE POLICY "Visualizar exercicios do grupo" ON exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_groups wg
    JOIN workout_plans wp ON wp.id = wg.plan_id
    WHERE wg.id = group_id AND (wp.aluno_id = auth.uid() OR wp.professor_id = auth.uid())
  )
);
CREATE POLICY "Professor insere exercicios" ON exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workout_groups wg
    JOIN workout_plans wp ON wp.id = wg.plan_id
    WHERE wg.id = group_id AND wp.professor_id = auth.uid()
  )
);

-- EXECUTION LOGS
CREATE POLICY "Alunos inserem logs" ON execution_logs FOR INSERT WITH CHECK ( aluno_id = auth.uid() );
CREATE POLICY "Alunos veem proprios logs" ON execution_logs FOR SELECT USING ( aluno_id = auth.uid() );
CREATE POLICY "Professores veem logs dos seus alunos" ON execution_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = execution_logs.aluno_id AND professor_id = auth.uid())
);

-- GERAÇÃO DE PERFIL ADMIN MASTER DE SEGURANÇA (Se precisar bypassar tela)
-- Isso não insere no AUTH. Para usar, deve logar e ir na tabela via web e mudar role manually.
