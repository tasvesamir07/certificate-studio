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

  // Filter previews by name if search is active
  const filteredPreviews = useMemo(() => {
    if (!searchFilter.trim()) return previewImages;
    return previewImages.filter((img) =>
      img.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
    );
  }, [previewImages, searchFilter]);

  return (
    <aside
      className={`bg-bg-surface flex flex-col border-border-custom overflow-y-auto lg:static lg:w-[320px] xl:w-[340px] lg:shrink-0 lg:h-[calc(100vh-56px)] lg:sticky lg:top-[56px] lg:border-l lg:border-t-0 p-4 lg:p-5 fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t max-h-[88vh] shadow-2xl pb-20 lg:pb-6 transition-transform duration-300 ease-in-out ${className}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-custom/80 shrink-0">
        <div className="flex items-center gap-2.5">
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-bg-elevated text-text-muted hover:text-text-primary text-xl cursor-pointer transition-colors duration-150"
              aria-label="Close previews drawer"
            >
              &times;
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
                Previews
              </h2>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              previewImages.length > 0
                ? "bg-accent/15 text-accent border-accent/30"
                : isDataReady
                ? "bg-bg-elevated text-text-secondary border-border-custom"
                : "bg-bg-elevated/50 text-text-muted border-border-custom/50"
            }`}
          >
            {previewImages.length > 0
              ? `${previewImages.length} Ready`
              : isDataReady
              ? `${data.length} Recipients`
              : "0 Loaded"}
          </span>
        </div>

        {previewImages.length > 0 && !isPreviewGridLoading && (
          <button
            className="px-2.5 py-1.5 bg-accent text-black font-bold text-[11px] rounded-lg shadow-xs hover:bg-accent-hover active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            onClick={handleDownloadAllZIP}
            title="Download all previews as PDFs in a ZIP file"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>ZIP</span>
          </button>
        )}
      </div>

      {/* Progress & Setup Status Card */}
      {previewImages.length === 0 && !isPreviewGridLoading && (
        <div className="bg-gradient-to-b from-bg-elevated/80 via-bg-elevated/40 to-bg-surface border border-border-custom rounded-2xl p-4 mb-4 shadow-xs shrink-0">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-custom/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              Workflow Progress
            </span>
            <span className="text-[10px] font-semibold text-text-muted">
              {[isTemplateReady, isDataReady, layoutReady].filter(Boolean).length}/3 Steps
            </span>
          </div>

          {/* 3 Step Interactive Checklist */}
          <div className="flex flex-col gap-2.5 mb-4">
            {/* Step 1: Template */}
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isTemplateReady
                    ? "bg-accent text-black"
                    : "bg-bg-elevated border border-border-custom text-text-muted"
                }`}
              >
                {isTemplateReady ? (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-bold">1</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`m-0 font-semibold truncate ${isTemplateReady ? "text-text-primary" : "text-text-muted"}`}>
                  1. Template Image
                </p>
                <p className="m-0 text-[10px] text-text-muted truncate">
                  {isTemplateReady ? "Uploaded & ready" : "Upload image in Step 1"}
                </p>
              </div>
            </div>

            {/* Step 2: Recipient Data */}
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isDataReady
                    ? "bg-accent text-black"
                    : "bg-bg-elevated border border-border-custom text-text-muted"
                }`}
              >
                {isDataReady ? (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-bold">2</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`m-0 font-semibold truncate ${isDataReady ? "text-text-primary" : "text-text-muted"}`}>
                  2. Recipient Data
                </p>
                <p className="m-0 text-[10px] text-text-muted truncate">
                  {isDataReady ? `${data.length} recipients loaded` : "Upload Excel/CSV in Step 2"}
                </p>
              </div>
            </div>

            {/* Step 3: Layout Lock */}
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  layoutReady
                    ? "bg-accent text-black"
                    : "bg-bg-elevated border border-border-custom text-text-muted"
                }`}
              >
                {layoutReady ? (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-bold">3</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`m-0 font-semibold truncate ${layoutReady ? "text-text-primary" : "text-text-muted"}`}>
                  3. Lock Position
                </p>
                <p className="m-0 text-[10px] text-text-muted truncate">
                  {layoutReady ? "Layout confirmed" : "Lock position in Step 3"}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Guidance Notice */}
          <div className="bg-bg-surface/80 border border-border-custom rounded-xl p-2.5 mb-3 text-[11px] leading-relaxed text-text-secondary">
            {!isTemplateReady ? (
              <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                <span>⚠️</span> Upload a certificate template image to start.
              </span>
            ) : !isDataReady ? (
              <span className="flex items-center gap-1.5 text-text-muted">
                <span>📄</span> Upload an Excel/CSV file with recipient names to preview certificates.
              </span>
            ) : !isLayoutLocked ? (
              <span className="flex items-center gap-1.5 text-text-muted">
                <span>🔒</span> Click "Lock Layout" in Step 3 to enable preview generation.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-accent font-semibold">
                <span>✨</span> Ready to generate previews for all {data.length} recipients!
              </span>
            )}
          </div>

          {/* Action CTA Button */}
          {canGenerate ? (
            <button
              type="button"
              className="w-full py-3 bg-accent text-black font-extrabold rounded-xl shadow-lg shadow-accent/20 hover:bg-accent-hover hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider select-none"
              onClick={handleGeneratePreviews}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Generate All {data.length} Previews</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-2.5 bg-bg-elevated border border-border-custom text-text-muted font-bold rounded-xl opacity-60 cursor-not-allowed text-xs uppercase tracking-wider flex items-center justify-center gap-2 select-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                {!isTemplateReady
                  ? "Upload Template First"
                  : !isDataReady
                  ? "Upload Excel File"
                  : "Lock Layout in Step 3"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Loading State Animation */}
      {isPreviewGridLoading && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-bg-elevated/40 border border-border-custom rounded-2xl mb-4">
          <div className="w-10 h-10 rounded-full border-3 border-border-custom border-t-accent animate-spin mb-3" />
          <h3 className="text-sm font-bold text-text-primary m-0 mb-1">
            Rendering Previews...
          </h3>
          <p className="text-xs text-text-muted m-0">
            Generating high-res certificates for {data.length} recipients.
          </p>
        </div>
      )}

      {/* When Previews are Ready: Top Controls & Search */}
      {previewImages.length > 0 && !isPreviewGridLoading && (
        <div className="flex flex-col gap-2.5 mb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-bg-elevated hover:bg-bg-hover border border-border-custom text-text-secondary hover:text-text-primary font-semibold rounded-lg text-xs transition-all duration-150 cursor-pointer flex items-center gap-1.5"
              onClick={() => setPreviewImages([])}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              </svg>
              <span>Clear</span>
            </button>
            <p className="text-[11px] text-text-muted m-0 truncate">
              Click any certificate to load on canvas
            </p>
          </div>

          {previewImages.length > 3 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search recipient..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-elevated border border-border-custom rounded-xl text-text-primary placeholder:text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              />
              <svg className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Previews List (or Blueprint Mockups when empty) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
        {previewImages.length > 0 ? (
          filteredPreviews.length > 0 ? (
            filteredPreviews.map((img, i) => {
              const isActive =
                previewName && previewName.toLowerCase() === img.name.toLowerCase();
              return (
                <div
                  key={`${img.name}-${i}`}
                  className={`group relative flex flex-col gap-2 p-2.5 bg-bg-surface hover:bg-bg-elevated/70 border rounded-2xl cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md ${
                    isActive
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                      : "border-border-custom hover:border-text-muted/40"
                  }`}
                  onClick={() => handlePreviewSelect(img.name)}
                >
                  <div className="relative overflow-hidden rounded-xl bg-bg-elevated border border-border-custom/60 aspect-[1.414/1] flex items-center justify-center">
                    <img
                      src={img.imageSrc}
                      alt={img.name}
                      width={PREVIEW_THUMBNAIL_WIDTH}
                      loading="lazy"
                      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-102"
                    />
                    {isActive && (
                      <div className="absolute top-2 right-2 bg-accent text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                        Canvas Active
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-bg-elevated border border-border-custom text-[10px] font-bold flex items-center justify-center text-text-secondary shrink-0">
                        {i + 1}
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-accent" : "text-text-primary group-hover:text-accent"
                        }`}
                      >
                        {img.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      Load &rarr;
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-text-muted text-xs bg-bg-elevated/30 rounded-2xl border border-dashed border-border-custom">
              No previews match "{searchFilter}"
            </div>
          )
        ) : (
          /* Sleek Visual Placeholders when no previews generated yet */
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <span>Preview Mockup</span>
              <span>Visual Guide</span>
            </div>

            {/* Mockup Card 1 */}
            <div className="p-3 rounded-2xl border border-dashed border-border-custom/80 bg-bg-elevated/30 flex flex-col gap-2 relative overflow-hidden group">
              <div className="w-full aspect-[1.414/1] rounded-xl border border-border-custom/60 bg-gradient-to-br from-bg-elevated/60 via-bg-surface to-bg-elevated/40 flex flex-col items-center justify-center p-4 relative">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                </div>
                <div className="h-2 w-24 bg-text-muted/20 rounded-full mb-1.5" />
                <div className="h-2.5 w-32 bg-accent/30 rounded-full mb-2" />
                <div className="h-1.5 w-20 bg-text-muted/15 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent/50" />
                  <span className="text-[11px] font-medium text-text-muted">
                    {data && data[0] ? (data[0].Name || data[0].name || "Recipient #1") : "Recipient Name Preview"}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted font-mono">001</span>
              </div>
            </div>

            {/* Mockup Card 2 */}
            <div className="p-3 rounded-2xl border border-dashed border-border-custom/50 bg-bg-elevated/15 flex flex-col gap-2 relative overflow-hidden opacity-60">
              <div className="w-full aspect-[1.414/1] rounded-xl border border-border-custom/40 bg-gradient-to-br from-bg-elevated/40 via-bg-surface to-bg-elevated/20 flex flex-col items-center justify-center p-4">
                <div className="h-2 w-20 bg-text-muted/20 rounded-full mb-1.5" />
                <div className="h-2.5 w-28 bg-text-muted/25 rounded-full mb-2" />
                <div className="h-1.5 w-16 bg-text-muted/15 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-border-custom" />
                  <span className="text-[11px] font-medium text-text-muted">
                    {data && data[1] ? (data[1].Name || data[1].name || "Recipient #2") : "Next Recipient"}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted font-mono">002</span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted text-center leading-relaxed mt-1 px-2">
              Generated certificates for all recipients will appear here with instant click-to-preview and batch ZIP export.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default PreviewGrid;
