'use client';

import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { classNames } from '@/lib/utils';

interface ComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  allowAdd?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  allowAdd = false,
  placeholder = 'Select…',
  ariaLabel,
  className,
}: ComboboxProps) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value ?? '');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [value]);

  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!trimmed) return options;
    return options.filter((o) => o.toLowerCase().includes(lowerQuery));
  }, [options, trimmed, lowerQuery]);

  const exactMatch = useMemo(
    () => options.find((o) => o.toLowerCase() === lowerQuery) ?? null,
    [options, lowerQuery]
  );

  const showAddRow = allowAdd && trimmed.length > 0 && !exactMatch;

  // Flat list of actionable rows for keyboard nav:
  //   filteredOptions... [+ "+ Add new: X" if shown]
  const totalRows = filteredOptions.length + (showAddRow ? 1 : 0);

  useEffect(() => {
    if (activeIndex >= totalRows) setActiveIndex(Math.max(0, totalRows - 1));
  }, [activeIndex, totalRows]);

  const selectRow = (index: number) => {
    if (index < filteredOptions.length) {
      const picked = filteredOptions[index];
      onChange(picked);
      setQuery(picked);
    } else if (showAddRow) {
      onChange(trimmed);
      setQuery(trimmed);
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (totalRows === 0 ? 0 : (i + 1) % totalRows));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (totalRows === 0 ? 0 : (i - 1 + totalRows) % totalRows));
    } else if (e.key === 'Enter') {
      if (open && totalRows > 0) {
        e.preventDefault();
        selectRow(activeIndex);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value ?? '');
    } else if (e.key === 'Backspace' && query === '' && value) {
      onChange(null);
    }
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={classNames('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-sm border border-zinc-300 rounded-md pl-2 pr-7 py-1.5 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm leading-none p-0.5"
          >
            ×
          </button>
        )}
      </div>

      {open && (filteredOptions.length > 0 || showAddRow) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg text-sm"
        >
          {filteredOptions.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectRow(i);
              }}
              className={classNames(
                'px-2 py-1.5 cursor-pointer',
                i === activeIndex ? 'bg-blue-50 text-blue-900' : 'text-zinc-900'
              )}
            >
              {opt}
            </li>
          ))}
          {showAddRow && (
            <li
              role="option"
              aria-selected={filteredOptions.length === activeIndex}
              onMouseEnter={() => setActiveIndex(filteredOptions.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectRow(filteredOptions.length);
              }}
              className={classNames(
                'px-2 py-1.5 cursor-pointer border-t border-zinc-100',
                filteredOptions.length === activeIndex ? 'bg-blue-50 text-blue-900' : 'text-blue-700'
              )}
            >
              + Add new: <span className="font-medium">&quot;{trimmed}&quot;</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
