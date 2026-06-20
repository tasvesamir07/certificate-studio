import React from "react";

const Button = React.forwardRef(({
  children,
  className = "",
  variant = "primary",
  type = "button",
  loading = false,
  disabled = false,
  ...props
}, ref) => {
  const baseClass = "inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg outline-none gap-2 font-sans";

  let variantClass = "px-5 py-2.5 btn-gradient uppercase tracking-wider text-[11px] font-bold";

  if (variant === "secondary") {
    variantClass = "px-5 py-2.5 btn-outline uppercase tracking-wider text-[11px] font-bold";
  } else if (variant === "canva") {
    variantClass = "px-5 py-2.5 bg-[var(--canva)] text-white font-bold shadow-sm hover:shadow-md uppercase tracking-wider text-[11px] rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0";
  } else if (variant === "logout") {
    variantClass = "px-2 py-1 text-text-muted hover:text-danger underline bg-transparent text-sm font-semibold border-none cursor-pointer transition-colors duration-200";
  } else if (variant === "login") {
    variantClass = "w-full py-3 btn-gradient uppercase tracking-wider text-xs font-bold rounded-xl";
  } else if (variant === "danger") {
    variantClass = "px-5 py-2.5 btn-gradient-danger uppercase tracking-wider text-[11px] font-bold";
  } else if (variant === "ghost") {
    variantClass = "px-3 py-2 btn-ghost text-xs font-semibold rounded-lg";
  } else if (variant === "link") {
    variantClass = "text-danger hover:text-danger/80 underline text-xs cursor-pointer bg-transparent border-none p-0";
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClass} ${variantClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
