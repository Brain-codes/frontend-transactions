"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  right?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, right }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

export default PageHeader;
