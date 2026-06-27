import React from "react";

const SalesByModelsChart = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
      <div className="bg-[#4a5d0f] px-4 py-3 flex items-center justify-between">
        <h3 className="text-white text-sm font-semibold">Sales by Models</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-[300px]">
        <div className="w-14 h-14 rounded-full bg-[#eef3c4] flex items-center justify-center mb-3">
          <span className="text-[#4a5d0f] text-xl font-bold">⏳</span>
        </div>
        <p className="text-sm font-semibold text-gray-700">Coming soon</p>
        <p className="text-xs text-gray-500 mt-1">Model-level breakdown will appear here.</p>
      </div>
    </div>
  );
};

export default SalesByModelsChart;
