"use client";

import { ToastProvider } from "@/hooks/useToast";
import { ConfirmProvider } from "@/components/ConfirmModal";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <ToastProvider>{children}</ToastProvider>
    </ConfirmProvider>
  );
}
