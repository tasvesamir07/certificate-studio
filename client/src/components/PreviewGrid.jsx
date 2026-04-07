import React from "react";

const PreviewGrid = ({
  data,
  template,
  isLayoutLocked,
  isPreviewGridLoading,
  previewImages,
  handleGeneratePreviews,
  layoutReady,
  templateImageRef,
  setPreviewImages,
  handlePreviewSelect,
  PREVIEW_THUMBNAIL_WIDTH,
}) => {
  return (
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
