import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
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

// Translation map: German name -> { en: English, sl: Slovenian }
const translations: Record<string, { en: string; sl: string }> = {
  "Grosse Brücke": { en: "Large Bridge", sl: "Velik most" },
  "Kleine Brücke": { en: "Small Bridge", sl: "Majhen most" },
  "Boots-Steg": { en: "Boat Dock", sl: "Pomol za čolne" },
  "Komposthaufen": { en: "Compost Heap", sl: "Kompostni kup" },
  "Brennholzlager": { en: "Firewood Storage", sl: "Skladišče drv" },
  "Gewächshaus": { en: "Greenhouse", sl: "Rastlinjak" },
  "Technikhaus (Solaranlage auf Dach)": { en: "Technical Building (Solar Panels on Roof)", sl: "Tehniška zgradba (sončne celice na strehi)" },
  "Haupthaus": { en: "Main House", sl: "Glavna hiša" },
  "Aussichtsturm": { en: "Observation Tower", sl: "Razgledni stolp" },
  "Feuerstelle": { en: "Fire Pit", sl: "Kurišče" },
  "Entwickler-Office": { en: "Developer Office", sl: "Pisarna razvijalcev" },
  "Lagerhaus": { en: "Warehouse", sl: "Skladišče" },
  "Werkzeughaus": { en: "Tool Shed", sl: "Shramba za orodje" },
  "Relaxing-Area": { en: "Relaxing Area", sl: "Prostor za sprostitev" },
  "Loch NETNODE (Loch Ness)": { en: "NETNODE Lake (Loch Ness)", sl: "Jezero NETNODE (Loch Ness)" },
  "Hühner-Stall": { en: "Chicken Coop", sl: "Kokošnjak" },
  "Partytisch": { en: "Party Table", sl: "Zabavna miza" },
};

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  const locations = await db.select().from(schema.imageLocations);

  console.log("Updating translations...\n");

  for (const loc of locations) {
    const translation = translations[loc.name];

    if (translation) {
      await db
        .update(schema.imageLocations)
        .set({
          nameEn: translation.en,
          nameSl: translation.sl,
        })
        .where(eq(schema.imageLocations.id, loc.id));

      console.log(`✓ ${loc.name}`);
      console.log(`  EN: ${translation.en}`);
      console.log(`  SL: ${translation.sl}`);
    } else {
      console.log(`✗ No translation found for: ${loc.name}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
