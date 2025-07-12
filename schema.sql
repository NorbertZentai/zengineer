-- Supabase SQL Schema for Zengineer

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users table (Supabase auth.users táblára hivatkozunk)
-- Nincs külön users tábla, Supabase auth kezeli

-- Quiz folders table
CREATE TABLE quiz_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#1976d2',
  icon text DEFAULT 'folder',
  parent_id uuid REFERENCES quiz_folders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quizzes table
CREATE TABLE quizzes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#1976d2',
  icon text DEFAULT 'quiz',
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

-- Enable Row Level Security
ALTER TABLE quiz_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data

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

-- Indexes for performance
CREATE INDEX idx_quiz_folders_user_id ON quiz_folders(user_id);
CREATE INDEX idx_quiz_folders_parent_id ON quiz_folders(parent_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quizzes_folder_id ON quizzes(folder_id);
CREATE INDEX idx_quiz_cards_quiz_id ON quiz_cards(quiz_id);
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_quiz_folders_updated_at BEFORE UPDATE ON quiz_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_cards_updated_at BEFORE UPDATE ON quiz_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
