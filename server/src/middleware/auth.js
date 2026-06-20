const crypto = require("crypto");

const secret = process.env.JWT_SECRET || "default_secret_key_123456";

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch (err) {
    return null;
  }
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired session token." });
  }

  req.user = decoded;
  next();
};

const generateToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const stringifiedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${stringifiedPayload}`).digest("base64url");
  return `${header}.${stringifiedPayload}.${signature}`;
};

module.exports = {
  requireAuth,
  generateToken,
};
