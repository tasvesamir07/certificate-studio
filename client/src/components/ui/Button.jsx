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

  let variantClass = "px-5 py-2.5 bg-ink text-canvas rounded-[var(--radius-pill)] text-base font-[480] tracking-[-0.01em] hover:opacity-85 active:opacity-100";

  if (variant === "secondary") {
    variantClass = "px-5 py-2.5 bg-canvas text-ink rounded-[var(--radius-pill)] text-base font-[480] tracking-[-0.01em] border border-hairline hover:border-ink active:bg-surface-soft";
  } else if (variant === "canva") {
    variantClass = "px-5 py-2.5 bg-[#8b3dff] text-white rounded-[var(--radius-pill)] text-base font-[480] tracking-[-0.01em] hover:opacity-85 active:opacity-100";
  } else if (variant === "logout") {
    variantClass = "px-2 py-1 text-ink opacity-50 hover:opacity-100 underline bg-transparent text-sm font-semibold border-none cursor-pointer";
  } else if (variant === "login") {
    variantClass = "w-full py-3 bg-ink text-canvas rounded-[var(--radius-pill)] text-base font-[480] tracking-[-0.01em] hover:opacity-85 active:opacity-100";
  } else if (variant === "danger") {
    variantClass = "px-5 py-2.5 bg-danger text-white rounded-[var(--radius-pill)] text-base font-[480] tracking-[-0.01em] hover:opacity-85 active:opacity-100";
  } else if (variant === "ghost") {
    variantClass = "px-3 py-2 text-ink opacity-60 hover:opacity-100 bg-transparent rounded-[var(--radius-pill)] text-sm font-semibold hover:bg-surface-soft";
  } else if (variant === "link") {
    variantClass = "text-ink underline text-sm cursor-pointer bg-transparent border-none p-0 opacity-60 hover:opacity-100";
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
