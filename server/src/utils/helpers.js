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

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toString().trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const escapeHTML = (str = "") => {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const NAME_TOKEN_REGEX = /{{\s*name\s*}}|{\s*name\s*}/gi;
const EMAIL_TOKEN_REGEX = /{{\s*email\s*}}|{\s*email\s*}/gi;
const DEFAULT_EMAIL_TEMPLATE = `Hi {name},

Congratulations! Your certificate is attached.

Warmly,
Your Certificate Team`;

const wrapEmailInTemplate = (title, contentBody, footerText = "") => {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; margin: 0; padding: 20px; text-align: left;">
  <div style="max-width: 600px; margin: 0 auto; text-align: left;">
    ${contentBody}
  </div>
</body>
</html>`;
};

const buildEmailBodies = (template = "", name = "", email = "") => {
  const safeName = name || "";
  const safeEmail = email || "";
  const baseTemplate = template?.toString() || DEFAULT_EMAIL_TEMPLATE;

  const textPopulated = baseTemplate
    .replace(NAME_TOKEN_REGEX, safeName)
    .replace(EMAIL_TOKEN_REGEX, safeEmail);

  const escapedName = escapeHTML(safeName);
  const escapedEmail = escapeHTML(safeEmail);

  const bodyContent = baseTemplate
    .replace(NAME_TOKEN_REGEX, escapedName)
    .replace(EMAIL_TOKEN_REGEX, escapedEmail)
    .replace(/\r?\n/g, "<br />");

  const htmlPopulated = wrapEmailInTemplate(
    "Certificate Issued",
    `<p style="margin-top: 0; margin-bottom: 16px; text-align: left;">${bodyContent}</p>`
  );

  return {
    text: textPopulated,
    html: htmlPopulated,
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
  toTitleCase,
  buildEmailBodies,
  wrapEmailInTemplate,
  getColumnValue
};
