import React, { useState, useEffect, useRef } from 'react';
import './FontPicker.css';

const FontPicker = ({ activeFontFamily, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  const CANVA_FONTS = [
    "Montserrat", "Lato", "Bebas Neue", "Merriweather", "Playfair Display",
    "Lobster", "Pacifico", "Open Sans", "League Spartan", "Anton",
    "Archivo Black", "Inter", "Poppins", "Quicksand", "Caveat",
    "Dancing Script", "Great Vibes", "Alex Brush", "Pinyon Script", "Allura",
    "Rochester", "Sacramento", "Libre Baskerville", "Lora", "Crimson Text",
    "EB Garamond", "Cinzel", "Cormorant Garamond", "Outfit", "DM Serif Display",
    "DM Sans", "Moontime", "Capriola", "Muli", "Alegreya Sans SC", "Tenor Sans",
    "Amatic SC", "Satisfy", "Yellowtail", "Shadows Into Light", "Courgette",
    "Kaushan Script", "Cookie", "Damion", "Grand Hotel", "Abril Fatface",
    "Vollkorn", "Old Standard TT", "Cardo", "Josefin Sans", "Quattrocento",
    "Philosopher", "Arvo", "Rokkitt", "Zilla Slab", "Bree Serif",
    "Comfortaa", "Fredoka One", "Righteous", "Patua One", "Fjalla One",
    "Oswald", "Teko", "Kanit", "Hind", "Rajdhani"
  ];

  const filteredFonts = CANVA_FONTS.filter(font => 
    font.toLowerCase().includes(search.toLowerCase())
  );

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
        const fontFamilies = filteredFonts.map(f => f.replace(/\s+/g, '+')).join('|');
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
          <div className="picker-search">
            <input 
              type="text" 
              placeholder="Search fonts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="picker-list">
            {filteredFonts.map(font => (
              <li key={font}>
                <button 
                  type="button"
                  className={font === activeFontFamily ? 'active' : ''}
                  onClick={() => {
                    onChange({ family: font });
                    setIsOpen(false);
                  }}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              </li>
            ))}
            {filteredFonts.length === 0 && (
              <li className="no-results">No fonts found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FontPicker;
