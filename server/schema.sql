-- ==========================================
-- Certificate Studio - Database Schema
-- Last Updated: 2026-03-18
-- ==========================================

-- Users table to store authentication details
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Access table to manage subscription/access status
CREATE TABLE IF NOT EXISTS user_access (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_expires_at TIMESTAMP WITH TIME ZONE,
    last_renewal_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Email Presets table to store user-specific email templates and signatures
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
