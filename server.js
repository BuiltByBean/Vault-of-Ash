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

/*
 * The game in public/play/ is the original release, kept byte-for-byte
 * unmodified on disk. So that the play page carries the same site chrome as
 * the landing page, we inject the site navigation bar at serve time (styles
 * scoped with a voa- prefix; body gets top padding so nothing is covered).
 * Replacing public/play/ with a future game release keeps the nav with zero
 * changes to the new files.
 */
const PLAY_INDEX = path.join(ROOT, "play", "index.html");
const SITE_NAV =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=EB+Garamond&display=swap" rel="stylesheet">\n' +
  '<nav id="voa-site-nav" aria-label="Vault of Ash site">\n' +
  '  <a class="voa-brand" href="/" title="Back to the Vault of Ash home page">\n' +
  '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C9 7 6.5 9.5 6.5 13.5a5.5 5.5 0 0 0 11 0C17.5 9.5 15 7 12 2Zm0 17.5a4 4 0 0 1-4-4c0-2.6 1.6-4.6 4-8 2.4 3.4 4 5.4 4 8a4 4 0 0 1-4 4Z" fill="currentColor"/><path d="M12 8.5c-1.3 1.9-2.2 3.2-2.2 4.9a2.2 2.2 0 0 0 4.4 0c0-1.7-.9-3-2.2-4.9Z" fill="currentColor"/></svg>\n' +
  "    <span>Vault of Ash</span>\n" +
  "  </a>\n" +
  '  <div class="voa-nav-links">\n' +
  '    <a href="/#chronicle">Chronicle</a>\n' +
  '    <a href="/#below">The Vault</a>\n' +
  '    <a href="/#manual">Field Manual</a>\n' +
  "  </div>\n" +
  "</nav>\n" +
  "<style>\n" +
  "body{padding-top:3.9rem}\n" +
  "#voa-site-nav{position:fixed;top:0;left:0;right:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:1.6rem;padding:.85rem clamp(1rem,4vw,2.4rem);background:rgba(8,6,6,.85);border-bottom:1px solid #221d15;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}\n" +
  '.voa-brand{display:flex;align-items:center;gap:.55rem;color:#ece3cd;font-family:"Cinzel",Georgia,serif;font-size:.95rem;letter-spacing:.18em;text-transform:uppercase;text-decoration:none}\n' +
  ".voa-brand svg{width:20px;height:20px;color:#d4632c}\n" +
  ".voa-brand:hover span{color:#ffdca8}\n" +
  ".voa-nav-links{display:flex;gap:1.5rem}\n" +
  '.voa-nav-links a{color:#a89c82;font-family:"EB Garamond",Georgia,serif;font-size:.95rem;letter-spacing:.04em;text-decoration:none;transition:color .2s ease}\n' +
  ".voa-nav-links a:hover{color:#ffdca8}\n" +
  "#voa-site-nav a:focus-visible{outline:2px solid #f1a05d;outline-offset:3px}\n" +
  "@media (max-width:700px){.voa-nav-links{display:none}}\n" +
  "</style>";

function withSiteNav(data) {
  const html = data.toString("utf8");
  if (html.indexOf("</body>") === -1) return data;
  return Buffer.from(html.replace("</body>", SITE_NAV + "\n</body>"), "utf8");
}

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
  fs.stat(filePath, (serr, stats) => {
    if (serr || !stats.isFile()) {
      notFound(req, res);
      return;
    }
    // no-cache + Last-Modified: browsers revalidate every time and get a
    // cheap 304 while the file is unchanged, so deploys apply instantly.
    const lastModified = new Date(Math.floor(stats.mtimeMs / 1000) * 1000).toUTCString();
    const since = Date.parse(req.headers["if-modified-since"] || "");
    if (!Number.isNaN(since) && Date.parse(lastModified) <= since) {
      send(res, 304, { "Cache-Control": "no-cache", "Last-Modified": lastModified }, "");
      return;
    }
    readAndSend(req, res, filePath, lastModified);
  });
}

function readAndSend(req, res, filePath, lastModified) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      notFound(req, res);
      return;
    }
    if (filePath === PLAY_INDEX) {
      data = withSiteNav(data);
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Last-Modified": lastModified,
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
