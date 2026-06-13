import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default", // 'default' | 'glass' | 'interactive'
  ...props
}, ref) => {
  let cardStyle = {
    background: "#181818",
    borderRadius: "8px",
    padding: "32px",
    boxShadow: "rgba(0, 0, 0, 0.5) 0px 8px 24px",
    boxSizing: "border-box",
  };

  if (variant === "glass") {
    cardStyle = {
      background: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      borderRadius: "24px",
      padding: "40px",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
      boxSizing: "border-box",
    };
  } else if (variant === "interactive") {
    cardStyle = {
      background: "#181818",
      borderRadius: "12px",
      padding: "16px",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
      transition: "all 0.2s ease",
      cursor: "pointer",
      boxSizing: "border-box",
    };
  }

  return (
    <div
      ref={ref}
      className={`custom-card ${className}`}
      style={{
        ...cardStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

export default Card;
