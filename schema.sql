-- Supabase SQL Schema for Zengineer

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Profiles table to store additional user information
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Users table (Supabase auth.users táblára hivatkozunk)
-- Nincs külön users tábla, Supabase auth kezeli

-- Projects table (új főkategória)
CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#1976d2',
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  tags jsonb DEFAULT '[]'::jsonb,
  subject text,
  difficulty_level integer CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  target_audience jsonb DEFAULT '[]'::jsonb,
  language text DEFAULT 'hu',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz folders table (projekt alá)
CREATE TABLE quiz_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#1976d2',
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  tags jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes table (projekt vagy folder alá)
CREATE TABLE quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#1976d2',
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  tags jsonb DEFAULT '[]'::jsonb,
  subject text,
  difficulty_level integer DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_time integer DEFAULT 10,
  study_modes jsonb DEFAULT '["flashcard"]'::jsonb,
  language text DEFAULT 'hu',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES quiz_folders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz cards table
CREATE TABLE quiz_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  difficulty integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz sessions table (statistics)
CREATE TABLE quiz_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  duration_seconds integer,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Test sessions table for quiz testing
CREATE TABLE test_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time timestamp with time zone,
  current_question_index integer DEFAULT 0,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Test results table for completed tests
CREATE TABLE test_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES test_sessions(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  quiz_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  percentage real NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  incorrect_answers integer NOT NULL DEFAULT 0,
  skipped_questions integer NOT NULL DEFAULT 0,
  time_spent integer NOT NULL DEFAULT 0, -- in seconds
  hints_used integer NOT NULL DEFAULT 0,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Card performance table for tracking individual card results
CREATE TABLE card_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  card_id uuid REFERENCES quiz_cards(id) ON DELETE CASCADE NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,
  total_attempts integer NOT NULL DEFAULT 0,
  average_response_time real NOT NULL DEFAULT 0, -- in seconds
  hints_used_count integer NOT NULL DEFAULT 0,
  last_answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one record per user-card combination
  UNIQUE(user_id, card_id)
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Quiz folders policies
CREATE POLICY "Users can view own folders" ON quiz_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON quiz_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON quiz_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON quiz_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Users can view own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Quiz cards policies
CREATE POLICY "Users can view own quiz cards" ON quiz_cards
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_cards.quiz_id)
  );

CREATE POLICY "Users can insert own quiz cards" ON quiz_cards
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_cards.quiz_id)
  );

CREATE POLICY "Users can update own quiz cards" ON quiz_cards
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_cards.quiz_id)
  );

CREATE POLICY "Users can delete own quiz cards" ON quiz_cards
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM quizzes WHERE id = quiz_cards.quiz_id)
  );

-- Quiz sessions policies
CREATE POLICY "Users can view own sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Test sessions policies
CREATE POLICY "Users can view own test sessions" ON test_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test sessions" ON test_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test sessions" ON test_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test sessions" ON test_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Test results policies
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Card performance policies
CREATE POLICY "Users can view own card performance" ON card_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card performance" ON card_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card performance" ON card_performance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card performance" ON card_performance
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_quiz_folders_project_id ON quiz_folders(project_id);
CREATE INDEX idx_quiz_folders_user_id ON quiz_folders(user_id);
CREATE INDEX idx_quizzes_project_id ON quizzes(project_id);
CREATE INDEX idx_quizzes_folder_id ON quizzes(folder_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quiz_cards_quiz_id ON quiz_cards(quiz_id);
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);
CREATE INDEX idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX idx_test_sessions_quiz_id ON test_sessions(quiz_id);
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_quiz_id ON test_results(quiz_id);
CREATE INDEX idx_test_results_session_id ON test_results(session_id);
CREATE INDEX idx_card_performance_user_id ON card_performance(user_id);
CREATE INDEX idx_card_performance_quiz_id ON card_performance(quiz_id);
CREATE INDEX idx_card_performance_card_id ON card_performance(card_id);
CREATE INDEX idx_card_performance_user_card ON card_performance(user_id, card_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_folders_updated_at BEFORE UPDATE ON quiz_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_cards_updated_at BEFORE UPDATE ON quiz_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_performance_updated_at BEFORE UPDATE ON card_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
