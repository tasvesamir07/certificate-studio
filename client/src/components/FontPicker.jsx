import React, { useState, useEffect, useRef, useMemo } from 'react';
import './FontPicker.css';

const FontPicker = ({ activeFontFamily, onChange, serverFonts = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingState, setLoadingState] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [externalFonts, setExternalFonts] = useState(() => {
    try {
      const saved = localStorage.getItem('certificate-studio-external-fonts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }); 
  const pickerRef = useRef(null);

  const CANVA_FONTS = [
    // --- SANS SERIF (Modern, Clean) ---
    { family: "Montserrat", category: "Sans Serif" },
    { family: "Roboto", category: "Sans Serif" },
    { family: "Open Sans", category: "Sans Serif" },
    { family: "Lato", category: "Sans Serif" },
    { family: "Oswald", category: "Sans Serif" },
    { family: "Raleway", category: "Sans Serif" },
    { family: "Poppins", category: "Sans Serif" },
    { family: "Inter", category: "Sans Serif" },
    { family: "Bebas Neue", category: "Sans Serif" },
    { family: "Ubuntu", category: "Sans Serif" },
    { family: "Nunito", category: "Sans Serif" },
    { family: "Quicksand", category: "Sans Serif" },
    { family: "Work Sans", category: "Sans Serif" },
    { family: "Fira Sans", category: "Sans Serif" },
    { family: "PT Sans", category: "Sans Serif" },
    { family: "PT Serif", category: "Serif" },
    { family: "Kanit", category: "Sans Serif" },
    { family: "Titillium Web", category: "Sans Serif" },
    { family: "Muli", category: "Sans Serif" },
    { family: "Hind", category: "Sans Serif" },
    { family: "Heebo", category: "Sans Serif" },
    { family: "Libre Baskerville", category: "Serif" },
    { family: "Arvo", category: "Serif" },
    { family: "Abril Fatface", category: "Display" },
    { family: "Josefin Sans", category: "Sans Serif" },
    { family: "Josefin Slab", category: "Serif" },
    { family: "Lobster", category: "Script" },
    { family: "Pacifico", category: "Script" },
    { family: "Dancing Script", category: "Script" },
    { family: "Great Vibes", category: "Script" },
    { family: "Caveat", category: "Script" },
    { family: "Satisfy", category: "Script" },
    { family: "Courgette", category: "Script" },
    { family: "Allura", category: "Script" },
    { family: "Cookie", category: "Script" },
    { family: "Alex Brush", category: "Script" },
    { family: "Sacramento", category: "Script" },
    { family: "Yellowtail", category: "Script" },
    { family: "Marck Script", category: "Script" },
    { family: "Parisienne", category: "Script" },
    { family: "Kaushan Script", category: "Script" },
    { family: "Damion", category: "Script" },
    { family: "Grand Hotel", category: "Script" },
    { family: "Tangerine", category: "Script" },
    { family: "Rochester", category: "Script" },
    { family: "Pinyon Script", category: "Script" },
    { family: "Bad Script", category: "Script" },
    { family: "Clicker Script", category: "Script" },
    { family: "Cinzel", category: "Elegant" },
    { family: "Cinzel Decorative", category: "Elegant" },
    { family: "Cormorant Garamond", category: "Elegant" },
    { family: "Playfair Display SC", category: "Elegant" },
    { family: "Old Standard TT", category: "Elegant" },
    { family: "EB Garamond", category: "Elegant" },
    { family: "Fraunces", category: "Elegant" },
    { family: "Bodoni Moda", category: "Elegant" },
    { family: "Prata", category: "Elegant" },
    { family: "Marcellus", category: "Elegant" },
    { family: "Cardo", category: "Elegant" },
    { family: "Spectral", category: "Elegant" },
    { family: "Gilda Display", category: "Elegant" },
    { family: "Volkhov", category: "Elegant" },
    { family: "Alice", category: "Elegant" },
    { family: "Belleza", category: "Elegant" },
    { family: "Viaoda Libre", category: "Elegant" },
    { family: "Oranienbaum", category: "Elegant" },
    { family: "Forum", category: "Elegant" },
    { family: "Sorts Mill Goudy", category: "Elegant" },
    { family: "Yeseva One", category: "Elegant" },
    { family: "Oleo Script", category: "Display" },
    { family: "Comfortaa", category: "Display" },
    { family: "Alegreya", category: "Serif" },
    { family: "Alegreya Sans", category: "Sans Serif" },
    { family: "Source Sans Pro", category: "Sans Serif" },
    { family: "Source Serif Pro", category: "Serif" },
    { family: "Crimson Text", category: "Serif" },
    { family: "Vollkorn", category: "Serif" },
    { family: "Bitter", category: "Serif" },
    { family: "Inconsolata", category: "Script" },
    { family: "Domine", category: "Serif" },
    { family: "Zilla Slab", category: "Serif" },
    { family: "Space Grotesk", category: "Display" },
    { family: "Righteous", category: "Display" },
    { family: "Bangers", category: "Display" },
    { family: "Special Elite", category: "Display" },
    { family: "Luckiest Guy", category: "Display" },
    { family: "Fredoka One", category: "Display" },
    { family: "Patua One", category: "Display" },
    { family: "Alfa Slab One", category: "Display" },
    { family: "Permanent Marker", category: "Display" },
    { family: "Creepster", category: "Display" },
    { family: "Monoton", category: "Display" },
    { family: "Viga", category: "Display" },
    { family: "Chivo", category: "Sans Serif" },
    { family: "Architects Daughter", category: "Script" },
    { family: "Shadows Into Light", category: "Script" },
    { family: "Amatic SC", category: "Display" },
    { family: "Indie Flower", category: "Script" },
    { family: "Coming Soon", category: "Script" },
    { family: "Gloria Hallelujah", category: "Script" },
    { family: "Rock Salt", category: "Script" },
    { family: "Homemade Apple", category: "Script" },
    { family: "Nanum Pen Script", category: "Script" },
    { family: "Zeyada", category: "Script" },
    { family: "Reenie Beanie", category: "Script" },
    { family: "Gochi Hand", category: "Script" },
    { family: "Covered By Your Grace", category: "Script" },
    { family: "The Girl Next Door", category: "Script" },
    { family: "Nothing You Could Do", category: "Script" },
    { family: "League Spartan", category: "Sans Serif" },
    { family: "Kumbh Sans", category: "Sans Serif" },
    { family: "Exo 2", category: "Sans Serif" },
    { family: "Assistant", category: "Sans Serif" },
    { family: "Outfit", category: "Sans Serif" },
    { family: "Syne", category: "Display" },
    { family: "Red Hat Display", category: "Display" },
    { family: "Metrophobic", category: "Sans Serif" },
    { family: "Urbanist", category: "Sans Serif" },
    { family: "Lexend", category: "Sans Serif" },
    { family: "Sen", category: "Sans Serif" },
    { family: "Questrial", category: "Sans Serif" },
    { family: "DM Sans", category: "Sans Serif" },
    { family: "Public Sans", category: "Sans Serif" },
    { family: "Be Vietnam Pro", category: "Sans Serif" },
    { family: "Sora", category: "Sans Serif" },
    { family: "Manrope", category: "Sans Serif" },
    { family: "Space Mono", category: "Script" },
    { family: "JetBrains Mono", category: "Script" },
    { family: "Fira Code", category: "Script" },
    { family: "B612", category: "Sans Serif" },
    { family: "Varela Round", category: "Sans Serif" },
    { family: "Signika", category: "Sans Serif" },
    { family: "Oxygen", category: "Sans Serif" },
    { family: "Noto Sans", category: "Sans Serif" },
    { family: "Noto Serif", category: "Serif" },
    { family: "Barlow", category: "Sans Serif" },
    { family: "Barlow Condensed", category: "Sans Serif" },
    { family: "Anton", category: "Sans Serif" },
    { family: "Cabin", category: "Sans Serif" },
    { family: "Dosis", category: "Sans Serif" },
    { family: "Abel", category: "Sans Serif" },
    { family: "Teko", category: "Sans Serif" },
    { family: "Cairo", category: "Sans Serif" },
    { family: "Antic Slab", category: "Serif" },
    { family: "Rokkitt", category: "Serif" },
    { family: "Karma", category: "Serif" },
    { family: "Quattrocento", category: "Elegant" },
    { family: "Quattrocento Sans", category: "Sans Serif" },
    { family: "Lusitana", category: "Elegant" },
    { family: "Cormorant", category: "Elegant" },
    { family: "Philosopher", category: "Elegant" },
    { family: "Tenor Sans", category: "Elegant" },
    { family: "Unna", category: "Elegant" },
    { family: "Gentium Book Basic", category: "Elegant" },
    { family: "Castoro", category: "Elegant" },
    { family: "Nanum Myeongjo", category: "Serif" },
    { family: "Vesper Libre", category: "Serif" },
    { family: "Baskervville", category: "Serif" },
    { family: "Libre Caslon Display", category: "Serif" },
    { family: "Italiana", category: "Elegant" },
    { family: "Petit Formal Script", category: "Script" },
    { family: "Mr De Haviland", category: "Script" },
    { family: "Mrs Saint Delafield", category: "Script" },
    { family: "Monsieur La Doulaise", category: "Script" },
    { family: "Herr Von Muellerhoff", category: "Script" },
    { family: "Rouge Script", category: "Script" },
    { family: "Engagement", category: "Script" },
    { family: "Euphoria Script", category: "Script" },
    { family: "Bilbo Swash Caps", category: "Script" },
    { family: "La Belle Aurore", category: "Script" },
    { family: "Meddon", category: "Script" },
    { family: "League Script", category: "Script" },
    { family: "Waiting for the Sunrise", category: "Script" },
    { family: "Sue Ellen Francisco", category: "Script" },
    { family: "Dawning of a New Day", category: "Script" },
    { family: "Over the Rainbow", category: "Script" },
    { family: "Just Me Again Down Here", category: "Script" },
    { family: "Shadows Into Light Two", category: "Script" },
    { family: "Handlee", category: "Script" },
    { family: "Neucha", category: "Script" },
    { family: "Kalam", category: "Script" },
    { family: "Itim", category: "Script" },
    { family: "Mali", category: "Script" },
    { family: "Gaegu", category: "Script" },
    { family: "Jua", category: "Display" },
    { family: "Yeon Sung", category: "Script" },
    { family: "Kirang Haerang", category: "Display" },
    { family: "East Sea Dokdo", category: "Display" },
    { family: "Gamja Flower", category: "Script" },
    { family: "Poor Story", category: "Script" },
    { family: "Hi Melody", category: "Script" },
    { family: "Cute Font", category: "Display" },
    { family: "Do Hyeon", category: "Display" },
    { family: "Black Han Sans", category: "Display" },
    { family: "Nanum Brush Script", category: "Script" },
    { family: "Sunflower", category: "Display" },
    { family: "Gothic A1", category: "Sans Serif" },
    { family: "Nirmala UI", category: "Sans Serif" },
    { family: "Eczar", category: "Serif" },
    { family: "Yantramanav", category: "Sans Serif" },
    { family: "Rameshwar", category: "Serif" },
    { family: "Kurale", category: "Serif" },
    { family: "Martel", category: "Serif" },
    { family: "Rozha One", category: "Display" },
    { family: "Modak", category: "Display" },
    { family: "Kumar One", category: "Display" },
    { family: "Kavivanar", category: "Script" },
    { family: "Baloo 2", category: "Display" },
    { family: "Baloo Bhai 2", category: "Display" },
    { family: "Baloo Bhaina 2", category: "Display" },
    { family: "Baloo Chettan 2", category: "Display" },
    { family: "Baloo Da 2", category: "Display" },
    { family: "Baloo Paaji 2", category: "Display" },
    { family: "Baloo Tamma 2", category: "Display" },
    { family: "Baloo Tammudu 2", category: "Display" },
    { family: "Baloo Thambi 2", category: "Display" },
    { family: "Coiny", category: "Display" },
    { family: "Shrikhand", category: "Display" },
    { family: "Rakkas", category: "Display" },
    { family: "Jomhuria", category: "Serif" },
    { family: "Lalezar", category: "Display" },
    { family: "Katibeh", category: "Serif" },
    { family: "Mirza", category: "Serif" },
    { family: "Changa", category: "Sans Serif" },
    { family: "El Messiri", category: "Sans Serif" },
    { family: "Lemonada", category: "Display" },
    { family: "Harmattan", category: "Sans Serif" },
    { family: "Scheherazade New", category: "Serif" },
    { family: "Amiri", category: "Serif" },
    { family: "Mada", category: "Sans Serif" },
    { family: "Vibes", category: "Display" },
    { family: "Kufam", category: "Sans Serif" },
    { family: "Vazirmatn", category: "Sans Serif" },
    { family: "IBM Plex Sans", category: "Sans Serif" },
    { family: "IBM Plex Serif", category: "Serif" },
    { family: "IBM Plex Mono", category: "Script" },
    { family: "Nanum Gothic", category: "Sans Serif" },
    { family: "Noto Sans JP", category: "Sans Serif" },
    { family: "Noto Sans KR", category: "Sans Serif" },
    { family: "Noto Sans TC", category: "Sans Serif" },
    { family: "Noto Serif TC", category: "Serif" },
    { family: "Sawarabi Gothic", category: "Sans Serif" },
    { family: "Sawarabi Mincho", category: "Serif" },
    { family: "M PLUS 1p", category: "Sans Serif" },
    { family: "M PLUS Rounded 1c", category: "Sans Serif" },
    { family: "Kosugi", category: "Sans Serif" },
    { family: "Kosugi Maru", category: "Sans Serif" },
    { family: "Zen Maru Gothic", category: "Sans Serif" },
    { family: "Zen Kaku Gothic New", category: "Sans Serif" },
    { family: "Zen Antique", category: "Serif" },
    { family: "Zen Old Mincho", category: "Serif" },
    { family: "Hina Mincho", category: "Serif" },
    { family: "Shippori Mincho", category: "Serif" },
    { family: "DotGothic16", category: "Display" },
    { family: "New Tegomin", category: "Serif" },
    { family: "Potta One", category: "Display" },
    { family: "Stick", category: "Display" },
    { family: "Reggae One", category: "Display" },
    { family: "RocknRoll One", category: "Display" },
    { family: "Dela Gothic One", category: "Display" },
    { family: "Train One", category: "Display" },
    { family: "Otomanopee One", category: "Display" },
    { family: "Yuji Syuku", category: "Serif" },
    { family: "Yuji Mai", category: "Serif" },
    { family: "Yuji Boku", category: "Serif" },
    { family: "Kaisei Tokumin", category: "Serif" },
    { family: "Kaisei Decol", category: "Serif" },
    { family: "Kaisei Opti", category: "Serif" },
    { family: "Kaisei HarunoUmi", category: "Serif" },
    { family: "Biz UDPGothic", category: "Sans Serif" },
    { family: "Biz UDPMincho", category: "Serif" },
    { family: "Biz Gothic", category: "Sans Serif" },
    { family: "Biz Mincho", category: "Serif" },
    { family: "Mochiy Pop P One", category: "Display" },
    { family: "Mochiy Pop One", category: "Display" },
    { family: "Hachi Maru Pop", category: "Display" },
    { family: "Kiwi Maru", category: "Serif" },
    { family: "Klee One", category: "Script" },
    { family: "Yusei Magic", category: "Display" },
    { family: "Michroma", category: "Sans Serif" },
    { family: "Orbitron", category: "Sans Serif" },
    { family: "Exo", category: "Sans Serif" },
    { family: "Audiowide", category: "Display" },
    { family: "Syncopate", category: "Sans Serif" },
    { family: "Wallpoet", category: "Display" },
    { family: "Goldman", category: "Display" },
    { family: "Black Ops One", category: "Display" },
    { family: "Stardos Stencil", category: "Display" },
    { family: "Allerta Stencil", category: "Display" },
    { family: "Big Shoulders Display", category: "Display" },
    { family: "Big Shoulders Inline Display", category: "Display" },
    { family: "Rowdies", category: "Display" },
    { family: "Bungee Shade", category: "Display" },
    { family: "Bungee Outline", category: "Display" },
    { family: "Bungee Hairline", category: "Display" },
    { family: "Faster One", category: "Display" },
    { family: "Slackey", category: "Display" },
    { family: "Ribeye", category: "Display" },
    { family: "Ribeye Marrow", category: "Display" },
    { family: "Ewert", category: "Display" },
    { family: "Sancreek", category: "Display" },
    { family: "Smokum", category: "Display" },
    { family: "Rye", category: "Display" },
    { family: "Limelight", category: "Display" },
    { family: "Graduate", category: "Display" },
    { family: "Metal Mania", category: "Display" },
    { family: "Piedra", category: "Display" },
    { family: "Chonburi", category: "Display" },
    { family: "Fascinate", category: "Display" },
    { family: "Fascinate Inline", category: "Display" },
    { family: "Flamenco", category: "Display" },
    { family: "Share Tech Mono", category: "Script" },
    { family: "Major Mono Display", category: "Display" },
    { family: "Nova Mono", category: "Script" },
    { family: "Overpass Mono", category: "Script" },
    { family: "Cousine", category: "Script" },
    { family: "Tinos", category: "Serif" },
    { family: "Arimo", category: "Sans Serif" },
    { family: "Ubuntu Mono", category: "Script" },
    { family: "Nanum Gothic Coding", category: "Script" },
    { family: "Cutive Mono", category: "Script" },
    { family: "Anonymous Pro", category: "Script" },
    { family: "Azeret Mono", category: "Script" },
    { family: "Roboto Mono", category: "Script" },
    { family: "Source Code Pro", category: "Script" },
    { family: "Courier Prime", category: "Script" },
    { family: "Libre Franklin", category: "Sans Serif" },
    { family: "BioRhyme", category: "Serif" },
    { family: "Karla", category: "Sans Serif" },
    { family: "Rubik", category: "Sans Serif" },
    { family: "Inria Serif", category: "Serif" },
    { family: "Inria Sans", category: "Sans Serif" },
    { family: "Faustina", category: "Serif" },
    { family: "Recursive", category: "Sans Serif" },
    { family: "Archivo", category: "Sans Serif" },
    { family: "BioRhyme Expanded", category: "Serif" },
    { family: "Readex Pro", category: "Sans Serif" },
    { family: "Yrsa", category: "Serif" }
  ];

  // Memoize allFonts to prevent recreation every render
  const allFonts = useMemo(() => {
    const combined = [...CANVA_FONTS, ...externalFonts, ...serverFonts];
    // Remove duplicates by family name
    return combined.filter((font, index, self) =>
        index === self.findIndex((f) => f.family.toLowerCase() === font.family.toLowerCase())
    );
  }, [externalFonts, serverFonts]);

  const [activeCategory, setActiveCategory] = useState('All');
  const CATEGORIES = ['All', 'Sans Serif', 'Serif', 'Script', 'Display', 'Elegant', 'External', 'Local'];

  const filteredFonts = allFonts.filter(font => {
    // Determine category match
    let matchesCategory = activeCategory === 'All';
    if (!matchesCategory) {
        if (activeCategory === 'Local') {
            matchesCategory = serverFonts.some(sf => sf.family.toLowerCase() === font.family.toLowerCase());
        } else if (activeCategory === 'External') {
            matchesCategory = externalFonts.some(ef => ef.family.toLowerCase() === font.family.toLowerCase());
        } else {
            matchesCategory = font.category === activeCategory;
        }
    }
    
    const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const exactMatch = allFonts.find(f => f.family.toLowerCase() === search.toLowerCase());
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
        // Limit to 40 fonts to avoid hitting Google's URL length limit (~2000 chars)
        const previewLimit = 40;
        const fontsToPreview = filteredFonts.slice(0, previewLimit);
        
        // Google Fonts v2 API: family=Name1&family=Name2
        const fontParams = fontsToPreview
            .map(f => `family=${f.family.replace(/\s+/g, '+')}`)
            .join('&');

        if (fontParams) {
            let link = document.getElementById('font-picker-previews');
            if (!link) {
                link = document.createElement('link');
                link.id = 'font-picker-previews';
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            // Add :wght@400 for standard weight to ensure it matches v2 format requirements
            // Using &display=swap for performance
            link.href = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
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
            // Use v2 API for single font as well
            link.href = `https://fonts.googleapis.com/css2?family=${activeFontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }
  }, [activeFontFamily]);

  // Persist external fonts
  useEffect(() => {
    localStorage.setItem('certificate-studio-external-fonts', JSON.stringify(externalFonts));
    
    // Also inject link tags for all external fonts so they work across the app
    externalFonts.forEach(font => {
        const fontId = `font-external-${font.family.replace(/\s+/g, '-')}`;
        if (!document.getElementById(fontId)) {
            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    });
  }, [externalFonts]);

  // Handle active font not being in the list on mount (optional but good)
  useEffect(() => {
    if (activeFontFamily && !allFonts.find(f => f.family.toLowerCase() === activeFontFamily.toLowerCase())) {
        setExternalFonts(prev => [{ family: activeFontFamily, category: 'External' }, ...prev]);
    }
  }, []);

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
              onChange={(e) => {
                setSearch(e.target.value);
                setLoadingState('idle'); // Reset error/loading state when user types
              }}
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
                  onClick={async () => {
                    const family = search.trim();
                    if (!family) return;
                    
                    setLoadingState('loading');
                    
                    try {
                        const fontSpec = `400 16px "${family}"`;
                        
                        // Use FontFace API for more reliable loading and validation
                        // First, we need to fetch the CSS to find the TTF URL
                        const googleUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
                        
                        // We still inject the link tag because it's the easiest way to handle all variants (bold, italic, etc.)
                        const fontId = `font-load-${family.replace(/\s+/g, '-')}`;
                        let link = document.getElementById(fontId);
                        if (!link) {
                            link = document.createElement('link');
                            link.id = fontId;
                            link.rel = 'stylesheet';
                            link.href = googleUrl;
                            document.head.appendChild(link);
                        }

                        // Wait for the browser to recognize the font
                        // document.fonts.load is the most accurate way to check if a font specified in CSS is actually loaded
                        await new Promise(r => setTimeout(r, 600)); // Increased buffer for CSS fetching and parsing
                        const loadedFonts = await document.fonts.load(fontSpec);
                        
                        // If loadedFonts is empty, it means the font failed to load or doesn't exist
                        if (loadedFonts && loadedFonts.length > 0) {
                           // SUCCESS
                           if (!externalFonts.find(f => f.family.toLowerCase() === family.toLowerCase())) {
                               setExternalFonts(prev => [{ family, category: 'External' }, ...prev]);
                           }
                           
                           onChange({ family });
                           setIsOpen(false);
                           setLoadingState('idle');
                           setSearch('');
                           setActiveCategory('External');
                        } else {
                           throw new Error("Font not found on Google Fonts or load failed");
                        }
                    } catch (err) {
                        console.error("Failed to load external font:", err);
                        setLoadingState('error');
                    }
                  }}
                  disabled={loadingState === 'loading'}
                  style={{ fontFamily: search }}
                >
                  {loadingState === 'loading' ? (
                    <span className="font-loader-span">
                       <span className="spinner-mini"></span> Downloading...
                    </span>
                  ) : loadingState === 'error' ? (
                    "Failed to load. Try another?"
                  ) : (
                    <>Try loading "<strong>{search}</strong>" from Google</>
                  )}
                </button>
                {loadingState === 'error' && (
                    <p className="error-hint">This font might not be on Google Fonts or is spelled incorrectly.</p>
                )}
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
