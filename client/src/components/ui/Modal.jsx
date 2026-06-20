import React, { useEffect } from "react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  style = {},
  showClose = true,
  ...props
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay-scrim)' }}
      onClick={onClose}
    >
      <div
        className={`bg-canvas text-ink rounded-[var(--radius-lg)] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-hairline shadow-[var(--shadow-card)] ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={style}
        {...props}
      >
        {(title || showClose) && (
          <div className="p-5 border-b border-hairline-soft flex justify-between items-center">
            {title && (
              <h3 className="m-0 text-lg font-[540] tracking-[-0.01em] text-ink">
                {title}
              </h3>
            )}
            {showClose && (
              <button
                type="button"
                className="bg-transparent border-none text-ink opacity-40 hover:opacity-100 cursor-pointer p-1.5 flex items-center justify-center rounded-full hover:bg-surface-soft transition-all duration-100"
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
