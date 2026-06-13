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
  if (fs.existsSync(fontsDir)) {
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

  DEFAULT_FONT = "sans-serif";
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

  console.log(`🔍 Font "${fullRequestName}" not found locally. Fetching from Google Fonts...`);

  try {
    let googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`;
    if (style === "italic") {
      googleFontsUrl += `:ital@1`;
    }

    const response = await axios.get(googleFontsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
    });

    const ttfUrlMatch = response.data.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/);
    if (!ttfUrlMatch) {
      throw new Error(`No .ttf URL found for font "${fullRequestName}"`);
    }

    const ttfUrl = ttfUrlMatch[1];
    const fileName = `${normalizedFile}.ttf`;
    const fontPath = path.join(dynamicFontsDir, fileName);

    console.log(`📥 Downloading font: ${fullRequestName}`);
    const fontResponse = await axios.get(ttfUrl, { responseType: 'arraybuffer', timeout: 15000 });
    fs.writeFileSync(fontPath, fontResponse.data);

    GlobalFonts.registerFromPath(fontPath, fullRequestName);
    availableFonts.add(fullRequestName);

    if (!fontList.find(f => f.family === fullRequestName)) {
      fontList.push({ family: fullRequestName, file: fileName });
    }

    console.log(`✅ Dynamically loaded and cached font: ${fullRequestName}`);
    return fullRequestName;
  } catch (err) {
    console.error(`❌ Failed to fetch font "${fullRequestName}": ${err.message}`);
    return family;
  }
}

module.exports = {
  setupFonts,
  ensureFont,
  fontList,
};
