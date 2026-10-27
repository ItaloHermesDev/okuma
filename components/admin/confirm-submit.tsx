"use client";

export function ConfirmSubmit({
  label,
  message,
}: {
  label: string;
  message: string;
}) {
  return (
    <button
      type="submit"
      className="h-10 border border-red-600 px-4 text-sm text-red-600"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
