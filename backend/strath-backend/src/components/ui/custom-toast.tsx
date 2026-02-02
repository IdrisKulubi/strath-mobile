"use client";

import { Toaster as Sonner } from "sonner";

export function CustomToaster() {
  return (
    <Sonner
      position="top-center"
      expand={true}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: `
            group flex items-center gap-3 w-full p-4 rounded-2xl shadow-2xl backdrop-blur-xl
            border border-white/20
            bg-gradient-to-r from-pink-500 to-rose-500
          `,
          title: "text-white font-semibold text-sm drop-shadow-sm",
          description: "text-white/90 text-xs drop-shadow-sm",
          actionButton: "bg-white text-pink-600 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-white/90 transition-colors shadow-md",
          cancelButton: "bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-white/30 transition-colors",
          closeButton: "!bg-white/20 hover:!bg-white/30 !text-white !border-0 !shadow-none [&>svg]:!text-white",
          icon: "text-white",
        },
      }}
    />
  );
}

// Custom toast functions with icons
import { toast as sonnerToast } from "sonner";

const SuccessIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  </div>
);

const ErrorIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
    </svg>
  </div>
);

const InfoIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  </div>
);

const WarningIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  </div>
);

const LoadingIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg className="animate-spin text-white" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  </div>
);

const HeartIcon = () => (
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  </div>
);

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: <SuccessIcon />,
      className: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: <ErrorIcon />,
      className: "!bg-gradient-to-r !from-red-500 !to-rose-500",
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: <InfoIcon />,
      className: "!bg-gradient-to-r !from-pink-500 !to-rose-500",
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <WarningIcon />,
      className: "!bg-gradient-to-r !from-amber-500 !to-orange-500",
    });
  },
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
      icon: <LoadingIcon />,
      className: "!bg-gradient-to-r !from-purple-500 !to-pink-500",
    });
  },
  match: (name: string) => {
    sonnerToast.success(`It's a match! 💕`, {
      description: `You and ${name} liked each other!`,
      icon: <HeartIcon />,
      duration: 5000,
      className: "!bg-gradient-to-r !from-pink-500 !to-rose-500",
    });
  },
  message: (name: string, preview: string) => {
    sonnerToast.info(`New message from ${name}`, {
      description: preview.length > 50 ? preview.slice(0, 50) + "..." : preview,
      icon: <InfoIcon />,
      className: "!bg-gradient-to-r !from-pink-500 !to-rose-500",
    });
  },
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};
