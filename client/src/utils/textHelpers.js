import axios from "axios";
import { buildApiUrl } from "./api";

const DEFAULT_API_PORT = "5000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export const normalizeBaseUrl = (base = "") =>
  base.trim().replace(/\s/g, "").replace(/\/+$/, "");

export const wrapIPv6Host = (host = "") => {
  if (!host) return "localhost";
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
};

export const isLoopbackHost = (host = "") => {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]"
  );
};

export const isPrivateIPv4 = (host = "") => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const [a, b] = host.split(".").map((chunk) => parseInt(chunk, 10));
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 127) return true;
  return false;
};

export const isLocalLikeHost = (host = "") => {
  if (!host) return true;
  if (isLoopbackHost(host)) return true;
  if (isPrivateIPv4(host)) return true;
  if (
    host.startsWith("fe80") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }
  return false;
};

export const resolveApiBase = () => {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE || "");
  if (envBase) return envBase;

  if (typeof window === "undefined") return "";
  const { protocol, hostname } = window.location;

  if (protocol === "file:") {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  if (isLocalLikeHost(hostname)) {
    const safeHost = wrapIPv6Host(hostname);
    const scheme = protocol === "https:" ? "https" : "http";

    if (window.location.port !== "3000" && hostname !== "localhost") {
      return `${scheme}://${safeHost}:${DEFAULT_API_PORT}`;
    }
    return "";
  }

  return "";
};

export const toTitleCase = (value = "") => {
  return value
    .toString()
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, (word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("");
    });
};

export const formatNameInput = (value = "") => {
  const collapsed = value.replace(/\s{2,}/g, " ").replace(/^\s+/, "");
  let result = "";
  let capitalizeNext = true;

  for (const char of collapsed) {
    if (/[a-z0-9\u00c0-\u024f]/i.test(char)) {
      result += capitalizeNext ? char.toUpperCase() : char;
      capitalizeNext = false;
    } else {
      result += char;
      capitalizeNext = true;
    }
  }

  return result;
};

export const sanitizeFileBaseName = (value = "", fallback = "certificate") => {
  return (
    value
      .toString()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
};

export const stripExtension = (filename = "") => filename.replace(/\.[^/.]+$/, "");

export const uploadRemoteAttachment = async (
  apiBaseUrl,
  file,
  purpose = "certificate"
) => {
  const uploadUrl = buildApiUrl(apiBaseUrl, "api/attachments/sign-upload");
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(uploadUrl, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const cleanupRemoteAttachments = async (apiBaseUrl, attachments = []) => {
  if (!attachments.length) return;

  const cleanupUrl = buildApiUrl(apiBaseUrl, "api/attachments/cleanup");
  await axios.post(cleanupUrl, { attachments });
};

export const getCellKeyAndValue = (row = {}, columnName = "") => {
  if (!row || !columnName) return { key: null, value: "" };
  if (Object.prototype.hasOwnProperty.call(row, columnName)) {
    return { key: columnName, value: row[columnName] };
  }

  const normalizedColumn = columnName.toString().trim().toLowerCase();
  const keys = Object.keys(row);

  let resolvedKey = keys.find(
    (key) => key?.toString().trim().toLowerCase() === normalizedColumn
  );

  if (
    typeof resolvedKey === "undefined" &&
    (normalizedColumn === "name" || normalizedColumn === "email")
  ) {
    resolvedKey = keys.find((key) => {
      const k = key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      return k.includes(normalizedColumn);
    });
  }

  return typeof resolvedKey === "undefined"
    ? { key: null, value: "" }
    : { key: resolvedKey, value: row[resolvedKey] };
};

export const getCellValue = (row = {}, columnName = "") =>
  getCellKeyAndValue(row, columnName).value;

export const isValidEmail = (value = "") => EMAIL_REGEX.test(value.trim());
