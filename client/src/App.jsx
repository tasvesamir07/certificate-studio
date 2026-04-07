import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useDropzone } from "react-dropzone";
import { Rnd } from "react-rnd";
import * as XLSX from "xlsx";
import axios from "axios";
import { saveAs } from "file-saver";
import { Toaster, toast } from "react-hot-toast";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import FontPicker from './components/FontPicker';

import "./App.css";
import LoginPage from "./Pages/LoginPage";
import ProfilePage from "./Pages/ProfilePage";
import PricingPage from "./Pages/PricingPage";
import GetPasswordPage from "./Pages/GetPasswordPage";
import ForgotPasswordPage from "./Pages/ForgotPasswordPage";
import { buildApiUrl } from "./utils/api";

// New Modular Components
import EditorHeader from "./components/EditorHeader";
import LayerPanel from "./components/LayerPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import ManualRecipientsPanel from "./components/ManualRecipientsPanel";
import EmailSettingsPanel from "./components/EmailSettingsPanel";
import CanvasStage from "./components/CanvasStage";
import PreviewGrid from "./components/PreviewGrid";
import CanvaDesignModal from "./components/CanvaDesignModal";

const normalizeBaseUrl = (base = "") =>
  base.trim().replace(/\s/g, "").replace(/\/+$/, "");

const DEFAULT_API_PORT = "5000";
const AUTH_STORAGE_KEY = "certificate-studio-auth";
const AUTH_USER_KEY = "certificate-studio-user";
const AUTH_TOKEN_KEY = "certificate-studio-session";
const CERTIFICATE_RENDER_SCALE = 1.6;
const CERTIFICATE_JPEG_QUALITY = 0.82;

const wrapIPv6Host = (host = "") => {
  if (!host) return "localhost";
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
};

const isLoopbackHost = (host = "") => {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]"
  );
};

const isPrivateIPv4 = (host = "") => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const [a, b] = host.split(".").map((chunk) => parseInt(chunk, 10));
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 127) return true;
  return false;
};

