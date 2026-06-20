import React from "react";

const Card = React.forwardRef(({
  children,
  className = "",
  style = {},
  variant = "default",
  ...props
}, ref) => {
  let cardClass = "bg-canvas text-ink rounded-[var(--radius-lg)] p-6 border border-hairline transition-all duration-200";

  if (variant === "interactive") {
    cardClass = "bg-canvas text-ink rounded-[var(--radius-lg)] p-6 border border-hairline transition-all duration-200 hover:border-ink hover:shadow-[var(--shadow-card)] cursor-pointer";
  } else if (variant === "lime") {
    cardClass = "bg-block-lime text-ink rounded-[var(--radius-lg)] p-6 transition-all duration-200";
  } else if (variant === "lilac") {
    cardClass = "bg-block-lilac text-ink rounded-[var(--radius-lg)] p-6 transition-all duration-200";
  } else if (variant === "cream") {
    cardClass = "bg-block-cream text-ink rounded-[var(--radius-lg)] p-6 transition-all duration-200";
  } else if (variant === "navy") {
    cardClass = "bg-block-navy text-inverse-ink rounded-[var(--radius-lg)] p-6 transition-all duration-200";
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
