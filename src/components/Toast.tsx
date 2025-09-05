// src/components/Toast.tsx
"use client";

import { useEffect } from "react";

type ToastProps = {
  kind?: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  autoHideMs?: number;
};

export default function Toast({
  kind = "info",
  message,
  onClose,
  autoHideMs = 2200,
}: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [autoHideMs, onClose]);

  const styles =
    kind === "success"
      ? "bg-emerald-600"
      : kind === "error"
      ? "bg-red-600"
      : "bg-gray-800";

  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className={`text-white ${styles} rounded-md px-4 py-2 shadow-lg`}>
        {message}
      </div>
    </div>
  );
}