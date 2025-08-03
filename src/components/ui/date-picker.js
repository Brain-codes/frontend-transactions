import React from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DatePicker = React.forwardRef(
  (
    { className, value, onChange, placeholder = "Select date...", ...props },
    ref
  ) => {
    const handleInputChange = (e) => {
      const value = e.target.value;
      if (onChange) {
        onChange(value);
      }
    };

    return (
      <div className={cn("relative", className)}>
        <Input
          type="date"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10"
          ref={ref}
          {...props}
        />
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
