import React, { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";

const Select = React.forwardRef(({
  label,
  id,
  name,
  value,
  defaultValue = "",
  options = [], // array of { value, label, disabled, icon } or simple strings
  children,
  placeholder,
  disabled = false,
  required = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  style = {},
  onChange,
  onBlur,
  icon,
  ...props
}, ref) => {
  const reactId = useId();
  const generatedId = id || reactId;
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Normalize options from either options prop or option children
  const parsedItems = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === "object" && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : "",
            label: opt.label !== undefined ? opt.label : opt.value,
            disabled: !!opt.disabled,
            icon: opt.icon,
            description: opt.description,
          };
        }
        return { value: opt, label: String(opt), disabled: false };
      });
    }

    if (children) {
      const extracted = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === "option") {
          const val = child.props.value !== undefined ? child.props.value : child.props.children;
          extracted.push({
            value: val,
            label: child.props.children !== undefined ? child.props.children : val,
            disabled: !!child.props.disabled,
            icon: child.props["data-icon"],
            description: child.props["data-description"],
          });
        }
      });
      return extracted;
    }

    return [];
  }, [options, children]);

  // Track controlled vs uncontrolled value
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? value : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    return parsedItems.find((item) => String(item.value) === String(currentValue));
  }, [parsedItems, currentValue]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onBlur]);

  // Set highlight to selected item when opened
  useEffect(() => {
    if (isOpen) {
      const idx = parsedItems.findIndex((item) => String(item.value) === String(currentValue));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, parsedItems, currentValue]);

  const emitChange = useCallback((nextValue) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || generatedId,
          value: nextValue,
          id: generatedId,
        },
        currentTarget: {
          name: name || generatedId,
          value: nextValue,
          id: generatedId,
        },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      // Allow functions that expect e.target.value or raw value
      onChange(syntheticEvent, nextValue);
    }
  }, [isControlled, onChange, name, generatedId]);

  const handleSelect = (item) => {
    if (item.disabled || disabled) return;
    emitChange(item.value);
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (triggerRef.current) triggerRef.current.focus();
        break;
      case "ArrowDown": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < parsedItems.length && parsedItems[next].disabled) {
            next++;
          }
          return next < parsedItems.length ? next : prev;
        });
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && parsedItems[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < parsedItems.length) {
          handleSelect(parsedItems[highlightedIndex]);
        }
        break;
      }
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Determine label to display on trigger
  const displayLabel = useMemo(() => {
    if (selectedItem && selectedItem.label) {
      return selectedItem.label;
    }
    if (placeholder) {
      return placeholder;
    }
    // If first item has empty value, use it as placeholder
    if (parsedItems.length > 0 && parsedItems[0].value === "") {
      return parsedItems[0].label;
    }
    return "-- Select --";
  }, [selectedItem, placeholder, parsedItems]);

  const isPlaceholderActive = !selectedItem || selectedItem.value === "";

  return (
    <div
      ref={containerRef}
      className={`relative grid gap-1.5 w-full ${className}`}
      style={style}
    >
      {label && (
        <label
          htmlFor={generatedId}
          onClick={() => {
            if (!disabled && triggerRef.current) triggerRef.current.focus();
          }}
          className="font-sans text-[11px] font-bold uppercase tracking-wider text-text-muted mb-0.5 cursor-pointer select-none"
        >
          {label}
        </label>
      )}

      {/* Modern Trigger Button */}
      <button
        ref={(el) => {
          triggerRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        id={generatedId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium text-left transition-all duration-150 outline-none select-none ${
          disabled
            ? "bg-bg-elevated/40 border-border-custom/50 text-text-muted opacity-50 cursor-not-allowed"
            : isOpen
            ? "border-accent ring-2 ring-accent/20 bg-bg-surface shadow-sm text-text-primary"
            : "bg-bg-elevated/90 hover:bg-bg-elevated border-border-custom hover:border-text-muted/40 text-text-primary cursor-pointer shadow-xs"
        } ${triggerClassName}`}
        {...props}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
          <span
            className={`truncate ${
              isPlaceholderActive ? "text-text-muted font-normal" : "text-text-primary"
            }`}
          >
            {displayLabel}
          </span>
        </div>

        {/* Custom animated chevron indicator */}
        <div className="shrink-0 flex items-center justify-center text-text-muted">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ease-out ${
              isOpen ? "rotate-180 text-accent" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {/* Modern Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 bg-bg-surface border border-border-custom rounded-xl shadow-2xl p-1.5 max-h-60 overflow-y-auto outline-none animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
          style={{ minWidth: "100%" }}
        >
          {parsedItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-muted text-center">
              No options available
            </div>
          ) : (
            parsedItems.map((item, index) => {
              const isSelected = String(item.value) === String(currentValue);
              const isHighlighted = highlightedIndex === index;
              const isFauxEmpty = item.value === "";

              return (
                <div
                  key={`${item.value}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => !item.disabled && setHighlightedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 text-xs md:text-sm rounded-lg transition-colors cursor-pointer select-none mx-0.5 my-0.5 ${
                    item.disabled
                      ? "opacity-40 cursor-not-allowed text-text-muted"
                      : isSelected
                      ? "bg-accent/15 text-accent font-semibold"
                      : isHighlighted
                      ? "bg-bg-hover text-text-primary"
                      : isFauxEmpty
                      ? "text-text-muted italic"
                      : "text-text-primary hover:bg-bg-hover"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.description && (
                        <span className="text-[10px] text-text-muted truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-accent shrink-0 ml-1.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
