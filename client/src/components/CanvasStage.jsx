import React, { memo } from "react";
import { Rnd } from "react-rnd";
import { useAppStore } from "../shared/store/useAppStore";

const MIN_LAYOUT_WIDTH = 100;
const MIN_LAYOUT_HEIGHT = 30;

const CanvasStage = memo(({
  handleDragStop,
  handleDrag,
  handleResizeStart,
  handleResize,
  getJustifyContent,
  getAlignItems,
  previewCanvasRef,
  handleResetZoom,
}) => {
  const {
    templateURL,
    previewScale,
    setPreviewScale,
    previewName,
    showGrid,
    setShowGrid,
    template,
    templateBackURL,
    previewSide,
    setPreviewSide,
    templateSize,
    layout,
    isSnapXActive,
    isSnapYActive,
    isLayoutLocked,
  } = useAppStore();

  const containerRef = React.useRef(null);
  const touchStart = React.useRef({ x: 0, y: 0 });
  const scrollStart = React.useRef({ x: 0, y: 0 });
  const touchStartDistance = React.useRef(0);
  const startScale = React.useRef(0.35);
  const isPanning = React.useRef(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isPanning.current = true;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (containerRef.current) {
        scrollStart.current = {
          x: containerRef.current.scrollLeft,
          y: containerRef.current.scrollTop
        };
      }
    } else if (e.touches.length === 2) {
      isPanning.current = false;
      const xDiff = e.touches[0].clientX - e.touches[1].clientX;
      const yDiff = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance.current = Math.hypot(xDiff, yDiff);
      startScale.current = previewScale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isPanning.current && containerRef.current) {
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      containerRef.current.scrollLeft = scrollStart.current.x - dx;
      containerRef.current.scrollTop = scrollStart.current.y - dy;
    } else if (e.touches.length === 2 && touchStartDistance.current > 0) {
      const xDiff = e.touches[0].clientX - e.touches[1].clientX;
      const yDiff = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(xDiff, yDiff);
      const factor = dist / touchStartDistance.current;
      const newScale = Math.min(1.5, Math.max(0.1, startScale.current * factor));
      setPreviewScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    isPanning.current = false;
    touchStartDistance.current = 0;
  };

  if (!templateURL) {
    return (
      <div className="flex-1 flex flex-col items-center bg-bg-primary p-7 h-[calc(100vh-56px)] overflow-auto relative">
        <h3 className="text-text-muted text-sm font-semibold mt-10">
          Upload a template to begin designing
        </h3>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center bg-bg-primary p-7 h-[calc(100vh-56px)] overflow-auto relative">
      <div className="w-full max-w-[600px] bg-bg-surface border border-border-custom rounded-lg p-4 mb-4 flex flex-col gap-2 shadow-card">
        <div className="flex items-center justify-between text-xs font-bold text-text-primary">
          <label htmlFor="zoomSlider">
            Zoom: {Math.round(previewScale * 100)}%
          </label>
          <button
            className="bg-transparent border-none text-accent hover:text-accent-hover text-xs font-semibold cursor-pointer transition-colors duration-150"
            onClick={handleResetZoom}
          >
            Reset to Auto-Fit
          </button>
        </div>
        <input
          id="zoomSlider"
          className="w-full accent-accent cursor-pointer h-1.5 bg-bg-elevated rounded-lg appearance-none"
          type="range"
          min="0.1"
          max="1.5"
          step="0.01"
          value={previewScale}
          onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
        />
      </div>

      <div className="w-full max-w-[600px] flex items-center justify-between mb-4 gap-4">
        <div className="px-3.5 py-1.5 bg-bg-surface border border-border-custom rounded-full text-xs text-text-secondary shadow-card font-medium">
          Previewing: <strong>{previewName || "Your Name Here"}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 ${
              showGrid 
                ? "bg-accent text-black shadow-card" 
                : "bg-bg-surface border border-border-custom text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            }`}
            onClick={() => setShowGrid(!showGrid)}
            disabled={!template}
            title={showGrid ? "Hide Grid" : "Show Grid"}
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>

          {templateBackURL && (
            <div className="flex items-center bg-bg-elevated rounded-full p-0.5 border border-border-custom">
              <button
                className={`px-3.5 py-1 text-[11px] font-semibold rounded-full cursor-pointer transition-all duration-150 ${
                  previewSide === "front" ? "bg-bg-surface text-text-primary shadow-card border border-border-custom" : "text-text-muted hover:text-text-primary"
                }`}
                onClick={() => setPreviewSide("front")}
              >
                Front Side
              </button>
              <button
                className={`px-3.5 py-1 text-[11px] font-semibold rounded-full cursor-pointer transition-all duration-150 ${
                  previewSide === "back" ? "bg-bg-surface text-text-primary shadow-card border border-border-custom" : "text-text-muted hover:text-text-primary"
                }`}
                onClick={() => setPreviewSide("back")}
              >
                Back Side
              </button>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center overflow-auto max-h-[80vh] py-6 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <div
          className={`preview-card-3d ${
            previewSide === "back" ? "is-flipped" : ""
          }`}
        >
          {/* Front Face */}
          <div
            className={`preview-face-3d front ${
              previewSide !== "back" ? "active" : ""
            }`}
          >
            <div
              className="relative border border-border-custom shadow-lg bg-bg-surface overflow-hidden rounded-lg flex-shrink-0"
              style={{
                width: `${templateSize.width}px`,
                height: `${templateSize.height}px`,
                backgroundImage: `url(${templateURL})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            >
              {layout ? (
                <>
                  {showGrid && (
                    <div
                      className="designer-grid"
                      style={{ "--grid-size": `${20 * previewScale}px` }}
                    />
                  )}
                  {showGrid && (
                    <>
                      <div
                        className={`absolute top-0 bottom-0 left-1/2 w-[1px] h-full bg-red-500/60 pointer-events-none z-[110] transition-all duration-150 -translate-x-1/2 ${
                          isSnapXActive ? "opacity-100 !w-[2px]" : "opacity-0"
                        }`}
                      />
                      <div
                        className={`absolute left-0 right-0 top-1/2 w-full h-[1px] bg-red-500/60 pointer-events-none z-[110] transition-all duration-150 -translate-y-1/2 ${
                          isSnapYActive ? "opacity-100 !h-[2px]" : "opacity-0"
                        }`}
                      />
                    </>
                  )}
                  <Rnd
                    bounds="parent"
                    dragHandleClassName="draggable-text-box"
                    onDragStop={handleDragStop}
                    position={{
                      x: layout.x * previewScale,
                      y: layout.y * previewScale,
                    }}
                    size={{
                      width: Math.max(1, layout.width * previewScale),
                      height: Math.max(1, layout.height * previewScale),
                    }}
                    onDrag={handleDrag}
                    onResizeStart={handleResizeStart}
                    onResize={handleResize}
                    disableDragging={isLayoutLocked}
                    enableResizing={
                      isLayoutLocked
                        ? false
                        : {
                            top: true,
                            right: true,
                            bottom: true,
                            left: true,
                            topRight: true,
                            bottomRight: true,
                            bottomLeft: true,
                            topLeft: true,
                          }
                    }
                    minWidth={Math.max(1, MIN_LAYOUT_WIDTH * previewScale)}
                    minHeight={Math.max(1, MIN_LAYOUT_HEIGHT * previewScale)}
                    maxWidth={templateSize.width}
                    maxHeight={templateSize.height}
                  >
                    <div
                      className={`draggable-text-box ${
                        isLayoutLocked ? "locked" : ""
                      }`}
                      style={{
                        width: "100%",
                        height: "100%",
                        justifyContent: getJustifyContent(),
                        alignItems: getAlignItems(),
                      }}
                    >
                      <canvas
                        ref={previewCanvasRef}
                        className="block pointer-events-none !bg-transparent"
                        aria-label="Certificate name preview"
                      />
                    </div>
                  </Rnd>
                </>
              ) : (
                <h3 className="text-text-muted text-sm font-semibold text-center mt-20">Preparing layout box...</h3>
              )}
            </div>
          </div>

          {/* Back Face */}
          <div
            className={`preview-face-3d back ${
              previewSide === "back" ? "active" : ""
            }`}
          >
            {templateBackURL && (
              <div
                className="relative border border-border-custom shadow-lg bg-bg-surface overflow-hidden rounded-lg flex-shrink-0"
                style={{
                  width: `${templateSize.width}px`,
                  height: `${templateSize.height}px`,
                  backgroundImage: `url(${templateBackURL})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CanvasStage;
