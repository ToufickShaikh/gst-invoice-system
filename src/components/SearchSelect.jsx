import React, { useEffect, useMemo, useRef, useState } from 'react';

// Lightweight, dependency-free searchable select with keyboard navigation
// Props:
// - items: array of objects
// - value: currently selected object (optional, for display)
// - onSelect: function(item)
// - placeholder: string
// - label: string (optional)
// - searchFields: array of field names to search in each item
// - renderItem: (item, query) => ReactNode
// - getKey: (item) => unique key (default: item.id || item._id)
// - emptyText: text when no matches
// - disabled, autoFocus, maxHeight
export default function SearchSelect({
  items = [],
  value = null,
  onSelect,
  placeholder = 'Search…',
  label,
  searchFields = [],
  renderItem,
  getKey = (it) => it?.id || it?._id,
  emptyText = 'No matches',
  disabled = false,
  autoFocus = true,
  maxHeight = 280,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normalized = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (!searchFields?.length) return true;
      return searchFields.some((f) => {
        const v = (it?.[f] ?? '').toString().toLowerCase();
        return v.includes(q);
      });
    });
  }, [items, query, searchFields]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (open && autoFocus) inputRef.current?.focus();
  }, [open, autoFocus]);

  useEffect(() => {
    // keep highlighted item in view
    const el = listRef.current?.querySelector(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const handleKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, normalized.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = normalized[highlight];
      if (it) {
        onSelect?.(it);
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div
        className={`relative border rounded-lg flex items-center bg-white ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        onKeyDown={handleKey}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg outline-none text-sm"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-2 text-gray-500"
          aria-label="Toggle"
        >
          ▾
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg">
            <div
              ref={listRef}
              className="max-h-[280px] overflow-auto"
              style={{ maxHeight }}
            >
              {normalized.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>
              )}
              {normalized.map((it, idx) => (
                <button
                  key={getKey(it) || idx}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onSelect?.(it);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${idx === highlight ? 'bg-gray-50' : ''}`}
                >
                  {renderItem ? renderItem(it, query) : (
                    <span>{getKey(it)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {value && (
        <div className="mt-1 text-xs text-gray-600 truncate">
          Selected: {typeof value === 'string' ? value : (value.name || value.firmName || value.hsnCode)}
        </div>
      )}
    </div>
  );
}
