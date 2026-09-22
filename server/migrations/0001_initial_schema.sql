-- ==========================================
-- Certificate Studio - Initial Schema (canonical)
-- Applied automatically by scripts/migrate.js on every push.
-- All statements are idempotent (IF NOT EXISTS), so re-running
-- against an existing database is safe and non-destructive.
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users (includes per-user Gmail/Brevo email sender settings)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    phone VARCHAR(20),
    gmail_email VARCHAR(255),
    gmail_app_password VARCHAR(255),
    brevo_email VARCHAR(255),
    brevo_sender_email VARCHAR(255),
    brevo_smtp_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email presets (user-specific email templates and signatures)
CREATE TABLE IF NOT EXISTS email_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preset_type VARCHAR(50) NOT NULL,
    preset_name VARCHAR(255) NOT NULL,
    template_text TEXT,
    signature_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preset_type, preset_name)
);

-- Canva OAuth tokens
CREATE TABLE IF NOT EXISTS user_canva_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom certificate templates
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_url TEXT NOT NULL,
    template_back_url TEXT,
    layout JSONB NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Issued certificates (for public verification)
CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    certificate_url TEXT NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded file metadata (Supabase storage)
CREATE TABLE IF NOT EXISTS file_metadata (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User uploaded fonts
CREATE TABLE IF NOT EXISTS user_fonts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    family VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    storage_path TEXT NOT NULL,
    weight VARCHAR(10) DEFAULT '400',
    style VARCHAR(20) DEFAULT 'normal',
    subsets TEXT[] DEFAULT ARRAY['latin'],
    category VARCHAR(50),
    license_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, family, weight, style)
);
CREATE INDEX IF NOT EXISTS idx_user_fonts_user_id ON user_fonts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fonts_category ON user_fonts(category);

-- Text presets (one-click text styles)
CREATE TABLE IF NOT EXISTS text_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    font_family VARCHAR(255) NOT NULL,
    font_weight VARCHAR(10) DEFAULT '400',
    font_style VARCHAR(20) DEFAULT 'normal',
    font_size INTEGER DEFAULT 160,
    color VARCHAR(7) DEFAULT '#000000',
    effects JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_text_presets_user_id ON text_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_text_presets_category ON text_presets(category);
CREATE INDEX IF NOT EXISTS idx_text_presets_is_system ON text_presets(is_system);
CREATE INDEX IF NOT EXISTS idx_text_presets_share_token ON text_presets(share_token);

-- Font favorites (user pinned fonts)
CREATE TABLE IF NOT EXISTS user_font_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    font_family VARCHAR(255) NOT NULL,
    font_weight VARCHAR(10) DEFAULT '400',
    font_style VARCHAR(20) DEFAULT 'normal',
    source VARCHAR(20) DEFAULT 'bundled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, font_family, font_weight, font_style)
);
CREATE INDEX IF NOT EXISTS idx_user_font_favorites_user_id ON user_font_favorites(user_id);

-- Row Level Security (enabling twice is a no-op)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_canva_tokens ENABLE ROW LEVEL SECURITY;