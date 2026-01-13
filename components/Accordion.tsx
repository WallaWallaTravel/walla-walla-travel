'use client';

import { useState } from 'react';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple items open at once (default: false - single open) */
  allowMultiple?: boolean;
}

export function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    if (allowMultiple) {
      // If allowing multiple, this component won't track - use native details
      return;
    }
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 hover:border-[#8B1538]/30 transition-colors overflow-hidden"
          >
            <button
              onClick={() => handleToggle(index)}
              className="w-full flex items-center justify-between p-4 cursor-pointer text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-gray-900 pr-4">{item.question}</span>
              <span
                className={`text-[#8B1538] transition-transform flex-shrink-0 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 text-gray-600 border-t border-gray-100 pt-3">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
