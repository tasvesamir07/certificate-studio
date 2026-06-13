import React from "react";

const Button = React.forwardRef(({ 
  children, 
  className = "", 
  variant = "primary", // 'primary' | 'secondary' | 'canva' | 'logout' | 'danger' | 'ghost' | 'icon'
  type = "button",
  loading = false,
  disabled = false,
  ...props 
}, ref) => {
  let btnClass = "action-button";
  
  if (variant === "secondary") {
    btnClass = "action-button secondary";
  } else if (variant === "canva") {
    btnClass = "canva-button";
  } else if (variant === "logout") {
    btnClass = "nav-logout";
  } else if (variant === "login") {
    btnClass = "login-button";
  } else if (variant === "danger") {
    btnClass = "action-button danger"; // We can style danger in App.css if needed, or inline
  } else if (variant === "ghost") {
    btnClass = "theme-toggle"; // Uses style like theme-toggle
  } else if (variant === "link") {
    btnClass = "canva-disconnect-link";
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`${btnClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="button-loading-container" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
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
