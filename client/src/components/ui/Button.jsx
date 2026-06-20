import React from "react";

const Button = React.forwardRef(({ 
  children, 
  className = "", 
  variant = "primary", // 'primary' | 'secondary' | 'canva' | 'logout' | 'danger' | 'ghost' | 'link'
  type = "button",
  loading = false,
  disabled = false,
  ...props 
}, ref) => {
  const baseClass = "inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-md outline-none gap-2";
  
  let variantClass = "px-5 py-2.5 bg-gradient-to-br from-accent to-accent-hover text-white hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 shadow-xs uppercase tracking-wider text-[11px] font-bold";
  
  if (variant === "secondary") {
    variantClass = "px-5 py-2.5 bg-bg-elevated border border-border-custom text-text-primary hover:bg-bg-surface hover:border-accent shadow-xs uppercase tracking-wider text-[11px] font-bold";
  } else if (variant === "canva") {
    variantClass = "px-5 py-2.5 bg-[#00c4cc] text-white hover:bg-[#00a3a8] font-bold shadow-xs uppercase tracking-wider text-[11px] rounded-md";
  } else if (variant === "logout") {
    variantClass = "px-2 py-1 text-text-muted hover:text-danger underline bg-transparent text-sm font-semibold border-none cursor-pointer";
  } else if (variant === "login") {
    variantClass = "w-full py-3 bg-gradient-to-br from-accent to-accent-hover text-white font-bold rounded-lg shadow-sm hover:shadow-md uppercase tracking-wider text-xs hover:-translate-y-0.5 active:translate-y-0";
  } else if (variant === "danger") {
    variantClass = "px-5 py-2.5 bg-danger text-white hover:bg-danger/90 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 shadow-xs uppercase tracking-wider text-[11px] font-bold";
  } else if (variant === "ghost") {
    variantClass = "px-3 py-2 border border-border-custom bg-bg-elevated text-text-primary hover:bg-accent-bg-glow hover:border-accent text-xs font-semibold";
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
          <span className="spinner-mini w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
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
