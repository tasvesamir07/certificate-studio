import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default",
  ...props
}, ref) => {
  let cardClass = "bg-bg-surface border border-border-light rounded-xl p-6 shadow-sm text-text-primary transition-all duration-200";

  if (variant === "glass") {
    cardClass = "glass-panel rounded-xl p-6 shadow-md text-text-primary transition-all duration-200";
  } else if (variant === "interactive") {
    cardClass = "card-hover bg-bg-surface border border-border-light rounded-xl p-6 shadow-sm text-text-primary cursor-pointer";
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
