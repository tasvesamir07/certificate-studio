import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { buildApiUrl } from "../../utils/api";

export function useFonts(apiBaseUrl) {
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFonts = useCallback(async () => {
    try {
      setLoading(true);
      const fontsUrl = buildApiUrl(apiBaseUrl, "api/fonts");
      const response = await axios.get(fontsUrl);
      const fontsData = response.data || [];
      setFonts(fontsData);

      // Inject @font-face for each server font
      const styleId = "server-fonts-styles";
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }

      let css = "";
      fontsData.forEach((f) => {
        const fontUrl = buildApiUrl(apiBaseUrl, `api/fonts/${f.file}`);
        css += `
          @font-face {
            font-family: "${f.family}";
            src: url("${fontUrl}") format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: block;
          }
        `;
      });
      styleTag.textContent = css;

      // Pre-load fonts in the browser
      if (document.fonts?.load) {
        fontsData.forEach((font) => {
          document.fonts.load(`16px "${font.family}"`);
        });
      }
      setError(null);
    } catch (err) {
      console.error("Failed to fetch server fonts:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const preloadFonts = useCallback(async (fontsToLoad = []) => {
    const targets = fontsToLoad.length ? fontsToLoad : fonts;
    if (!targets.length) return;

    try {
      const fontPromises = targets.map((f) => {
        const family = typeof f === "string" ? f : f.family;
        return document.fonts.load(`16px "${family}"`);
      });
      await Promise.all(fontPromises);
      // Small safety buffer after parallel loads
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.warn("Font preloading partially failed:", err);
    }
  }, [fonts]);

  return { fonts, loading, error, preloadFonts, refetch: fetchFonts };
}
