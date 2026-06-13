import React from "react";

const Input = React.forwardRef(({
  label,
  id,
  type = "text",
  error,
  className = "",
  style = {},
  ...props
}, ref) => {
  const generatedId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <div className="input-wrapper" style={{ display: "grid", gap: "6px", width: "100%" }}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="input-label"
          style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            color: "#b3b3b3", 
            textTransform: "uppercase", 
            letterSpacing: "1.4px",
            marginBottom: "2px"
          }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={generatedId}
        type={type}
        className={`custom-input ${className}`}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: "999px",
          border: "none",
          background: "#1f1f1f",
          color: "#fff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          transition: "all 0.2s",
          boxShadow: error 
            ? "0 0 0 1px #f3727f" 
            : "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
          ...style
        }}
        {...props}
      />
      {error && (
        <span className="input-error-text" style={{ color: "#f3727f", fontSize: "12px", marginTop: "2px" }}>
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
