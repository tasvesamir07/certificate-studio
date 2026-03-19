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

const normalizeBaseUrl = (base = "") =>
  base.trim().replace(/\s/g, "").replace(/\/+$/, "");

const DEFAULT_API_PORT = "5000";
const AUTH_STORAGE_KEY = "certificate-studio-auth";
const AUTH_USER_KEY = "certificate-studio-user";
const AUTH_TOKEN_KEY = "certificate-studio-session";

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
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s-/])([a-z0-9\u00c0-\u024f])/g, (match, boundary, char) => {
      return boundary + char.toUpperCase();
    });
};

const formatNameInput = (value = "") => {
  const collapsed = value.replace(/\s{2,}/g, " ").replace(/^\s+/, "");
  let result = "";
  let capitalizeNext = true;

  for (const char of collapsed) {
    if (char === " ") {
      result += char;
      capitalizeNext = true;
      continue;
    }

    if (/[a-z]/i.test(char)) {
      result += capitalizeNext ? char.toUpperCase() : char;
    } else {
      result += char;
    }
    capitalizeNext = false;
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

const getCellValue = (row = {}, columnName = "") => {
  if (!row || !columnName) return "";
  if (Object.prototype.hasOwnProperty.call(row, columnName)) {
    return row[columnName];
  }

  const normalizedColumn = columnName.toString().trim().toLowerCase();
  const resolvedKey = Object.keys(row).find(
    (key) => key?.toString().trim().toLowerCase() === normalizedColumn
  );
  return typeof resolvedKey === "undefined" ? "" : row[resolvedKey];
};

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
    // However, if height is the limiting factor, we check if we can push it a bit more.
    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio >= 0.98 && ratio <= 1.02) {
      break;
    }

    const nextSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.floor(size * ratio)
    );

    if (nextSize === size) break;
    size = nextSize;

    if (size <= MIN_DYNAMIC_FONT_SIZE) break;
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

