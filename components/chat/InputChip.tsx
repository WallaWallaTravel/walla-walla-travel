'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface InputChipProps {
  icon: string;
  label: string;
  value?: string;
  isSet: boolean;
  children: ReactNode;
  onClear?: () => void;
}

/**
 * Reusable expandable input chip component.
 * Shows a collapsed chip that expands to reveal input content when clicked.
 * Uses a portal to render dropdown outside any overflow-clipping containers.
 */
export function InputChip({
  icon,
  label,
  value,
  isSet,
  children,
  onClear,
}: InputChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position the dropdown relative to the chip button
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 400;

      setDropdownStyle({
        position: 'fixed',
        left: `${rect.left}px`,
        ...(openUpward
          ? { bottom: `${window.innerHeight - rect.top + 8}px` }
          : { top: `${rect.bottom + 8}px` }),
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Portal dropdown content
  const dropdownContent = isOpen && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[200px] max-h-[450px] overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Chip button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isSet
            ? 'bg-purple-100 text-purple-800 border border-purple-200'
            : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
        }`}
      >
        <span>{icon}</span>
        <span>{isSet && value ? value : label}</span>
        {isSet && onClear && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onClear();
              }
            }}
            className="ml-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-purple-200 text-purple-600 cursor-pointer"
          >
            ×
          </span>
        )}
      </button>

      {/* Dropdown rendered via portal to escape overflow:hidden containers */}
      {dropdownContent}
    </div>
  );
}
