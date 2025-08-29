"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
  ...props
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" />
      <DialogContent
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none ${className}`}
      >
        {title && (
          <DialogTitle className="text-lg font-semibold mb-2">
            {title}
          </DialogTitle>
        )}
        {description && (
          <DialogDescription className="mb-4 text-gray-500">
            {description}
          </DialogDescription>
        )}
        {children}
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <span aria-hidden>
              {" "}
              <X />{" "}
            </span>
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
