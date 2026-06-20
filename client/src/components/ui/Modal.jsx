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
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className={`modal-container ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={style}
        {...props}
      >
        {(title || showClose) && (
          <div className="modal-header">
            {title && (
              <h3>
                {title}
              </h3>
            )}
            {showClose && (
              <button
                type="button"
                className="close-button"
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
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
