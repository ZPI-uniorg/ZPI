import { useState, useRef } from "react";

export default function Autocomplete({
  value,
  onChange,
  options,
  onSelect,
  placeholder,
  inputClassName,
  dropdownClassName,
  getOptionLabel,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef();

  const handleInput = (e) => {
    onChange(e.target.value);
    setOpen(true);
    setHighlighted(0);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && options[highlighted]) {
      e.preventDefault();
      onSelect(options[highlighted]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {open && options.length > 0 && (
        <div
          className={`absolute left-0 top-full z-50 w-full ${dropdownClassName || ""} bg-slate-900 border border-slate-700 rounded shadow max-h-40 overflow-y-auto mt-1`}
        >
          {options.map((opt, i) => (
            <div
              key={opt.id}
              className={`px-3 py-2 cursor-pointer text-slate-100 ${
                i === highlighted ? "bg-indigo-500/30" : "hover:bg-indigo-500/20"
              }`}
              onMouseDown={() => {
                onSelect(opt);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {getOptionLabel ? getOptionLabel(opt) : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
