// src/components/ui/dialog.tsx
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog = ({
  open,
  onOpenChange,
  children,
  className,
}: DialogProps) => {
  React.useEffect(() => {
    // Prevent scrolling on body when dialog is open
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center justify-between border-b px-6 py-4",
      className
    )}
  >
    {children}
  </div>
);

export const DialogTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2 className={cn("text-xl font-bold text-gray-800", className)}>
    {children}
  </h2>
);

export const DialogContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn("px-6 py-4", className)}>{children}</div>;

export const DialogFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center justify-end space-x-2 border-t px-6 py-4",
      className
    )}
  >
    {children}
  </div>
);
interface DialogCloseProps {
  onClick?: () => void;
  className?: string;
  asChild?: boolean;
  children?: React.ReactElement;
}

export const DialogClose: React.FC<DialogCloseProps> = ({
  onClick,
  className,
  asChild,
  children,
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick,
      className: cn(
        "text-gray-500 hover:text-gray-700",
        className,
        (children.props as { className?: string }).className
      ),
    } as React.Attributes & React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      onClick={onClick}
      className={cn("text-gray-500 hover:text-gray-700", className)}
    >
      {children || <X className="h-5 w-5" />}
    </button>
  );
};

// export const DialogClose = ({
//   onClick,
//   className,
// }: {
//   onClick?: () => void;
//   className?: string;
// }) => (
//   <button
//     onClick={onClick}
//     className={cn("text-gray-500 hover:text-gray-700", className)}
//   >
//     <X className="h-5 w-5" />
//   </button>
// );
