import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

    const variants: Record<Variant, string> = {
      default: "bg-brand-900 text-white shadow hover:bg-brand-800 border-0",
      destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600 border-0",
      outline: "border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:text-gray-900",
      secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 border-0",
      ghost: "bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-0",
      link: "text-brand-600 underline-offset-4 hover:underline bg-transparent border-0",
    };

    const sizes: Record<Size, string> = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };



// import * as React from "react";
// import { cn } from "@/lib/utils";

// const Button = React.forwardRef(
//   (
//     {
//       className,
//       variant = "default",
//       size = "default",
//       asChild = false,
//       ...props
//     },
//     ref
//   ) => {
//     const baseClasses =
//       "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

//     const variants = {
//       default: "bg-brand-900 text-white shadow hover:bg-brand-800 border-0",
//       destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600 border-0",
//       outline: "border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:text-gray-900",
//       secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 border-0",
//       ghost: "bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-0",
//       link: "text-brand-600 underline-offset-4 hover:underline bg-transparent border-0",
//     };

//     const sizes = {
//       default: "h-9 px-4 py-2",
//       sm: "h-8 rounded-md px-3 text-xs",
//       lg: "h-10 rounded-md px-8",
//       icon: "h-9 w-9",
//     };

//     return (
//       <button
//         className={cn(baseClasses, variants[variant], sizes[size], className)}
//         ref={ref}
//         {...props}
//       />
//     );
//   }
// );
// Button.displayName = "Button";

// export { Button };



