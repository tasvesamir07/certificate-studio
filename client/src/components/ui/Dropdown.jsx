import React, { useState, useRef, useEffect } from "react";

const Dropdown = ({
  trigger,
  children,
  className = "",
  style = {},
  align = "left", // 'left' | 'right'
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div
      ref={dropdownRef}
      className={`dropdown-container ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
        ...style,
      }}
      {...props}
    >
      <div onClick={toggleDropdown} style={{ width: "100%" }}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            position: "absolute",
            top: "100%",
            [align]: 0,
            marginTop: "6px",
            background: "var(--dropdown-bg, #181818)",
            border: "1px solid var(--dropdown-border, rgba(255, 255, 255, 0.1))",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            minWidth: "200px",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "6px 0",
            animation: "dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Dropdown;
