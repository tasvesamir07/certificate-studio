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
      className={`relative inline-block w-full ${className}`}
      style={style}
      {...props}
    >
      <div onClick={toggleDropdown} className="w-full">
        {trigger}
      </div>
      {isOpen && (
        <div
          className="absolute top-full mt-1.5 bg-bg-surface border border-border-custom rounded-md shadow-md z-[1000] min-w-[200px] max-h-[300px] overflow-y-auto py-1.5 animate-[dropdownFadeIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
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
