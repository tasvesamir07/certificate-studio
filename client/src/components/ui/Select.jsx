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
    <div className="select-wrapper" style={style}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="select-label"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={generatedId}
        className={`custom-select ${className}`}
        {...props}
      >
        {children || options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val}>
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
