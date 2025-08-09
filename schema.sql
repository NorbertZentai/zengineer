-- Supabase SQL Schema for Zengineer (aligned with remote Supabase public schema)

-- NOTE: Auth/storage/realtime schemas are managed by Supabase. This file defines only the public schema objects.

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Quiz folders
CREATE TABLE IF NOT EXISTS public.quiz_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#1976d2',
  icon text DEFAULT 'folder',
  parent_id uuid,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#1976d2',
  icon text DEFAULT 'quiz',
  folder_id uuid,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  difficulty_level integer DEFAULT 1,
  language text DEFAULT 'hu',
  tags jsonb DEFAULT '[]'::jsonb,
  visibility text DEFAULT 'private',
  CONSTRAINT quizzes_difficulty_level_check CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  CONSTRAINT quizzes_visibility_check CHECK (visibility IN ('private','public')),
  CONSTRAINT quizzes_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.quiz_folders(id) ON DELETE SET NULL
);

-- Quiz cards
CREATE TABLE IF NOT EXISTS public.quiz_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  difficulty integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT quiz_cards_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT quiz_cards_difficulty_check CHECK (difficulty >= 1 AND difficulty <= 5)
);

-- Quiz sessions
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  total_questions integer NOT NULL,
  duration_seconds integer,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT quiz_sessions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);

-- Test sessions
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL,
  user_id uuid NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'active',
  start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time timestamp with time zone,
  current_question_index integer DEFAULT 0,
  questions jsonb DEFAULT '[]'::jsonb NOT NULL,
  answers jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  score integer DEFAULT 0,
  CONSTRAINT test_sessions_status_check CHECK (status IN ('active','paused','completed','abandoned')),
  CONSTRAINT test_sessions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);

-- Test results
CREATE TABLE IF NOT EXISTS public.test_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  quiz_name text NOT NULL,
  user_id uuid NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  max_score integer DEFAULT 0 NOT NULL,
  percentage real DEFAULT 0 NOT NULL,
  total_questions integer DEFAULT 0 NOT NULL,
  correct_answers integer DEFAULT 0 NOT NULL,
  incorrect_answers integer DEFAULT 0 NOT NULL,
  skipped_questions integer DEFAULT 0 NOT NULL,
  time_spent integer DEFAULT 0 NOT NULL,
  hints_used integer DEFAULT 0 NOT NULL,
  test_configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  answers jsonb DEFAULT '[]'::jsonb NOT NULL,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  wrong_answers integer DEFAULT 0 NOT NULL,
  CONSTRAINT test_results_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT test_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  CONSTRAINT test_results_percentage_check CHECK ((percentage >= 0 AND percentage <= 100) AND percentage IS NOT NULL)
);

-- Card performance
CREATE TABLE IF NOT EXISTS public.card_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  card_id uuid NOT NULL,
  correct_count integer DEFAULT 0 NOT NULL,
  incorrect_count integer DEFAULT 0 NOT NULL,
  total_attempts integer DEFAULT 0 NOT NULL,
  average_response_time real DEFAULT 0 NOT NULL,
  hints_used_count integer DEFAULT 0 NOT NULL,
  last_answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  test_appearances integer DEFAULT 0,
  CONSTRAINT card_performance_user_id_card_id_key UNIQUE (user_id, card_id),
  CONSTRAINT card_performance_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.quiz_cards(id) ON DELETE CASCADE,
  CONSTRAINT card_performance_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT card_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Test history