const createInitialLayout = (templateWidth, templateHeight) => {
  const safeWidth = Math.max(MIN_LAYOUT_WIDTH, Math.round(templateWidth * 0.4));
  const safeHeight = Math.max(
    MIN_LAYOUT_HEIGHT,
    Math.round(templateHeight * 0.08)
  );

  return {
    x: Math.max(0, Math.round((templateWidth - safeWidth) / 2)),
    y: Math.max(0, Math.round(templateHeight * 0.45 - safeHeight / 2)),
    width: Math.min(templateWidth, safeWidth),
    height: Math.min(templateHeight, safeHeight),
    fontSize: 160,
    fontFamily: "Sloop Script Bold One",
    color: "#C67F0E",
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
  const { drawName = true } = options;
  const { width: templateWidth, height: templateHeight } = templateImage;

  canvas.width = templateWidth;
  canvas.height = templateHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

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

  // 1. Render exactly what's on the preview to a high-res canvas
  const canvas = document.createElement("canvas");
  await drawCertificateToCanvas(
    canvas,
    templateImage,
    layout,
    fullName,
    { drawName: true }
  );

  // 2. Create PDF with same dimensions
  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
  });

  // 3. Add the rendered canvas as an image to the PDF
  // We use PNG for lossless quality as requested by the user initially
  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", 0, 0, width, height, undefined, "FAST");

  // 4. Add back side if provided
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
  const { drawName = true, thumbnailWidth = PREVIEW_THUMBNAIL_WIDTH } = options;
  const { naturalWidth: templateWidth, naturalHeight: templateHeight } =
    templateImage;

  const scaleRatio = thumbnailWidth / templateWidth;
  const thumbnailHeight = templateHeight * scaleRatio;

  canvas.width = thumbnailWidth;
  canvas.height = thumbnailHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  ctx.drawImage(templateImage, 0, 0, thumbnailWidth, thumbnailHeight);

  if (drawName) {
    if (!fullLayout) {
      throw new Error("A layout is required to draw recipient names.");
    }

    const scaledLayout = {
      x: fullLayout.x * scaleRatio,
      y: fullLayout.y * scaleRatio,
      width: fullLayout.width * scaleRatio,
      height: fullLayout.height * scaleRatio,
      fontSize: fullLayout.fontSize * scaleRatio,
      fontFamily: fullLayout.fontFamily,
      color: fullLayout.color,
      align: fullLayout.align,
      v_align: fullLayout.v_align,
    };

    const { x, y, width, height, fontSize, fontFamily, color, align, v_align } =
      scaledLayout;

    // Scale font weight/style passed from original layout? No, they are strings.
    const fontWeight = fullLayout.fontWeight || "normal";
    const fontStyle = fullLayout.fontStyle || "normal";

    const desiredFontSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.round(fontSize) || 0
    );
    const activeFontFamily = fontFamily || "sans-serif";

    // Ensure font is loaded before measuring or drawing
    if (document.fonts?.load) {
      const fontSpec = `${fontStyle} ${fontWeight} ${desiredFontSize}px "${activeFontFamily}"`;
      try {
        if (!document.fonts.check(fontSpec)) {
          await document.fonts.load(fontSpec);
          // Small extra wait for thumbnails as they often run in parallel
          await new Promise(r => setTimeout(r, 20));
        }
      } catch (err) {
        console.warn("Font load warning for thumbnail drawing:", err);
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

    let anchorY;
    if (v_align === "top") {
      ctx.textBaseline = "top";
      anchorY = y;
    } else if (v_align === "bottom") {
      ctx.textBaseline = "bottom";
      anchorY = y + height;
    } else {
      ctx.textBaseline = "middle";
      anchorY = y + height / 2;
    }

    ctx.fillText(fullName, anchorX, anchorY);
  }

  return canvas.toDataURL("image/jpeg", 0.75);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [loginPrefill, setLoginPrefill] = useState("");
  const [template, setTemplate] = useState(null);
  const [templateURL, setTemplateURL] = useState("");
  const [templateBack, setTemplateBack] = useState(null);
  const [templateBackURL, setTemplateBackURL] = useState("");
  const [dataFile, setDataFile] = useState(null);
  const [data, setData] = useState([]);
  const [sheetName, setSheetName] = useState("");

  const [layout, setLayout] = useState(null);
  const [templateSignature, setTemplateSignature] = useState("");

  const [previewName, setPreviewName] = useState("");
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);

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

  // --- Handle Resize for Responsive Zoom ---
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && templateImageRef.current) {
        const { naturalWidth, naturalHeight } = templateImageRef.current;
        const maxMobileWidth = window.innerWidth - 40;
        const autoScale = Math.min(DEFAULT_ZOOM_SCALE, maxMobileWidth / naturalWidth);
        
        // Only update if significantly different to avoid jitter
        if (Math.abs(previewScale - autoScale) > 0.01) {
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
        fonts.forEach(font => {
          // Construct URL to the font file on our server
          const fontUrl = `${API_BASE_URL}/api/fonts/${encodeURIComponent(font.file)}`;
          css += `
            @font-face {
              font-family: "${font.family}";
              src: url("${fontUrl}");
              font-weight: normal;
              font-style: normal;
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

        // --- Responsive Auto Zoom ---
        const isMobile = window.innerWidth <= 768;
        let initialScale = DEFAULT_ZOOM_SCALE;
        
        if (isMobile) {
          const maxMobileWidth = window.innerWidth - 60; // padding/margin
          initialScale = Math.min(DEFAULT_ZOOM_SCALE, maxMobileWidth / naturalWidth);
        }
        
        setPreviewScale(initialScale);
        setTemplateSize({
          width: Math.round(naturalWidth * initialScale),
          height: Math.round(naturalHeight * initialScale),
        });
        // ----------------------------

        toast.success("Template loaded.", { id: toastId });

        setLayout((prev) => {
          const savedLayout = savedLayoutsRef.current?.[signature];
          if (savedLayout) {
            return { ...savedLayout };
          }

          if (!prev) {
            return createInitialLayout(naturalWidth, naturalHeight);
          }

          const safeWidth = Math.min(naturalWidth, prev.width);
          const safeHeight = Math.min(naturalHeight, prev.height);
          const maxX = Math.max(0, naturalWidth - safeWidth);
          const maxY = Math.max(0, naturalHeight - safeHeight);

          return {
            ...prev,
            width: safeWidth,
            height: safeHeight,
            x: Math.min(prev.x, maxX),
            y: Math.min(prev.y, maxY),
          };
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

        const namesData = jsonData
          .map((row) => {
            const formatted = toTitleCase(getCellValue(row, "Name") || "");
            if (!formatted) return null;

            const emailValue = (getCellValue(row, "Email") || "")
              .toString()
              .trim();

            return {
              Name: formatted,
              Email: emailValue,
            };
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
    setPreviewName("");
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
    setIsAuthenticated(false);
    setAuthUser("");
    setLoginPrefill("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      // Force a full page reload to clear all React state (uploaded templates, excel data, etc.)
      window.location.href = "/user/login";
    } else {
      navigate("/user/login");
    }
  }, [navigate]);

  const handleLoginSuccess = useCallback(
    ({ email, code }) => {
      const safeEmail = email?.toString().trim() || "";
      const safeToken = code?.toString().trim() || "";
      setIsAuthenticated(true);
      setAuthUser(safeEmail);
      setLoginPrefill(safeEmail);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(AUTH_USER_KEY, safeEmail);
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
        const widthScale = nextWidth / (startLayout.width || 1);
        const heightScale = nextHeight / (startLayout.height || 1);
        const scaleFactor = Math.max(widthScale, heightScale);

        const nextFontSize = Math.max(
          MIN_DYNAMIC_FONT_SIZE,
          Math.round(startLayout.fontSize * scaleFactor)
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
      setCurrentPath(normalizePathOnly(window.location.pathname || "/pricing"));
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [normalizePathOnly]);

  useEffect(() => {
    if (!isAuthenticated && !sessionStorage.getItem("access_token")) {
      // Attempt re-auth if token exists but state is lost (e.g., page refresh)
      const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
      const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (storedAuth === "true" && storedUser && storedToken) {
        setIsAuthenticated(true);
        setAuthUser(storedUser);
        // In a real app, you would validate this token against the server here
        // For this project, we assume the token (sessionToken) grants access.
        sessionStorage.setItem("access_token", storedToken);
      }
    }

    const allowed = [
      "/user/login",
      "/generate-certifcate",
      "/profile",
      "/pricing",
      "/pricing/generate-password",
      "/forgot-password",
    ];

    if (!allowed.includes(currentPath)) {
      navigate(isAuthenticated ? "/generate-certifcate" : "/user/login");
      return;
    }

    const isAuthRoute =
      currentPath === "/user/login" ||
      currentPath === "/pricing" ||
      currentPath === "/pricing/generate-password" ||
      currentPath === "/forgot-password";

    if (
      !isAuthenticated &&
      (currentPath === "/generate-certifcate" || currentPath === "/profile")
    ) {
      navigate("/user/login");
    }

    if (isAuthenticated && isAuthRoute) {
      navigate("/generate-certifcate");
    }
  }, [currentPath, isAuthenticated, navigate]);

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
    const ws = XLSX.utils.json_to_sheet(rowsMissingEmails);
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

    const ws = XLSX.utils.json_to_sheet(rowsWithDuplicateEmails);
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
  const isPricingPage = currentPath === "/pricing";
  const isGetPasswordPage = currentPath === "/pricing/generate-password";
  const isForgotPasswordPage = currentPath === "/forgot-password";

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
    const fontSpec = `${desiredFontSize}px "${fontFamily}"`;
    const pixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let cancelled = false;

    const drawPreview = async () => {
      if (document.fonts?.load) {
        try {
          await document.fonts.load(fontSpec);
        } catch (err) {
          console.warn("Font preview load warning:", err);
        }
      }

      if (cancelled) return;

      // Buffers to allow flourishes/scripts to bleed outside the logical box in the UI
      const vBuffer = Math.round(height * 0.4); // 40% vertical buffer
      const hBuffer = Math.round(width * 0.1);  // 10% horizontal buffer
      
      canvas.width = Math.max(1, Math.round((width + hBuffer * 2) * pixelRatio));
      canvas.height = Math.max(1, Math.round((height + vBuffer * 2) * pixelRatio));
      
      // Position larger canvas with negative offsets so the text remains logically centered in the box
      canvas.style.position = 'absolute';
      canvas.style.top = `-${vBuffer * previewScale}px`;
      canvas.style.left = `-${hBuffer * previewScale}px`;
      canvas.style.width = `${(width + hBuffer * 2) * previewScale}px`;
      canvas.style.height = `${(height + vBuffer * 2) * previewScale}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width + hBuffer * 2, height + vBuffer * 2);

      // Translate context to account for buffer when drawing
      ctx.translate(hBuffer, vBuffer);

      const fontWeight = layout.fontWeight || "normal";
      const fontStyle = layout.fontStyle || "normal";

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

      ctx.font = `${fontStyle} ${fontWeight} ${appliedFontSize}px "${fontFamily}"`;
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

      ctx.fillText(previewName || "Your Name Here", anchorX, anchorY);
    };

    drawPreview();

    return () => {
      cancelled = true;
    };
  }, [layout, previewName, previewSide, templateURL]);



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
    const toastId = toast.loading(`Sending ${totalRecipients} ${emailNoun}...`);

    try {
      // 1. Verify Purchase/Access
      try {
        const verifyUrl = buildApiUrl(API_BASE_URL, "api/auth/verify-purchase");
        const verifyRes = await axios.post(verifyUrl, {
          email: senderEmail,
          name: emailSettings.senderName || "User",
          phone: "00000000000", // Standard fallback
        });
        if (
          verifyRes.data.status === "payment_pending" &&
          verifyRes.data.paymentUrl
        ) {
          setEmailSummary({
            timestamp: new Date().toLocaleString(),
            status: "payment_pending",
          });
          toast.success(
            "Redirecting to payment to complete your purchase before sending.",
            { id: toastId }
          );
          window.location.href = verifyRes.data.paymentUrl;
          return;
        }
      } catch (verifyErr) {
        throw new Error(
          verifyErr.response?.data?.message || "Payment verification failed."
        );
      }

      // 2. Prepare Recipients
      let excelTargets = [];
      if (emailReadyRows.length && dataFile) {
        excelTargets = emailReadyRows
          .map((row) => {
            const name = toTitleCase(getCellValue(row, "Name") || "");
            const email = (getCellValue(row, "Email") || "").toString().trim();
            return { name, email };
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
      let sharedBatchId = null;

      setIsSending(true);

      // 3. Upload Shared Files Once (if applicable)
      if (emailAttachmentType === "shared" && sharedAttachmentFiles.length > 0) {
        toast.loading("Uploading shared attachments once...", { id: toastId });
        try {
          const uploadFormData = new FormData();
          sharedAttachmentFiles.forEach((file) => {
            if (file) uploadFormData.append("attachments", file);
          });
          const uploadUrl = buildApiUrl(API_BASE_URL, "api/upload-shared");
          const uploadRes = await axios.post(uploadUrl, uploadFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          sharedBatchId = uploadRes.data.sharedBatchId;
        } catch (uploadErr) {
          throw new Error(
            "Failed to pre-upload shared attachments. " +
              (uploadErr.response?.data?.message || uploadErr.message)
          );
        }
      }

      // 4. Sending Loop
      try {
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          const pct = Math.round((i / recipients.length) * 100);
          toast.loading(`Sending... ${i}/${recipients.length} (${pct}%)`, {
            id: toastId,
          });
          setSendProgress({ processed: i, total: recipients.length });

          try {
            const formData = new FormData();
            formData.append("emailService", service);
            formData.append("emailUser", senderEmail);
            formData.append("emailPass", password);
            formData.append("senderName", emailSettings.senderName || "");
            formData.append("emailSubject", subject);
            formData.append("emailTemplate", fullMessage);
            formData.append("recipientName", recipient.name);
            formData.append("recipientEmail", recipient.email);

            if (sharedBatchId) {
              formData.append("sharedBatchId", sharedBatchId);
            }

            // Handle Personalized Certificate
            if (emailAttachmentType === "certificate") {
              const pdfBlob = await generateCertificatePDF(
                templateImageRef.current,
                layout,
                recipient.name,
                { drawName: true },
                templateBackImageRef.current
              );
              formData.append(
                "attachments",
                pdfBlob,
                `${sanitizeFileBaseName(recipient.name, "certificate")}.pdf`
              );
            }

            const sendUrl = buildApiUrl(API_BASE_URL, "api/send-single");
            await axios.post(sendUrl, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to send to ${recipient.email}:`, err);
            failures.push({
              name: recipient.name,
              email: recipient.email,
              reason:
                err.response?.data?.message || err.message || "Failed to send",
            });
          }
        }
      } finally {
        // 5. Cleanup Shared Files
        if (sharedBatchId) {
          try {
            const cleanupUrl = buildApiUrl(API_BASE_URL, "api/cleanup-shared");
            await axios.post(cleanupUrl, { sharedBatchId });
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

  if (!isAuthenticated && isLoginPage) {
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

  if (!isAuthenticated && isPricingPage) {
    return <PricingPage navigate={navigate} />;
  }

  if (!isAuthenticated && !isLoginPage && !isPricingPage) {
    return <PricingPage navigate={navigate} />;
  }

  if (isAuthenticated && isPricingPage) {
    navigate("/generate-certifcate");
    return null;
  }

  if (isAuthenticated && isProfilePage) {
    return <ProfilePage authUser={authUser} onLogout={handleLogout} apiBaseUrl={API_BASE_URL} navigate={navigate} />;
  }

  if (isAuthenticated) {
    // Main Generation UI
    return (
      <div className="App">
        <Toaster position="bottom-right" />
        <div className="top-nav">
          <div className="nav-left">
            <span
              className="nav-brand"
              onClick={() => navigate("/generate-certifcate")}
            >
              Certificate Studio
            </span>
            <button
              type="button"
              className={`nav-link ${currentPath === "/generate-certifcate" ? "active" : ""
                }`}
              onClick={() => navigate("/generate-certifcate")}
            >
              Generate
            </button>
            <button
              type="button"
              className={`nav-link ${currentPath === "/profile" ? "active" : ""
                }`}
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>
          </div>
          <div className="nav-right">
            <span className="nav-user">{authUser || "Signed in"}</span>
            <button type="button" className="nav-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="main-layout">
          <div className="controls-panel">
            <h2>Design Studio</h2>
            <p className="panel-intro">
              Upload your artwork, decide whether to personalize it, then send
              or download everything in one place.
            </p>

            <div className="control-group">
              <label>1. Upload Template Image</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div {...getTemplateProps({ className: "dropzone" })}>
                  <input {...getTemplateInputProps()} />
                  <p><b>Front Side:</b> Drag 'n' drop, or click</p>
                  {template && (
                    <div className="file-chip">
                      <span className="file-name">{template.name}</span>
                      <button
                        type="button"
                        className="file-remove-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          clearTemplate();
                        }}
                        aria-label="Remove template"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                <div
                  {...getTemplateBackProps({
                    className: "dropzone",
                    style: {
                      borderStyle: "dashed",
                      opacity: 0.8,
                      minHeight: "80px",
                    },
                  })}
                >
                  <input {...getTemplateBackInputProps()} />
                  <p><b>Back Side (Optional):</b> Drag 'n' drop, or click</p>
                  {templateBack && (
                    <div className="file-chip">
                      <span className="file-name">{templateBack.name}</span>
                      <button
                        type="button"
                        className="file-remove-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          clearTemplateBack();
                        }}
                        aria-label="Remove back template"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="control-group">
              <label>2. Upload Data File (.xlsx)</label>
              <div {...getDataProps({ className: "dropzone" })}>
                <input {...getDataInputProps()} />
                <p>Drag 'n' drop, or click</p>
                {dataFile && (
                  <div className="file-chip">
                    <span className="file-name">{dataFile.name}</span>
                    <button
                      type="button"
                      className="file-remove-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        clearDataFile();
                      }}
                      aria-label="Remove data file"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="control-group">
              <label>3. Personalize Certificates</label>
              <p className="toggle-hint">
                Drag or resize the red box, then lock the layout to prevent
                accidental changes.
              </p>

              <label>Font Family</label>
              <div className="font-picker-wrapper">
                <FontPicker
                  activeFontFamily={layout?.fontFamily || "Montserrat"}
                  serverFonts={serverFonts}
                  onChange={(nextFont) => {
                    setLayout((prev) => ({ ...prev, fontFamily: nextFont.family }));
                  }}
                />
              </div>

              <label htmlFor="fontSize">Font Size (px)</label>
              <input
                type="number"
                name="fontSize"
                min="8"
                value={layout?.fontSize ?? ""}
                onChange={handleLayoutChange}
                disabled={!layout || isLayoutLocked}
              />

              <label htmlFor="color">Font Color</label>
              <input
                type="color"
                name="color"
                value={layout?.color || "#C67F0E"}
                onChange={handleLayoutChange}
                disabled={!layout || isLayoutLocked}
              />
              <div className="color-swatches">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`color-swatch ${layout?.color?.toLowerCase() === swatch.toLowerCase()
                        ? "selected"
                        : ""
                      }`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => handleColorSelect(swatch)}
                    aria-label={`Set font color to ${swatch}`}
                    disabled={!layout || isLayoutLocked}
                  />
                ))}
              </div>

              <label style={{ marginTop: "12px" }}>Text Styling</label>
              <div className="font-align">
                <button
                  className={layout?.fontWeight === "bold" ? "active" : ""}
                  onClick={() =>
                    handleLayoutChange({
                      target: {
                        name: "fontWeight",
                        value:
                          layout?.fontWeight === "bold" ? "normal" : "bold",
                      },
                    })
                  }
                  disabled={!layout || isLayoutLocked}
                >
                  Bold
                </button>
                <button
                  className={layout?.fontStyle === "italic" ? "active" : ""}
                  onClick={() =>
                    handleLayoutChange({
                      target: {
                        name: "fontStyle",
                        value:
                          layout?.fontStyle === "italic" ? "normal" : "italic",
                      },
                    })
                  }
                  disabled={!layout || isLayoutLocked}
                >
                  Italic
                </button>
              </div>

              <label htmlFor="positionX">Horizontal Position (px)</label>
              <input
                type="number"
                name="x"
                min="0"
                max={Math.max(0, Math.floor(maxXForInput))}
                value={layout?.x ?? ""}
                onChange={handleLayoutChange}
                disabled={!layout || isLayoutLocked}
              />

              <label htmlFor="positionY">Vertical Position (px)</label>
              <input
                type="number"
                name="y"
                min="0"
                max={Math.max(0, Math.floor(maxYForInput))}
                value={layout?.y ?? ""}
                onChange={handleLayoutChange}
                disabled={!layout || isLayoutLocked}
              />

              <label>Horizontal Alignment</label>
              <div className="font-align">
                <button
                  onClick={() => handleAlign("left")}
                  className={layout?.align === "left" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Left
                </button>
                <button
                  onClick={() => handleAlign("center")}
                  className={layout?.align === "center" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Center
                </button>
                <button
                  onClick={() => handleAlign("right")}
                  className={layout?.align === "right" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Right
                </button>
              </div>

              <label style={{ marginTop: "10px" }}>Vertical Alignment</label>
              <div className="font-align">
                <button
                  onClick={() => handleVAlign("top")}
                  className={layout?.v_align === "top" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Top
                </button>
                <button
                  onClick={() => handleVAlign("middle")}
                  className={layout?.v_align === "middle" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Middle
                </button>
                <button
                  onClick={() => handleVAlign("bottom")}
                  className={layout?.v_align === "bottom" ? "active" : ""}
                  disabled={!layout || isLayoutLocked}
                >
                  Bottom
                </button>
              </div>

              <button
                className={`confirm-layout-button ${isLayoutLocked ? "locked" : ""
                  }`}
                onClick={() => {
                  setIsLayoutLocked(!isLayoutLocked);
                  setPreviewImages([]);
                }}
                disabled={!template || !layout}
              >
                {isLayoutLocked ? "Unlock Layout" : "Lock Layout"}
              </button>
            </div>

            <div className="control-group">
              <label>4. Test Preview & Download</label>
              <p className="toggle-hint">
                Enter a test name below, then download a single PDF preview or
                view it in the center panel.
              </p>

              <label htmlFor="previewName">Recipient Name (Test)</label>
              <input
                id="previewName"
                className="preview-input"
                type="text"
                value={previewName}
                onChange={(e) => handlePreviewInput(e.target.value)}
                placeholder={data[0]?.Name || "Enter test name"}
              />
              <p className="active-preview">
                {isPreviewFromData
                  ? "Name derived from data."
                  : "Name used for testing only."}
              </p>

              <button
                className="preview-download-button"
                onClick={handleDownloadPreview}
                disabled={
                  !template ||
                  isPreviewLoading ||
                  !previewNameIsValid ||
                  !layoutReady
                }
              >
                {isPreviewLoading ? "Downloading..." : "Download Preview PDF"}
              </button>
            </div>

            <div className="control-group">
              <label>5. Quick Recipients (Max {MAX_MANUAL_RECIPIENTS})</label>
              <p className="layout-hint">
                Use this for quick testing or sending certificates to a small,
                fixed list without uploading an Excel file.
              </p>
              {manualRecipients.map((recipient, index) => (
                <div key={recipient.id} className="manual-recipient-row">
                  <input
                    type="text"
                    placeholder={`Recipient Name ${index + 1}`}
                    value={recipient.name}
                    onChange={(e) =>
                      handleManualRecipientChange(
                        recipient.id,
                        "name",
                        e.target.value
                      )
                    }
                  />
                  <div className="manual-recipient-email-row">
                    <input
                      type="email"
                      placeholder={`Email Address ${index + 1}`}
                      value={recipient.email}
                      onChange={(e) =>
                        handleManualRecipientChange(
                          recipient.id,
                          "email",
                          e.target.value
                        )
                      }
                    />
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => removeManualRecipient(recipient.id)}
                      disabled={manualRecipients.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="manual-recipient-actions">
                <button
                  type="button"
                  className="add-manual-button"
                  onClick={addManualRecipient}
                  disabled={manualRecipientLimitReached}
                >
                  + Add Recipient
                </button>
                {manualRecipientLimitReached && (
                  <span className="manual-limit-hint">
                    Limit: {MAX_MANUAL_RECIPIENTS} recipients
                  </span>
                )}
              </div>

              <button
                className="manual-generate-button"
                onClick={handleManualGenerate}
                disabled={
                  !template ||
                  !manualReadyRecipients.length ||
                  isManualGenerating ||
                  !layoutReady
                }
              >
                {isManualGenerating
                  ? "Generating..."
                  : `Download Manual (${manualReadyRecipients.length})`}
              </button>
            </div>



            <div className="control-group">
              <label>6. Email Delivery (Optional)</label>
              <p className="layout-hint">
                Personalize your email with <code>{"{name}"}</code> to insert
                each recipient's name automatically.
              </p>
              <label className="email-toggle">
                <input
                  type="checkbox"
                  checked={emailDeliveryEnabled}
                  onChange={(event) => {
                    setEmailDeliveryEnabled(event.target.checked);
                  }}
                />
                Enable Generate & Send
              </label>

              <div
                className={`email-settings ${emailDeliveryEnabled ? "active" : "disabled"
                  }`}
              >

                <label>Email Attachment</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="emailAttachmentType"
                      value="certificate"
                      checked={emailAttachmentType === "certificate"}
                      onChange={(e) => setEmailAttachmentType(e.target.value)}
                      disabled={!emailDeliveryEnabled || isSending}
                    />
                    Attach Personalized Certificate
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="emailAttachmentType"
                      value="shared"
                      checked={emailAttachmentType === "shared"}
                      onChange={(e) => setEmailAttachmentType(e.target.value)}
                      disabled={!emailDeliveryEnabled || isSending}
                    />
                    Attach Shared File(s)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="emailAttachmentType"
                      value="none"
                      checked={emailAttachmentType === "none"}
                      onChange={(e) => setEmailAttachmentType(e.target.value)}
                      disabled={!emailDeliveryEnabled || isSending}
                    />
                    Send Email Only (No Attachment)
                  </label>
                </div>

                {emailAttachmentType === "shared" && (
                  <div
                    {...getSharedFileProps({
                      className: "dropzone shared-file-dropzone",
                    })}
                  >
                    <input {...getSharedFileInputProps()} />
                    <p>Drop one or more shared files here (PDF, DOCX, etc.)</p>
                    {sharedAttachmentFiles.map((file, index) => (
                      <div className="file-chip" key={`${file.name}-${index}`}>
                        <span className="file-name">{file.name}</span>
                        <button
                          type="button"
                          className="file-remove-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            clearSharedAttachment(index);
                          }}
                          aria-label={`Remove ${file.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {emailAttachmentType === "certificate" && (
                  <p className="layout-hint">
                    This will generate and attach a unique PNG for each
                    recipient.
                  </p>
                )}
                {emailAttachmentType === "shared" && (
                  <p className="layout-hint">
                    Everyone will receive the same shared file(s) you upload
                    here.
                  </p>
                )}
                {emailAttachmentType === "none" && (
                  <p className="email-warning">No attachments will be sent.</p>
                )}

                <label htmlFor="emailService">Email Service</label>
                <input
                  id="emailService"
                  name="service"
                  type="text"
                  placeholder="gmail, outlook, yahoo..."
                  value={emailSettings.service}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />
                <label htmlFor="senderName">Sender Name (optional)</label>
                <input
                  id="senderName"
                  name="senderName"
                  type="text"
                  placeholder="Your Organization"
                  value={emailSettings.senderName}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />
                <label htmlFor="senderEmail">Sender Email Address</label>
                <input
                  id="senderEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={emailSettings.email}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />
                <label htmlFor="emailPassword">Email App Password</label>
                <input
                  id="emailPassword"
                  name="password"
                  type="password"
                  autoComplete="off"
                  placeholder="Enter the app password from your provider"
                  value={emailSettings.password}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />
                <label htmlFor="emailSubject">Email Subject</label>
                <input
                  id="emailSubject"
                  name="subject"
                  type="text"
                  placeholder="Your Certificate is Ready!"
                  value={emailSettings.subject}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />

                <div className="presets-section" style={{ marginTop: '16px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <label style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-color)', display: 'block' }}>Message Template Presets</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <select 
                      value={selectedMessagePresetId} 
                      onChange={(e) => handleLoadPreset(e, 'message')}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      disabled={isSavingMessagePreset || isSending}
                    >
                      <option value="">-- Load a saved message --</option>
                      {presets.filter(p => p.presetType === 'message').map(p => (
                        <option key={p.id} value={p.id}>{p.presetName}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => handleDeletePreset(selectedMessagePresetId, 'message')}
                      disabled={!selectedMessagePresetId || isSavingMessagePreset || isSending}
                      style={{ alignSelf: 'flex-start', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!selectedMessagePresetId || isSavingMessagePreset || isSending) ? 0.5 : 1 }}
                      title="Delete selected preset"
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="New message preset name..." 
                      value={newMessagePresetName}
                      onChange={(e) => setNewMessagePresetName(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      disabled={isSavingMessagePreset || isSending}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleSavePreset('message')}
                      disabled={!newMessagePresetName.trim() || isSavingMessagePreset || isSending}
                      style={{ alignSelf: 'flex-start', padding: '10px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!newMessagePresetName.trim() || isSavingMessagePreset || isSending) ? 0.5 : 1 }}
                    >
                      {isSavingMessagePreset ? 'Saving...' : 'Save As Preset'}
                    </button>
                  </div>
                </div>

                <label htmlFor="emailTemplate" style={{ marginTop: '16px' }}>Message Template</label>
                <div className="formatting-toolbar">
                  <button
                    type="button"
                    onClick={() => insertFormat("b")}
                    title="Bold copy"
                    className="format-btn"
                  >
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("i")}
                    title="Italic copy"
                    className="format-btn"
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("u")}
                    title="Underline copy"
                    className="format-btn"
                  >
                    <u>U</u>
                  </button>
                  <div className="divider" style={{ width: "1px", background: "#ccc", margin: "0 5px" }} />
                  <button
                    type="button"
                    onClick={() => insertLink("emailTemplate")}
                    title="Insert Link"
                    className="format-btn"
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    onClick={() => promptForImage("emailTemplate")}
                    title="Insert Image via URL"
                    className="format-btn"
                  >
                    🌐
                  </button>
                  <label className="format-btn" title="Upload Image" style={{ display: "inline-flex", alignItems: "center", marginBottom: 0 }}>
                    📤
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleImageUpload(e, "emailTemplate")}
                    />
                  </label>
                  <div className="divider" style={{ width: "1px", background: "#ccc", margin: "0 5px" }} />
                  <div className="placeholder-buttons" style={{ display: "inline-flex", gap: "5px" }}>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("name", "emailTemplate")}
                      className="format-btn placeholder-btn"
                      title="Insert Name Placeholder"
                      style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}
                    >
                      {`{name}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("email", "emailTemplate")}
                      className="format-btn placeholder-btn"
                      title="Insert Email Placeholder"
                      style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}
                    >
                      {`{email}`}
                    </button>
                  </div>
                </div>
                <textarea
                  id="emailTemplate"
                  name="template"
                  placeholder="Hi {name}, ..."
                  value={emailSettings.template}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                />

                <div className="presets-section" style={{ marginTop: '24px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <label style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-color)', display: 'block' }}>Email Signature Presets</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <select 
                      value={selectedSignaturePresetId} 
                      onChange={(e) => handleLoadPreset(e, 'signature')}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      disabled={isSavingSignaturePreset || isSending}
                    >
                      <option value="">-- Load a saved signature --</option>
                      {presets.filter(p => p.presetType === 'signature').map(p => (
                        <option key={p.id} value={p.id}>{p.presetName}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => handleDeletePreset(selectedSignaturePresetId, 'signature')}
                      disabled={!selectedSignaturePresetId || isSavingSignaturePreset || isSending}
                      style={{ alignSelf: 'flex-start', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!selectedSignaturePresetId || isSavingSignaturePreset || isSending) ? 0.5 : 1 }}
                      title="Delete selected preset"
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="New signature preset name..." 
                      value={newSignaturePresetName}
                      onChange={(e) => setNewSignaturePresetName(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      disabled={isSavingSignaturePreset || isSending}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleSavePreset('signature')}
                      disabled={!newSignaturePresetName.trim() || isSavingSignaturePreset || isSending}
                      style={{ alignSelf: 'flex-start', padding: '10px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!newSignaturePresetName.trim() || isSavingSignaturePreset || isSending) ? 0.5 : 1 }}
                    >
                      {isSavingSignaturePreset ? 'Saving...' : 'Save As Preset'}
                    </button>
                  </div>
                </div>

                <label htmlFor="emailSignature" style={{ marginTop: "16px" }}>Email Signature</label>
                <div className="formatting-toolbar">
                  <button
                    type="button"
                    onClick={() => insertFormat("b", "emailSignature")}
                    title="Bold"
                    className="format-btn"
                  >
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("i", "emailSignature")}
                    title="Italic"
                    className="format-btn"
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("u", "emailSignature")}
                    title="Underline"
                    className="format-btn"
                  >
                    <u>U</u>
                  </button>
                  <div className="divider" style={{ width: "1px", background: "#ccc", margin: "0 5px" }} />
                  <button
                    type="button"
                    onClick={() => insertLink("emailSignature")}
                    title="Insert Link"
                    className="format-btn"
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    onClick={() => promptForImage("emailSignature")}
                    title="Insert Image via URL"
                    className="format-btn"
                  >
                    🌐
                  </button>
                  <label className="format-btn" title="Upload Image" style={{ display: "inline-flex", alignItems: "center", marginBottom: 0 }}>
                    📤
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleImageUpload(e, "emailSignature")}
                    />
                  </label>
                  <div className="divider" style={{ width: "1px", background: "#ccc", margin: "0 5px" }} />
                  <div className="placeholder-buttons" style={{ display: "inline-flex", gap: "5px" }}>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("name", "emailSignature")}
                      className="format-btn placeholder-btn"
                      title="Insert Name Placeholder"
                      style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}
                    >
                      {`{name}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlaceholder("email", "emailSignature")}
                      className="format-btn placeholder-btn"
                      title="Insert Email Placeholder"
                      style={{ fontSize: '12px', fontWeight: 'bold', color: '#6366f1' }}
                    >
                      {`{email}`}
                    </button>
                  </div>
                </div>
                <textarea
                  id="emailSignature"
                  name="signature"
                  placeholder="Sincerely,\nYour Name"
                  value={emailSettings.signature}
                  onChange={handleEmailSettingsChange}
                  disabled={!emailDeliveryEnabled || isSending}
                  style={{ minHeight: "80px" }}
                />

                {/* Combined Email Preview */}
                {(emailSettings.template || emailSettings.signature) && (
                  <div className="email-preview-container" style={{ marginTop: "15px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Preview</p>
                    <div
                      className="email-content-preview"
                      style={{ fontFamily: "sans-serif", fontSize: "14px", lineHeight: "1.5", color: "#334155" }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: (emailSettings.template || "").replace(/\n/g, "<br/>") }} />

                      {(emailSettings.template && emailSettings.signature) && <br />}

                      <div dangerouslySetInnerHTML={{ __html: (emailSettings.signature || "").replace(/\n/g, "<br/>") }} />
                    </div>
                  </div>
                )}

                <p className="template-hint">
                  Tip: We'll automatically replace <code>{"{name}"}</code> with
                  each recipient's name and attach their certificate as a PNG.
                </p>
              </div>
            </div>

            <div className="control-group">
              <label>7. Generate & Deliver</label>

              {/* Counts and Toggles - Kept here as requested */}
              <div className="email-delivery-stats" style={{ marginBottom: "15px" }}>
                <p style={{ margin: "0 0 10px 0", color: "#000000", fontWeight: "bold" }}>
                  Emails detected: {emailReadyRows.length}/{data.length || 0}
                  <span style={{ margin: "0 10px", color: "#ccc" }}>|</span>
                  Manual: {manualReadyRecipients.length}
                </p>

                <label className="toggle-label" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: emailDeliveryEnabled ? "pointer" : "default",
                  color: emailDeliveryEnabled ? "#000000" : "#94a3b8",
                  fontWeight: "bold",
                  opacity: emailDeliveryEnabled ? 1 : 0.6
                }}>
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    disabled={!emailDeliveryEnabled}
                    style={{ width: "16px", height: "16px", cursor: emailDeliveryEnabled ? "pointer" : "default" }}
                  />
                  Skip Duplicate Emails
                </label>
              </div>

              <div className="generation-actions">
                {/* Warning: Missing Emails */}
                {emailDeliveryEnabled && rowsMissingEmails.length > 0 && (
                  <div
                    className="missing-emails-warning"
                    style={{
                      marginBottom: "15px",
                      padding: "12px",
                      backgroundColor: "#fff3cd", /* Light Yellow */
                      border: "1px solid #ffeeba",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      color: "#856404",
                      position: "relative",
                      zIndex: 10,
                      isolation: "isolate"
                    }}
                  >
                    <p style={{ margin: "0 0 8px 0", fontWeight: "bold", position: "relative", zIndex: 10, color: "#856404" }}>
                      <span style={{ color: "#856404", position: "relative", zIndex: 10 }}>
                        ⚠️ Warning: {rowsMissingEmails.length} recipients have a Name but missing/invalid Email.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadMissingEmails}
                      style={{
                        fontSize: "0.85rem",
                        padding: "6px 14px",
                        backgroundColor: "#ef5350", /* Soft Red */
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-block",
                        fontWeight: "bold",
                        position: "relative",
                        zIndex: 10
                      }}
                    >
                      <span style={{ color: "#ffffff" }}>
                        Download These Entries (.xlsx)
                      </span>
                    </button>
                  </div>
                )}

                {/* Warning: Duplicate Emails */}
                {emailDeliveryEnabled && rowsWithDuplicateEmails.length > 0 && (
                  <div
                    className="duplicate-emails-warning"
                    style={{
                      marginBottom: "15px",
                      padding: "12px",
                      backgroundColor: "#e3f2fd", /* Light Blue */
                      border: "1px solid #bbdefb",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      color: "#0d47a1", /* Dark Blue */
                      position: "relative",
                      zIndex: 10,
                      isolation: "isolate"
                    }}
                  >
                    <p style={{ margin: "0 0 8px 0", fontWeight: "bold", position: "relative", zIndex: 10, color: "#0d47a1" }}>
                      <span style={{ color: "#0d47a1", position: "relative", zIndex: 10 }}>
                        {skipDuplicates
                          ? `⚠️ Detect: ${rowsWithDuplicateEmails.length} duplicates found (Skipping enabled).`
                          : `⚠️ Detect: ${rowsWithDuplicateEmails.length} Duplicate Email Entries found.`}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadDuplicateEmails}
                      style={{
                        fontSize: "0.85rem",
                        padding: "6px 14px",
                        backgroundColor: "#42a5f5", /* Soft Blue */
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-block",
                        fontWeight: "bold",
                        position: "relative",
                        zIndex: 10
                      }}
                    >
                      <span style={{ color: "#ffffff" }}>
                        Download Duplicates (.xlsx)
                      </span>
                    </button>
                  </div>
                )}
                <button
                  className="generate-button"
                  onClick={handleGenerate}
                  disabled={
                    !template ||
                    !dataFile ||
                    isLoading ||
                    isPreviewLoading ||
                    (layoutIsRequired && !layoutReady)
                  }
                >
                  {isLoading
                    ? "Generating..."
                    : `Generate ${data.length} Certificates`}
                </button>
                <button
                  className="send-button"
                  onClick={handleGenerateAndSend}
                  disabled={!canAttemptEmailSend}
                >
                  {sendButtonLabel}
                </button>
              </div>
              {lastGenerationInfo && (
                <div className="generation-summary">
                  <p>
                    <strong>Last download:</strong>{" "}
                    {lastGenerationInfo.timestamp}
                  </p>
                  <p>
                    <strong>Certificates:</strong> {lastGenerationInfo.count}
                  </p>
                  <p>
                    <strong>ZIP Name:</strong>{" "}
                    <code>{lastGenerationInfo.fileName || "-"}</code>
                  </p>
                </div>
              )}
              {emailSummary && (
                <div className="generation-summary email-summary">
                  <p>
                    <strong>Last send:</strong> {emailSummary.timestamp}
                  </p>
                  <p>
                    <strong>Delivered:</strong> {emailSummary.successCount || 0}{" "}
                    / {emailSummary.attempted || emailReadyRows.length || 0}
                  </p>
                  <p>
                    <strong>Missing Emails:</strong>{" "}
                    {emailSummary.missingEmailCount || 0}
                  </p>
                  {emailSummary.failureCount > 0 && (
                    <details>
                      <summary>
                        Failed deliveries ({emailSummary.failureCount})
                      </summary>
                      <ul className="failure-list">
                        {(emailSummary.failures || [])
                          .slice(0, 5)
                          .map((failure, i) => (
                            <li key={`${failure.email}-${i}`}>
                              {failure.name} - {failure.email}: {failure.reason}
                            </li>
                          ))}
                        {emailSummary.failures?.length > 5 && (
                          <li>
                            ...and {emailSummary.failures.length - 5} more
                          </li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="editor-panel">
            {templateURL && (
              <div className="preview-zoom-controls">
                <div className="preview-zoom-header">
                  <label htmlFor="zoomSlider">
                    Zoom: {Math.round(previewScale * 100)}%
                  </label>
                  <button
                    className="preview-zoom-reset"
                    onClick={() => setPreviewScale(DEFAULT_ZOOM_SCALE)}
                    disabled={previewScale === DEFAULT_ZOOM_SCALE}
                  >
                    Reset to 35%
                  </button>
                </div>
                <input
                  id="zoomSlider"
                  className="preview-zoom-slider"
                  type="range"
                  min="0.1"
                  max="0.35"
                  step="0.01"
                  value={previewScale}
                  onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                  disabled={!templateURL}
                />
              </div>
            )}

            {templateURL ? (
              <>
                <div className="preview-top-bar">
                  <div className="preview-pill">
                    Previewing: <strong>{previewName || "-"}</strong>
                  </div>

                  {templateBackURL && (
                    <div className="preview-side-toggle">
                      <button
                        className={`side-toggle-button ${previewSide === "front" ? "active" : ""}`}
                        onClick={() => setPreviewSide("front")}
                      >
                        Front Side
                      </button>
                      <button
                        className={`side-toggle-button ${previewSide === "back" ? "active" : ""}`}
                        onClick={() => setPreviewSide("back")}
                      >
                        Back Side
                      </button>
                    </div>
                  )}
                </div>

                <div className="preview-container-3d">
                  <div className={`preview-card-3d ${previewSide === "back" ? "is-flipped" : ""}`}>
                    {/* Front Face */}
                    <div className={`preview-face-3d front ${previewSide !== "back" ? "active" : ""}`}>
                      <div
                        className="editor-canvas"
                        style={{
                          width: `${templateSize.width}px`,
                          height: `${templateSize.height}px`,
                          backgroundImage: `url(${templateURL})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        {layout ? (
                          <Rnd
                            bounds="parent"
                            dragHandleClassName="draggable-text-box"
                            position={{
                              x: layout.x * previewScale,
                              y: layout.y * previewScale,
                            }}
                            size={{
                              width: Math.max(1, layout.width * previewScale),
                              height: Math.max(1, layout.height * previewScale),
                            }}
                            onDrag={handleDrag}
                            onResizeStart={handleResizeStart}
                            onResize={handleResize}
                            disableDragging={isLayoutLocked}
                            enableResizing={isLayoutLocked ? false : {
                              top: true, right: true, bottom: true, left: true,
                              topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
                            }}
                            minWidth={Math.max(1, MIN_LAYOUT_WIDTH * previewScale)}
                            minHeight={Math.max(1, MIN_LAYOUT_HEIGHT * previewScale)}
                            maxWidth={templateSize.width}
                            maxHeight={templateSize.height}
                          >
                            <div
                              className={`draggable-text-box ${isLayoutLocked ? "locked" : ""}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                justifyContent: getJustifyContent(),
                                alignItems: getAlignItems(),
                              }}
                            >
                              <canvas
                                ref={previewCanvasRef}
                                className="preview-text-canvas"
                                aria-label="Certificate name preview"
                              />
                            </div>
                          </Rnd>
                        ) : (
                          <h3 className="layout-placeholder">Preparing layout box...</h3>
                        )}
                      </div>
                    </div>

                    {/* Back Face */}
                    <div className={`preview-face-3d back ${previewSide === "back" ? "active" : ""}`}>
                      {templateBackURL && (
                        <div
                          className="editor-canvas"
                          style={{
                            width: `${templateSize.width}px`,
                            height: `${templateSize.height}px`,
                            backgroundImage: `url(${templateBackURL})`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <h3 className="empty-template-hint">Upload a template to begin designing</h3>
            )}
          </div>

          <div className="preview-grid-panel">
            <h2>All Previews ({data.length})</h2>

            {!template ? (
              <>
                <p className="data-panel-hint">Upload a template image first.</p>
                <button className="generate-previews-button" disabled>
                  Generate Previews
                </button>
              </>
            ) : !data.length ? (
              <>
                <p className="data-panel-hint">
                  Upload an Excel data file to see previews.
                </p>
                <button className="generate-previews-button" disabled>
                  Generate Previews
                </button>
              </>
            ) : !isLayoutLocked ? (
              <>
                <p className="data-panel-hint">
                  Lock your layout in Step 3 to generate all previews.
                </p>
                <button className="generate-previews-button" disabled>
                  Generate All {data.length} Previews
                </button>
              </>
            ) : isPreviewGridLoading ? (
              <button className="generate-previews-button" disabled>
                Generating Previews...
              </button>
            ) : previewImages.length === 0 ? (
              <>
                <p className="data-panel-hint">
                  Ready to see what everyone's certificate will look like?
                </p>
                <button
                  className="generate-previews-button"
                  onClick={handleGeneratePreviews}
                  disabled={
                    !layoutReady || !data.length || !templateImageRef.current
                  }
                >
                  Generate All {data.length} Previews
                </button>
              </>
            ) : (
              <button
                className="generate-previews-button clear"
                onClick={() => setPreviewImages([])}
              >
                Clear Previews
              </button>
            )}

            {previewImages.length > 0 && !isPreviewGridLoading && (
              <p className="data-panel-hint">
                Showing {previewImages.length} previews. Click a name in Step 3
                to adjust the main preview.
              </p>
            )}

            <div className="preview-grid-container">
              {previewImages.map((img, i) => (
                <div
                  key={i}
                  className="preview-grid-item"
                  onClick={() => handlePreviewSelect(img.name)}
                >
                  <img
                    src={img.imageSrc}
                    alt={img.name}
                    width={PREVIEW_THUMBNAIL_WIDTH}
                    loading="lazy"
                  />
                  <p>{img.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should not be reached if routing logic is solid)
  return <div>Loading...</div>;
}

export default App;
