"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "connected") return;
        router.refresh();
      } catch {
        /* ignore */
      }
    };

    return () => es.close();
  }, [router]);

  return null;
}
