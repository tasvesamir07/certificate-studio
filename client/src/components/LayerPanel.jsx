import React from "react";

const LayerPanel = ({
  template,
  getTemplateProps,
  getTemplateInputProps,
  clearTemplate,
  templateBack,
  getTemplateBackProps,
  getTemplateBackInputProps,
  clearTemplateBack,
  dataFile,
  getDataProps,
  getDataInputProps,
  clearDataFile,
  isCanvaConnected,
  setIsCanvaModalOpen,
  handleConnectCanva,
  handleDisconnectCanva,
}) => {
  return (
    <>
      <h2>Design Studio</h2>
      <p className="panel-intro">
        Upload your artwork, decide whether to personalize it, then send or
        download everything in one place.
      </p>

      <div className="control-group">
        <label>1. Upload Template Image</label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div {...getTemplateProps({ className: "dropzone" })}>
            <input {...getTemplateInputProps()} />
            <p>
              <b>Front Side:</b> Drag 'n' drop, or click
            </p>
            {template && (
              <div className="file-chip">
                <span className="file-name">{template.name}</span>
                <button
                  type="button"
                  className="file-remove-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    clearTemplate();
                  }}
                  aria-label="Remove template"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          <div className="or-divider">
            <span>OR</span>
          </div>

          {!isCanvaConnected ? (
            <button
              type="button"
              className="canva-button"
              onClick={handleConnectCanva}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                <path d="M12.9 2.1c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8M21.9 11.1c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8M2.1 11.1c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8m9 9c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8m4.9-3.2c-.1.1-.1.2-.1.2s0 .2.1.2l3.4 3.4c.1.1.2.1.2.1s.2 0 .2-.1l1.3-1.3c.1-.1.1-.2.1-.2s0-.2-.1-.2l-3.4-3.4c-.1-.1-.2-.1-.2-.1s-.2 0-.2.1l-1.3 1.3m-10.8 0c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1s.2 0 .2.1l1.3 1.3M17.1 2.1c.1 0 .2.1.2.2l1.3 1.3c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1M5.6 2.1c-.1 0-.2.1-.2.2l-3.4 3.4c-.1.1-.1.2-.1.2s0 .2.1.2l1.3 1.3c.1.1.2.1.2.1s.2 0 .2-.1l3.4-3.4c.1-.1.1-.2.1-.2s0-.2-.1-.2l-1.3-1.3c0-.1-.1-.1-.2-.1" />
              </svg>
              Connect Canva
            </button>
          ) : (
            <div className="canva-connected-group">
              <button
                type="button"
                className="canva-button"
                onClick={() => setIsCanvaModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path d="M12.9 2.1c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8M21.9 11.1c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8M2.1 11.1c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8m9 9c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8m4.9-3.2c-.1.1-.1.2-.1.2s0 .2.1.2l3.4 3.4c.1.1.2.1.2.1s.2 0 .2-.1l1.3-1.3c.1-.1.1-.2.1-.2s0-.2-.1-.2l-3.4-3.4c-.1-.1-.2-.1-.2-.1s-.2 0-.2.1l-1.3 1.3m-10.8 0c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1s.2 0 .2.1l1.3 1.3M17.1 2.1c.1 0 .2.1.2.2l1.3 1.3c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1M5.6 2.1c-.1 0-.2.1-.2.2l-3.4 3.4c-.1.1-.1.2-.1.2s0 .2.1.2l1.3 1.3c.1.1.2.1.2.1s.2 0 .2-.1l3.4-3.4c.1-.1.1-.2.1-.2s0-.2-.1-.2l-1.3-1.3c0-.1-.1-.1-.2-.1" />
                </svg>
                Browse Canva Designs
              </button>
              <button 
                type="button" 
                className="canva-disconnect-link"
                onClick={handleDisconnectCanva}
                title="Securely unlink your Canva account"
              >
                Disconnect Canva Account
              </button>
            </div>
          )}

          <div
            {...getTemplateBackProps({
              className: "dropzone",
              style: {
                borderStyle: "dashed",
                opacity: 0.8,
                minHeight: "80px",
              },
            })}
          >
            <input {...getTemplateBackInputProps()} />
            <p>
              <b>Back Side (Optional):</b> Drag 'n' drop, or click
            </p>
            {templateBack && (
              <div className="file-chip">
                <span className="file-name">{templateBack.name}</span>
                <button
                  type="button"
                  className="file-remove-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    clearTemplateBack();
                  }}
                  aria-label="Remove back template"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="control-group">
        <label>2. Upload Data File (.xlsx)</label>
        <div {...getDataProps({ className: "dropzone" })}>
          <input {...getDataInputProps()} />
          <p>Drag 'n' drop, or click</p>
          {dataFile && (
            <div className="file-chip">
              <span className="file-name">{dataFile.name}</span>
              <button
                type="button"
                className="file-remove-button"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  clearDataFile();
                }}
                aria-label="Remove data file"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LayerPanel;
