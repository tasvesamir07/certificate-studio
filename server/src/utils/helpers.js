const sanitizeFileName = (value = "", fallback = "certificate") => {
  return (
    value
      .toString()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
};

const stripExtension = (filename = "") => filename.replace(/\.[^/.]+$/, "");

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  const normalized = value.toString().trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  return defaultValue;
};

const chunkArray = (arr = [], size = 1) => {
  if (!Array.isArray(arr) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const NAME_TOKEN_REGEX = /{{\s*name\s*}}|{\s*name\s*}/gi;
const EMAIL_TOKEN_REGEX = /{{\s*email\s*}}|{\s*email\s*}/gi;
const DEFAULT_EMAIL_TEMPLATE = `Hi {name},

Congratulations! Your certificate is attached.

Warmly,
Your Certificate Team`;

const buildEmailBodies = (template = "", name = "", email = "") => {
  const safeName = name || "";
  const safeEmail = email || "";
  const baseTemplate = template?.toString() || DEFAULT_EMAIL_TEMPLATE;
  const populated = baseTemplate
    .replace(NAME_TOKEN_REGEX, safeName)
    .replace(EMAIL_TOKEN_REGEX, safeEmail);
  return {
    text: populated,
    html: populated.replace(/\r?\n/g, "<br />"),
  };
};

const getColumnValue = (row = {}, columnName = "") => {
  if (!row || !columnName) return "";
  if (Object.prototype.hasOwnProperty.call(row, columnName)) return row[columnName];
  const normalizedColumn = columnName.toString().trim().toLowerCase();
  const keys = Object.keys(row);
  let resolvedKey = keys.find(k => k?.toString().trim().toLowerCase() === normalizedColumn);
  if (typeof resolvedKey === "undefined" && (normalizedColumn === "name" || normalizedColumn === "email")) {
    resolvedKey = keys.find(k => k?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedColumn));
  }
  return typeof resolvedKey === "undefined" ? "" : row[resolvedKey];
};

module.exports = {
  sanitizeFileName,
  stripExtension,
  parseBoolean,
  chunkArray,
  buildEmailBodies,
  getColumnValue
};
