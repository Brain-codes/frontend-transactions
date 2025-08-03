"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export const Select = ({
  value,
  onValueChange,
  children,
  placeholder = "Select an option...",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {children}
        </div>
      )}
    </div>
  );
};

export const SelectItem = ({ value, children, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-900 first:rounded-t-lg last:rounded-b-lg"
    >
      {children}
    </button>
  );
};

export const SelectContent = ({ children }) => {
  return <>{children}</>;
};

export const SelectTrigger = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};

export const SelectValue = ({ placeholder }) => {
  return <span className="text-gray-500">{placeholder}</span>;
};
