const crypto = require("crypto");
const axios = require("axios");
const pool = require("../models/db");

const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

// In-memory store for PKCE verifiers (use Redis in production)
const pkceStore = new Map();

const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString("base64url");
};

const generateCodeChallenge = (verifier) => {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
};

const checkConnection = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send({ message: "User ID is required." });

  try {
    const tokenResult = await pool.query(
      "SELECT expires_at FROM user_canva_tokens WHERE user_id = $1",
      [userId]
    );

    const isConnected = tokenResult && tokenResult.rows && tokenResult.rows.length > 0;
    res.send({ isConnected });
  } catch (err) {
    console.error("Check Connection Error:", err.message);
    res.status(500).send({ isConnected: false });
  }
};

const getAuthUrl = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send({ message: "User ID is required." });

  const client_id = process.env.CANVA_CLIENT_ID?.trim();
  const redirect_uri = process.env.CANVA_REDIRECT_URI?.trim();
  
  if (!client_id || !redirect_uri) {
    return res.status(500).send({ message: "Canva credentials not configured on server." });
  }

  const code_verifier = generateCodeVerifier();
  const code_challenge = generateCodeChallenge(code_verifier);
  const state = crypto.randomBytes(16).toString("hex");

  // Store verifier for later use in callback
  pkceStore.set(state, { code_verifier, userId });

  console.log("Generating Canva Auth URL for Client ID:", client_id);
  const params = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri,
    scope: "design:meta:read design:content:read profile:read",
    code_challenge,
    code_challenge_method: "S256",
    state,
    prompt: "login",
  });

  const authUrl = `${CANVA_AUTH_URL}?${params.toString()}`;
  console.log("Full Canva Auth URL Produced (Check query params):", authUrl);
  res.send({ url: authUrl });
};

const handleCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.warn("Canva Auth Error:", error);
    const redirectUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${redirectUrl}/canva-error?error=${error}`);
  }

  const stored = pkceStore.get(state);
  if (!stored) {
    return res.status(400).send({ message: "Invalid state or session expired." });
  }

  const { code_verifier, userId } = stored;
  pkceStore.delete(state);

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.CANVA_REDIRECT_URI,
      code_verifier,
      client_id: process.env.CANVA_CLIENT_ID,
      client_secret: process.env.CANVA_CLIENT_SECRET,
    });

    const response = await axios.post(CANVA_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expires_at = new Date(Date.now() + expires_in * 1000);

    // Store tokens in database
    await pool.query(
      `INSERT INTO user_canva_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE 
       SET access_token = EXCLUDED.access_token, 
           refresh_token = EXCLUDED.refresh_token, 
           expires_at = EXCLUDED.expires_at`,
      [userId, access_token, refresh_token, expires_at]
    );

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/canva-success`);
  } catch (err) {
    console.error("Canva Token Exchange Error:", err.response?.data || err.message);
    res.status(500).send({ message: "Failed to exchange Canva token." });
  }
};

const getValidToken = async (userId) => {
  const tokenResult = await pool.query(
    "SELECT access_token, refresh_token, expires_at FROM user_canva_tokens WHERE user_id = $1",
    [userId]
  );

  if (!tokenResult || !tokenResult.rows || tokenResult.rows.length === 0) {
    throw new Error("Canva not connected.");
  }

  let { access_token, refresh_token, expires_at } = tokenResult.rows[0];

  // Check if token is expired (or about to expire in 5 mins)
  if (new Date(expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: process.env.CANVA_CLIENT_ID,
      client_secret: process.env.CANVA_CLIENT_SECRET,
    });

    const refreshResponse = await axios.post(CANVA_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    access_token = refreshResponse.data.access_token;
    refresh_token = refreshResponse.data.refresh_token || refresh_token;
    const expires_in = refreshResponse.data.expires_in;
    expires_at = new Date(Date.now() + expires_in * 1000);

    await pool.query(
      "UPDATE user_canva_tokens SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE user_id = $4",
      [access_token, refresh_token, expires_at, userId]
    );
  }

  return access_token;
};

