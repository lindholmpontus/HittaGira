import { runSync } from "../lib/sync";

const ids = process.argv
  .slice(2)
  .map((s) => Number(s))
  .filter((n) => !Number.isNaN(n));
const target = ids.length > 0 ? ids : undefined;

const start = Date.now();
runSync(target)
  .then((stats) => {
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Sync OK in ${dur}s:`, stats);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
