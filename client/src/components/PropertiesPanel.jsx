import React from "react";
import FontPicker from "./FontPicker";

const PropertiesPanel = ({
  layout,
  setLayout,
  serverFonts,
  MAX_FONT_SIZE,
  handleLayoutChange,
  isLayoutLocked,
  COLOR_SWATCHES,
  handleColorSelect,
  handleAlign,
  handleVAlign,
  setIsLayoutLocked,
  setPreviewImages,
  template,
  previewName,
  handlePreviewInput,
  data,
  isPreviewFromData,
  handleDownloadPreview,
  isPreviewLoading,
  previewNameIsValid,
  layoutReady,
}) => {
  return (
    <>
      <div className="control-group">
        <label>3. Personalize Certificates</label>
        <p className="toggle-hint">
          Drag or resize the red box, then lock the layout to prevent accidental
          changes.
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
          max={MAX_FONT_SIZE}
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
              className={`color-swatch ${
                layout?.color?.toLowerCase() === swatch.toLowerCase()
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
                  value: layout?.fontWeight === "bold" ? "normal" : "bold",
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
                  value: layout?.fontStyle === "italic" ? "normal" : "italic",
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
          value={layout?.x ?? ""}
          onChange={handleLayoutChange}
          disabled={!layout || isLayoutLocked}
        />

        <label htmlFor="positionY">Vertical Position (px)</label>
        <input
          type="number"
          name="y"
          min="0"
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
          className={`confirm-layout-button ${isLayoutLocked ? "locked" : ""}`}
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
          Enter a test name below, then download a single PDF preview or view it
          in the center panel.
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
    </>
  );
};

export default PropertiesPanel;