const isLocalLikeHost = (host = "") => {
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

// --- MODIFIED FUNCTION ---
const resolveApiBase = () => {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE || "");
  if (envBase) return envBase;

  if (typeof window === "undefined") return "";
  const { protocol, hostname } = window.location;

  if (protocol === "file:") {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  // If running on a local-like host (e.g., localhost during npm start), use the proxy,
  // which means returning an empty string for relative paths.
  if (isLocalLikeHost(hostname)) {
    const safeHost = wrapIPv6Host(hostname);
    const scheme = protocol === "https:" ? "https" : "http";

    // If the port is not the typical React dev port, assume it's running
    // in a non-proxied local environment (like a standalone test build)
    if (window.location.port !== "3000" && hostname !== "localhost") {
      return `${scheme}://${safeHost}:${DEFAULT_API_PORT}`;
    }
    // For typical development or production rewrite, return empty string for relative paths.
    return "";
  }

  // In production (Firebase Hosting with rewrite rule), this returns ""
  // ensuring API calls are relative to the root (e.g., /api/fonts)
  return "";
};
// -------------------------

const toTitleCase = (value = "") => {
  return value
    .toString()
    .toLowerCase()
    .replace(/[\p{L}\p{N}]+/gu, (word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("");
    });
};

const formatNameInput = (value = "") => {
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

const sanitizeFileBaseName = (value = "", fallback = "certificate") => {
  return (
    value
      .toString()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
};

const stripExtension = (filename = "") => filename.replace(/\.[^/.]+$/, "");

const uploadRemoteAttachment = async (
  apiBaseUrl,
  file,
  purpose = "certificate"
) => {
  const signUrl = buildApiUrl(apiBaseUrl, "api/attachments/sign-upload");
  const safeFilename = sanitizeFileBaseName(file?.name || "attachment.pdf");
  const signRes = await axios.post(signUrl, {
    filename: safeFilename,
    purpose,
  });

  const {
    apiKey,
    cloudName,
    folder,
    publicId,
    tags,
    signature,
    timestamp,
    uploadUrl,
  } = signRes.data || {};

  if (!apiKey || !cloudName || !signature || !timestamp) {
    throw new Error("Attachment upload signature is incomplete.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  if (folder) formData.append("folder", folder);
  if (publicId) formData.append("public_id", publicId);
  if (tags) formData.append("tags", tags);

  const cloudinaryUrl =
    uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
  const uploadRes = await axios.post(cloudinaryUrl, formData);
  const uploadData = uploadRes.data || {};

  return {
    contentType: file?.type || "application/octet-stream",
    filename: safeFilename,
    publicId: uploadData.public_id,
    resourceType: uploadData.resource_type || "raw",
    url: uploadData.secure_url,
  };
};

const cleanupRemoteAttachments = async (apiBaseUrl, attachments = []) => {
  if (!attachments.length) return;

  const cleanupUrl = buildApiUrl(apiBaseUrl, "api/attachments/cleanup");
  await axios.post(cleanupUrl, { attachments });
};

const getCellKeyAndValue = (row = {}, columnName = "") => {
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

const getCellValue = (row = {}, columnName = "") =>
  getCellKeyAndValue(row, columnName).value;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isValidEmail = (value = "") => EMAIL_REGEX.test(value.trim());

// --- API URLs use the resolved base ---
const API_BASE_URL = resolveApiBase();

  // Handled by centralized buildApiUrl imported above

const API_FONTS_URL = buildApiUrl(API_BASE_URL, "api/fonts");
const API_SEND_URL = buildApiUrl(API_BASE_URL, "api/generate-and-send");
// -------------------------------------

const COLOR_SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#C67F0E",
  "#0D47A1",
  "#C2185B",
  "#388E3C",
];

const DEFAULT_EMAIL_MESSAGE = `Hi {name},

Congratulations! Your certificate is ready. Please find it attached to this email.

Best regards,
The Certificates Team`;

const DEFAULT_TEMPLATE_SIZE = { width: 800, height: 600 };
const DEFAULT_VIEWPORT_WIDTH = 1600;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const CONTROL_PANEL_WIDTH = 320;
const DATA_PANEL_WIDTH = 300;
const PREVIEW_PADDING = 80;
const BASE_MAX_PREVIEW_WIDTH = 1280;
const BASE_MAX_PREVIEW_HEIGHT = 900;
const MIN_PREVIEW_WIDTH = 480;
const MIN_PREVIEW_HEIGHT = 360;
const MIN_LAYOUT_WIDTH = 100;
const MIN_LAYOUT_HEIGHT = 30;
const LAYOUT_STORAGE_KEY = "certificate-designer-layouts";
const MAX_MANUAL_RECIPIENTS = 5;
const DEFAULT_ZOOM_SCALE = 0.35;
const PREVIEW_THUMBNAIL_WIDTH = 300;
const MAX_BATCH_SIZE = 100;

const createManualRecipient = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  email: "",
});

const CANVAS_TEXT_ALIGN = {
  left: "left",
  center: "center",
  right: "right",
};
const MIN_DYNAMIC_FONT_SIZE = 8;
const MAX_FONT_SIZE = 1000; // Prevent runaway scaling
const FONT_FIT_PADDING = 1.0;
const GOLDEN_BORDER_PADDING = 0;

const fitFontSizeToBox = (
  ctx,
  text,
  fontFamily,
  desiredSize,
  boxWidth,
  boxHeight,
  fontWeight = "normal",
  fontStyle = "normal"
) => {
  let size = Math.max(MIN_DYNAMIC_FONT_SIZE, Number(desiredSize) || 0);
  const safeText = text?.toString() || "";
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    ctx.font = `${fontStyle} ${fontWeight} ${size}px "${fontFamily}"`;
    const metrics = ctx.measureText(safeText);
    
    // Calculate precise width & height based on bounding box
    const left = Math.abs(metrics.actualBoundingBoxLeft || 0);
    const right = Math.abs(metrics.actualBoundingBoxRight || 0);
    const width = left + right || metrics.width || 0;
    
    // For height, use ascent + descent, but we'll be slightly more lenient
    // to allow a better fit if flourishes are extreme but the "core" text is small.
    const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
    const descent = metrics.actualBoundingBoxDescent || size * 0.2;
    const height = ascent + descent;

    const allowedWidth = Math.max(1, boxWidth);
    const allowedHeight = Math.max(1, boxHeight);

    const widthRatio = width ? allowedWidth / width : 1;
    const heightRatio = height ? allowedHeight / height : 1;
    
    // We prioritize width but don't want to overflow height.
    const ratio = Math.min(widthRatio, heightRatio);

    // If it fits or is within 2% margin, stop shrinking.
    if (ratio >= 0.98) {
      break;
    }

    // Shrink-only logic: never grow beyond the current size
    const nextSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.floor(size * ratio)
    );

    if (nextSize >= size) break;
    size = nextSize;
  }

  return size;
};

const getResponsivePreviewWidth = (viewportWidth = DEFAULT_VIEWPORT_WIDTH) => {
  const available =
    viewportWidth - (CONTROL_PANEL_WIDTH + DATA_PANEL_WIDTH + PREVIEW_PADDING);
  return Math.max(
    MIN_PREVIEW_WIDTH,
    Math.min(BASE_MAX_PREVIEW_WIDTH, available)
  );
};

const getResponsivePreviewHeight = (
  viewportHeight = DEFAULT_VIEWPORT_HEIGHT
) => {
  const available = viewportHeight - PREVIEW_PADDING * 1.5;
  return Math.max(
    MIN_PREVIEW_HEIGHT,
    Math.min(BASE_MAX_PREVIEW_HEIGHT, available)
  );
};

const calculateAutoScale = (naturalWidth, naturalHeight) => {
  if (!naturalWidth || !naturalHeight) return DEFAULT_ZOOM_SCALE;
  
  const isMobile = window.innerWidth <= 768;
  // Account for panels and padding
  const hPadding = isMobile ? 60 : (CONTROL_PANEL_WIDTH + DATA_PANEL_WIDTH + PREVIEW_PADDING * 2.5);
  const vPadding = isMobile ? 120 : (PREVIEW_PADDING * 2.5 + 80); // 80 for header/controls
  
  const availableW = Math.max(MIN_PREVIEW_WIDTH, window.innerWidth - hPadding);
  const availableH = Math.max(MIN_PREVIEW_HEIGHT, window.innerHeight - vPadding);
  
  const scaleW = availableW / naturalWidth;
  const scaleH = availableH / naturalHeight;
  
  // We fit the image while leaving 5% breathing room, but don't exceed 100% size unless tiny
  const bestFit = Math.min(scaleW, scaleH) * 0.95;
  return Math.min(1.2, Math.max(0.1, bestFit));
};

const createInitialLayout = (templateWidth, templateHeight) => {
  const safeWidth = Math.max(MIN_LAYOUT_WIDTH, Math.round(templateWidth * 0.65));
  const safeHeight = Math.max(
    MIN_LAYOUT_HEIGHT,
    Math.round(templateHeight * 0.18)
  );

  return {
    x: Math.max(0, Math.round((templateWidth - safeWidth) / 2)),
    y: Math.max(0, Math.round(templateHeight * 0.42 - safeHeight / 2)),
    width: Math.min(templateWidth, safeWidth),
    height: Math.min(templateHeight, safeHeight),
    fontSize: 160,
    fontFamily: "Libre Baskerville",
    color: "#2D3436",
    align: "center",
    v_align: "middle",
    fontWeight: "normal",
    fontStyle: "normal",
  };
};

const drawCertificateToCanvas = async (
  canvas,
  templateImage,
  layout,
  fullName,
  options = {}
) => {
  const { drawName = true, multiplier = 1 } = options;
  const { width: templateWidth, height: templateHeight } = templateImage;

  canvas.width = Math.round(templateWidth * multiplier);
  canvas.height = Math.round(templateHeight * multiplier);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  // Use scale to handle the high-DPI coordinate system automatically
  ctx.scale(multiplier, multiplier);
  
  // Set quality hints
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(templateImage, 0, 0, templateWidth, templateHeight);

  if (drawName) {
    if (!layout) {
      throw new Error("A layout is required to draw recipient names.");
    }

    const { x, y, width, height, fontSize, fontFamily, color, align, v_align } =
      layout;
    const fontWeight = layout.fontWeight || "normal";
    const fontStyle = layout.fontStyle || "normal";

    const desiredFontSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.round(fontSize) || 0
    );
    const activeFontFamily = fontFamily || "sans-serif";

    // Ensure font is loaded before measuring or drawing
    if (document.fonts?.load) {
      const fontSpec = `${fontStyle} ${fontWeight} ${desiredFontSize}px "${activeFontFamily}"`;
      try {
        // First check if already loaded
        if (!document.fonts.check(fontSpec)) {
          // If not loaded, request it and wait
          await document.fonts.load(fontSpec);
          // Small extra wait for some browsers to process the layout
          await new Promise(r => setTimeout(r, 50)); 
        }
      } catch (err) {
        console.warn("Font load warning for certificate drawing:", err);
      }
    }

    const appliedFontSize = fitFontSizeToBox(
      ctx,
      fullName,
      activeFontFamily,
      desiredFontSize,
      width,
      height,
      fontWeight,
      fontStyle
    );

    ctx.font = `${fontStyle} ${fontWeight} ${appliedFontSize}px "${activeFontFamily}"`;
    ctx.fillStyle = color || "#000000";
    ctx.textAlign = CANVAS_TEXT_ALIGN[align] || "center";

    const anchorX =
      align === "left" ? x : align === "right" ? x + width : x + width / 2;

    const metrics = ctx.measureText(fullName);
    const ascent = metrics.actualBoundingBoxAscent || 0;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const actualTextHeight = ascent + descent;

    let anchorY;
    ctx.textBaseline = "alphabetic";

    if (v_align === "top") {
      anchorY = y + ascent;
    } else if (v_align === "bottom") {
      anchorY = y + height - descent;
    } else {
      anchorY = y + (height - actualTextHeight) / 2 + ascent;
    }

    ctx.save();
    ctx.beginPath();
    // Adding a slight buffer to the clipping rect to avoid edge artifacts
    ctx.rect(x - 1, y - 1, width + 2, height + 2);
    ctx.clip();
    ctx.fillText(fullName, anchorX, anchorY);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed to create a blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
};

const generateCertificatePDF = async (
  templateImage,
  layout,
  fullName,
  options = {},
  templateBackImage = null
) => {
  const { width, height } = templateImage;
  const orientation = width > height ? "l" : "p";

  // Render the browser preview into a moderately high-res canvas, then embed
  // it as JPEG in the PDF to keep each attachment well below Vercel-safe sizes.
  const canvas = document.createElement("canvas");
  await drawCertificateToCanvas(
    canvas,
    templateImage,
    layout,
    fullName,
    { drawName: true, multiplier: CERTIFICATE_RENDER_SCALE, ...options }
  );

  const doc = new jsPDF({
    compress: true,
    orientation,
    unit: "px",
    format: [width, height],
  });

  const imgData = canvas.toDataURL("image/jpeg", CERTIFICATE_JPEG_QUALITY);
  doc.addImage(imgData, "JPEG", 0, 0, width, height, undefined, "MEDIUM");

  if (templateBackImage) {
    const backImg = templateBackImage;
    const { naturalWidth: bW, naturalHeight: bH } = backImg;
    const backOrientation = bW > bH ? "l" : "p";

    doc.addPage([bW, bH], backOrientation);
    doc.addImage(backImg, "PNG", 0, 0, bW, bH, undefined, "FAST");
  }

  return doc.output("blob");
};

const drawCertificateToCanvasThumbnail = async (
  canvas,
  templateImage,
  fullLayout,
  fullName,
  options = {}
) => {
  const { thumbnailWidth = PREVIEW_THUMBNAIL_WIDTH } = options;
  const { naturalWidth: templateWidth, naturalHeight: templateHeight } =
    templateImage;

  // 1. Render at FULL HIGH-RES on an off-screen canvas first
  // This is the "Bomb-Proof" way to ensure the thumbnail is EXACTLY the same
  // as the high-res one (no rounding errors, no font mismatches).
  const highResCanvas = document.createElement("canvas");
  await drawCertificateToCanvas(
    highResCanvas,
    templateImage,
    fullLayout,
    fullName,
    { drawName: true, ...options }
  );

  // 2. Set thumbnail dimensions
  const scaleRatio = thumbnailWidth / templateWidth;
  const thumbnailHeight = templateHeight * scaleRatio;
  canvas.width = thumbnailWidth;
  canvas.height = thumbnailHeight;

  // 3. Draw the high-res result onto our smaller thumbnail canvas
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get thumbnail context");

  // Use smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(highResCanvas, 0, 0, thumbnailWidth, thumbnailHeight);

  return canvas.toDataURL("image/jpeg", 0.75);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [loginPrefill, setLoginPrefill] = useState("");
  const [template, setTemplate] = useState(null);
  const [templateURL, setTemplateURL] = useState("");
  const [templateBack, setTemplateBack] = useState(null);
  const [templateBackURL, setTemplateBackURL] = useState("");
  const [dataFile, setDataFile] = useState(null);
  const [data, setData] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [originalExcelKeys, setOriginalExcelKeys] = useState([]);

  const [layout, setLayout] = useState(null);
  const [templateSignature, setTemplateSignature] = useState("");

  const [previewName, setPreviewName] = useState("Your Name Here");
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isSnapXActive, setIsSnapXActive] = useState(false);
  const [isSnapYActive, setIsSnapYActive] = useState(false);

  const [templateSize, setTemplateSize] = useState(DEFAULT_TEMPLATE_SIZE);
  const [previewScale, setPreviewScale] = useState(DEFAULT_ZOOM_SCALE);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastGenerationInfo, setLastGenerationInfo] = useState(null);
  const [emailDeliveryEnabled, setEmailDeliveryEnabled] = useState(false);

  const [emailSettings, setEmailSettings] = useState({
    service: "gmail",
    senderName: "",
    email: "",
    password: "",
    subject: "Your Certificate is Ready!",
    template: "",
    signature: "",
  });

  const [serverFonts, setServerFonts] = useState([]);

  const [isSending, setIsSending] = useState(false);
  const [emailSummary, setEmailSummary] = useState(null);
  const [manualRecipients, setManualRecipients] = useState([
    createManualRecipient(),
  ]);
  const [isManualGenerating, setIsManualGenerating] = useState(false);

  const prepareRowsForExport = useCallback(
    (rows) => {
      if (!originalExcelKeys || originalExcelKeys.length === 0) return rows;
      return rows.map((r) => {
        const cleanRow = {};
        originalExcelKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(r, key)) {
            cleanRow[key] = r[key];
          }
        });
        return cleanRow;
      });
    },
    [originalExcelKeys]
  );

  const [emailAttachmentType, setEmailAttachmentType] = useState("certificate");
  const [sharedAttachmentFiles, setSharedAttachmentFiles] = useState([]);
  const [sendProgress, setSendProgress] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(false); // New: Toggle to skip duplicates

  // --- PRESETS STATE ---
  const [presets, setPresets] = useState([]);
  
  const [selectedMessagePresetId, setSelectedMessagePresetId] = useState("");
  const [newMessagePresetName, setNewMessagePresetName] = useState("");
  const [isSavingMessagePreset, setIsSavingMessagePreset] = useState(false);

  const [selectedSignaturePresetId, setSelectedSignaturePresetId] = useState("");
  const [newSignaturePresetName, setNewSignaturePresetName] = useState("");
  const [isSavingSignaturePreset, setIsSavingSignaturePreset] = useState(false);
  // ---------------------

  const [viewportSize, setViewportSize] = useState(() => ({
    width:
      typeof window !== "undefined"
        ? window.innerWidth
        : DEFAULT_VIEWPORT_WIDTH,
    height:
      typeof window !== "undefined"
        ? window.innerHeight
        : DEFAULT_VIEWPORT_HEIGHT,
  }));

  const [previewImages, setPreviewImages] = useState([]);
  const [isPreviewGridLoading, setIsPreviewGridLoading] = useState(false);
  const [previewSide, setPreviewSide] = useState("front"); // "front" or "back"
  const [isCanvaModalOpen, setIsCanvaModalOpen] = useState(false);
  const [isCanvaConnected, setIsCanvaConnected] = useState(false);


  // --- Handle Resize for Responsive Zoom ---
  useEffect(() => {
    const handleResize = () => {
      if (templateImageRef.current) {
        const { naturalWidth, naturalHeight } = templateImageRef.current;
        const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
        
        // We only update if it's currently on auto-fit (or close to it)
        // This avoids resetting their manual zoom if they are zooming in.
        // We characterize "auto-fit" as within 5% of the calculated scale.
        // On mobile, we ALWAYS auto-fit.
        const isMobile = window.innerWidth <= 768;
        const currentIsAutoFit = Math.abs(previewScale - autoScale) < 0.05;
        
        if (isMobile || currentIsAutoFit) {
          setPreviewScale(autoScale);
          setTemplateSize({
            width: Math.round(naturalWidth * autoScale),
            height: Math.round(naturalHeight * autoScale),
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [previewScale]);

  // --- Fetch Server Fonts & Inject @font-face ---
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const response = await axios.get(API_FONTS_URL);
        const fonts = response.data || [];
        setServerFonts(fonts);

        // Inject @font-face for each server font
        const styleId = 'server-fonts-styles';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
        }

        let css = '';
        fonts.forEach(f => {
          // Construct URL to the font file on our server
          css += `
            @font-face {
              font-family: "${f.family}";
              src: url("${buildApiUrl(API_BASE_URL, `api/fonts/${f.file}`)}") format("truetype");
              font-weight: normal;
              font-style: normal;
              font-display: block;
            }
          `;
        });
        styleTag.textContent = css;
        
        // Pre-load them so they are ready for the canvas
        if (document.fonts?.load) {
          fonts.forEach(font => {
            document.fonts.load(`16px "${font.family}"`);
          });
        }
      } catch (err) {
        console.error("Failed to fetch server fonts:", err);
      }
    };

    fetchFonts();
  }, [API_FONTS_URL, API_BASE_URL]);
  // ----------------------------------------------
  // -----------------------------------------

  const templateImageRef = useRef(null);
  const templateBackImageRef = useRef(null);
  const draggableRef = useRef(null);
  const textMeasureContextRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const templateNaturalSizeRef = useRef(DEFAULT_TEMPLATE_SIZE);
  const resizeStartLayoutRef = useRef(null);
  const savedLayoutsRef = useRef({});
  const stopSendingRef = useRef(false);

  const handleStopSending = () => {
    stopSendingRef.current = true;
    toast("Stopping... finishing current email then halting.", {
      icon: "🛑",
    });
  };
  const templateNaturalWidth =
    templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
  const templateNaturalHeight =
    templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;
  const layoutWidth = layout?.width || MIN_LAYOUT_WIDTH;
  const layoutHeight = layout?.height || MIN_LAYOUT_HEIGHT;
  const maxXForInput = Math.max(0, templateNaturalWidth - layoutWidth);
  const maxYForInput = Math.max(0, templateNaturalHeight - layoutHeight);

  const normalizePathOnly = (value = "") => value.split("?")[0] || value;

  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === "undefined") return "/user/login";
    const path = normalizePathOnly(window.location.pathname);
    if (path === "/") return "/user/login";
    return path || "/user/login";
  });

  const navigate = useCallback(
    (path) => {
      if (typeof window === "undefined") return;
      const normalized = normalizePathOnly(path);
      if (window.location.pathname !== normalized) {
        window.history.pushState({}, "", path);
      } else {
        window.history.replaceState({}, "", path);
      }
      setCurrentPath(normalized);
    },
    [normalizePathOnly]
  );

  const onTemplateDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const toastId = toast.loading("Loading template...");

      setTemplate(file);
      setLastGenerationInfo(null);
      setPreviewImages([]);
      // Ensure we have a default preview name if none is set
      setPreviewName((prev) => (prev && prev !== "-") ? prev : "Your Name Here");
      setPreviewSide("front");
      templateImageRef.current = null;

      const objectUrl = URL.createObjectURL(file);

      if (templateURL) {
        URL.revokeObjectURL(templateURL);
      }
      setTemplateURL(objectUrl);

      const img = new Image();
      img.onload = () => {
        templateImageRef.current = img;
        const naturalWidth =
          img.naturalWidth || img.width || DEFAULT_TEMPLATE_SIZE.width;
        const naturalHeight =
          img.naturalHeight || img.height || DEFAULT_TEMPLATE_SIZE.height;
        const signature = `${naturalWidth}x${naturalHeight}`;

        templateNaturalSizeRef.current = {
          width: naturalWidth,
          height: naturalHeight,
        };
        setTemplateSignature(signature);

        // --- NEW: Dynamic Auto Zoom for all resolutions ---
        const initialScale = calculateAutoScale(naturalWidth, naturalHeight);
        
        setPreviewScale(initialScale);
        setTemplateSize({
          width: Math.round(naturalWidth * initialScale),
          height: Math.round(naturalHeight * initialScale),
        });
        // ----------------------------

        toast.success("Template loaded.", { id: toastId });

        setLayout((prev) => {
          const signature = `${naturalWidth}x${naturalHeight}`;
          const savedLayout = savedLayoutsRef.current?.[signature];
          if (savedLayout) {
            // Preload the saved font immediately
            if (savedLayout.fontFamily) preloadAllFonts([savedLayout.fontFamily]);
            return { ...savedLayout };
          }

          const newLayout = prev ? {
            ...prev,
            width: Math.min(naturalWidth, prev.width),
            height: Math.min(naturalHeight, prev.height),
            x: Math.min(prev.x, Math.max(0, naturalWidth - prev.width)),
            y: Math.min(prev.y, Math.max(0, naturalHeight - prev.height)),
          } : createInitialLayout(naturalWidth, naturalHeight);

          // Preload the new/default font
          if (newLayout.fontFamily) preloadAllFonts([newLayout.fontFamily]);
          return newLayout;
        });
      };
      img.onerror = () => {
        toast.error("Failed to read template dimensions.", { id: toastId });
        templateImageRef.current = null;
        templateNaturalSizeRef.current = DEFAULT_TEMPLATE_SIZE;
        setPreviewScale(1);
        setTemplateSize(DEFAULT_TEMPLATE_SIZE);
      };
      img.src = objectUrl;
    },
    [templateURL]
  );

  const onTemplateBackDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const toastId = toast.loading("Loading back side template...");

        setTemplateBack(file);
        const objectUrl = URL.createObjectURL(file);

        if (templateBackURL) {
          URL.revokeObjectURL(templateBackURL);
        }
        setTemplateBackURL(objectUrl);

        const img = new Image();
        img.onload = () => {
          templateBackImageRef.current = img;
          const { naturalWidth, naturalHeight } = img;
          const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
          setPreviewScale(autoScale);
          setTemplateSize({
            width: Math.round(naturalWidth * autoScale),
            height: Math.round(naturalHeight * autoScale),
          });
          toast.success("Back side template loaded.", { id: toastId });
        };
      img.onerror = () => {
        toast.error("Failed to load back side image.", { id: toastId });
      };
      img.src = objectUrl;
    },
    [templateBackURL]
  );

  const onDataDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setLastGenerationInfo(null);
    setEmailSummary(null);
    setDataFile(file);
    setSheetName("");
    setPreviewImages([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames?.[0] || "";
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          toast.error("Excel workbook must contain at least one sheet.");
          setDataFile(null);
          setData([]);
          setSheetName("");
          return;
        }
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('Excel must have a "Name" column!');
          setDataFile(null);
          setData([]);
          setSheetName("");
          return;
        }

        const keys = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        setOriginalExcelKeys(keys);

        const namesData = jsonData
          .map((row) => {
            const nameMatch = getCellKeyAndValue(row, "Name");
            const emailMatch = getCellKeyAndValue(row, "Email");

            const formattedName = toTitleCase(nameMatch.value || "");
            if (!formattedName) return null;

            const emailValue = (emailMatch.value || "").toString().trim();

            const newRow = { ...row };
            // Update the ACTUAL original keys if they exist
            if (nameMatch.key) newRow[nameMatch.key] = formattedName;
            if (emailMatch.key) newRow[emailMatch.key] = emailValue;

            // Also keep Name/Email for internal app logic
            newRow.Name = formattedName;
            newRow.Email = emailValue;

            return newRow;
          })
          .filter(Boolean);

        if (!namesData.length) {
          toast.error('Excel must have a "Name" column!');
          setDataFile(null);
          setData([]);
          setSheetName("");
          return;
        }

        const fileBaseName = stripExtension(file?.name || "");
        const normalizedSheetName =
          firstSheetName || fileBaseName || "certificates";
        const sanitizedSheetName = sanitizeFileBaseName(
          normalizedSheetName,
          fileBaseName || "certificates"
        );

        const hasEmails = namesData.some((row) => row.Email);

        setSheetName(sanitizedSheetName);
        setData(namesData);
        setPreviewName(namesData[0]?.Name || "");
        toast.success(`Loaded ${namesData.length} names.`);

        if (!hasEmails) {
          toast(
            "Optional: add an Email column to send certificates directly.",
            {
              icon: "📧",
            }
          );
        }
      } catch (err) {
        toast.error("Failed to parse Excel file: " + err.message);
        setDataFile(null);
        setData([]);
        setSheetName("");
      }
    };
    reader.onerror = (err) => {
      toast.error("Failed to read file: " + err.message);
      setSheetName("");
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onSharedFileDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setSharedAttachmentFiles((prev) => {
      const next = [...prev];
      acceptedFiles.forEach((file) => {
        if (file) next.push(file);
      });
      return next;
    });
    const names = acceptedFiles.map((file) => file?.name).filter(Boolean);
    if (names.length) {
      toast.success(`Attached ${names.join(", ")}`);
    }
  }, []);

  // --- Canva Connect Integration ---
  useEffect(() => {
    // Check if we just returned from a successful Canva OAuth flow
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/canva-success" || params.get("canva_success")) {
      setIsCanvaConnected(true);
      setIsCanvaModalOpen(true);
      toast.success("Canva connected successfully!");
      // Clean up the URL and navigate back to the editor
      window.history.replaceState({}, document.title, "/generate-certifcate");
      navigate("/generate-certifcate");
    } else if (window.location.pathname === "/canva-error" || params.get("canva_error")) {
      const error = params.get("error") || "Authorization failed";
      toast.error(`Canva Connection: ${error.replace(/_/g, " ")}`);
      // Clean up the URL and navigate back to the editor
      window.history.replaceState({}, document.title, "/generate-certifcate");
      navigate("/generate-certifcate");
    }
  }, [navigate]);

  const handleConnectCanva = async () => {
    const currentUserId = authUserId || window.localStorage.getItem("certificate-studio-userId");
    if (!currentUserId) {
      toast.error("Please log in again to connect Canva.");
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/canva/auth-url?userId=${currentUserId}`);
      window.location.href = response.data.url;
    } catch (err) {
      console.error("Failed to get Canva auth URL:", err);
      toast.error("Failed to connect to Canva.");
    }
  };

  const handleDisconnectCanva = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Canva account? This will revoke access for searching and exporting your designs.")) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/canva/disconnect`, { userId: authUserId });
      setIsCanvaConnected(false);
      toast.success("Canva disconnected successfully.");
    } catch (err) {
      console.error("Disconnect Canva Error:", err);
      toast.error("Failed to disconnect Canva. Please try again.");
    }
  };

  const handleSelectCanvaDesign = async (designId, pages = []) => {
    const currentUserId = authUserId || window.localStorage.getItem("certificate-studio-userId");
    setIsCanvaModalOpen(false);
    const selectedPages = pages.length > 0 ? pages : [1];
    const toastId = toast.loading(`Exporting page(s) ${selectedPages.join(", ")} from Canva...`);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/canva/designs/export`, {
        userId: currentUserId,
        designId,
        pages: selectedPages
      });
      
      const { urls } = response.data;
      if (!urls || urls.length === 0) throw new Error("No export URLs found.");

      // 1. Process Front Page (First URL returned)
      const frontResponse = await fetch(urls[0]);
      const frontBlob = await frontResponse.blob();
      const frontFile = new File([frontBlob], `canva-${designId}-page-${selectedPages[0] || 1}.png`, { type: "image/png" });
      onTemplateDrop([frontFile]);

      // 2. Process Back Page (If 2+ pages requested or existed)
      if (urls.length > 1) {
        toast.loading("Importing second page as back side...", { id: toastId });
        const backResponse = await fetch(urls[1]);
        const backBlob = await backResponse.blob();
        const backFile = new File([backBlob], `canva-${designId}-page-${selectedPages[1] || 2}.png`, { type: "image/png" });
        onTemplateBackDrop([backFile]);
        
        if (urls.length > 2 && pages.length === 0) {
          toast.success("Imported First 2 Pages! (Default)", { id: toastId });
        } else {
          toast.success(`Imported ${urls.length} selected pages!`, { id: toastId });
        }
      } else {
        toast.success("Design imported successfully!", { id: toastId });
      }
    } catch (err) {
      console.error("Canva Import Error:", err.response?.data || err);
      const errorMsg = err.response?.data?.details?.message || err.response?.data?.message || err.message || "Unknown error";
      toast.error(`Failed to import design: ${errorMsg}`, { id: toastId });
    }
  };

  const handleCanvaDesignButtonExport = async (exportUrl) => {
    setIsCanvaModalOpen(false);
    const toastId = toast.loading("Importing created design...");
    try {
      const fileResponse = await fetch(exportUrl);
      const blob = await fileResponse.blob();
      const fileName = `canva-created-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      onTemplateDrop([file]);
      toast.success("Design imported successfully!", { id: toastId });
    } catch (err) {
      console.error("Canva Button Export Error:", err);
      toast.error("Failed to import created design.", { id: toastId });
    }
  };
    // ------------------------------------

  const insertFormat = (tag, targetId = "emailTemplate") => {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}<${tag}>${selection}</${tag}>${after}`;

    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));

    // Defer setting selection back to ensure render happened
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
    }, 0);
  };

  const insertPlaceholder = (placeholder, targetId = "emailTemplate") => {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = `${before}{${placeholder}}${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));

    // Defer setting selection back to ensure render happened
    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholder.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertLink = (targetId = "emailSignature") => {
    const url = prompt("Enter the link URL (e.g., https://example.com):");
    if (!url) return;

    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const valueKey = targetId === "emailTemplate" ? "template" : "signature";
    const text = emailSettings[valueKey] || "";

    const before = text.substring(0, start);
    const selection = text.substring(start, end) || "Click Here";
    const after = text.substring(end);

    const newText = `${before}<a href="${url}">${selection}</a>${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));
  };

  const insertImage = (url, targetId = "emailSignature") => {
    if (!url) return;
    const textarea = document.getElementById(targetId);
    const valueKey = textarea?.id === "emailTemplate" ? "template" : "signature";
    const currentText = emailSettings[valueKey] || "";

    // Append to end if no selection, or insert at cursor
    const start = textarea ? textarea.selectionStart : currentText.length;
    const end = textarea ? textarea.selectionEnd : currentText.length;

    const before = currentText.substring(0, start);
    const after = currentText.substring(end);

    // Simplified image insertion without extra breaks
    const imgTag = `<img src="${url}" alt="Logo" style="max-height: 50px;" />`;

    const newText = `${before}${imgTag}${after}`;
    setEmailSettings((prev) => ({ ...prev, [valueKey]: newText }));
  };

  const handleImageUpload = async (event, targetId) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const toastId = toast.loading("Uploading image...");
    try {
      const uploadUrl = buildApiUrl(API_BASE_URL, "api/upload-image");
      const response = await axios.post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { url } = response.data;
      insertImage(url, targetId);
      toast.success("Image uploaded!", { id: toastId });
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed: " + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      // Reset input
      event.target.value = "";
    }
  };

  const promptForImage = (targetId) => {
    const url = prompt("Enter the Image URL (e.g., https://example.com/logo.png):");
    if (url) insertImage(url, targetId);
  };


  // Removed signature persistence favoring presets

  const {
    getRootProps: getTemplateProps,
    getInputProps: getTemplateInputProps,
  } = useDropzone({
    onDrop: onTemplateDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  const {
    getRootProps: getTemplateBackProps,
    getInputProps: getTemplateBackInputProps,
  } = useDropzone({
    onDrop: onTemplateBackDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  const { getRootProps: getDataProps, getInputProps: getDataInputProps } =
    useDropzone({
      onDrop: onDataDrop,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
      },
      maxFiles: 1,
    });

  const {
    getRootProps: getSharedFileProps,
    getInputProps: getSharedFileInputProps,
  } = useDropzone({
    onDrop: onSharedFileDrop,
    maxFiles: 10,
  });

  const clearTemplate = useCallback(() => {
    if (templateURL) {
      URL.revokeObjectURL(templateURL);
    }

    setTemplate(null);
    setTemplateURL("");
    setTemplateSignature("");
    setTemplateSize(DEFAULT_TEMPLATE_SIZE);
    setPreviewScale(DEFAULT_ZOOM_SCALE);
    setPreviewSide("front");
    setPreviewName("Your Name Here");
    setLayout(null);
    setIsLayoutLocked(false);
    setPreviewImages([]);
    setLastGenerationInfo(null);
    setEmailSummary(null);
    templateImageRef.current = null;
    templateNaturalSizeRef.current = DEFAULT_TEMPLATE_SIZE;
    toast.success("Template removed.");
  }, [templateURL]);

  const clearTemplateBack = useCallback(() => {
    if (templateBackURL) {
      URL.revokeObjectURL(templateBackURL);
    }
    setTemplateBack(null);
    setTemplateBackURL("");
    setPreviewSide("front");
    templateBackImageRef.current = null;
    toast.success("Back template removed.");
  }, [templateBackURL]);

  const clearDataFile = useCallback(() => {
    setDataFile(null);
    setData([]);
    setSheetName("");
    setPreviewName("Your Name Here");
    setPreviewImages([]);
    setLastGenerationInfo(null);
    setEmailSummary(null);
    toast.success("Data file removed.");
  }, []);

  const clearSharedAttachment = useCallback(
    (index) => {
      setSharedAttachmentFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next;
      });
      toast.success("Shared attachment removed.");
    },
    [setSharedAttachmentFiles]
  );

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem("certificate-studio-userId");
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    setIsAuthenticated(false);
    setAuthUser("");
    setAuthUserId("");
    setLoginPrefill("");
    if (typeof window !== "undefined") {
      window.location.href = "/user/login";
    } else {
      navigate("/user/login");
    }
  }, [navigate]);

  const handleLoginSuccess = useCallback(
    ({ email, code, id }) => {
      const safeEmail = email?.toString().trim() || "";
      const safeToken = code?.toString().trim() || "";
      const safeId = id?.toString().trim() || "";
      setIsAuthenticated(true);
      setAuthUser(safeEmail);
      setAuthUserId(safeId);
      setLoginPrefill(safeEmail);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(AUTH_USER_KEY, safeEmail);
        window.localStorage.setItem("certificate-studio-userId", safeId);
        window.localStorage.setItem(AUTH_TOKEN_KEY, safeToken);
      }
      navigate("/generate-certifcate");
    },
    [navigate]
  );

  const handleDesignerSettingsChange = useCallback((event) => {
    const { name, value } = event.target;
  }, []);

  const handleEmailSettingsChange = useCallback((event) => {
    const { name, value } = event.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // --- PRESETS LOGIC ---
  const fetchPresets = useCallback(async () => {
    if (!isAuthenticated || !authUser) return;
    try {
      const fetchPresetsUrl = buildApiUrl(API_BASE_URL, `api/auth/presets/${encodeURIComponent(authUser)}`);
      const { data } = await axios.get(fetchPresetsUrl);
      setPresets(data);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    }
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (emailDeliveryEnabled) {
      fetchPresets();
    }
  }, [emailDeliveryEnabled, fetchPresets]);

  const handleSavePreset = async (type) => {
    const isMessage = type === 'message';
    const presetName = isMessage ? newMessagePresetName : newSignaturePresetName;
    const templateText = isMessage ? emailSettings.template : "";
    const signatureText = isMessage ? "" : emailSettings.signature;
    const setIsSaving = isMessage ? setIsSavingMessagePreset : setIsSavingSignaturePreset;

    if (!presetName.trim()) {
      toast.error(`Please enter a ${isMessage ? 'message' : 'signature'} preset name.`);
      return;
    }

    const toastId = toast.loading(`Saving ${isMessage ? 'message' : 'signature'} preset...`);
    setIsSaving(true);

    try {
      const savePresetUrl = buildApiUrl(API_BASE_URL, "api/auth/presets");
      await axios.post(savePresetUrl, {
        email: authUser,
        presetType: type,
        presetName: presetName,
        templateText: templateText,
        signatureText: signatureText,
      });
      toast.success("Preset saved successfully!", { id: toastId });
      
      if (isMessage) setNewMessagePresetName("");
      else setNewSignaturePresetName("");
      
      fetchPresets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save preset.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (e, type) => {
    const presetId = e.target.value;
    const isMessage = type === 'message';
    
    if (isMessage) {
      setSelectedMessagePresetId(presetId);
      if (!presetId) {
        setNewMessagePresetName("");
        setEmailSettings((prev) => ({ ...prev, template: "" }));
      }
    } else {
      setSelectedSignaturePresetId(presetId);
      if (!presetId) {
        setNewSignaturePresetName("");
        setEmailSettings((prev) => ({ ...prev, signature: "" }));
      }
    }
    
    if (!presetId) return;

    const preset = presets.find((p) => p.id.toString() === presetId.toString());
    if (preset) {
      if (isMessage) setNewMessagePresetName(preset.presetName);
      else setNewSignaturePresetName(preset.presetName);

      setEmailSettings((prev) => ({
        ...prev,
        ...(isMessage ? { template: preset.templateText || "" } : { signature: preset.signatureText || "" })
      }));
      toast.success(`Loaded preset: ${preset.presetName}`);
    }
  };

  const handleDeletePreset = async (presetId, type) => {
    if (!presetId) return;
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    
    const toastId = toast.loading("Deleting preset...");
    try {
      const deletePresetUrl = buildApiUrl(API_BASE_URL, `api/auth/presets/${presetId}`);
      await axios.delete(deletePresetUrl);
      toast.success("Preset deleted.", { id: toastId });
      
      if (type === 'message' && selectedMessagePresetId === presetId.toString()) {
        setSelectedMessagePresetId("");
      } else if (type === 'signature' && selectedSignaturePresetId === presetId.toString()) {
        setSelectedSignaturePresetId("");
      }
      
      fetchPresets();
    } catch (error) {
      toast.error("Failed to delete preset.", { id: toastId });
    }
  };
  // ---------------------

  const handleManualRecipientChange = useCallback((id, field, value) => {
    const nextValue = field === "name" ? formatNameInput(value || "") : value;
    setManualRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === id ? { ...recipient, [field]: nextValue } : recipient
      )
    );
  }, []);

  const addManualRecipient = useCallback(() => {
    setManualRecipients((prev) => {
      if (prev.length >= MAX_MANUAL_RECIPIENTS) return prev;
      return [...prev, createManualRecipient()];
    });
  }, []);

  const removeManualRecipient = useCallback((id) => {
    setManualRecipients((prev) => {
      if (prev.length <= 1) {
        return [createManualRecipient()];
      }
      const next = prev.filter((recipient) => recipient.id !== id);
      return next.length ? next : [createManualRecipient()];
    });
  }, []);

  const handleLayoutChange = useCallback((e) => {
    const { name, value } = e.target;
    setLayout((prev) => {
      if (!prev) return prev;

      const templateWidth =
        templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
      const templateHeight =
        templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

      if (name === "fontSize") {
        return { ...prev, fontSize: Number(value) || 0 };
      }

      if (name === "x") {
        const numeric = Math.round(Number(value) || 0);
        const maxX = Math.max(0, templateWidth - prev.width);
        return {
          ...prev,
          x: Math.min(Math.max(0, numeric), maxX),
        };
      }

      if (name === "y") {
        const numeric = Math.round(Number(value) || 0);
        const maxY = Math.max(0, templateHeight - prev.height);
        return {
          ...prev,
          y: Math.min(Math.max(0, numeric), maxY),
        };
      }

      return { ...prev, [name]: value };
    });
  }, []);

  const handleAlign = useCallback((align) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, align };
    });
  }, []);

  const handleVAlign = useCallback((v_align) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, v_align };
    });
  }, []);

  const handleDrag = useCallback(
    (_, data) => {
      setLayout((prev) => {
        if (!prev) return prev;

        const scale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        const nextX = Math.round(data.x / scale);
        const nextY = Math.round(data.y / scale);
        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        // Snap detection threshold (10 raw pixels)
        const snapThreshold = 10;

        // X-axis (Vertical Center Line)
        const centerX = nextX + prev.width / 2;
        const templateCenterX = templateWidth / 2;
        setIsSnapXActive(Math.abs(centerX - templateCenterX) < snapThreshold);

        // Y-axis (Horizontal Center Line)
        const centerY = nextY + prev.height / 2;
        const templateCenterY = templateHeight / 2;
        setIsSnapYActive(Math.abs(centerY - templateCenterY) < snapThreshold);

        return {
          ...prev,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale]
  );

  const handleDragStop = useCallback(
    (_, data) => {
      setLayout((prev) => {
        if (!prev) return prev;

        const scale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        let nextX = Math.round(data.x / scale);
        let nextY = Math.round(data.y / scale);
        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        const snapThreshold = 10;

        // Snap X to center
        const centerX = nextX + prev.width / 2;
        const templateCenterX = templateWidth / 2;
        if (Math.abs(centerX - templateCenterX) < snapThreshold) {
          nextX = templateCenterX - prev.width / 2;
        }

        // Snap Y to center
        const centerY = nextY + prev.height / 2;
        const templateCenterY = templateHeight / 2;
        if (Math.abs(centerY - templateCenterY) < snapThreshold) {
          nextY = templateCenterY - prev.height / 2;
        }

        setIsSnapXActive(false);
        setIsSnapYActive(false);

        return {
          ...prev,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (isLayoutLocked || !layout || !templateURL) return;

      // Don't interfere with typing in inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      const { key, shiftKey } = e;
      const step = shiftKey ? 10 : 1;

      let dx = 0;
      let dy = 0;

      if (key === "ArrowLeft") dx = -step;
      else if (key === "ArrowRight") dx = step;
      else if (key === "ArrowUp") dy = -step;
      else if (key === "ArrowDown") dy = step;
      else return;

      e.preventDefault();

      setLayout((prev) => {
        if (!prev) return prev;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        const maxX = Math.max(0, templateWidth - prev.width);
        const maxY = Math.max(0, templateHeight - prev.height);

        return {
          ...prev,
          x: Math.min(Math.max(0, prev.x + dx), maxX),
          y: Math.min(Math.max(0, prev.y + dy), maxY),
        };
      });
    },
    [isLayoutLocked, layout, templateURL]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleResizeStart = useCallback(() => {
    resizeStartLayoutRef.current = layout ? { ...layout } : null;
  }, [layout]);

  const handleResize = useCallback(
    (_, direction, ref, delta, position) => {
      const startLayout = resizeStartLayoutRef.current;
      if (!startLayout) return;

      setLayout((prev) => {
        if (!prev) return prev;

        const safeScale = previewScale || 1;
        const templateWidth =
          templateNaturalSizeRef.current.width || DEFAULT_TEMPLATE_SIZE.width;
        const templateHeight =
          templateNaturalSizeRef.current.height || DEFAULT_TEMPLATE_SIZE.height;

        // Calculate natural dimensions based on start state + delta for maximum precision
        const nextWidth = Math.min(
          templateWidth,
          Math.max(MIN_LAYOUT_WIDTH, startLayout.width + Math.round(delta.width / safeScale))
        );
        const nextHeight = Math.min(
          templateHeight,
          Math.max(MIN_LAYOUT_HEIGHT, startLayout.height + Math.round(delta.height / safeScale))
        );

        const nextX = Math.round((position.x || 0) / safeScale);
        const nextY = Math.round((position.y || 0) / safeScale);

        const maxX = Math.max(0, templateWidth - nextWidth);
        const maxY = Math.max(0, templateHeight - nextHeight);

        // Dynamic font scaling: Use the maximum scale factor between width and height growth
        const widthScale = nextWidth / (Math.max(1, startLayout.width));
        const heightScale = nextHeight / (Math.max(1, startLayout.height));
        const scaleFactor = Math.max(widthScale, heightScale);

        const nextFontSize = Math.min(
          MAX_FONT_SIZE,
          Math.max(
            MIN_DYNAMIC_FONT_SIZE,
            Math.round(startLayout.fontSize * scaleFactor)
          )
        );

        return {
          ...prev,
          width: nextWidth,
          height: nextHeight,
          fontSize: nextFontSize,
          x: Math.min(Math.max(0, nextX), maxX),
          y: Math.min(Math.max(0, nextY), maxY),
        };
      });
    },
    [previewScale]
  );

  const handleResetZoom = useCallback(() => {
    if (templateImageRef.current) {
      const { naturalWidth, naturalHeight } = templateImageRef.current;
      const autoScale = calculateAutoScale(naturalWidth, naturalHeight);
      setPreviewScale(autoScale);
      setTemplateSize({
        width: Math.round(naturalWidth * autoScale),
        height: Math.round(naturalHeight * autoScale),
      });
      toast.success(`Reset zoom to best fit (${Math.round(autoScale * 100)}%)`);
    } else {
      setPreviewScale(DEFAULT_ZOOM_SCALE);
    }
  }, [DEFAULT_ZOOM_SCALE]);

  const handlePreviewSelect = useCallback((value) => {
    setPreviewName(value ? toTitleCase(value) : "");
  }, []);

  const handlePreviewInput = useCallback((value) => {
    setPreviewName(formatNameInput(value || ""));
  }, []);

  const handleColorSelect = useCallback((hex) => {
    setLayout((prev) => {
      if (!prev) return prev;
      return { ...prev, color: hex };
    });
  }, []); // Font library is now handled by FontPicker and dynamic server loading

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        savedLayoutsRef.current = parsed;
      }
    } catch (err) {
      console.warn("Failed to restore saved layouts:", err);
    }
  }, []);

  useEffect(() => {
    if (
      !layout ||
      !templateSignature ||
      typeof window === "undefined" ||
      !templateURL
    ) {
      return;
    }

    try {
      const snapshot = { ...layout };
      savedLayoutsRef.current = {
        ...savedLayoutsRef.current,
        [templateSignature]: snapshot,
      };
      window.localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify(savedLayoutsRef.current)
      );
    } catch (err) {
      console.warn("Failed to persist layout:", err);
    }
  }, [layout, templateSignature, templateURL]);

  useEffect(() => {
    if (!templateURL) return;

    const { width: naturalWidth, height: naturalHeight } =
      templateNaturalSizeRef.current;
    if (!naturalWidth || !naturalHeight) return;

    setTemplateSize({
      width: Math.round(naturalWidth * previewScale),
      height: Math.round(naturalHeight * previewScale),
    });
  }, [previewScale, templateSignature, templateURL]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePop = () =>
      setCurrentPath(normalizePathOnly(window.location.pathname || "/user/login"));
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [normalizePathOnly]);

  useEffect(() => {
    const restoreSession = async () => {
      const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUserId = window.localStorage.getItem("certificate-studio-userId");

      if (storedAuth === "true" && storedUser && storedToken) {
        if (!isAuthenticated) {
          setIsAuthenticated(true);
          setAuthUser(storedUser);
          setAuthUserId(storedUserId || "");
        }
        
        // Recover Canva connection status
        if (storedUserId && !isCanvaConnected) {
          try {
            const checkUrl = buildApiUrl(API_BASE_URL, `api/canva/check-connection?userId=${storedUserId}`);
            const res = await axios.get(checkUrl);
            setIsCanvaConnected(res.data.isConnected);
          } catch (err) {
            console.error("Failed to check Canva connection on mount:", err);
          }
        }
      }
    };

    restoreSession();

    const allowed = [
      "/user/login",
      "/generate-certifcate",
      "/profile",
      "/pricing",
      "/pricing/generate-password",
      "/forgot-password",
      "/canva-success",
    ];

    if (!allowed.includes(currentPath)) {
      navigate(effectivelyAuthenticated ? "/generate-certifcate" : "/user/login");
      return;
    }

    const isAuthRoute =
      currentPath === "/user/login" ||
      currentPath === "/pricing" ||
      currentPath === "/pricing/generate-password" ||
      currentPath === "/forgot-password" ||
      currentPath === "/canva-success";

    if (
      !effectivelyAuthenticated &&
      (currentPath === "/generate-certifcate" || currentPath === "/profile")
    ) {
      navigate("/user/login");
    }

    if (effectivelyAuthenticated && isAuthRoute) {
      navigate("/generate-certifcate");
    }
  }, [currentPath, isAuthenticated, navigate]);

  // Robust User ID Recovery (Ensures authUserId is populated for the Canva flow)
  useEffect(() => {
    if (isAuthenticated && authUser && !authUserId) {
      const storedUserId = window.localStorage.getItem("certificate-studio-userId");
      if (storedUserId) {
        setAuthUserId(storedUserId);
      } else {
        const fetchProfile = async () => {
          try {
            const profileUrl = buildApiUrl(API_BASE_URL, `api/auth/profile/${encodeURIComponent(authUser)}`);
            const res = await axios.get(profileUrl);
            if (res.data.id) {
              const idStr = res.data.id.toString();
              setAuthUserId(idStr);
              window.localStorage.setItem("certificate-studio-userId", idStr);
            }
          } catch (err) {
            console.error("Failed to recover user ID:", err);
          }
        };
        fetchProfile();
      }
    }
  }, [isAuthenticated, authUser, authUserId, API_BASE_URL]);

  const emailReadyRows = useMemo(() => {
    if (!data.length) return [];

    const seen = new Set();
    return data.filter((row) => {
      const value = row?.Email?.toString().trim();
      if (!value || !isValidEmail(value)) return false;

      const emailLower = value.toLowerCase();
      if (skipDuplicates) {
        if (seen.has(emailLower)) return false;
        seen.add(emailLower);
      }
      return true;
    });
  }, [data, skipDuplicates]);

  const manualReadyRecipients = useMemo(() => {
    return manualRecipients.filter((recipient) => {
      const name = recipient?.name?.toString().trim();
      const email = recipient?.email?.toString().trim();
      return !!name && !!email && isValidEmail(email);
    });
  }, [manualRecipients]);

  const totalReadyRecipients =
    manualReadyRecipients.length + emailReadyRows.length;

  const isPreviewFromData = useMemo(() => {
    if (!data.length) return false;
    return data.some((row) => row.Name === previewName);
  }, [data, previewName]);

  const hasExcelRecipients = emailReadyRows.length > 0;
  const layoutIsRequired = true;
  const layoutReady = !!layout && isLayoutLocked;
  const templateAssetsReady = !!template && layoutReady;
  const excelDataReady = hasExcelRecipients ? !!dataFile : true;
  const manualRecipientLimitReached =
    manualRecipients.length >= MAX_MANUAL_RECIPIENTS;
  const previewNameIsValid = !!previewName?.trim();

  const canAttemptEmailSend =
    emailDeliveryEnabled &&
    totalReadyRecipients > 0 &&
    (emailAttachmentType !== "certificate" || templateAssetsReady) &&
    (emailAttachmentType !== "shared" || sharedAttachmentFiles.length > 0) &&
    excelDataReady &&
    emailSettings.service.trim().length > 0 &&
    emailSettings.email.trim().length > 0 &&
    emailSettings.password.trim().length > 0 &&
    emailSettings.subject.trim().length > 0 &&
    emailSettings.template.trim().length > 0 &&
    !isSending &&
    !isLoading &&
    !isPreviewLoading;

  const rowsMissingEmails = useMemo(() => {
    if (!data.length) return [];
    return data.filter((row) => {
      // If it doesn't have a name, it's skipped for certificates too, so not a discrepancy.
      // Discrepancy is: Has Name (Certificate Generated) BUT No/Invalid Email (Email Skipped).
      const hasName = !!row?.Name?.toString().trim();
      const email = row?.Email?.toString().trim();
      const hasValidEmail = email && isValidEmail(email);
      return hasName && !hasValidEmail;
    });
  }, [data]);
  const handleDownloadMissingEmails = () => {
    if (!rowsMissingEmails.length) {
      toast("No missing emails to download.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(prepareRowsForExport(rowsMissingEmails));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Missing Emails");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, `missing-emails-${Date.now()}.xlsx`);
    toast.success(`Downloaded ${rowsMissingEmails.length} entries.`);
  };

  const rowsWithDuplicateEmails = useMemo(() => {
    if (!data.length) return [];

    // 1. Count frequencies
    const emailCounts = {};
    data.forEach(row => {
      const email = row?.Email?.toString().trim().toLowerCase();
      if (email && isValidEmail(email)) {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    });

    // 2. Filter unique representatives of duplicates
    const seenDuplicates = new Set();
    return data.filter(row => {
      const email = row?.Email?.toString().trim().toLowerCase();
      // Must be a valid email, must appear > 1 time, must not have been added to our "duplicates list" yet
      if (email && emailCounts[email] > 1 && !seenDuplicates.has(email)) {
        seenDuplicates.add(email);
        return true;
      }
      return false;
    });
  }, [data]);

  const handleDownloadDuplicateEmails = () => {
    if (!rowsWithDuplicateEmails.length) {
      toast("No duplicate emails to download.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      prepareRowsForExport(rowsWithDuplicateEmails)
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Duplicate Emails");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(dataBlob, `duplicate-emails-unique-${Date.now()}.xlsx`);
    toast.success(`Downloaded ${rowsWithDuplicateEmails.length} unique duplicate emails.`);
  };

  const isLoginPage = currentPath.startsWith("/user/login");
  const isProfilePage = currentPath === "/profile";
  const isCanvaSuccessPage = currentPath === "/canva-success";
  const isPricingPage = currentPath === "/pricing";
  const isGetPasswordPage = currentPath === "/pricing/generate-password";
  const isForgotPasswordPage = currentPath === "/forgot-password";

  const localAuth = window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  const localUser = window.localStorage.getItem(AUTH_USER_KEY);
  const localToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const effectivelyAuthenticated = isAuthenticated || (localAuth && !!localUser && !!localToken);

  const sendButtonLabel = isSending
    ? sendProgress
      ? `Sending (${sendProgress.processed}/${sendProgress.total})...`
      : "Sending..."
    : totalReadyRecipients
      ? `Send ${totalReadyRecipients} Email${totalReadyRecipients === 1 ? "" : "s"
      }`
      : "Generate & Send Emails";

  useEffect(() => {
    const canvas = previewCanvasRef.current;

    if (!layout || !canvas || typeof document === "undefined") {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(1, Math.round(layout.width || MIN_LAYOUT_WIDTH));
    const height = Math.max(1, Math.round(layout.height || MIN_LAYOUT_HEIGHT));
    const desiredFontSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.round(layout.fontSize) || 0
    );
    const fontFamily = layout.fontFamily || "sans-serif";
    const fontWeight = layout.fontWeight || "normal";
    const fontStyle = layout.fontStyle || "normal";
    
    // FIX: Include style and weight in fontSpec for proper loading
    const fontSpec = `${fontStyle} ${fontWeight} ${desiredFontSize}px "${fontFamily}"`;
    
    const pixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let cancelled = false;

    const drawPreview = async () => {
      // 1. Ensure font is fully loaded
      if (document.fonts?.load) {
        try {
          if (!document.fonts.check(fontSpec)) {
            await document.fonts.load(fontSpec);
          }
        } catch (err) {
          console.warn("Font preview load warning:", err);
        }
      }

      if (cancelled) return;

      // Buffers to allow flourishes/scripts to bleed outside the logical box in the UI
      // We keep these for UI smoothness, but add a CLIPPING RECT inside to match the PDF
      const vBuffer = Math.round(height * 0.4); 
      const hBuffer = Math.round(width * 0.1);  
      
      canvas.width = Math.max(1, Math.round((width + hBuffer * 2) * pixelRatio));
      canvas.height = Math.max(1, Math.round((height + vBuffer * 2) * pixelRatio));
      
      canvas.style.position = 'absolute';
      canvas.style.top = `-${vBuffer * previewScale}px`;
      canvas.style.left = `-${hBuffer * previewScale}px`;
      canvas.style.width = `${(width + hBuffer * 2) * previewScale}px`;
      canvas.style.height = `${(height + vBuffer * 2) * previewScale}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width + hBuffer * 2, height + vBuffer * 2);

      // Translate context to account for buffer
      ctx.translate(hBuffer, vBuffer);

      // We now use auto-fitting in the preview as well to guarantee perfect WYSIWYG
      // between the preview canvas and the final PDF/Thumbnail outputs.
      const appliedFontSize = fitFontSizeToBox(
        ctx,
        previewName || "Your Name Here",
        fontFamily,
        desiredFontSize,
        width,
        height,
        fontWeight,
        fontStyle
      );

      const appliedFontSpec = `${fontStyle} ${fontWeight} ${appliedFontSize}px "${fontFamily}"`;
      ctx.font = appliedFontSpec;
      ctx.fillStyle = layout.color || "#000000";
      ctx.textAlign = CANVAS_TEXT_ALIGN[layout.align] || "center";

      let anchorX = width / 2;
      if (layout.align === "left") {
        anchorX = 0;
      } else if (layout.align === "right") {
        anchorX = width;
      }

      // PIXEL PERFECT VERTICAL CENTERING
      // We ignore standard textBaselines which vary by browser and font.
      // Instead, we measure the actual inked pixels (bounding box) and offset manually.
      const metrics = ctx.measureText(previewName || "Your Name Here");
      const ascent = metrics.actualBoundingBoxAscent || 0;
      const descent = metrics.actualBoundingBoxDescent || 0;
      const actualTextHeight = ascent + descent;
      
      let anchorY;
      ctx.textBaseline = "alphabetic"; // Use a stable baseline

      if (layout.v_align === "top") {
        anchorY = ascent;
      } else if (layout.v_align === "bottom") {
        anchorY = height - descent;
      } else {
        // Middle: Center the bounding box within the box height
        anchorY = (height - actualTextHeight) / 2 + ascent;
      }

      // ADD CLIPPING to match final certificate behavior
      ctx.save();
      ctx.beginPath();
      // Clipping box: from 0,0 to width,height in the translated coordinate system
      ctx.rect(0, 0, width, height);
      ctx.clip();
      
      ctx.fillText(previewName || "Your Name Here", anchorX, anchorY);
      ctx.restore();
    };

    let animationFrameId;
    let renderTimeout;

    // Throttle rendering so dragging is smooth and doesn't freeze the main thread
    renderTimeout = setTimeout(() => {
      animationFrameId = requestAnimationFrame(drawPreview);
    }, 16);

    return () => {
      cancelled = true;
      clearTimeout(renderTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [layout, previewName, previewSide, templateURL, previewScale]);



  const getJustifyContent = () => {
    if (!layout) return "center";
    if (layout.align === "left") return "flex-start";
    if (layout.align === "right") return "flex-end";
    return "center";
  };

  const getAlignItems = () => {
    if (!layout) return "center";
    if (layout.v_align === "top") return "flex-start";
    if (layout.v_align === "bottom") return "flex-end";
    return "center";
  };

  const handleManualGenerate = useCallback(async () => {
    if (!manualReadyRecipients.length) {
      toast.error("Add at least one manual recipient with a name and email.");
      return;
    }
    if (!template) {
      toast.error("Upload a template image first.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error("Position the name on the template before generating.");
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout before generating.");
      return;
    }

    setIsManualGenerating(true);
    const toastId = toast.loading(
      `Generating ${manualReadyRecipients.length} manual certificate${manualReadyRecipients.length === 1 ? "" : "s"
      }...`
    );

    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      if (manualReadyRecipients.length === 1) {
        const fullName = toTitleCase(
          manualReadyRecipients[0].name?.toString().trim() || ""
        );
        const pdfBlob = await generateCertificatePDF(
          templateImage,
          layout,
          fullName,
          { drawName: true },
          templateBackImageRef.current
        );
        const downloadName = `${sanitizeFileBaseName(
          fullName,
          "certificate"
        )}.pdf`;
        saveAs(pdfBlob, downloadName);
        toast.success(`Downloading ${downloadName}`, { id: toastId });
      } else {
        const zip = new JSZip();
        const nameCounter = {};
        for (const recipient of manualReadyRecipients) {
          const fullName = toTitleCase(recipient.name?.toString().trim() || "");
          const pdfBlob = await generateCertificatePDF(
            templateImage,
            layout,
            fullName,
            { drawName: true },
            templateBackImageRef.current
          );
          const safeName = sanitizeFileBaseName(fullName, "certificate");
          nameCounter[safeName] = (nameCounter[safeName] || 0) + 1;
          const uniqueName =
            nameCounter[safeName] > 1
              ? `${safeName}-${nameCounter[safeName]}`
              : safeName;
          zip.file(`${uniqueName}.pdf`, pdfBlob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadName = `manual-certificates-${Date.now()}.zip`;
        saveAs(zipBlob, downloadName);
        toast.success(`Downloading ${downloadName}`, { id: toastId });
      }
    } catch (error) {
      console.error("Manual generation failed:", error);
      toast.error(
        "Manual generation failed: " + (error.message || "Unknown error"),
        { id: toastId }
      );
    } finally {
      setIsManualGenerating(false);
    }
  }, [
    manualReadyRecipients,
    template,
    layout,
    isLayoutLocked,
    layoutIsRequired,
  ]);

  const handleGenerate = async () => {
    if (!template) {
      toast.error("Please upload both a template and a data file.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error(
        "Please position the name on the template before generating."
      );
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout before generating.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(
      `Generating ${data.length} certificates... This may take a moment.`
    );

    try {
      const zip = new JSZip();

      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      const nameCounter = {};

      for (const row of data) {
        const fullName = row.Name;
        if (!fullName) continue;

        const pdfBlob = await generateCertificatePDF(
          templateImage,
          layout,
          fullName,
          { drawName: true },
          templateBackImageRef.current
        );

        const safeName =
          fullName
            .toString()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, " ")
            .trim() || "certificate";

        nameCounter[safeName] = (nameCounter[safeName] || 0) + 1;
        const uniqueName =
          nameCounter[safeName] > 1
            ? `${safeName}-${nameCounter[safeName]}`
            : safeName;

        zip.file(`${uniqueName}.pdf`, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const fileBaseName = dataFile?.name ? stripExtension(dataFile.name) : "";
      const fallbackBaseName = fileBaseName || `certificates-${Date.now()}`;
      const zipBaseName = sanitizeFileBaseName(
        sheetName || fileBaseName,
        fallbackBaseName
      );
      const downloadName = `${zipBaseName}.zip`;

      saveAs(zipBlob, downloadName);

      setLastGenerationInfo({
        count: data.length || 0,
        fileName: downloadName,
        timestamp: new Date().toLocaleString(),
      });

      toast.success(`Downloading ${downloadName}`, { id: toastId });
    } catch (err) {
      console.error("Client-side generation failed:", err);
      toast.error("Generation failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Pre-load Help for Perfect Rendering ---
  const preloadAllFonts = async (fontsToLoad = []) => {
    const targets = fontsToLoad.length ? fontsToLoad : serverFonts; // Use serverFonts if no specific fonts are passed
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
  };

  const handleGenerateAndSend = async () => {
    if (isSending) return;

    if (!emailDeliveryEnabled) {
      toast.error("Enable email delivery before sending.");
      return;
    }

    const manualTargets = manualReadyRecipients.map((recipient) => ({
      name: toTitleCase(recipient.name?.toString().trim() || ""),
      email: recipient.email?.toString().trim(),
    }));

    const totalRecipients = manualTargets.length + emailReadyRows.length;

    if (!totalRecipients) {
      toast.error(
        "Add at least one recipient via your Excel sheet or the manual section."
      );
      return;
    }

    if (emailAttachmentType === "certificate") {
      if (!template) {
        toast.error("Upload a template image before attaching certificates.");
        return;
      }
      if (layoutIsRequired && !layout) {
        toast.error("Position the layout before sending attachments.");
        return;
      }
      if (layoutIsRequired && !isLayoutLocked) {
        toast.error("Please lock the layout before sending attachments.");
        return;
      }
    } else if (emailAttachmentType === "shared") {
      if (!sharedAttachmentFiles.length) {
        toast.error(
          "Upload at least one shared file (PDF, DOCX, etc.) to attach."
        );
        return;
      }
    }

    if (emailReadyRows.length && !dataFile) {
      toast.error("Re-upload the Excel file to reach spreadsheet recipients.");
      return;
    }

    const service = emailSettings.service.trim();
    const senderEmail = emailSettings.email.trim();
    const password = emailSettings.password.trim();
    const subject = emailSettings.subject.trim();
    const templateMessage = emailSettings.template.trim();

    if (!service) {
      toast.error("Enter the email service (e.g., gmail, outlook).");
      return;
    }
    if (!senderEmail) {
      toast.error("Enter the sender email address.");
      return;
    }
    if (!isValidEmail(senderEmail)) {
      toast.error(
        "Sender email looks invalid. Please use a valid email address."
      );
      return;
    }
    if (!password) {
      toast.error("Enter the email app password.");
      return;
    }
    if (!subject) {
      toast.error("Add an email subject line.");
      return;
    }
    if (!templateMessage) {
      toast.error("Add the message template that includes {name}.");
      return;
    }

    const invalidManual = manualRecipients.find((recipient) => {
      const email = recipient?.email?.toString().trim();
      const name = recipient?.name?.toString().trim();
      return name && email && !isValidEmail(email);
    });

    if (invalidManual) {
      toast.error(
        `Invalid email for ${invalidManual.name || "a manual recipient"
        }. Please fix before sending.`
      );
      return;
    }

    setIsSending(true);
    setEmailSummary(null);
    setSendProgress(null);

    const emailNoun = `personalized email${totalRecipients === 1 ? "" : "s"}`;
    const toastId = toast.loading(`Preparing to send ${emailNoun}...`);

    try {
      // 1. Prepare Recipients
      let excelTargets = [];
      if (emailReadyRows.length && dataFile) {
        excelTargets = emailReadyRows
          .map((row) => {
            const name = toTitleCase(getCellValue(row, "Name") || "");
            const email = (getCellValue(row, "Email") || "").toString().trim();
            return { ...row, name, email };
          })
          .filter((r) => r.name && isValidEmail(r.email));
      }

      let recipients = [...excelTargets, ...manualTargets];
      if (skipDuplicates) {
        const seenEmails = new Set();
        recipients = recipients.filter((r) => {
          const lowerEmail = r.email.toLowerCase();
          if (seenEmails.has(lowerEmail)) return false;
          seenEmails.add(lowerEmail);
          return true;
        });
      }

      if (!recipients.length) {
        throw new Error("No valid recipients found with both Name and Email.");
      }

      // --- Split Logic: Limit to MAX_BATCH_SIZE ---
      let toSend = recipients;
      let remaining = [];
      if (recipients.length > MAX_BATCH_SIZE) {
        toSend = recipients.slice(0, MAX_BATCH_SIZE);
        remaining = recipients.slice(MAX_BATCH_SIZE);
        toast(`Batch limit reached: Only the first ${MAX_BATCH_SIZE} will be sent. The rest will be provided for download.`, {
          icon: "⚡",
          duration: 6000,
        });

        // --- Trigger Download for Remaining Recipients IMMEDIATELY ---
        const ws = XLSX.utils.json_to_sheet(remaining);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Remaining Recipients");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(dataBlob, `remaining-recipients-${Date.now()}.xlsx`);
        toast.success(`Remaining ${remaining.length} recipients downloaded.`, { icon: "📥" });
      }
      // --------------------------------------------

      // Check if total shared attachments exceed 25MB (common email provider limit)
      if (emailAttachmentType === "shared" && sharedAttachmentFiles.length > 0) {
        const totalSize = sharedAttachmentFiles.reduce((acc, file) => acc + (file?.size || 0), 0);
        if (totalSize > 25 * 1024 * 1024) {
          toast(
            "Caution: Your attachments exceed 25MB. Many email providers (like Gmail) may reject these emails.",
            { icon: "⚠️", duration: 6000 }
          );
        }
      }

      const fullMessage = emailSettings.signature
        ? `${templateMessage}\n\n${emailSettings.signature}`
        : templateMessage;

      let successCount = 0;
      let failures = [];
      let sharedRemoteAttachments = [];

      setIsSending(true);
      stopSendingRef.current = false;

      // 3. Upload Shared Files Once (if applicable)
      if (emailAttachmentType === "shared" && sharedAttachmentFiles.length > 0) {
        toast.loading("Uploading shared attachments once...", { id: toastId });
        try {
          for (const file of sharedAttachmentFiles) {
            if (!file) continue;
            const uploadedAttachment = await uploadRemoteAttachment(
              API_BASE_URL,
              file,
              "shared"
            );
            sharedRemoteAttachments.push(uploadedAttachment);
          }
        } catch (uploadErr) {
          if (sharedRemoteAttachments.length) {
            try {
              await cleanupRemoteAttachments(
                API_BASE_URL,
                sharedRemoteAttachments
              );
            } catch (cleanupErr) {
              console.error("Shared attachment cleanup failed:", cleanupErr);
            }
          }
          throw new Error(
            "Failed to pre-upload shared attachments. " +
              (uploadErr.response?.data?.message || uploadErr.message)
          );
        }
      }

      // 4. Sending Loop (Optimized with Concurrency)
      const CONCURRENCY_LIMIT = 10;
      let nextIndex = 0;
      let processedCount = 0; // Keep for toast update outside workers

      // Define constants for values that don't change per recipient
      const emailService = service;
      const emailUser = senderEmail;
      const emailPass = password;
      const senderName = emailSettings.senderName || "";
      const emailSubject = subject;
      const emailTemplate = fullMessage;
      const attachmentMode = emailAttachmentType; // Renamed for clarity
      const personalizeWithNames = true; // Based on original `drawName: true`
      const API_SEND_SINGLE_URL = buildApiUrl(API_BASE_URL, "api/send-single");

      const sendNext = async (workerId) => {
        while (true) {
          // 1. Get the next index safely
          let i;
          if (nextIndex < toSend.length) {
            i = nextIndex++;
          } else {
            break;
          }

          if (i >= toSend.length || stopSendingRef.current) break;

          // 2. CRITICAL: Create a private local snapshot of this recipient's data
          // This ensures that even if nextIndex or other variables change,
          // this worker lane is "locked" to this specific person.
          const recipientSnapshot = { ...toSend[i] };
          const { name: rName, email: rEmail } = recipientSnapshot;
          let recipientRemoteAttachments = [];

          try {
            const formData = new FormData();
            formData.append("emailService", emailService);
            formData.append("emailUser", emailUser);
            formData.append("emailPass", emailPass);
            formData.append("senderName", senderName);
            formData.append("emailSubject", emailSubject);
            formData.append("emailTemplate", emailTemplate);
            formData.append("recipientName", rName);
            formData.append("recipientEmail", rEmail);

            if (attachmentMode === "certificate") {
              // Generate certificate using the name from our snapshot
              const pdfBlob = await generateCertificatePDF(
                templateImageRef.current,
                layout,
                rName,
                { drawName: personalizeWithNames },
                templateBackImageRef.current
              );
              const pdfFile = new File(
                [pdfBlob],
                `${sanitizeFileBaseName(rName, "certificate")}.pdf`,
                { type: "application/pdf" }
              );
              const uploadedAttachment = await uploadRemoteAttachment(
                API_BASE_URL,
                pdfFile,
                "certificate"
              );
              recipientRemoteAttachments = [uploadedAttachment];
              formData.append(
                "remoteAttachments",
                JSON.stringify(recipientRemoteAttachments)
              );
              formData.append("autoCleanupRemoteAttachments", "true");
            } else if (attachmentMode === "shared" && sharedRemoteAttachments.length) {
              formData.append(
                "remoteAttachments",
                JSON.stringify(sharedRemoteAttachments)
              );
              formData.append("autoCleanupRemoteAttachments", "false");
            }

            // Send to the email from our snapshot
            await axios.post(API_SEND_SINGLE_URL, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            successCount++;
          } catch (error) {
            const reason = error.response?.data?.message || error.message || "Unknown error";
            failures.push({
              name: rName,
              email: rEmail,
              reason: reason,
            });
            if (recipientRemoteAttachments.length) {
              cleanupRemoteAttachments(
                API_BASE_URL,
                recipientRemoteAttachments
              ).catch((cleanupErr) => {
                console.error("Recipient attachment cleanup failed:", cleanupErr);
              });
            }
          } finally {
            processedCount++;
            const pct = Math.round((processedCount / toSend.length) * 100);
            toast.loading(
              `Sending... ${processedCount}/${toSend.length} (${pct}%)`,
              {
                id: toastId,
              }
            );
            setSendProgress({
              processed: processedCount,
              total: toSend.length,
            });
          }
        }
      };

      try {
        const workers = Array.from(
          { length: Math.min(CONCURRENCY_LIMIT, toSend.length) },
          (_, idx) => sendNext(idx + 1)
        );
        await Promise.all(workers);

        if (stopSendingRef.current) {
          toast("Sending stopped by user.", { id: toastId, icon: "⚠️" });
          const stoppedRemaining = [...toSend.slice(nextIndex), ...remaining];
          if (stoppedRemaining.length > 0) {
            const ws = XLSX.utils.json_to_sheet(
              prepareRowsForExport(stoppedRemaining)
            );
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stopped Remaining");
            const excelBuffer = XLSX.write(wb, {
              bookType: "xlsx",
              type: "array",
            });
            const dataBlob = new Blob([excelBuffer], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            saveAs(dataBlob, `stopped-remaining-${Date.now()}.xlsx`);
            toast.success(
              `Downloaded ${stoppedRemaining.length} remaining recipients.`,
              { icon: "📥" }
            );
          }
        }
      } finally {
        // 5. Cleanup Shared Files
        if (sharedRemoteAttachments.length) {
          try {
            await cleanupRemoteAttachments(API_BASE_URL, sharedRemoteAttachments);
          } catch (cleanupErr) {
            console.error("Cleanup failed:", cleanupErr);
          }
        }
      }

      setSendProgress(null);
      setIsSending(false);

      const finalStatus = failures.length
        ? successCount
          ? "partial_failure"
          : "failed"
        : "success";
      setEmailSummary({
        timestamp: new Date().toLocaleString(),
        status: finalStatus,
        successCount,
        failureCount: failures.length,
        attempted: recipients.length,
        failures,
      });

      if (finalStatus === "success") {
        toast.success(`Successfully sent ${successCount} emails.`, {
          id: toastId,
        });
      } else {
        toast.error(
          `Sent ${successCount} emails, but ${failures.length} failed.`,
          { id: toastId }
        );
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to send certificates.";
      toast.error(message, { id: toastId });
      setIsSending(false);
    }
  };

  const handleDownloadPreview = async () => {
    if (!template) {
      toast.error("Please upload a template first.");
      return;
    }
    if (layoutIsRequired && !layout) {
      toast.error("Please position the name on the template.");
      return;
    }
    if (layoutIsRequired && !isLayoutLocked) {
      toast.error("Please lock the layout before generating.");
      return;
    }
    if (layoutIsRequired && !previewNameIsValid) {
      toast.error("Please enter a valid name to preview and download.");
      return;
    }

    setIsPreviewLoading(true);
    const baseTemplateName = template?.name || "certificate.png";
    const previewLabel =
      layoutIsRequired && previewNameIsValid
        ? previewName
        : stripExtension(baseTemplateName) || "Shared Certificate";
    const toastId = toast.loading(
      `Generating preview for ${previewLabel || baseTemplateName}...`
    );

    try {
      const canvas = document.createElement("canvas");
      const templateObjectUrl = URL.createObjectURL(template);
      const templateImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) =>
          reject(new Error("Failed to load template image: " + err));
        img.src = templateObjectUrl;
      });
      URL.revokeObjectURL(templateObjectUrl);

      const pdfBlob = await generateCertificatePDF(
        templateImage,
        layout,
        previewLabel,
        { drawName: true },
        templateBackImageRef.current
      );

      const safeName =
        previewLabel
          .toString()
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
          .replace(/\s+/g, " ")
          .trim() || "certificate";

      const downloadName = `${safeName}.pdf`;

      saveAs(pdfBlob, downloadName);

      toast.success(`Downloading ${downloadName}`, { id: toastId });
    } catch (err) {
      console.error("Client-side preview download failed:", err);
      toast.error("Preview failed: " + (err.message || "Unknown error"), {
        id: toastId,
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleGeneratePreviews = async () => {
    if (!data.length || !templateImageRef.current || !layout) {
      toast.error("Missing template, data, or layout.");
      return;
    }

    setIsPreviewGridLoading(true);
    setPreviewImages([]);

    const toastId = toast.loading(`Generating ${data.length} previews...`, {
      duration: 10000,
    });

    try {
      const templateImage = templateImageRef.current;
      const generatedImages = [];
      const drawName = true;

      const chunkSize = 25;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);

        toast.loading(
          `Generating previews... (${i + chunk.length}/${data.length})`,
          { id: toastId }
        );

        const promises = chunk.map(async (row) => {
          const fullName = row.Name;
          if (!fullName) return null;

          // Create an isolated canvas for this specific thumbnail to avoid race conditions
          const localCanvas = document.createElement("canvas");
          const imageDataUrl = await drawCertificateToCanvasThumbnail(
            localCanvas,
            templateImage,
            layout,
            fullName,
            { drawName }
          );

          return {
            name: fullName,
            imageSrc: imageDataUrl,
          };
        });

        const results = (await Promise.all(promises)).filter(Boolean);
        generatedImages.push(...results);

        setPreviewImages([...generatedImages]);

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      toast.success(`Generated ${generatedImages.length} previews.`, {
        id: toastId,
      });
    } catch (err) {
      console.error("Preview grid generation failed:", err);
      toast.error(
        "Preview generation failed: " + (err.message || "Unknown error"),
        { id: toastId }
      );
    } finally {
      setIsPreviewGridLoading(false);
    }
  };

  if (!effectivelyAuthenticated && isLoginPage) {
    return (
      <LoginPage
        defaultEmail={loginPrefill || authUser}
        onSuccess={handleLoginSuccess}
        apiBaseUrl={API_BASE_URL}
        navigate={navigate} // Pass navigate to LoginPage
      />
    );
  }

  if (isGetPasswordPage) {
    return (
      <GetPasswordPage
        defaultEmail={loginPrefill || authUser}
        apiBaseUrl={API_BASE_URL}
        navigate={navigate}
      />
    );
  }

  if (isForgotPasswordPage) {
    return (
      <ForgotPasswordPage
        apiBaseUrl={API_BASE_URL}
        navigate={navigate}
      />
    );
  }
  if (!effectivelyAuthenticated && isPricingPage) {
    return <PricingPage navigate={navigate} />;
  }


  if (!effectivelyAuthenticated && !isLoginPage && !isPricingPage && !isCanvaSuccessPage && !isGetPasswordPage && !isForgotPasswordPage) {
    return (
      <LoginPage
        defaultEmail={loginPrefill || authUser}
        onSuccess={handleLoginSuccess}
        apiBaseUrl={API_BASE_URL}
        navigate={navigate}
      />
    );
  }

  // If we're on canva-success but not yet authenticated (session recovering), 
  // show a simple loading state to avoid flickering the pricing page
  if (!effectivelyAuthenticated && isCanvaSuccessPage) {
    return <div className="loading-screen">Finalizing Canva connection...</div>;
  }

  if (effectivelyAuthenticated && isPricingPage) {
    navigate("/generate-certifcate");
    return null;
  }

  if (effectivelyAuthenticated && isProfilePage) {
    return <ProfilePage authUser={authUser} onLogout={handleLogout} apiBaseUrl={API_BASE_URL} navigate={navigate} />;
  }

  if (effectivelyAuthenticated) {
    // Main Generation UI
    return (
      <div className="App">
        <Toaster position="bottom-right" />
        <EditorHeader
          currentPath={currentPath}
          navigate={navigate}
          authUser={authUser}
          onLogout={handleLogout}
        />

        <div className="main-layout">
          <div className="controls-panel">
            <LayerPanel
              template={template}
              getTemplateProps={getTemplateProps}
              getTemplateInputProps={getTemplateInputProps}
              clearTemplate={clearTemplate}
              templateBack={templateBack}
              getTemplateBackProps={getTemplateBackProps}
              getTemplateBackInputProps={getTemplateBackInputProps}
              clearTemplateBack={clearTemplateBack}
              dataFile={dataFile}
              getDataProps={getDataProps}
              getDataInputProps={getDataInputProps}
              clearDataFile={clearDataFile}
              isCanvaConnected={isCanvaConnected}
              setIsCanvaModalOpen={setIsCanvaModalOpen}
              handleConnectCanva={handleConnectCanva}
              handleDisconnectCanva={handleDisconnectCanva}
            />

            <PropertiesPanel
              layout={layout}
              setLayout={setLayout}
              serverFonts={serverFonts}
              MAX_FONT_SIZE={MAX_FONT_SIZE}
              handleLayoutChange={handleLayoutChange}
              isLayoutLocked={isLayoutLocked}
              COLOR_SWATCHES={COLOR_SWATCHES}
              handleColorSelect={handleColorSelect}
              handleAlign={handleAlign}
              handleVAlign={handleVAlign}
              setIsLayoutLocked={setIsLayoutLocked}
              setPreviewImages={setPreviewImages}
              template={template}
              previewName={previewName}
              handlePreviewInput={handlePreviewInput}
              data={data}
              isPreviewFromData={isPreviewFromData}
              handleDownloadPreview={handleDownloadPreview}
              isPreviewLoading={isPreviewLoading}
              previewNameIsValid={previewNameIsValid}
              layoutReady={layoutReady}
            />

            <ManualRecipientsPanel
              MAX_MANUAL_RECIPIENTS={MAX_MANUAL_RECIPIENTS}
              manualRecipients={manualRecipients}
              handleManualRecipientChange={handleManualRecipientChange}
              removeManualRecipient={removeManualRecipient}
              addManualRecipient={addManualRecipient}
              manualRecipientLimitReached={manualRecipientLimitReached}
              handleManualGenerate={handleManualGenerate}
              template={template}
              manualReadyRecipients={manualReadyRecipients}
              isManualGenerating={isManualGenerating}
              layoutReady={layoutReady}
            />

            <EmailSettingsPanel
              emailDeliveryEnabled={emailDeliveryEnabled}
              setEmailDeliveryEnabled={setEmailDeliveryEnabled}
              emailAttachmentType={emailAttachmentType}
              setEmailAttachmentType={setEmailAttachmentType}
              isSending={isSending}
              getSharedFileProps={getSharedFileProps}
              getSharedFileInputProps={getSharedFileInputProps}
              sharedAttachmentFiles={sharedAttachmentFiles}
              clearSharedAttachment={clearSharedAttachment}
              emailSettings={emailSettings}
              handleEmailSettingsChange={handleEmailSettingsChange}
              selectedMessagePresetId={selectedMessagePresetId}
              handleLoadPreset={handleLoadPreset}
              isSavingMessagePreset={isSavingMessagePreset}
              presets={presets}
              handleDeletePreset={handleDeletePreset}
              newMessagePresetName={newMessagePresetName}
              setNewMessagePresetName={setNewMessagePresetName}
              handleSavePreset={handleSavePreset}
              insertFormat={insertFormat}
              insertLink={insertLink}
              promptForImage={promptForImage}
              handleImageUpload={handleImageUpload}
              insertPlaceholder={insertPlaceholder}
              selectedSignaturePresetId={selectedSignaturePresetId}
              isSavingSignaturePreset={isSavingSignaturePreset}
              newSignaturePresetName={newSignaturePresetName}
              setNewSignaturePresetName={setNewSignaturePresetName}
              emailReadyRows={emailReadyRows}
              data={data}
              manualReadyRecipients={manualReadyRecipients}
              skipDuplicates={skipDuplicates}
              setSkipDuplicates={setSkipDuplicates}
              rowsMissingEmails={rowsMissingEmails}
              handleDownloadMissingEmails={handleDownloadMissingEmails}
              rowsWithDuplicateEmails={rowsWithDuplicateEmails}
              handleDownloadDuplicateEmails={handleDownloadDuplicateEmails}
              handleGenerate={handleGenerate}
              template={template}
              dataFile={dataFile}
              isLoading={isLoading}
              isPreviewLoading={isPreviewLoading}
              layoutIsRequired={layoutIsRequired}
              layoutReady={layoutReady}
              handleGenerateAndSend={handleGenerateAndSend}
              canAttemptEmailSend={canAttemptEmailSend}
              sendButtonLabel={sendButtonLabel}
              handleStopSending={handleStopSending}
              lastGenerationInfo={lastGenerationInfo}
              emailSummary={emailSummary}
            />
          </div>

          <CanvasStage
            templateURL={templateURL}
            previewScale={previewScale}
            setPreviewScale={setPreviewScale}
            DEFAULT_ZOOM_SCALE={DEFAULT_ZOOM_SCALE}
            previewName={previewName}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            template={template}
            templateBackURL={templateBackURL}
            previewSide={previewSide}
            setPreviewSide={setPreviewSide}
            templateSize={templateSize}
            layout={layout}
            isSnapXActive={isSnapXActive}
            isSnapYActive={isSnapYActive}
            handleDragStop={handleDragStop}
            handleDrag={handleDrag}
            handleResizeStart={handleResizeStart}
            handleResize={handleResize}
            isLayoutLocked={isLayoutLocked}
            MIN_LAYOUT_WIDTH={MIN_LAYOUT_WIDTH}
            MIN_LAYOUT_HEIGHT={MIN_LAYOUT_HEIGHT}
            getJustifyContent={getJustifyContent}
            getAlignItems={getAlignItems}
            previewCanvasRef={previewCanvasRef}
            handleResetZoom={handleResetZoom}
          />

          <PreviewGrid
            data={data}
            template={template}
            isLayoutLocked={isLayoutLocked}
            isPreviewGridLoading={isPreviewGridLoading}
            previewImages={previewImages}
            handleGeneratePreviews={handleGeneratePreviews}
            layoutReady={layoutReady}
            templateImageRef={templateImageRef}
            setPreviewImages={setPreviewImages}
            handlePreviewSelect={handlePreviewSelect}
            PREVIEW_THUMBNAIL_WIDTH={PREVIEW_THUMBNAIL_WIDTH}
          />
        </div>

        <CanvaDesignModal
          isOpen={isCanvaModalOpen}
          onClose={() => setIsCanvaModalOpen(false)}
          onSelect={handleSelectCanvaDesign}
          onDesignButtonExport={handleCanvaDesignButtonExport}
          userId={authUserId}
          apiBaseUrl={API_BASE_URL}
        />
      </div>
    );
  }

  // Fallback (should not be reached if routing logic is solid)
  return <div>Loading...</div>;
}

export default App;
