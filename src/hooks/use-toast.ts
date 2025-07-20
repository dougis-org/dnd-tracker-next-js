'use client';

import { toast } from 'sonner';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const showToast = ({ title, description, variant, duration, action }: ToastProps) => {
    const options: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {};

    if (description != null) {
      options.description = description;
    }

    if (duration != null) {
      options.duration = duration;
    }

    if (action) {
      options.action = action;
    }

    const hasOptions = Object.keys(options).length > 0;

    const toastFn =
      variant === 'destructive'
        ? toast.error
        : variant === 'default'
        ? toast.success
        : toast;

    if (hasOptions) {
      toastFn(title, options);
    } else {
      toastFn(title);
    }
  };

  const dismiss = (id?: string) => {
    if (id != null) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  };

  return {
    toast: showToast,
    dismiss
  };
}