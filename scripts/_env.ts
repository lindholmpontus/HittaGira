// Load .env.local before any module that reads process.env (like db/client).
// Side-effect import — must be the FIRST import in any script that touches the DB.
import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });
