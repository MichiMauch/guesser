import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../lib/db/schema";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf8");
  envFile.split("\n").forEach((line) => {
    const [key, ...values] = line.split("=");
    if (key && values.length) {
      process.env[key.trim()] = values.join("=").trim();
    }
  });
} catch (e) {
  console.error("Could not load .env.local");
}

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  const locations = await db.select().from(schema.imageLocations);

  console.log("Current image locations:");
  console.log("========================");
  locations.forEach((loc) => {
    console.log(`- ${loc.name} (id: ${loc.id}, imageMapId: ${loc.imageMapId})`);
    console.log(`  nameEn: ${loc.nameEn || "NULL"}`);
    console.log(`  nameSl: ${loc.nameSl || "NULL"}`);
  });
}

main().catch(console.error);
