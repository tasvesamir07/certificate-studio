import React, { useId } from "react";

const Select = React.forwardRef(({
  label,
  id,
  options = [], // array of { value, label } or simple strings
  children,
  className = "",
  style = {},
  ...props
}, ref) => {
  const reactId = useId();
  const generatedId = id || reactId;

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
      <select
        ref={ref}
        id={generatedId}
        className={`w-full px-3.5 py-2.5 border border-border-light rounded-md bg-bg-elevated text-text-primary text-sm font-sans outline-none transition-all duration-200 shadow-inner focus:border-accent focus:bg-bg-surface focus:ring-2 focus:ring-accent-bg-glow appearance-none bg-no-repeat bg-[right_16px_center] bg-[length:16px] pr-10 cursor-pointer bg-[image:var(--select-arrow)] ${className}`}
        {...props}
      >
        {children || options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val} className="bg-bg-surface text-text-primary">
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
