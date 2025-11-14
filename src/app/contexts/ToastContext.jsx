"use client";

import React, { createContext, useContext } from "react";
import { useToast, ToastContainer } from "@/components/ui/toast";

const ToastContext = createContext();

export const useToastNotification = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastNotification must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const { toast, toasts, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};
