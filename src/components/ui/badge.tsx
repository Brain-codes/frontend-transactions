import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:
    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
  outline: "text-foreground",
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };


// import * as React from "react";
// import { cn } from "@/lib/utils";

// const badgeVariants = {
//   default:
//     "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
//   secondary:
//     "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
//   destructive:
//     "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
//   outline: "text-foreground",
// };

// function Badge({ className, variant = "default", ...props }) {
//   return (
//     <div
//       className={cn(
//         "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
//         badgeVariants[variant],
//         className
//       )}
//       {...props}
//     />
//   );
// }

// export { Badge, badgeVariants };
