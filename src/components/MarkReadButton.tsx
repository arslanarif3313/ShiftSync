"use client";

export function MarkReadButton({ id }: { id: string }) {
  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ border: "1px solid #e5e7eb", fontSize: "12px" }}
      onClick={async () => {
        await fetch(`/api/notifications/${id}/read`, { method: "POST" });
        window.location.reload();
      }}
    >
      Mark read
    </button>
  );
}
