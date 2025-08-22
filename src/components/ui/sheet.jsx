import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Sheet = ({ children, open, onOpenChange }) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Animated Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 bg-black/80"
            onClick={() => onOpenChange(false)}
          />
          {children}
        </div>
      )}
    </AnimatePresence>
  );
};

const SheetTrigger = ({ children, onClick }) => {
  return React.cloneElement(children, { onClick });
};

const SheetClose = ({ children, onClick }) => {
  return React.cloneElement(children, { onClick });
};

const SheetContent = React.forwardRef(
  ({ side = "right", className, children, onClose, ...props }, ref) => {
    React.useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          onClose?.();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Animation variants for different sides
    const slideVariants = {
      right: {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      },
      left: {
        initial: { x: "-100%" },
        animate: { x: 0 },
        exit: { x: "-100%" },
      },
      top: {
        initial: { y: "-100%" },
        animate: { y: 0 },
        exit: { y: "-100%" },
      },
      bottom: {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
      },
    };

    const sideClasses = {
      top: "inset-x-0 top-0 border-b",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    };

    return (
      <motion.div
        ref={ref}
        initial={slideVariants[side].initial}
        animate={slideVariants[side].animate}
        exit={slideVariants[side].exit}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "fixed z-50 gap-4 bg-white p-6 shadow-lg",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </motion.div>
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 text-start", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
