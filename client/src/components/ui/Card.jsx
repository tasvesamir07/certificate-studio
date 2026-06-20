import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default", // 'default' | 'glass' | 'interactive'
  ...props
}, ref) => {
  let cardClass = "bg-bg-surface border border-border-light rounded-lg p-6 shadow-sm text-text-primary transition-all duration-200";

  if (variant === "glass") {
    cardClass = "bg-bg-surface/80 backdrop-blur-md border border-border-light rounded-lg p-6 shadow-md text-text-primary transition-all duration-200";
  } else if (variant === "interactive") {
    cardClass = "bg-bg-surface border border-border-light rounded-lg p-6 shadow-sm text-text-primary transition-all duration-200 hover:border-accent hover:shadow-md cursor-pointer transform hover:-translate-y-0.5";
  }

  return (
    <div
      ref={ref}
      className={`${cardClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

export default Card;
