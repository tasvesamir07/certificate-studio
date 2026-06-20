-- ==========================================
-- Certificate Studio - Supabase Schema Setup
-- Paste this into Supabase SQL Editor
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Presets
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

-- Canva OAuth Tokens
CREATE TABLE IF NOT EXISTS user_canva_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User uploaded fonts (optional)
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

-- Text presets (optional)
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

-- Font favorites (optional)
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

-- Row Level Security (enable on all tables)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_canva_tokens ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (id::text = auth.uid()::text);
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (id::text = auth.uid()::text);
