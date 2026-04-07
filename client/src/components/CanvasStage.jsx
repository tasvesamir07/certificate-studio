import React from "react";
import { Rnd } from "react-rnd";

const CanvasStage = ({
  templateURL,
  previewScale,
  setPreviewScale,
  DEFAULT_ZOOM_SCALE,
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
  handleDragStop,
  handleDrag,
  handleResizeStart,
  handleResize,
  isLayoutLocked,
  MIN_LAYOUT_WIDTH,
  MIN_LAYOUT_HEIGHT,
  getJustifyContent,
  getAlignItems,
  previewCanvasRef,
  handleResetZoom,
}) => {
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

      <div className="preview-container-3d">
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
};

export default CanvasStage;
