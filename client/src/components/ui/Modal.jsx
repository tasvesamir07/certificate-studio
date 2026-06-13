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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
      }}
    >
      <div
        className={`modal-container ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--modal-bg, #181818)",
          border: "1px solid var(--modal-border, rgba(255, 255, 255, 0.1))",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "var(--text-color, #ffffff)",
          animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          ...style,
        }}
        {...props}
      >
        {(title || showClose) && (
          <div
            className="modal-header"
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {title && (
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {title}
              </h3>
            )}
            {showClose && (
              <button
                type="button"
                className="close-button"
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.color = "#ef4444")}
                onMouseOut={(e) => (e.target.style.color = "#94a3b8")}
              >
                &times;
              </button>
            )}
          </div>
        )}
        <div
          className="modal-body"
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
