import React, { useState, useEffect, useRef } from 'react';
import './FontPicker.css';

const FontPicker = ({ activeFontFamily, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  const CANVA_FONTS = [
    // Sans Serif
    { family: "Montserrat", category: "Sans Serif" },
    { family: "Inter", category: "Sans Serif" },
    { family: "Poppins", category: "Sans Serif" },
    { family: "Lato", category: "Sans Serif" },
    { family: "Open Sans", category: "Sans Serif" },
    { family: "Roboto", category: "Sans Serif" },
    { family: "Raleway", category: "Sans Serif" },
    { family: "Ubuntu", category: "Sans Serif" },
    { family: "Oswald", category: "Sans Serif" },
    { family: "Kanit", category: "Sans Serif" },
    { family: "Hind", category: "Sans Serif" },
    { family: "Rajdhani", category: "Sans Serif" },
    { family: "Teko", category: "Sans Serif" },
    { family: "Assistant", category: "Sans Serif" },
    { family: "Heebo", category: "Sans Serif" },
    { family: "Mukta", category: "Sans Serif" },
    { family: "Nunito", category: "Sans Serif" },
    { family: "Quicksand", category: "Sans Serif" },
    { family: "Work Sans", category: "Sans Serif" },
    { family: "Rubik", category: "Sans Serif" },
    { family: "Outfit", category: "Sans Serif" },
    { family: "DM Sans", category: "Sans Serif" },
    { family: "Public Sans", category: "Sans Serif" },
    { family: "Urbanist", category: "Sans Serif" },
    { family: "League Spartan", category: "Sans Serif" },
    { family: "Josefin Sans", category: "Sans Serif" },
    { family: "Cabin", category: "Sans Serif" },
    { family: "Maven Pro", category: "Sans Serif" },
    { family: "Questrial", category: "Sans Serif" },
    { family: "Catamaran", category: "Sans Serif" },
    { family: "Exo 2", category: "Sans Serif" },
    { family: "Manrope", category: "Sans Serif" },
    { family: "Lexend", category: "Sans Serif" },
    { family: "Space Grotesk", category: "Sans Serif" },
    { family: "Plus Jakarta Sans", category: "Sans Serif" },
    { family: "Figtree", category: "Sans Serif" },
    { family: "Be Vietnam Pro", category: "Sans Serif" },

    // Serif
    { family: "Playfair Display", category: "Serif" },
    { family: "Merriweather", category: "Serif" },
    { family: "Lora", category: "Serif" },
    { family: "Libre Baskerville", category: "Serif" },
    { family: "PT Serif", category: "Serif" },
    { family: "Noto Serif", category: "Serif" },
    { family: "EB Garamond", category: "Serif" },
    { family: "Crimson Text", category: "Serif" },
    { family: "Cinzel", category: "Serif" },
    { family: "Cormorant Garamond", category: "Serif" },
    { family: "Vollkorn", category: "Serif" },
    { family: "Old Standard TT", category: "Serif" },
    { family: "Cardo", category: "Serif" },
    { family: "Abril Fatface", category: "Serif" },
    { family: "DM Serif Display", category: "Serif" },
    { family: "Prata", category: "Serif" },
    { family: "Fraunces", category: "Serif" },
    { family: "Bodoni Moda", category: "Serif" },
    { family: "Playfair", category: "Serif" },
    { family: "Newsreader", category: "Serif" },
    { family: "Source Serif 4", category: "Serif" },
    { family: "Crimson Pro", category: "Serif" },
    { family: "Frank Ruhl Libre", category: "Serif" },
    { family: "Alice", category: "Serif" },
    { family: "Domine", category: "Serif" },
    { family: "Bitter", category: "Serif" },
    { family: "Zilla Slab", category: "Serif" },
    { family: "Bree Serif", category: "Serif" },
    { family: "Rokkitt", category: "Serif" },
    { family: "Arvo", category: "Serif" },
    { family: "Quattrocento", category: "Serif" },

    // Script
    { family: "Lobster", category: "Script" },
    { family: "Pacifico", category: "Script" },
    { family: "Dancing Script", category: "Script" },
    { family: "Caveat", category: "Script" },
    { family: "Satisfy", category: "Script" },
    { family: "Great Vibes", category: "Script" },
    { family: "Alex Brush", category: "Script" },
    { family: "Pinyon Script", category: "Script" },
    { family: "Allura", category: "Script" },
    { family: "Rochester", category: "Script" },
    { family: "Sacramento", category: "Script" },
    { family: "Yellowtail", category: "Script" },
    { family: "Shadows Into Light", category: "Script" },
    { family: "Courgette", category: "Script" },
    { family: "Kaushan Script", category: "Script" },
    { family: "Cookie", category: "Script" },
    { family: "Damion", category: "Script" },
    { family: "Grand Hotel", category: "Script" },
    { family: "Parisienne", category: "Script" },
    { family: "Tangerine", category: "Script" },
    { family: "Clicker Script", category: "Script" },
    { family: "Italianno", category: "Script" },
    { family: "Mr Dafoe", category: "Script" },
    { family: "Petit Formal Script", category: "Script" },
    { family: "Marck Script", category: "Script" },
    { family: "Indie Flower", category: "Script" },
    { family: "Amatic SC", category: "Script" },
    { family: "Permanent Marker", category: "Script" },
    { family: "Rock Salt", category: "Script" },
    { family: "Homemade Apple", category: "Script" },
    { family: "Reenie Beanie", category: "Script" },
    { family: "Nothing You Could Do", category: "Script" },
    { family: "Gloria Hallelujah", category: "Script" },
    { family: "Patrick Hand", category: "Script" },
    { family: "Coming Soon", category: "Script" },
    { family: "Annie Use Your Telescope", category: "Script" },
    { family: "Architects Daughter", category: "Script" },

    // Display
    { family: "Bebas Neue", category: "Display" },
    { family: "Anton", category: "Display" },
    { family: "Archivo Black", category: "Display" },
    { family: "Righteous", category: "Display" },
    { family: "Fjalla One", category: "Display" },
    { family: "Fredoka One", category: "Display" },
    { family: "Alfa Slab One", category: "Display" },
    { family: "Paytone One", category: "Display" },
    { family: "Chivo", category: "Display" },
    { family: "Titan One", category: "Display" },
    { family: "Passion One", category: "Display" },
    { family: "Luckiest Guy", category: "Display" },
    { family: "Sigmar", category: "Display" },
    { family: "Bungee", category: "Display" },
    { family: "Bungee Inline", category: "Display" },
    { family: "Monoton", category: "Display" },
    { family: "Press Start 2P", category: "Display" },
    { family: "Staatliches", category: "Display" },
    { family: "Bangers", category: "Display" },
    { family: "Caprasimo", category: "Display" },
    { family: "Shrikhand", category: "Display" },
    { family: "Ultra", category: "Display" },
    { family: "Bowlby One SC", category: "Display" },
    { family: "Modak", category: "Display" },
    { family: "Kumar One Outline", category: "Display" },

    // Elegant / Luxury
    { family: "Tenor Sans", category: "Elegant" },
    { family: "Cormorant SC", category: "Elegant" },
    { family: "Forum", category: "Elegant" },
    { family: "Cinzel Decorative", category: "Elegant" },
    { family: "Marcellus", category: "Elegant" },
    { family: "Castoro", category: "Elegant" },
    { family: "Spectral", category: "Elegant" },
    { family: "Philosopher", category: "Elegant" },
    { family: "Alegreya Sans SC", category: "Elegant" },
    { family: "Niconne", category: "Elegant" },
    { family: "Mea Culpa", category: "Elegant" },
    { family: "Engagement", category: "Elegant" },
    { family: "Italiana", category: "Elegant" },
    { family: "Jost", category: "Elegant" },
    { family: "Syncopate", category: "Elegant" },
    { family: "Syne", category: "Elegant" },
    { family: "Belleza", category: "Elegant" },
    { family: "Viaoda Libre", category: "Elegant" }
  ];

  const [activeCategory, setActiveCategory] = useState('All');
  const CATEGORIES = ['All', 'Sans Serif', 'Serif', 'Script', 'Display', 'Elegant'];

  const filteredFonts = CANVA_FONTS.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || font.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const exactMatch = filteredFonts.find(f => f.family.toLowerCase() === search.toLowerCase());
  const shouldShowLoadExternal = search && !exactMatch;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inject font preview on demand
  useEffect(() => {
    if (isOpen) {
        // Prepare a link tag with all filtered fonts for the dropdown preview
        // Prepare a link tag with all filtered fonts for the dropdown preview
        const fontFamilies = filteredFonts.map(f => f.family.replace(/\s+/g, '+')).join('|');
        if (fontFamilies) {
            let link = document.getElementById('font-picker-previews');
            if (!link) {
                link = document.createElement('link');
                link.id = 'font-picker-previews';
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css?family=${fontFamilies}&display=swap`;
        }
    }
  }, [isOpen, filteredFonts.length]); // Only re-fetch when list changes or opens

  // Inject active font permanently
  useEffect(() => {
    if (activeFontFamily) {
        const fontId = `font-active-${activeFontFamily.replace(/\s+/g, '-')}`;
        if (!document.getElementById(fontId)) {
            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css?family=${activeFontFamily.replace(/\s+/g, '+')}&display=swap`;
            document.head.appendChild(link);
        }
    }
  }, [activeFontFamily]);

  return (
    <div className="custom-font-picker" ref={pickerRef}>
      <button 
        type="button"
        className="picker-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ fontFamily: activeFontFamily }}
      >
        <span>{activeFontFamily || 'Select Font'}</span>
        <span className="chevron">▾</span>
      </button>

      {isOpen && (
        <div className="picker-dropdown">
          <div className="picker-categories">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                type="button"
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="picker-search">
            <input 
              type="text" 
              placeholder="Search or type any Google Font..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="picker-list">
            {filteredFonts.map(font => (
              <li key={font.family}>
                <button 
                  type="button"
                  className={font.family === activeFontFamily ? 'active' : ''}
                  onClick={() => {
                    onChange({ family: font.family });
                    setIsOpen(false);
                  }}
                  style={{ fontFamily: font.family }}
                >
                  {font.family}
                </button>
              </li>
            ))}
            {shouldShowLoadExternal && (
              <li className="load-external">
                <p>Not found in our list?</p>
                <button 
                  type="button"
                  onClick={() => {
                    onChange({ family: search });
                    setIsOpen(false);
                  }}
                  style={{ fontFamily: search }}
                >
                  Try loading "<strong>{search}</strong>" from Google
                </button>
              </li>
            )}
            {filteredFonts.length === 0 && !shouldShowLoadExternal && (
              <li className="no-results">No fonts found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FontPicker;
