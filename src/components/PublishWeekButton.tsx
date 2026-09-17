"use client";

export function PublishWeekButton({
  scheduleWeekId,
  publish,
}: {
  scheduleWeekId: string;
  publish: boolean;
}) {
  return (
    <button
      type="button"
      className={publish ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
      onClick={async () => {
        await fetch("/api/schedule/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleWeekId, publish }),
        });
        window.location.reload();
      }}
    >
      {publish ? "Publish" : "Unpublish"}
    </button>
  );
}
