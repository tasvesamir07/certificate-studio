/**
 * Builds a robust API URL by normalizing the base URL and endpoint.
 * Prevents double /api prefixes and other common URL formatting issues.
 * 
 * @param {string} base - The base API URL (e.g., from VITE_API_BASE).
 * @param {string} endpoint - The specific API endpoint (e.g., 'auth/login').
 * @returns {string} The normalized and complete API URL.
 */
export const buildApiUrl = (base = "", endpoint = "") => {
  const normalizedBase = base.trim().replace(/\/+$/, "");
  const normalizedEndpoint = endpoint.trim().replace(/^\/+/, "");

  // If the base already ends with /api, and the endpoint starts with api/,
  // we remove the duplicate 'api/' from the endpoint.
  let finalEndpoint = normalizedEndpoint;
  if (normalizedBase.endsWith("/api") && finalEndpoint.startsWith("api/")) {
    finalEndpoint = finalEndpoint.replace(/^api\//, "");
  } else if (!normalizedBase.endsWith("/api") && !finalEndpoint.startsWith("api/")) {
    // If neither has 'api', we might need to add it if the backend expects it.
    // However, most calls here explicitly include 'api/' in the endpoint.
  }

  const url = `${normalizedBase}/${finalEndpoint}`;
  
  // Final cleanup: remove double slashes (but not the ones in http://)
  return url.replace(/([^:]\/)\/+/g, "$1");
};
