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
    <div className={`flex-[0_0_320px] bg-bg-surface p-7 h-[calc(100vh-56px)] sticky top-[56px] flex flex-col border-l border-border-custom overflow-y-auto ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-2">
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="bg-transparent border-none text-text-muted hover:text-text-primary text-xl cursor-pointer p-1 rounded-md transition-colors duration-150"
            >
              &times;
            </button>
          )}
          <h2 className="text-sm font-bold text-text-primary m-0 flex items-center gap-2">Previews ({data.length})</h2>
        </div>
        {previewImages.length > 0 && !isPreviewGridLoading && (
          <button
            className="px-3 py-1.5 bg-bg-elevated border border-border-light text-text-primary text-xs font-bold rounded-lg hover:bg-bg-hover transition-all duration-150 cursor-pointer"
            onClick={handleDownloadAllZIP}
            title="Download all previews as PDFs in a ZIP file"
          >
            Download All ZIP
          </button>
        )}
      </div>

      {!template ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed mb-3">Upload a template image first.</p>
          <button className="w-full py-2 bg-bg-elevated border border-border-light text-text-primary font-bold rounded-lg opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
            Generate Previews
          </button>
        </>
      ) : !data.length ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Upload an Excel data file to see previews.
          </p>
          <button className="w-full py-2 bg-bg-elevated border border-border-light text-text-primary font-bold rounded-lg opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
            Generate Previews
          </button>
        </>
      ) : !isLayoutLocked ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Lock your layout in Step 3 to generate all previews.
          </p>
          <button className="w-full py-2 bg-bg-elevated border border-border-light text-text-primary font-bold rounded-lg opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
            Generate All {data.length} Previews
          </button>
        </>
      ) : isPreviewGridLoading ? (
        <button className="w-full py-2 bg-bg-elevated border border-border-light text-text-primary font-bold rounded-lg opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
          Generating Previews...
        </button>
      ) : previewImages.length === 0 ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Ready to see what everyone's certificate will look like?
          </p>
          <button
            className="w-full py-2 bg-gradient-to-br from-accent to-accent-hover text-white font-bold rounded-lg shadow-sm hover:shadow-md uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed select-none transition-all duration-150 cursor-pointer text-center mb-4 flex items-center justify-center"
            onClick={handleGeneratePreviews}
            disabled={!layoutReady || !data.length || !templateImageRef.current}
          >
            Generate All {data.length} Previews
          </button>
        </>
      ) : (
        <button
          className="w-full py-2 bg-transparent border border-border-light text-text-secondary font-semibold rounded-lg hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-center mb-4 flex items-center justify-center text-xs"
          onClick={() => setPreviewImages([])}
        >
          Clear Previews
        </button>
      )}

      {previewImages.length > 0 && !isPreviewGridLoading && (
        <p className="text-xs text-text-muted leading-relaxed mb-3">
          Showing {previewImages.length} previews. Click a name in Step 3 to
          adjust the main preview.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 flex-1">
        {previewImages.map((img, i) => (
          <div
            key={i}
            className="group flex flex-col gap-1.5 p-2 bg-bg-elevated border border-border-light rounded-xl cursor-pointer hover:border-accent hover:bg-bg-hover transition-all duration-150"
            onClick={() => handlePreviewSelect(img.name)}
          >
            <img
              src={img.imageSrc}
              alt={img.name}
              width={PREVIEW_THUMBNAIL_WIDTH}
              loading="lazy"
              className="w-full h-auto rounded-lg border border-border-light group-hover:border-accent/40"
            />
            <p className="text-xs font-semibold text-text-primary truncate m-0 group-hover:text-accent">{img.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewGrid;
