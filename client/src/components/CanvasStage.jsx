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
      <div className="editor-panel">
        <h3 className="empty-template-hint">
          Upload a template to begin designing
        </h3>
      </div>
    );
  }

  return (
    <div className="editor-panel">
      <div className="preview-zoom-controls">
        <div className="preview-zoom-header">
          <label htmlFor="zoomSlider">
            Zoom: {Math.round(previewScale * 100)}%
          </label>
          <button
            className="preview-zoom-reset"
            onClick={handleResetZoom}
          >
            Reset to Auto-Fit
          </button>
        </div>
        <input
          id="zoomSlider"
          className="preview-zoom-slider"
          type="range"
          min="0.1"
          max="1.5"
          step="0.01"
          value={previewScale}
          onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
        />
      </div>

      <div className="preview-top-bar">
        <div className="preview-pill">
          Previewing: <strong>{previewName || "Your Name Here"}</strong>
        </div>

        <div className="preview-top-actions">
          <button
            className={`grid-toggle-button canvas-mode ${
              showGrid ? "active" : ""
            }`}
            onClick={() => setShowGrid(!showGrid)}
            disabled={!template}
            title={showGrid ? "Hide Grid" : "Show Grid"}
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>

          {templateBackURL && (
            <div className="preview-side-toggle">
              <button
                className={`side-toggle-button ${
                  previewSide === "front" ? "active" : ""
                }`}
                onClick={() => setPreviewSide("front")}
              >
                Front Side
              </button>
              <button
                className={`side-toggle-button ${
                  previewSide === "back" ? "active" : ""
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
        className="preview-container-3d"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none", overflow: "auto" }}
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
              className="editor-canvas"
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
                        className={`center-snap-line-v ${
                          isSnapXActive ? "active" : ""
                        }`}
                      />
                      <div
                        className={`center-snap-line-h ${
                          isSnapYActive ? "active" : ""
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
                        className="preview-text-canvas"
                        aria-label="Certificate name preview"
                      />
                    </div>
                  </Rnd>
                </>
              ) : (
                <h3 className="layout-placeholder">Preparing layout box...</h3>
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
                className="editor-canvas"
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
