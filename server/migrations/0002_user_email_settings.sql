-- ==========================================
-- Add per-user email-sender columns (schema drift fix).
-- The application previously added Gmail/Brevo columns to `users`
-- outside of versioned migrations. This converges existing databases;
-- it is a no-op on fresh databases created by 0001.
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_app_password VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS brevo_email VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS brevo_sender_email VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS brevo_smtp_key VARCHAR(255);
    END IF;

    -- Converge older user_fonts tables (previously cloudinary-based) to storage-path layout
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_fonts') THEN
        ALTER TABLE user_fonts ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
        ALTER TABLE user_fonts ADD COLUMN IF NOT EXISTS storage_path TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'text_presets') THEN
        ALTER TABLE text_presets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;