const getDesigns = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send({ message: "User ID is required." });

  // Add strict cache-busting headers
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  try {
    const access_token = await getValidToken(userId);
    
    // Fetch designs (increased limit to 40)
    const designsResponse = await axios.get("https://api.canva.com/rest/v1/designs?max_items=40", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Fetch user profile to help clarify account connection
    let profile = null;
    try {
      const profileResponse = await axios.get("https://api.canva.com/rest/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      profile = profileResponse.data.profile;
    } catch (profileErr) {
      console.warn("Failed to fetch Canva profile:", profileErr.message);
    }

    // Sort designs by updated_at descending
    const designs = designsResponse.data.items || [];
    
    // Robust sorting function to handle both Unix timestamps (seconds) and ISO strings
    const getSortVal = (v) => {
      if (!v) return 0;
      if (typeof v === "number") return v; // Keep as number if it's already a Unix timestamp
      const date = new Date(v);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const sortedItems = designs.sort((a, b) => getSortVal(b.updated_at) - getSortVal(a.updated_at));
    
    // Debug log for sorted order
    if (sortedItems.length > 0) {
      console.log(`Canva Sync: Fetched ${sortedItems.length} designs. Top design: "${sortedItems[0].title}" (Updated at: ${sortedItems[0].updated_at})`);
    }

    res.send({ 
      ...designsResponse.data, 
      items: sortedItems,
      profile: profile
    });
  } catch (err) {
    console.error("Canva API Error:", err.response?.data || err.message);
    const status = err.message === "Canva not connected." ? 401 : (err.response?.status || 500);
    res.status(status).send({ message: "Failed to fetch Canva designs.", details: err.response?.data || err.message });
  }
};

const exportDesign = async (req, res) => {
    const { userId, designId, pages } = req.body;
    if (!userId || !designId) return res.status(400).send({ message: "User ID and Design ID required." });

    try {
        const access_token = await getValidToken(userId);

        // 1. Create Export Job
        const exportBody = { 
            design_id: designId,
            format: { 
                type: "png",
                export_quality: "pro"
            } 
        };
        
        // If specific pages are requested (e.g., [1, 5]), add them to the request
        if (pages && Array.isArray(pages) && pages.length > 0) {
            exportBody.pages = pages;
        }

        const exportJobsResponse = await axios.post(
            `https://api.canva.com/rest/v1/exports`,
            exportBody,
            { headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" } }
        );

        const { id: jobId } = exportJobsResponse.data.job;

        // 2. Poll for Export Completion (Ultra-Fast)
        let jobResult;
        for (let i = 0; i < 40; i++) {
            // Aggressive: Wait only 500ms for the first 10 attempts, then 1s
            const delay = i < 10 ? 500 : 1000;
            await new Promise(r => setTimeout(r, delay));
            
            try {
                const statusResponse = await axios.get(
                    `https://api.canva.com/rest/v1/exports/${jobId}`,
                    { headers: { Authorization: `Bearer ${access_token}` } }
                );
                // Handle both wrapped and unwrapped Canva job responses
                jobResult = statusResponse.data.job || statusResponse.data;
                
                if (jobResult.status === "success") break;
                if (jobResult.status === "failed") {
                    console.error("Canva export job failed:", jobResult.error || jobResult);
                    throw new Error("Canva export job failed.");
                }
            } catch (pollErr) {
                console.error("Canva export polling error:", pollErr.response?.data || pollErr.message);
            }
        }

        if (!jobResult || jobResult.status !== "success") {
            console.error("Canva Export failed or timed out. Last job status:", JSON.stringify(jobResult, null, 2));
            throw new Error("Canva export timed out or failed.");
        }

        // Robustly find the URL in the result (Canva API structures can vary)
        const exportUrl = jobResult.urls?.[0] || 
                          jobResult.resources?.[0]?.url || 
                          (jobResult.resources && jobResult.resources[0]) ||
                          (Array.isArray(jobResult.resources) && jobResult.resources[0]?.url) ||
                          jobResult.url;

        if (!exportUrl) {
            console.error("Canva Success, but no URL found:", JSON.stringify(jobResult, null, 2));
            throw new Error("Canva export succeeded, but download URL is missing.");
        }

        console.log("Canva Export Success:", jobResult.urls);
        res.send({ 
          url: exportUrl, // Keep for backward compatibility
          urls: jobResult.urls || [exportUrl] // Send all pages
        });
    } catch (err) {
        console.error("Canva Export Detailed Error:", err.response?.data || err.message);
        res.status(err.response?.status || 500).send({ 
            message: "Failed to export Canva design.",
            details: err.response?.data || err.message,
            statusCode: err.response?.status 
        });
    }
};

const disconnect = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).send({ message: "User ID is required." });

  try {
    await pool.query("DELETE FROM user_canva_tokens WHERE user_id = $1", [userId]);
    res.send({ message: "Canva disconnected successfully." });
  } catch (err) {
    console.error("Disconnect Canva Error:", err.message);
    res.status(500).send({ message: "Failed to disconnect Canva." });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  getDesigns,
  exportDesign,
  checkConnection,
  disconnect
};
