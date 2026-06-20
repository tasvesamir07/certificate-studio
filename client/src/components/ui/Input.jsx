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
    <div className="grid gap-1.5 w-full" style={style}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="font-sans text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={generatedId}
        type={type}
        className={`w-full px-3.5 py-2.5 border rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow ${
          error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border-light"
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-danger text-xs mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