CREATE TABLE IF NOT EXISTS public.test_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  quiz_name text NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  percentage real DEFAULT 0 NOT NULL,
  total_questions integer DEFAULT 0 NOT NULL,
  correct_answers integer DEFAULT 0 NOT NULL,
  time_spent integer DEFAULT 0 NOT NULL,
  test_type text DEFAULT '' NOT NULL,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT test_history_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_quiz_folders_parent_id ON public.quiz_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_quiz_folders_user_id ON public.quiz_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_folder_id ON public.quizzes(folder_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_cards_quiz_id ON public.quiz_cards(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_quiz_id ON public.test_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON public.test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_quiz_id ON public.test_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON public.test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_card_performance_user_id ON public.card_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_card_performance_quiz_id ON public.card_performance(quiz_id);
CREATE INDEX IF NOT EXISTS idx_card_performance_card_id ON public.card_performance(card_id);
CREATE INDEX IF NOT EXISTS idx_card_performance_user_card ON public.card_performance(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_test_history_completed_at ON public.test_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_test_history_quiz_id ON public.test_history(quiz_id);
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON public.test_history(user_id);

-- Updated_at trigger function (public)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Percentage helpers for test_results
CREATE OR REPLACE FUNCTION public.safe_percentage(correct_answers integer, total_questions integer)
RETURNS numeric AS $$
BEGIN
  IF total_questions IS NULL OR total_questions = 0 THEN
    RETURN 0;
  END IF;
  RETURN (correct_answers::numeric * 100) / total_questions::numeric;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_percentage_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.percentage := COALESCE(public.safe_percentage(NEW.correct_answers, NEW.total_questions), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_quiz_folders_updated_at ON public.quiz_folders;
CREATE TRIGGER update_quiz_folders_updated_at BEFORE UPDATE ON public.quiz_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_cards_updated_at ON public.quiz_cards;
CREATE TRIGGER update_quiz_cards_updated_at BEFORE UPDATE ON public.quiz_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_sessions_updated_at ON public.test_sessions;
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON public.test_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_card_performance_updated_at ON public.card_performance;
CREATE TRIGGER update_card_performance_updated_at BEFORE UPDATE ON public.card_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS test_results_percentage_trigger ON public.test_results;
CREATE TRIGGER test_results_percentage_trigger BEFORE INSERT OR UPDATE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION public.calculate_percentage_trigger();

-- View: quizzes with card count and profile info (aligned with remote)
CREATE OR REPLACE VIEW public.quiz_with_card_count AS
  SELECT q.id,
         q.name,
         q.description,
         q.color,
         q.icon,
         q.folder_id,
         q.user_id,
         q.created_at,
         q.updated_at,
         q.difficulty_level,
         q.language,
         q.tags,
         q.visibility,
         p.username,
         p.email,
         COUNT(c.id) AS card_count
  FROM public.quizzes q
  LEFT JOIN public.profiles p ON q.user_id = p.id
  LEFT JOIN public.quiz_cards c ON c.quiz_id = q.id
  GROUP BY q.id, p.username, p.email;

-- Row Level Security
ALTER TABLE public.quiz_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_performance ENABLE ROW LEVEL SECURITY;

-- Policies (aligned with remote)
-- Public access to public quizzes and their cards
CREATE POLICY IF NOT EXISTS "Public quizzes are viewable" ON public.quizzes
  FOR SELECT USING (visibility = 'public');

CREATE POLICY IF NOT EXISTS "Public can view cards of public quizzes" ON public.quiz_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_cards.quiz_id AND quizzes.visibility = 'public')
  );

-- Ownership-based policies
CREATE POLICY IF NOT EXISTS "Users can view own folders" ON public.quiz_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own folders" ON public.quiz_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own folders" ON public.quiz_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own folders" ON public.quiz_folders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own quiz cards" ON public.quiz_cards FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.quizzes WHERE id = quiz_cards.quiz_id)
);
CREATE POLICY IF NOT EXISTS "Users can insert own quiz cards" ON public.quiz_cards FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.quizzes WHERE id = quiz_cards.quiz_id)
);
CREATE POLICY IF NOT EXISTS "Users can update own quiz cards" ON public.quiz_cards FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM public.quizzes WHERE id = quiz_cards.quiz_id)
);
CREATE POLICY IF NOT EXISTS "Users can delete own quiz cards" ON public.quiz_cards FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM public.quizzes WHERE id = quiz_cards.quiz_id)
);

CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON public.quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own test history" ON public.test_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own test history" ON public.test_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own test results" ON public.test_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own test results" ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own test sessions" ON public.test_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own test sessions" ON public.test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own test sessions" ON public.test_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own test sessions" ON public.test_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own card performance" ON public.card_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own card performance" ON public.card_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own card performance" ON public.card_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own card performance" ON public.card_performance FOR DELETE USING (auth.uid() = user_id);
