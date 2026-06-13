import { jsPDF } from "jspdf";

export const DEFAULT_TEMPLATE_SIZE = { width: 800, height: 600 };
export const MIN_LAYOUT_WIDTH = 100;
export const MIN_LAYOUT_HEIGHT = 30;
export const MIN_DYNAMIC_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 1000;
export const PREVIEW_THUMBNAIL_WIDTH = 300;
export const DEFAULT_ZOOM_SCALE = 0.35;
export const CONTROL_PANEL_WIDTH = 320;
export const DATA_PANEL_WIDTH = 300;
export const PREVIEW_PADDING = 80;
export const MIN_PREVIEW_WIDTH = 480;
export const MIN_PREVIEW_HEIGHT = 360;

export const CANVAS_TEXT_ALIGN = {
  left: "left",
  center: "center",
  right: "right",
};

export const CERTIFICATE_RENDER_SCALE = 1.6;
export const CERTIFICATE_JPEG_QUALITY = 0.82;

export const fitFontSizeToBox = (
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
    
    const left = Math.abs(metrics.actualBoundingBoxLeft || 0);
    const right = Math.abs(metrics.actualBoundingBoxRight || 0);
    const width = left + right || metrics.width || 0;
    
    const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
    const descent = metrics.actualBoundingBoxDescent || size * 0.2;
    const height = ascent + descent;

    const allowedWidth = Math.max(1, boxWidth);
    const allowedHeight = Math.max(1, boxHeight);

    const widthRatio = width ? allowedWidth / width : 1;
    const heightRatio = height ? allowedHeight / height : 1;
    
    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio >= 0.98) {
      break;
    }

    const nextSize = Math.max(
      MIN_DYNAMIC_FONT_SIZE,
      Math.floor(size * ratio)
    );

    if (nextSize >= size) break;
    size = nextSize;
  }

  return size;
};

export const calculateAutoScale = (naturalWidth, naturalHeight) => {
  if (!naturalWidth || !naturalHeight) return DEFAULT_ZOOM_SCALE;
  
  const isMobile = window.innerWidth <= 768;
  const hPadding = isMobile ? 60 : (CONTROL_PANEL_WIDTH + DATA_PANEL_WIDTH + PREVIEW_PADDING * 2.5);
  const vPadding = isMobile ? 120 : (PREVIEW_PADDING * 2.5 + 80);
  
  const availableW = Math.max(MIN_PREVIEW_WIDTH, window.innerWidth - hPadding);
  const availableH = Math.max(MIN_PREVIEW_HEIGHT, window.innerHeight - vPadding);
  
  const scaleW = availableW / naturalWidth;
  const scaleH = availableH / naturalHeight;
  
  const bestFit = Math.min(scaleW, scaleH) * 0.95;
  return Math.min(1.2, Math.max(0.1, bestFit));
};

export const createInitialLayout = (templateWidth, templateHeight) => {
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

export const drawCertificateToCanvas = async (
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

  ctx.scale(multiplier, multiplier);
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

    if (document.fonts?.load) {
      const fontSpec = `${fontStyle} ${fontWeight} ${desiredFontSize}px "${activeFontFamily}"`;
      try {
        if (!document.fonts.check(fontSpec)) {
          await document.fonts.load(fontSpec);
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
    ctx.rect(x - 1, y - 1, width + 2, height + 2);
    ctx.clip();
    ctx.fillText(fullName, anchorX, anchorY);
    ctx.restore();
  }

  // Generate and embed verification QR code
  if (options.verificationCode) {
    try {
      const verifyUrl = `${window.location.origin}/verify/${options.verificationCode}`;
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.onerror = resolve;
      });
      if (qrImg.complete && qrImg.naturalWidth > 0) {
        const qrSize = Math.round(templateHeight * 0.12); // proportional sizing: 12% of height
        const margin = Math.round(templateHeight * 0.04);
        ctx.drawImage(
          qrImg, 
          templateWidth - qrSize - margin, 
          templateHeight - qrSize - margin, 
          qrSize, 
          qrSize
        );
      }
    } catch (qrErr) {
      console.warn("QR code drawing failed:", qrErr);
    }
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

export const generateCertificatePDF = async (
  templateImage,
  layout,
  fullName,
  options = {},
  templateBackImage = null
) => {
  const { width, height } = templateImage;
  const orientation = width > height ? "l" : "p";

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

export const drawCertificateToCanvasThumbnail = async (
  canvas,
  templateImage,
  fullLayout,
  fullName,
  options = {}
) => {
  const { thumbnailWidth = PREVIEW_THUMBNAIL_WIDTH } = options;
  const { naturalWidth: templateWidth, naturalHeight: templateHeight } =
    templateImage;

  const highResCanvas = document.createElement("canvas");
  await drawCertificateToCanvas(
    highResCanvas,
    templateImage,
    fullLayout,
    fullName,
    { drawName: true, ...options }
  );

  const scaleRatio = thumbnailWidth / templateWidth;
  const thumbnailHeight = templateHeight * scaleRatio;
  canvas.width = thumbnailWidth;
  canvas.height = thumbnailHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get thumbnail context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(highResCanvas, 0, 0, thumbnailWidth, thumbnailHeight);

  return canvas.toDataURL("image/jpeg", 0.75);
};
