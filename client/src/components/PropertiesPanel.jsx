import React from "react";
import FontPicker from "./FontPicker";
import { useAppStore } from "../shared/store/useAppStore";

const MAX_FONT_SIZE = 1000;
const COLOR_SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#64748b", // Slate
  "#1e293b", // Navy Slate
];

const PropertiesPanel = ({
  handleLayoutChange,
  handleColorSelect,
  handleAlign,
  handleVAlign,
  handlePreviewInput,
  handleDownloadPreview,
}) => {
  const {
    layout,
    setLayout,
    serverFonts,
    isLayoutLocked,
    setIsLayoutLocked,
    setPreviewImages,
    template,
    previewName,
    data,
    isPreviewLoading,
  } = useAppStore();

  const isPreviewFromData = React.useMemo(() => {
    if (!data.length) return false;
    return data.some((row) => row.Name === previewName);
  }, [data, previewName]);

  const previewNameIsValid = !!previewName?.trim();
  const layoutReady = !!layout && isLayoutLocked;

  return (
    <>
      <div className="flex flex-col gap-2 mb-4">
        <label className="text-xs font-bold text-text-primary uppercase tracking-wide">3. Personalize Certificates</label>
        <p className="text-xs text-text-muted mb-2 leading-relaxed">
          Drag or resize the red box, then lock the layout to prevent accidental
          changes.
        </p>

        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Font Family</label>
        <div className="w-full">
          <FontPicker
            activeFontFamily={layout?.fontFamily || "Montserrat"}
            serverFonts={serverFonts}
            onChange={(nextFont) => {
              setLayout((prev) => ({ ...prev, fontFamily: nextFont.family }));
            }}
          />
        </div>

        <label htmlFor="fontSize" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Font Size (px)</label>
        <input
          type="number"
          name="fontSize"
          min="8"
          max={MAX_FONT_SIZE}
          value={layout?.fontSize ?? ""}
          onChange={handleLayoutChange}
          disabled={!layout || isLayoutLocked}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <label htmlFor="color" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Font Color</label>
        <input
          type="color"
          name="color"
          value={layout?.color || "#C67F0E"}
          onChange={handleLayoutChange}
          disabled={!layout || isLayoutLocked}
          className="w-full h-10 p-1.5 border border-border-light rounded-md bg-bg-elevated cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="grid grid-cols-6 gap-1.5 my-2">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`w-8 h-8 rounded-md border border-border-light cursor-pointer hover:scale-105 transition-all duration-150 relative disabled:opacity-50 disabled:cursor-not-allowed ${
                layout?.color?.toLowerCase() === swatch.toLowerCase()
                  ? "ring-2 ring-accent border-accent"
                  : ""
              }`}
              style={{ backgroundColor: swatch }}
              onClick={() => handleColorSelect(swatch)}
              aria-label={`Set font color to ${swatch}`}
              disabled={!layout || isLayoutLocked}
            />
          ))}
        </div>

        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5 mt-2">Text Styling</label>
        <div className="grid grid-cols-2 gap-1">
          <button
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.fontWeight === "bold" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            onClick={() =>
              handleLayoutChange({
                target: {
                  name: "fontWeight",
                  value: layout?.fontWeight === "bold" ? "normal" : "bold",
                },
              })
            }
            disabled={!layout || isLayoutLocked}
          >
            Bold
          </button>
          <button
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.fontStyle === "italic" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            onClick={() =>
              handleLayoutChange({
                target: {
                  name: "fontStyle",
                  value: layout?.fontStyle === "italic" ? "normal" : "italic",
                },
              })
            }
            disabled={!layout || isLayoutLocked}
          >
            Italic
          </button>
        </div>

        <label htmlFor="positionX" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Horizontal Position (px)</label>
        <input
          type="number"
          name="x"
          min="0"
          value={layout?.x ?? ""}
          onChange={handleLayoutChange}
          disabled={!layout || isLayoutLocked}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <label htmlFor="positionY" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Vertical Position (px)</label>
        <input
          type="number"
          name="y"
          min="0"
          value={layout?.y ?? ""}
          onChange={handleLayoutChange}
          disabled={!layout || isLayoutLocked}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Horizontal Alignment</label>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => handleAlign("left")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.align === "left" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Left
          </button>
          <button
            onClick={() => handleAlign("center")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.align === "center" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Center
          </button>
          <button
            onClick={() => handleAlign("right")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.align === "right" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Right
          </button>
        </div>

        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5 mt-2">Vertical Alignment</label>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => handleVAlign("top")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.v_align === "top" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Top
          </button>
          <button
            onClick={() => handleVAlign("middle")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.v_align === "middle" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Middle
          </button>
          <button
            onClick={() => handleVAlign("bottom")}
            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              layout?.v_align === "bottom" 
                ? "bg-accent text-bg-primary font-bold shadow-sm" 
                : "bg-bg-elevated text-text-secondary border border-border-light hover:bg-bg-hover hover:text-text-primary"
            }`}
            disabled={!layout || isLayoutLocked}
          >
            Bottom
          </button>
        </div>

        <button
          className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border ${
            isLayoutLocked 
              ? "bg-accent text-bg-primary border-accent hover:bg-accent-hover hover:-translate-y-0.5 shadow-sm" 
              : "bg-bg-elevated text-text-secondary border-border-light hover:bg-bg-hover hover:text-text-primary"
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

      <div className="flex flex-col gap-2 mb-4">
        <label className="text-xs font-bold text-text-primary uppercase tracking-wide">4. Test Preview & Download</label>
        <p className="text-xs text-text-muted mb-2 leading-relaxed">
          Enter a test name below, then download a single PDF preview or view it
          in the center panel.
        </p>

        <label htmlFor="previewName" className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Recipient Name (Test)</label>
        <input
          id="previewName"
          type="text"
          value={previewName}
          onChange={(e) => handlePreviewInput(e.target.value)}
          placeholder={data[0]?.Name || "Enter test name"}
          className="w-full px-3 py-2 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm outline-none focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow transition-all duration-150"
        />
        <p className="text-xs text-text-muted mb-2">
          {isPreviewFromData
            ? "Name derived from data."
            : "Name used for testing only."}
        </p>

        <button
          onClick={handleDownloadPreview}
          disabled={
            !template ||
            isPreviewLoading ||
            !previewNameIsValid ||
            !layoutReady
          }
          className="w-full py-3 bg-gradient-to-br from-accent to-accent-hover text-white font-bold rounded-lg shadow-sm hover:shadow-md uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
        >
          {isPreviewLoading ? "Downloading..." : "Download Preview PDF"}
        </button>
      </div>
    </>
  );
};

export default PropertiesPanel;
