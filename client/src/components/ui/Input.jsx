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
    <div className="input-wrapper" style={style}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="input-label"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={generatedId}
        type={type}
        className={`custom-input ${error ? "error" : ""} ${className}`}
        {...props}
      />
      {error && (
        <span className="input-error-text">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
