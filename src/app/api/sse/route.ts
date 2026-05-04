import { NextRequest, NextResponse } from "next/server";
import { addClient, removeClient } from "@/lib/sse";
import { verifySession, SESSION_COOKIE } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Exige sessão válida — eventos do CRM não são públicos
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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
