"use client";

export function ApproveSwapButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-success btn-sm"
      onClick={async () => {
        await fetch(`/api/swaps/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: true }) });
        window.location.reload();
      }}>
      Approve
    </button>
  );
}

export function RejectSwapButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-danger btn-sm"
      onClick={async () => {
        await fetch(`/api/swaps/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: false }) });
        window.location.reload();
      }}>
      Reject
    </button>
  );
}

export function CancelSwapButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-danger btn-sm"
      onClick={async () => {
        await fetch(`/api/swaps/${id}/cancel`, { method: "POST" });
        window.location.reload();
      }}>
      Cancel request
    </button>
  );
}

export function AcceptPeerSwapButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-primary btn-sm"
      onClick={async () => {
        await fetch(`/api/swaps/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: true }) });
        window.location.reload();
      }}>
      Accept
    </button>
  );
}

export function DeclinePeerSwapButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-danger btn-sm"
      onClick={async () => {
        await fetch(`/api/swaps/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: false }) });
        window.location.reload();
      }}>
      Decline
    </button>
  );
}

export function ApproveDropButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-success btn-sm"
      onClick={async () => {
        await fetch(`/api/drops/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: true }) });
        window.location.reload();
      }}>
      Approve
    </button>
  );
}

export function RejectDropButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-danger btn-sm"
      onClick={async () => {
        await fetch(`/api/drops/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: false }) });
        window.location.reload();
      }}>
      Reject
    </button>
  );
}

export function ClaimDropButton({ id }: { id: string }) {
  return (
    <button type="button" className="btn btn-primary btn-sm"
      onClick={async () => {
        await fetch(`/api/drops/${id}/claim`, { method: "POST" });
        window.location.reload();
      }}>
      Claim shift
    </button>
  );
}

export function ClockButton({ assignmentId, action }: { assignmentId: string; action: "in" | "out" }) {
  return (
    <button
      type="button"
      className={action === "in" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
      onClick={async () => {
        await fetch("/api/clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId, action }) });
        window.location.reload();
      }}
    >
      {action === "in" ? "Clock in" : "Clock out"}
    </button>
  );
}

export function OfferDropButton({ shiftId }: { shiftId: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ border: "1px solid #e5e7eb" }}
      onClick={async () => {
        await fetch("/api/drops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shiftId }) });
        window.location.reload();
      }}
    >
      Offer drop
    </button>
  );
}
