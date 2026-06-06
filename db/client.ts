import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error(
    "TURSO_DATABASE_URL is not set. Add it to .env.local for development " +
      "or to your hosting platform's environment variables for production.",
  );
}

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
