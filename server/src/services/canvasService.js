const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { jsPDF } = require("jspdf");
const { ensureFont } = require("./fontService");

const MIN_DYNAMIC_FONT_SIZE = 8;
const FONT_FIT_PADDING = 0.9;
const GOLDEN_BORDER_PADDING = 20;

const weightMap = {
  bold: "700",
  normal: "400",
};

const ALIGN_TO_X = {
  left: (x) => x,
  center: (x, width) => x + width / 2,
  right: (x, width) => x + width,
};

const CANVAS_TEXT_ALIGN = {
  left: "left",
  center: "center",
  right: "right",
};

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
  const iterations = 12;

  const numericWeight = weightMap[fontWeight] || fontWeight || "400";
  let style = fontStyle || "normal";

  let effectiveFontFamily = fontFamily;
  if (style === "italic" && fontFamily === "Libre Baskerville") {
    effectiveFontFamily = "Libre Baskerville Italic";
    style = "normal";
  }

  for (let i = 0; i < iterations; i++) {
    ctx.font = `${style} ${numericWeight} ${size}px "${effectiveFontFamily}"`;
    const metrics = ctx.measureText(safeText);
    const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
    const descent = metrics.actualBoundingBoxDescent || size * 0.2;
    const left = Math.abs(metrics.actualBoundingBoxLeft || 0);
    const right = Math.abs(metrics.actualBoundingBoxRight || 0);
    const width = left + right || metrics.width || 0;
    const height = ascent + descent;

    const allowedWidth = Math.max(1, boxWidth - GOLDEN_BORDER_PADDING * 2) * FONT_FIT_PADDING;
    const allowedHeight = Math.max(1, boxHeight) * FONT_FIT_PADDING;

    const widthRatio = width ? allowedWidth / width : 1;
    const heightRatio = height ? allowedHeight / height : 1;
    const ratio = Math.min(widthRatio, heightRatio);

    if (ratio >= 1) break;

    const nextSize = Math.max(MIN_DYNAMIC_FONT_SIZE, Math.floor(size * Math.max(0.1, ratio)));
    if (nextSize >= size) {
      size = Math.max(MIN_DYNAMIC_FONT_SIZE, size - 1);
    } else {
      size = nextSize;
    }
    if (size <= MIN_DYNAMIC_FONT_SIZE) break;
  }
  return size;
};

async function drawTextOnCanvas(templateBuffer, layout, fullName, options = {}) {
  const { drawName = true } = options;
  const templateImage = await loadImage(templateBuffer);
  const { width: templateWidth, height: templateHeight } = templateImage;

  const canvas = createCanvas(templateWidth, templateHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(templateImage, 0, 0, templateWidth, templateHeight);

  if (!drawName) return canvas.encode("png");
  if (!layout) throw new Error("Layout is required to draw recipient names.");

  const baseX = Number(layout.x) || 0;
  const baseY = Number(layout.y) || 0;
  const boxWidth = Math.max(1, Number(layout.width) || templateWidth);
  const boxHeight = Math.max(1, Number(layout.height) || templateHeight);
  const fontSize = Math.max(8, Number(layout.fontSize) || 48);

  const align = layout.align || "center";
  const vAlign = layout.v_align || "middle";
  const fillStyle = layout.color || "#000000";
  const numericWeight = weightMap[layout.fontWeight] || layout.fontWeight || "400";
  let style = layout.fontStyle || "normal";

  const effectiveFontFamily = await ensureFont(layout.fontFamily, style, numericWeight);

  const appliedFontSize = fitFontSizeToBox(
    ctx, fullName, effectiveFontFamily, fontSize, boxWidth, boxHeight, numericWeight, style
  );

  ctx.font = `${style} ${numericWeight} ${appliedFontSize}px "${effectiveFontFamily}"`;
  ctx.fillStyle = fillStyle;
  ctx.textAlign = CANVAS_TEXT_ALIGN[align] || "center";

  const anchorX = (ALIGN_TO_X[align] || ALIGN_TO_X.center)(baseX, Math.max(1, boxWidth));

  let anchorY;
  if (vAlign === "top") {
    ctx.textBaseline = "top";
    anchorY = baseY;
  } else if (vAlign === "bottom") {
    ctx.textBaseline = "bottom";
    anchorY = baseY + boxHeight;
  } else {
    ctx.textBaseline = "middle";
    anchorY = baseY + boxHeight / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(baseX - 1, baseY - 1, boxWidth + 2, boxHeight + 2);
  ctx.clip();
  ctx.fillText(fullName, anchorX, anchorY);
  ctx.restore();

  return canvas.encode("png");
}

async function drawTextOnPDF(templateBuffer, layout, fullName, options = {}) {
  const pngBuffer = await drawTextOnCanvas(templateBuffer, layout, fullName, options);
  const templateImage = await loadImage(templateBuffer);
  const { width, height } = templateImage;
  const orientation = width > height ? "l" : "p";

  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
  });

  doc.addImage(pngBuffer, "PNG", 0, 0, width, height, undefined, "FAST");
  return Buffer.from(doc.output("arraybuffer"));
}

module.exports = {
  drawTextOnCanvas,
  drawTextOnPDF
};
