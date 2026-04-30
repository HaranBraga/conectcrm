import { NextRequest } from "next/server";
import { addClient, removeClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      addClient(c);

      // Heartbeat a cada 25s para manter conexão viva através do Nginx
      const hb = setInterval(() => {
        try {
          c.enqueue(new TextEncoder().encode(":ping\n\n"));
        } catch {
          clearInterval(hb);
        }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(hb);
        removeClient(c);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // desativa buffer do Nginx — essencial para SSE
    },
  });
}
