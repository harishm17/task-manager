import { Toaster, toast } from 'sonner';

// Export the toast function for use throughout the app
// eslint-disable-next-line react-refresh/only-export-components
export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      theme="light"
      className="toaster-custom"
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        },
      }}
    />
  );
}

// Utility functions for common toast patterns
// eslint-disable-next-line react-refresh/only-export-components
export const showSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3000,
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const showError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 5000,
    action: {
      label: 'Report',
      onClick: () => {
        // In production, this would open a bug report form
        console.log('User reported error:', message, description);
      },
    },
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const showWarning = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    duration: 4000,
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const showInfo = (message: string, description?: string) => {
  toast.info(message, {
    description,
    duration: 3000,
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const showLoading = (message: string) => {
  return toast.loading(message, {
    duration: Infinity,
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};
