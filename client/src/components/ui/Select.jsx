import React from "react";

const Select = React.forwardRef(({
  label,
  id,
  options = [], // array of { value, label } or simple strings
  children,
  className = "",
  style = {},
  ...props
}, ref) => {
  const generatedId = id || `select-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="select-wrapper" style={{ display: "grid", gap: "6px", width: "100%" }}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="select-label"
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
      <select
        ref={ref}
        id={generatedId}
        className={`custom-select ${className}`}
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
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: "rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
          backgroundSize: "16px",
          paddingRight: "40px",
          ...style
        }}
        {...props}
      >
        {children || options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val} style={{ background: "#181818", color: "#fff" }}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
});

Select.displayName = "Select";

export default Select;
