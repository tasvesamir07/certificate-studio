import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default",
  ...props
}, ref) => {
  let cardClass = "bg-bg-surface/80 backdrop-blur-md text-text-primary rounded-lg p-6 border border-border-custom shadow-card transition-all duration-200";

  if (variant === "interactive") {
    cardClass = "bg-bg-surface/80 backdrop-blur-md text-text-primary rounded-lg p-6 border border-border-custom shadow-card transition-all duration-200 hover:border-accent hover:shadow-[0_0_20px_rgba(30,215,96,0.15)] cursor-pointer";
  } else if (variant === "lime") {
    cardClass = "bg-block-lime text-text-primary rounded-lg p-6 transition-all duration-200";
  } else if (variant === "lilac") {
    cardClass = "bg-block-lilac text-text-primary rounded-lg p-6 transition-all duration-200";
  } else if (variant === "cream") {
    cardClass = "bg-block-cream text-text-primary rounded-lg p-6 transition-all duration-200";
  } else if (variant === "navy") {
    cardClass = "bg-block-navy text-inverse-ink rounded-lg p-6 transition-all duration-200";
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
