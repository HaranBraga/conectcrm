// Singleton: mantém todos os clientes SSE conectados no processo Node.js
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

export function addClient(c: ReadableStreamDefaultController<Uint8Array>) {
  clients.add(c);
}

export function removeClient(c: ReadableStreamDefaultController<Uint8Array>) {
  clients.delete(c);
}

// Dispara evento para todos os clientes conectados
export function broadcast(event: string, data: unknown = {}) {
  const msg = new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
  for (const c of clients) {
    try {
      c.enqueue(msg);
    } catch {
      clients.delete(c); // cliente desconectou
    }
  }
}

export function clientCount() {
  return clients.size;
}
