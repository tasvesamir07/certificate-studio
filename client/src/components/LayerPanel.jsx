import React from "react";
import { useAppStore } from "../shared/store/useAppStore";

const LayerPanel = ({
  getTemplateProps,
  getTemplateInputProps,
  clearTemplate,
  getTemplateBackProps,
  getTemplateBackInputProps,
  clearTemplateBack,
  getDataProps,
  getDataInputProps,
  clearDataFile,
  handleConnectCanva,
  handleDisconnectCanva,
  onOpenTemplateLibrary,
}) => {
  const {
    template,
    templateBack,
    dataFile,
    isCanvaConnected,
    setIsCanvaModalOpen,
  } = useAppStore();

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-bold text-text-primary m-0 flex items-center gap-2">Design Studio</h2>
        <button
          type="button"
          onClick={onOpenTemplateLibrary}
          className="bg-white/5 border border-white/10 rounded-full text-white py-1 px-3 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
        >
          📚 Library
        </button>
      </div>
      <p className="text-xs text-text-muted leading-relaxed mb-3">
        Upload your artwork, decide whether to personalize it, then send or
        download everything in one place.
      </p>

      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">1. Upload Template Image</label>
        <div className="flex flex-col gap-2.5">
          <div {...getTemplateProps({ 
            className: "border-[1.5px] border-dashed border-border-custom rounded-xl py-5 px-4 text-center bg-bg-elevated text-text-muted cursor-pointer transition-all duration-200 text-xs hover:border-accent hover:bg-accent-bg-glow hover:text-accent flex flex-col items-center justify-center" 
          })}>
            <input {...getTemplateInputProps()} />
            <p>
              <b>Front Side:</b> Drag 'n' drop, or click
            </p>
            {template && (
              <div className="flex items-center justify-between p-2 bg-accent/10 border border-accent/20 rounded-lg mt-2 w-full max-w-full overflow-hidden">
                <span className="text-xs font-semibold text-accent truncate max-w-[80%]">{template.name}</span>
                <button
                  type="button"
                  className="border-none bg-transparent text-text-muted cursor-pointer px-1.5 py-0.5 text-sm transition-all duration-150 rounded-md hover:text-danger hover:bg-danger/10"
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

          <div className="flex items-center justify-center text-[10px] font-bold text-text-muted uppercase tracking-wider my-1.5 before:content-[''] before:flex-1 before:border-b before:border-border-light before:mr-2.5 after:content-[''] after:flex-1 after:border-b after:border-border-light after:ml-2.5">
            <span>OR</span>
          </div>

          {!isCanvaConnected ? (
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-xs"
              onClick={handleConnectCanva}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12.9 2.1c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8M21.9 11.1c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8M2.1 11.1c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8m9 9c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8m4.9-3.2c-.1.1-.1.2-.1.2s0 .2.1.2l3.4 3.4c.1.1.2.1.2.1s.2 0 .2-.1l1.3-1.3c.1-.1.1-.2.1-.2s0-.2-.1-.2l-3.4-3.4c-.1-.1-.2-.1-.2-.1s-.2 0-.2.1l-1.3 1.3m-10.8 0c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1s.2 0 .2.1l1.3 1.3M17.1 2.1c.1 0 .2.1.2.2l1.3 1.3c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1M5.6 2.1c-.1 0-.2.1-.2.2l-3.4 3.4c-.1.1-.1.2-.1.2s0 .2.1.2l1.3 1.3c.1.1.2.1.2.1s.2 0 .2-.1l3.4-3.4c.1-.1.1-.2.1-.2s0-.2-.1-.2l-1.3-1.3c0-.1-.1-.1-.2-.1" />
              </svg>
              Connect Canva
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-xs"
                onClick={() => setIsCanvaModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12.9 2.1c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8M21.9 11.1c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8M2.1 11.1c0-.1.1-.2.2-.2h4.8c.1 0 .2.1.2.2v1.8c0 .1-.1.2-.2.2h-4.8c-.1 0-.2-.1-.2-.2v-1.8m9 9c-.1 0-.2-.1-.2-.2v-4.8c0-.1.1-.2.2-.2h1.8c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-1.8m4.9-3.2c-.1.1-.1.2-.1.2s0 .2.1.2l3.4 3.4c.1.1.2.1.2.1s.2 0 .2-.1l1.3-1.3c.1-.1.1-.2.1-.2s0-.2-.1-.2l-3.4-3.4c-.1-.1-.2-.1-.2-.1s-.2 0-.2.1l-1.3 1.3m-10.8 0c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1s.2 0 .2.1l1.3 1.3M17.1 2.1c.1 0 .2.1.2.2l1.3 1.3c.1.1.1.2.1.2s0 .2-.1.2l-3.4 3.4c-.1.1-.2.1-.2.1s-.2 0-.2-.1l-1.3-1.3c-.1-.1-.1-.2-.1-.2s0-.2.1-.2l3.4-3.4c.1-.1.2-.1.2-.1M5.6 2.1c-.1 0-.2.1-.2.2l-3.4 3.4c-.1.1-.1.2-.1.2s0 .2.1.2l1.3 1.3c.1.1.2.1.2.1s.2 0 .2-.1l3.4-3.4c.1-.1.1-.2.1-.2s0-.2-.1-.2l-1.3-1.3c0-.1-.1-.1-.2-.1" />
                </svg>
                Browse Canva Designs
              </button>
              <button 
                type="button" 
                className="bg-transparent border border-border-custom text-xs font-medium text-text-muted cursor-pointer py-1 px-3 rounded-full transition-all duration-150 inline-flex items-center gap-1.5 hover:border-danger hover:text-danger hover:bg-danger/10"
                onClick={handleDisconnectCanva}
                title="Securely unlink your Canva account"
              >
                Disconnect Canva Account
              </button>
            </div>
          )}

          <div
            {...getTemplateBackProps({
              className: "border-[1.5px] border-dashed border-border-custom rounded-xl py-4 px-4 text-center bg-bg-elevated text-text-muted cursor-pointer transition-all duration-200 text-xs hover:border-accent hover:bg-accent-bg-glow hover:text-accent flex flex-col items-center justify-center opacity-80 min-h-[80px]"
            })}
          >
            <input {...getTemplateBackInputProps()} />
            <p>
              <b>Back Side (Optional):</b> Drag 'n' drop, or click
            </p>
            {templateBack && (
              <div className="flex items-center justify-between p-2 bg-accent/10 border border-accent/20 rounded-lg mt-2 w-full max-w-full overflow-hidden">
                <span className="text-xs font-semibold text-accent truncate max-w-[80%]">{templateBack.name}</span>
                <button
                  type="button"
                  className="border-none bg-transparent text-text-muted cursor-pointer px-1.5 py-0.5 text-sm transition-all duration-150 rounded-md hover:text-danger hover:bg-danger/10"
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

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5">2. Upload Data File (.xlsx)</label>
        <div {...getDataProps({ 
          className: "border-[1.5px] border-dashed border-border-custom rounded-xl py-5 px-4 text-center bg-bg-elevated text-text-muted cursor-pointer transition-all duration-200 text-xs hover:border-accent hover:bg-accent-bg-glow hover:text-accent flex flex-col items-center justify-center" 
        })}>
          <input {...getDataInputProps()} />
          <p>Drag 'n' drop, or click</p>
          {dataFile && (
            <div className="flex items-center justify-between p-2 bg-accent/10 border border-accent/20 rounded-lg mt-2 w-full max-w-full overflow-hidden">
              <span className="text-xs font-semibold text-accent truncate max-w-[80%]">{dataFile.name}</span>
              <button
                type="button"
                className="border-none bg-transparent text-text-muted cursor-pointer px-1.5 py-0.5 text-sm transition-all duration-150 rounded-md hover:text-danger hover:bg-danger/10"
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
