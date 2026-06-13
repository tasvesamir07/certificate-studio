-- ==========================================
-- Certificate Studio - Font & Text Presets Schema
-- ==========================================

-- User uploaded fonts
CREATE TABLE IF NOT EXISTS user_fonts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    family VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    cloudinary_public_id VARCHAR(255) UNIQUE NOT NULL,
    cloudinary_url TEXT NOT NULL,
    weight VARCHAR(10) DEFAULT '400',
    style VARCHAR(20) DEFAULT 'normal',
    subsets TEXT[] DEFAULT ARRAY['latin'],
    category VARCHAR(50),
    license_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, family, weight, style)
);

CREATE INDEX idx_user_fonts_user_id ON user_fonts(user_id);
CREATE INDEX idx_user_fonts_category ON user_fonts(category);

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

CREATE INDEX idx_text_presets_user_id ON text_presets(user_id);
CREATE INDEX idx_text_presets_category ON text_presets(category);
CREATE INDEX idx_text_presets_is_system ON text_presets(is_system);
CREATE INDEX idx_text_presets_share_token ON text_presets(share_token);

-- Font favorites (user pinned fonts)
CREATE TABLE IF NOT EXISTS user_font_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    font_family VARCHAR(255) NOT NULL,
    font_weight VARCHAR(10) DEFAULT '400',
    font_style VARCHAR(20) DEFAULT 'normal',
    source VARCHAR(20) DEFAULT 'bundled', -- 'bundled', 'google', 'uploaded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, font_family, font_weight, font_style)
);

CREATE INDEX idx_user_font_favorites_user_id ON user_font_favorites(user_id);