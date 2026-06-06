// HittaGira run-driver.
//
// Launches `next dev` on a free-ish port, waits until the server answers,
// smoke-tests routes, optionally takes a screenshot, and tears the server
// down. Designed to run end-to-end without any human in the loop.
//
// Usage (from the repo root — `<unit>`):
//   node .claude/skills/run-hittagira/driver.mjs            # smoke
//   node .claude/skills/run-hittagira/driver.mjs --screenshot
//   node .claude/skills/run-hittagira/driver.mjs --screenshot --route=/sok
//   node .claude/skills/run-hittagira/driver.mjs --keep     # leave server running
//
// Env: PORT (default 3007). Reads .env.local via Next itself.

import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

const args = new Set(process.argv.slice(2));
const wantScreenshot = args.has("--screenshot");
const keep = args.has("--keep");
const routeArg =
  [...args].find((a) => a.startsWith("--route="))?.slice("--route=".length) ??
  "/";

const PORT = Number(process.env.PORT ?? 3007);
const BASE = `http://localhost:${PORT}`;

const ROUTES = ["/", "/sok", "/bevakade", "/mer", "/fender"];

function log(msg) {
  console.log(`[run-hittagira] ${msg}`);
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "GET" });
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never became ready at ${url}`);
}

function startDevServer() {
  log(`spawning \`next dev --turbopack\` on port ${PORT}`);
  const isWin = process.platform === "win32";
  // On Windows `npm` is `npm.cmd`, which Node refuses to spawn without a shell.
  // Spawn `next` directly via its node_modules/.bin/ shim (no shell needed).
  const nextBin = resolve(
    repoRoot,
    "node_modules",
    ".bin",
    isWin ? "next.cmd" : "next",
  );
  // shell: true is required on Windows for .cmd shims, but the shell mangles
  // paths with spaces unless we quote the executable ourselves and use the
  // windowsVerbatimArguments escape hatch so Node doesn't requote the args.
  const proc = isWin
    ? spawn(`"${nextBin}"`, ["dev", "--turbopack"], {
        cwd: repoRoot,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        windowsVerbatimArguments: true,
      })
    : spawn(nextBin, ["dev", "--turbopack"], {
        cwd: repoRoot,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
      });
  proc.stdout.on("data", (b) => process.stdout.write(`  next> ${b}`));
  proc.stderr.on("data", (b) => process.stderr.write(`  next! ${b}`));
  return proc;
}

async function smokeRoutes() {
  const results = [];
  for (const path of ROUTES) {
    const r = await fetch(`${BASE}${path}`);
    results.push({ path, status: r.status });
    log(`GET  ${path}  -> ${r.status}`);
    if (!r.ok) throw new Error(`route ${path} returned ${r.status}`);
  }
  return results;
}

async function smokeSyncApi() {
  const r = await fetch(`${BASE}/api/sync`, { method: "POST" });
  log(`POST /api/sync (no auth)  -> ${r.status}`);
  if (r.status !== 401) {
    throw new Error(`expected 401 from /api/sync without token, got ${r.status}`);
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/c/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function screenshot(route) {
  const chrome = findChrome();
  if (!chrome) {
    log("no Chrome/Edge binary found; skipping screenshot");
    return null;
  }
  const outDir = resolve(__dirname);
  mkdirSync(outDir, { recursive: true });
  const safe = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_");
  const out = resolve(outDir, `${safe}.png`);
  log(`screenshotting ${BASE}${route}  ->  ${out}`);
  await new Promise((resolveP, rejectP) => {
    const p = spawn(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1280,1800",
      "--virtual-time-budget=4000",
      `--screenshot=${out}`,
      `${BASE}${route}`,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (b) => (err += b.toString()));
    p.on("exit", (code) => (code === 0 ? resolveP() : rejectP(new Error(`chrome exit ${code}: ${err}`))));
  });
  return out;
}

let proc = null;
let exitCode = 0;
try {
  proc = startDevServer();
  await waitForServer(`${BASE}/`);
  log("server is up");
  await smokeRoutes();
  await smokeSyncApi();
  if (wantScreenshot) {
    const p = await screenshot(routeArg);
    if (p) log(`saved ${p}`);
  }
  log("OK");
} catch (e) {
  console.error("[run-hittagira] FAIL:", e.message);
  exitCode = 1;
} finally {
  if (proc && !keep) {
    log("stopping dev server");
    if (process.platform === "win32" && proc.pid) {
      // SIGTERM does not propagate from the cmd shim to the child `node`
      // process group on Windows. Use taskkill /T to nuke the tree.
      const { spawnSync } = await import("node:child_process");
      spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 3000).unref();
    }
  } else if (keep) {
    log(`dev server left running at ${BASE} (PID ${proc?.pid}); kill it manually`);
  }
  process.exit(exitCode);
}
