import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default", // 'default' | 'glass' | 'interactive'
  ...props
}, ref) => {
  let cardClass = "custom-card";

  if (variant === "glass") {
    cardClass = "custom-card glass";
  } else if (variant === "interactive") {
    cardClass = "custom-card interactive";
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
