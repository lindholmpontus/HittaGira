import "./_env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../db/client";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error("Migrate failed:", err);
  process.exit(1);
});
