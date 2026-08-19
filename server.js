"use strict";

/*
 * Vault of Ash — static site server.
 * Zero dependencies: Node's http + fs + zlib only.
 *
 * Railway notes:
 *  - Listens on process.env.PORT (Railway injects this).
 *  - Binds "::" so both IPv6 (Railway private network / healthchecks)
 *    and IPv4-mapped traffic are accepted; falls back to 0.0.0.0 where
 *    IPv6 is unavailable (some local machines).
 *  - GET /healthz returns 200 for the deploy healthcheck.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json"
};

const COMPRESSIBLE = new Set([".html", ".css", ".js", ".mjs", ".json", ".txt", ".svg", ".map", ".webmanifest"]);

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function notFound(req, res) {
  const page404 = path.join(ROOT, "404.html");
  fs.readFile(page404, (err, data) => {
    if (err) {
      send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — this passage collapsed long ago.");
      return;
    }
    send(res, 404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, data);
  });
}

function serveFile(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      notFound(req, res);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    };

    const acceptsGzip = /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
    if (acceptsGzip && COMPRESSIBLE.has(ext) && data.length > 1024) {
      zlib.gzip(data, (zerr, zipped) => {
        if (zerr) {
          send(res, 200, headers, data);
          return;
        }
        headers["Content-Encoding"] = "gzip";
        headers["Vary"] = "Accept-Encoding";
        send(res, 200, headers, zipped);
      });
      return;
    }
    send(res, 200, headers, data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { "Content-Type": "text/plain; charset=utf-8", "Allow": "GET, HEAD" }, "Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }

  if (pathname === "/healthz") {
    send(res, 200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }, "ok");
    return;
  }

  // Resolve inside ROOT only — reject traversal attempts.
  const resolved = path.normalize(path.join(ROOT, pathname));
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    notFound(req, res);
    return;
  }

  fs.stat(resolved, (err, stats) => {
    if (!err && stats.isDirectory()) {
      // Directories must be addressed with a trailing slash so the page's
      // relative asset paths (css/, js/) resolve correctly.
      if (!pathname.endsWith("/")) {
        send(res, 301, { Location: pathname + "/", "Cache-Control": "no-cache" }, "");
        return;
      }
      serveFile(req, res, path.join(resolved, "index.html"));
      return;
    }
    if (!err && stats.isFile()) {
      serveFile(req, res, resolved);
      return;
    }
    notFound(req, res);
  });
});

function start(host) {
  server.listen(PORT, host, () => {
    console.log(`Vault of Ash serving on http://${host === "::" ? "localhost" : host}:${PORT} (bound ${host})`);
  });
}

server.on("error", (err) => {
  if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT") {
    console.warn(`IPv6 bind failed (${err.code}); retrying on 0.0.0.0`);
    start("0.0.0.0");
    return;
  }
  console.error(err);
  process.exit(1);
});

start("::");
