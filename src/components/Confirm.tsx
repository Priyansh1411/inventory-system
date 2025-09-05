// src/components/Confirm.tsx
"use client";

type Props = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export default function Confirm({
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-gray-700">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}