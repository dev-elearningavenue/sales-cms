// Basic toast hook implementation
import { useState } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...props, id };
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    // Auto-dismiss toast after duration
    if (props.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
      }, props.duration || 3000);
    }
    
    // For proper implementation, you'd return functions to dismiss the toast
    return {
      id,
      dismiss: () => setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id)),
    };
  };

  return { toast, toasts };
} 