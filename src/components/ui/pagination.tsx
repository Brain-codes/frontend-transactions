import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

// ------------------
// Pagination
// ------------------
export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {}

const Pagination = ({ className, ...props }: PaginationProps) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

// ------------------
// PaginationContent
// ------------------
export interface PaginationContentProps
  extends React.HTMLAttributes<HTMLUListElement> {}

const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
);
PaginationContent.displayName = "PaginationContent";

// ------------------
// PaginationItem
// ------------------
export interface PaginationItemProps
  extends React.LiHTMLAttributes<HTMLLIElement> {}

const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  )
);
PaginationItem.displayName = "PaginationItem";

// ------------------
// PaginationLink
// ------------------
export interface PaginationLinkProps extends ButtonProps {
  isActive?: boolean;
}

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <Button
    aria-current={isActive ? "page" : undefined}
    variant={isActive ? "outline" : "ghost"}
    size={size}
    className={cn(
      isActive && "bg-brand-50 border-brand-200 text-brand-900",
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

// ------------------
// PaginationPrevious
// ------------------
export interface PaginationPreviousProps extends PaginationLinkProps {}

const PaginationPrevious = ({ className, ...props }: PaginationPreviousProps) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

// ------------------
// PaginationNext
// ------------------
export interface PaginationNextProps extends PaginationLinkProps {}

const PaginationNext = ({ className, ...props }: PaginationNextProps) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

// ------------------
// PaginationEllipsis
// ------------------
export interface PaginationEllipsisProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

const PaginationEllipsis = ({
  className,
  ...props
}: PaginationEllipsisProps) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

// ------------------
// Exports
// ------------------
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};


// import * as React from "react";
// import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";

// const Pagination = ({ className, ...props }) => (
//   <nav
//     role="navigation"
//     aria-label="pagination"
//     className={cn("mx-auto flex w-full justify-center", className)}
//     {...props}
//   />
// );
// Pagination.displayName = "Pagination";

// const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
//   <ul
//     ref={ref}
//     className={cn("flex flex-row items-center gap-1", className)}
//     {...props}
//   />
// ));
// PaginationContent.displayName = "PaginationContent";

// const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
//   <li ref={ref} className={cn("", className)} {...props} />
// ));
// PaginationItem.displayName = "PaginationItem";

// const PaginationLink = ({ className, isActive, size = "icon", ...props }) => (
//   <Button
//     aria-current={isActive ? "page" : undefined}
//     variant={isActive ? "outline" : "ghost"}
//     size={size}
//     className={cn(
//       isActive && "bg-brand-50 border-brand-200 text-brand-900",
//       className
//     )}
//     {...props}
//   />
// );
// PaginationLink.displayName = "PaginationLink";

// const PaginationPrevious = ({ className, ...props }) => (
//   <PaginationLink
//     aria-label="Go to previous page"
//     size="default"
//     className={cn("gap-1 pl-2.5", className)}
//     {...props}
//   >
//     <ChevronLeft className="h-4 w-4" />
//     <span>Previous</span>
//   </PaginationLink>
// );
// PaginationPrevious.displayName = "PaginationPrevious";

// const PaginationNext = ({ className, ...props }) => (
//   <PaginationLink
//     aria-label="Go to next page"
//     size="default"
//     className={cn("gap-1 pr-2.5", className)}
//     {...props}
//   >
//     <span>Next</span>
//     <ChevronRight className="h-4 w-4" />
//   </PaginationLink>
// );
// PaginationNext.displayName = "PaginationNext";

// const PaginationEllipsis = ({ className, ...props }) => (
//   <span
//     aria-hidden
//     className={cn("flex h-9 w-9 items-center justify-center", className)}
//     {...props}
//   >
//     <MoreHorizontal className="h-4 w-4" />
//     <span className="sr-only">More pages</span>
//   </span>
// );
// PaginationEllipsis.displayName = "PaginationEllipsis";

// export {
//   Pagination,
//   PaginationContent,
//   PaginationEllipsis,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// };
