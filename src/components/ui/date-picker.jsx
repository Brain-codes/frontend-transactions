import React from "react";
import { Input } from "./input";

export const DatePicker = ({ value, onChange, placeholder, ...props }) => {
  return (
    <Input
      type="date"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
};
