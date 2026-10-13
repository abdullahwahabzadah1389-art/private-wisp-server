import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

// Railway (and most platforms) inject the listen port; fall back for local runs.
const PORT = parseInt(process.env.PORT ?? "8080", 10);
// Bind 0.0.0.0 — binding localhost inside a container makes the port unreachable.
const HOST = process.env.HOST ?? "0.0.0.0";

const server = http.createServer((req, res) => {
    // Container liveness probe. Deliberately trivial: it must never touch the
    // wisp connection pool, so a health check cannot count against the cap.
    if (req.method === "GET" && (req.url === "/health" || req.url === "/health/")) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 not found");
});

// Every WebSocket upgrade is handed to wisp. wisp keys behaviour off the path:
// one ending in "/" (our root "/") establishes a wisp tunnel, anything else is
// treated as a plain WS proxy target, so the root path is what clients use.
server.on("upgrade", (req, socket, head) => {
    wisp.routeRequest(req, socket, head);
});

// Surface close reasons instead of dying silently on an unhandled rejection.
process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection:", reason);
});

server.listen(PORT, HOST, () => {
    console.log(`wisp egress listening on http://${HOST}:${PORT}`);
    console.log(`health check:  http://${HOST}:${PORT}/health`);
    console.log(`wisp endpoint: wss://<your-host>/`);
});

server.on("error", (err) => {
    console.error("server error:", err);
    process.exit(1);
});
