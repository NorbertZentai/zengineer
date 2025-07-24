-- Zengineer adatbázis teljes javítása
-- Ez a query mindent megold: eltávolítja a time_limit oszlopot és ellenőrzi a többi táblát

DO $$
DECLARE
    result_message TEXT := '';
    error_occurred BOOLEAN := FALSE;
BEGIN
    -- 1. Test sessions tábla javítása
    BEGIN
        -- Távolítsuk el a time_limit oszlopot ha létezik
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'time_limit'
        ) THEN
            ALTER TABLE test_sessions DROP COLUMN time_limit;
            result_message := result_message || 'time_limit oszlop eltávolítva. ';
        END IF;

        -- Biztosítsuk a szükséges oszlopok létezését
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'configuration'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN configuration jsonb NOT NULL DEFAULT '{}'::jsonb;
            result_message := result_message || 'configuration oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'status'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN status text DEFAULT 'active';
            result_message := result_message || 'status oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'start_time'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
            result_message := result_message || 'start_time oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'end_time'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN end_time timestamp with time zone;
            result_message := result_message || 'end_time oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'current_question_index'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN current_question_index integer DEFAULT 0;
            result_message := result_message || 'current_question_index oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'questions'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN questions jsonb NOT NULL DEFAULT '[]'::jsonb;
            result_message := result_message || 'questions oszlop hozzáadva. ';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'test_sessions' AND column_name = 'answers'
        ) THEN
            ALTER TABLE test_sessions ADD COLUMN answers jsonb NOT NULL DEFAULT '[]'::jsonb;
            result_message := result_message || 'answers oszlop hozzáadva. ';
        END IF;

        -- Status constraint hozzáadása
        BEGIN
            ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS test_sessions_status_check;
            ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_status_check 
                CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));
            result_message := result_message || 'status constraint hozzáadva. ';
        EXCEPTION 
            WHEN OTHERS THEN
                result_message := result_message || 'Status constraint hiba: ' || SQLERRM || '. ';
        END;

    EXCEPTION 
        WHEN OTHERS THEN
            error_occurred := TRUE;
            result_message := result_message || 'Test sessions hiba: ' || SQLERRM || '. ';
    END;

    -- 2. Card performance tábla ellenőrzése
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'card_performance') THEN
            CREATE TABLE card_performance (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
                card_id uuid REFERENCES quiz_cards(id) ON DELETE CASCADE NOT NULL,
                correct_count integer NOT NULL DEFAULT 0,
                incorrect_count integer NOT NULL DEFAULT 0,
                total_attempts integer NOT NULL DEFAULT 0,
                average_response_time real NOT NULL DEFAULT 0,
                hints_used_count integer NOT NULL DEFAULT 0,
                last_answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                UNIQUE(user_id, card_id)
            );
            
            ALTER TABLE card_performance ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Users can view own card performance" ON card_performance
                FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert own card performance" ON card_performance
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "Users can update own card performance" ON card_performance
                FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "Users can delete own card performance" ON card_performance
                FOR DELETE USING (auth.uid() = user_id);
                
            CREATE INDEX idx_card_performance_user_id ON card_performance(user_id);
            CREATE INDEX idx_card_performance_quiz_id ON card_performance(quiz_id);
            CREATE INDEX idx_card_performance_card_id ON card_performance(card_id);
            CREATE INDEX idx_card_performance_user_card ON card_performance(user_id, card_id);

            CREATE TRIGGER update_card_performance_updated_at BEFORE UPDATE ON card_performance
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            
            result_message := result_message || 'card_performance tábla létrehozva. ';
        END IF;
    EXCEPTION 
        WHEN OTHERS THEN
            error_occurred := TRUE;
            result_message := result_message || 'Card performance hiba: ' || SQLERRM || '. ';
    END;

    -- Eredmény kiírása
    IF error_occurred THEN
        RAISE NOTICE 'HIBÁK TÖRTÉNTEK! %', result_message;
        RAISE EXCEPTION 'Az adatbázis javítása nem fejeződött be sikeresen.';
    ELSE
        IF result_message = '' THEN
            RAISE NOTICE 'SIKER: Az adatbázis már helyes állapotban van, nincs szükség javításra.';
        ELSE
            RAISE NOTICE 'SIKER: Az adatbázis sikeresen javítva. Módosítások: %', result_message;
        END IF;
    END IF;
    
END $$;
