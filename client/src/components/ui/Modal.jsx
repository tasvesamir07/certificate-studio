import React, { useEffect } from "react";
import Button from "./Button";

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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2000] p-4"
      onClick={onClose}
    >
      <div
        className={`bg-bg-surface border border-border-custom rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-text-primary animate-[modalFadeIn_0.3s_cubic-bezier(0.16,1,0.3,1)] ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={style}
        {...props}
      >
        {(title || showClose) && (
          <div className="p-5 border-b border-border-light flex justify-between items-center">
            {title && (
              <h3 className="m-0 font-sans text-lg font-bold text-text-primary">
                {title}
              </h3>
            )}
            {showClose && (
              <button
                type="button"
                className="bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center transition-colors duration-150 hover:text-danger"
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
