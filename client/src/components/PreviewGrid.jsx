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
    previewName,
  } = useAppStore();

  const layoutReady = !!layout && isLayoutLocked;

  return (
    <aside
      className={`bg-bg-surface flex flex-col border-border-custom overflow-y-auto lg:static lg:w-[300px] xl:w-[320px] lg:shrink-0 lg:h-[calc(100vh-56px)] lg:sticky lg:top-[56px] lg:border-l lg:border-t-0 p-5 lg:p-6 fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t max-h-[85vh] shadow-2xl pb-20 lg:pb-6 transition-transform duration-300 ease-in-out ${className}`}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-2">
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="lg:hidden bg-transparent border-none text-text-muted hover:text-text-primary text-2xl cursor-pointer p-1 rounded-md transition-colors duration-150 leading-none"
              aria-label="Close previews drawer"
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
          <button className="w-full py-2 bg-bg-elevated border border-border-custom text-text-primary font-bold rounded-full opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
            Generate All {data.length} Previews
          </button>
        </>
      ) : isPreviewGridLoading ? (
        <button className="w-full py-2 bg-bg-elevated border border-border-custom text-text-primary font-bold rounded-full opacity-40 cursor-not-allowed text-xs uppercase tracking-wider text-center mb-4 flex items-center justify-center" disabled>
          Generating Previews...
        </button>
      ) : previewImages.length === 0 ? (
        <>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Ready to see what everyone's certificate will look like?
          </p>
          <button
            className="w-full py-2.5 bg-accent text-black font-bold rounded-full shadow-sm hover:bg-accent-hover uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed select-none transition-all duration-150 cursor-pointer text-center mb-4 flex items-center justify-center"
            onClick={handleGeneratePreviews}
            disabled={!layoutReady || !data.length || !templateImageRef.current}
          >
            Generate All {data.length} Previews
          </button>
        </>
      ) : (
        <button
          className="w-full py-2.5 bg-bg-elevated border border-border-custom text-text-secondary font-semibold rounded-full hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer text-center mb-4 flex items-center justify-center text-xs"
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

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 flex-1 content-start">
        {previewImages.map((img, i) => {
          const isActive = previewName && previewName.toLowerCase() === img.name.toLowerCase();
          return (
            <div
              key={i}
              className={`group flex flex-col gap-1.5 p-2 bg-bg-elevated border rounded-xl cursor-pointer hover:border-accent hover:bg-bg-hover transition-all duration-150 ${
                isActive ? "border-accent bg-bg-hover" : "border-border-light"
              }`}
              onClick={() => handlePreviewSelect(img.name)}
            >
              <img
                src={img.imageSrc}
                alt={img.name}
                width={PREVIEW_THUMBNAIL_WIDTH}
                loading="lazy"
                className={`w-full h-auto rounded-lg border group-hover:border-accent/40 ${
                  isActive ? "border-accent/40" : "border-border-light"
                }`}
              />
              <p className={`text-xs font-semibold truncate m-0 group-hover:text-accent ${
                isActive ? "text-accent" : "text-text-primary"
              }`}>{img.name}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default PreviewGrid;
