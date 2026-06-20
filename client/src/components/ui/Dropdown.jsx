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
      style={style}
      {...props}
    >
      <div onClick={toggleDropdown} style={{ width: "100%" }}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className="dropdown-menu"
          style={{ [align]: 0 }}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
