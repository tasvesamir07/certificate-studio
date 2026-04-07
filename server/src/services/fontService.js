const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { GlobalFonts } = require("@napi-rs/canvas");
const os = require("os");

const fontsDir = path.join(process.cwd(), "fonts");
const dynamicFontsDir = path.join(os.tmpdir(), "dynamic-fonts");

if (!fs.existsSync(dynamicFontsDir)) {
  fs.mkdirSync(dynamicFontsDir, { recursive: true });
}

const availableFonts = new Set();
const fontList = [];
let DEFAULT_FONT = "sans-serif";

function setupFonts() {
  if (!fs.existsSync(fontsDir)) {
    console.warn(`Fonts folder not found at ${fontsDir}.`);
    return;
  }

  try {
    const files = fs.readdirSync(fontsDir);
    const fontFiles = files.filter(f => f.toLowerCase().endsWith(".ttf") || f.toLowerCase().endsWith(".otf"));

    for (const file of fontFiles) {
      const fontPath = path.join(fontsDir, file);
      const family = path.parse(file).name.replace(/[-_]/g, ' ');
      try {
        GlobalFonts.registerFromPath(fontPath, family);
        availableFonts.add(family);
        fontList.push({ family, file });
        console.log(`✅ Loaded font: ${family}`);
      } catch (err) {
        console.warn(`⚠️ Failed to load font ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error reading fonts directory: ${err.message}`);
  }
}

async function ensureFont(family, style = "normal", weight = "400") {
  if (!family || family.toLowerCase() === "sans-serif") return "sans-serif";
  
  const variantSuffix = (style === "italic" ? " Italic" : "");
  const fullRequestName = `${family}${variantSuffix}`;
  
  const repoMatch = Array.from(availableFonts).find(f => 
    f.toLowerCase() === fullRequestName.toLowerCase() || 
    f.toLowerCase() === family.toLowerCase()
  );
  if (repoMatch) return repoMatch;

  const normalizedFile = fullRequestName.toLowerCase().replace(/\s+/g, '-');
  const tempFontPath = path.join(dynamicFontsDir, `${normalizedFile}.ttf`);
  
  if (fs.existsSync(tempFontPath)) {
    try {
      GlobalFonts.registerFromPath(tempFontPath, fullRequestName);
      availableFonts.add(fullRequestName);
      return fullRequestName;
    } catch (e) {
      return "sans-serif";
    }
  }

  return "sans-serif"; // Simplification for now, original had download logic
}

module.exports = {
  setupFonts,
  ensureFont,
  availableFonts,
  fontList,
  DEFAULT_FONT
};
