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
  const baseClass = "inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none outline-none gap-2 font-sans leading-tight";

  let variantClass = "px-5 py-2.5 bg-accent text-black rounded-full text-base font-bold uppercase tracking-[1px] hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-150";

  if (variant === "secondary") {
    variantClass = "px-5 py-2.5 bg-bg-elevated text-text-primary rounded-full text-base font-semibold border border-border-custom hover:bg-bg-hover hover:border-accent active:bg-bg-surface transition-all duration-150";
  } else if (variant === "canva") {
    variantClass = "px-5 py-2.5 bg-[#8b3dff] text-white rounded-full text-base font-bold hover:opacity-90 active:scale-95 transition-all duration-150";
  } else if (variant === "logout") {
    variantClass = "px-2 py-1 text-text-secondary hover:text-accent underline bg-transparent text-sm font-semibold border-none cursor-pointer";
  } else if (variant === "login") {
    variantClass = "w-full py-3 bg-accent text-black rounded-full text-base font-bold uppercase tracking-[1.5px] hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-150";
  } else if (variant === "danger") {
    variantClass = "px-5 py-2.5 bg-danger text-white rounded-full text-base font-bold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150";
  } else if (variant === "ghost") {
    variantClass = "px-3 py-2 text-text-secondary hover:text-text-primary bg-transparent rounded-full text-sm font-semibold hover:bg-bg-hover transition-all duration-150";
  } else if (variant === "link") {
    variantClass = "text-text-primary hover:text-accent underline text-sm cursor-pointer bg-transparent border-none p-0";
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
          <span className="spinner-mini"></span>
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
