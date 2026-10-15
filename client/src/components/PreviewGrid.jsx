import React, { useState, useMemo } from "react";
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

  const [searchFilter, setSearchFilter] = useState("");

  const layoutReady = !!layout && isLayoutLocked;
  const isTemplateReady = !!template;
  const isDataReady = data && data.length > 0;
  const canGenerate = layoutReady && isDataReady && !!templateImageRef?.current;

  const filteredPreviews = useMemo(() => {
    if (!searchFilter.trim()) return previewImages;
    return previewImages.filter((img) =>
      img.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
    );
  }, [previewImages, searchFilter]);

  // How many steps are complete
  const stepsComplete = [isTemplateReady, isDataReady, layoutReady].filter(Boolean).length;

  return (
    <aside
      className={`bg-bg-surface flex flex-col border-border-custom overflow-y-auto lg:static lg:w-[300px] xl:w-[320px] lg:shrink-0 lg:h-[calc(100vh-56px)] lg:sticky lg:top-[56px] lg:border-l lg:border-t-0 p-5 lg:p-6 fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t max-h-[85vh] shadow-2xl pb-20 lg:pb-6 transition-transform duration-300 ease-in-out ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light shrink-0">
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
          <h2 className="text-sm font-bold text-text-primary m-0">
            Previews ({previewImages.length > 0 ? previewImages.length : data.length})
          </h2>
        </div>
        {previewImages.length > 0 && !isPreviewGridLoading && (
          <button
            className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded-lg hover:bg-accent-hover transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            onClick={handleDownloadAllZIP}
            title="Download all previews as PDFs in a ZIP file"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ZIP
          </button>
        )}
      </div>

      {/* Workflow setup steps – shown only when no previews exist yet */}
      {previewImages.length === 0 && !isPreviewGridLoading && (
        <div className="mb-4 shrink-0">
          {/* Step list */}
          <div className="flex flex-col gap-2 mb-3">
            {[
              { label: "Upload template image", done: isTemplateReady, hint: "Step 1" },
              { label: "Upload recipient data", done: isDataReady, hint: isDataReady ? `${data.length} loaded` : "Step 2" },
              { label: "Lock text position", done: layoutReady, hint: "Step 3" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${
                    step.done
                      ? "bg-accent border-accent text-black"
                      : "bg-bg-elevated border-border-custom text-text-muted"
                  }`}
                >
                  {step.done ? (
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${step.done ? "text-text-primary" : "text-text-muted"}`}>
                    {step.label}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold shrink-0 ${step.done ? "text-accent" : "text-text-muted"}`}>
                  {step.hint}
                </span>
              </div>
            ))}
          </div>

          {/* Hint text */}
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            {!isTemplateReady
              ? "Upload a certificate template image to get started."
              : !isDataReady
              ? "Upload an Excel or CSV file with recipient names."
              : !isLayoutLocked
              ? "Confirm your text position by locking the layout in Step 3."
              : `Ready! Click below to generate ${data.length} certificate preview${data.length !== 1 ? "s" : ""}.`}
          </p>

          {/* CTA button */}
          {canGenerate ? (
            <button
              type="button"
              className="w-full py-2.5 bg-accent text-black font-bold rounded-full shadow-sm hover:bg-accent-hover uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 mb-4"
              onClick={handleGeneratePreviews}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Generate {data.length} Preview{data.length !== 1 ? "s" : ""}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-2.5 bg-bg-elevated border border-border-light text-text-muted font-bold rounded-full opacity-50 cursor-not-allowed text-xs uppercase tracking-wider flex items-center justify-center mb-4"
            >
              Generate Previews
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {isPreviewGridLoading && (
        <div className="flex flex-col items-center justify-center py-8 text-center mb-4">
          <div className="spinner-mini mb-3" style={{ width: 24, height: 24, borderWidth: 3 }} />
          <p className="text-xs text-text-muted m-0">
            Generating previews for {data.length} recipients…
          </p>
        </div>
      )}

      {/* Controls when previews are shown */}
      {previewImages.length > 0 && !isPreviewGridLoading && (
        <div className="flex flex-col gap-2 mb-3 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted m-0">
              {previewImages.length} previews — click to load on canvas.
            </p>
            <button
              type="button"
              className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer bg-transparent border-none"
              onClick={() => setPreviewImages([])}
            >
              Clear
            </button>
          </div>

          {previewImages.length > 3 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search recipient…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-bg-elevated border border-border-custom rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              />
              <svg className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchFilter && (
                <button type="button" onClick={() => setSearchFilter("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-sm cursor-pointer bg-transparent border-none leading-none">&times;</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview thumbnails */}
      <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 flex-1 content-start">
        {previewImages.length > 0 ? (
          filteredPreviews.length > 0 ? (
            filteredPreviews.map((img, i) => {
              const isActive = previewName && previewName.toLowerCase() === img.name.toLowerCase();
              return (
                <div
                  key={`${img.name}-${i}`}
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
                  }`}>
                    {img.name}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-text-muted text-center py-4">
              No results for "{searchFilter}"
            </p>
          )
        ) : null}
      </div>
    </aside>
  );
};

export default PreviewGrid;
