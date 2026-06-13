import React from "react";
import { useAppStore } from "../shared/store/useAppStore";

const PREVIEW_THUMBNAIL_WIDTH = 300;

const PreviewGrid = ({
  handleGeneratePreviews,
  templateImageRef,
  setPreviewImages,
  handlePreviewSelect,
  handleDownloadAllZIP,
  className = "",
  onCloseDrawer,
}) => {
  const {
    data,
    template,
    layout,
    isLayoutLocked,
    isPreviewGridLoading,
    previewImages,
  } = useAppStore();

  const layoutReady = !!layout && isLayoutLocked;

  return (
    <div className={`preview-grid-panel ${className}`}>
      <div className="preview-grid-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onCloseDrawer && (
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onCloseDrawer}
              style={{ margin: 0, padding: "4px 8px" }}
            >
              &times;
            </button>
          )}
          <h2 style={{ margin: 0 }}>Previews ({data.length})</h2>
        </div>
        {previewImages.length > 0 && !isPreviewGridLoading && (
          <button
            className="preview-zip-button"
            onClick={handleDownloadAllZIP}
            title="Download all previews as PDFs in a ZIP file"
          >
            Download All ZIP
          </button>
        )}
      </div>

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
            disabled={!layoutReady || !data.length || !templateImageRef.current}
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
          Showing {previewImages.length} previews. Click a name in Step 3 to
          adjust the main preview.
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
  );
};

export default PreviewGrid;
