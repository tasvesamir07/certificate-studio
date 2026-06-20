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
  const safeTitle = escapeHTML(title || "Message");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.05), 0 2px 4px -1px rgba(99, 102, 241, 0.03);
      overflow: hidden;
    }
    .header {
      background-color: #4f46e5;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
      font-size: 16px;
      color: #334155;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
    }
    .footer p {
      margin: 0 0 8px 0;
    }
    .footer p:last-child {
      margin-bottom: 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Certificate Studio</h1>
      </div>
      <div class="content">
        ${contentBody}
      </div>
      <div class="footer">
        <p>${footerText || 'This secure email was sent by Certificate Studio on behalf of the issuer.'}</p>
        <p>&copy; ${new Date().getFullYear()} Certificate Studio. All rights reserved.</p>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 12px; margin-bottom: 0;">
          To ensure delivery, please add the sender's email address to your address book.
        </p>
      </div>
    </div>
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
    `<h2>Congratulations!</h2>
     <p>${bodyContent}</p>
     <p>Your secure, authentic certificate is attached to this email.</p>`,
    "This certificate was generated and sent securely on behalf of the issuer via Certificate Studio."
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
