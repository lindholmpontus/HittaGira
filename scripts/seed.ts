import { eq, and, notInArray, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { CATALOG } from "../lib/catalog";

function seed() {
  let mCount = 0;
  let modelCount = 0;
  let modelsDeleted = 0;

  for (let i = 0; i < CATALOG.length; i++) {
    const m = CATALOG[i];
    const existing = db
      .select({ id: schema.manufacturers.id })
      .from(schema.manufacturers)
      .where(eq(schema.manufacturers.slug, m.slug))
      .get();

    let manufacturerId: number;
    if (existing) {
      manufacturerId = existing.id;
      db.update(schema.manufacturers)
        .set({
          name: m.name,
          blurb: m.blurb ?? null,
          logoFile: m.logoFile ?? null,
          sortOrder: i,
        })
        .where(eq(schema.manufacturers.id, manufacturerId))
        .run();
    } else {
      const inserted = db
        .insert(schema.manufacturers)
        .values({
          slug: m.slug,
          name: m.name,
          blurb: m.blurb ?? null,
          logoFile: m.logoFile ?? null,
          sortOrder: i,
        })
        .returning({ id: schema.manufacturers.id })
        .get();
      manufacturerId = inserted!.id;
      mCount += 1;
    }

    for (let j = 0; j < m.models.length; j++) {
      const model = m.models[j];
      const existingModel = db
        .select({ id: schema.models.id })
        .from(schema.models)
        .where(
          and(
            eq(schema.models.manufacturerId, manufacturerId),
            eq(schema.models.slug, model.slug),
          ),
        )
        .get();

      if (existingModel) {
        db.update(schema.models)
          .set({
            name: model.name,
            searchQuery: model.query,
            guitarType: model.guitarType ?? null,
            sortOrder: j,
          })
          .where(eq(schema.models.id, existingModel.id))
          .run();
      } else {
        db.insert(schema.models)
          .values({
            manufacturerId,
            slug: model.slug,
            name: model.name,
            searchQuery: model.query,
            guitarType: model.guitarType ?? null,
            sortOrder: j,
          })
          .run();
        modelCount += 1;
      }
    }

    // Remove models that exist in DB for this manufacturer but not in catalog.
    // Foreign-key cascade drops their ads automatically.
    const keepSlugs = m.models.map((mo) => mo.slug);
    const deleted = db
      .delete(schema.models)
      .where(
        and(
          eq(schema.models.manufacturerId, manufacturerId),
          keepSlugs.length > 0
            ? notInArray(schema.models.slug, keepSlugs)
            : sql`1=1`,
        ),
      )
      .run();
    modelsDeleted += deleted.changes;
  }

  console.log(
    `Seed done. New manufacturers: ${mCount}. New models: ${modelCount}. Removed models: ${modelsDeleted}.`,
  );
}

seed();
