import "server-only";
import { connection } from "next/server";
import type { BusinessData } from "./types";
import { buildDemoData } from "./demo-data";

/**
 * True when Supabase credentials are configured. Until then the app runs in
 * clearly-labelled preview mode with demo data.
 */
export function isDatabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDemoMode() {
  return !isDatabaseConfigured();
}

/**
 * Loads all records for the signed-in user's business.
 * Phase 2 replaces the database branch with Supabase queries scoped by RLS.
 */
export async function getBusinessData(): Promise<BusinessData> {
  // Business data is per-user and time-dependent: always render at request time.
  await connection();
  if (isDemoMode()) return buildDemoData();
  throw new Error(
    "Database connection is configured but not yet wired up (Phase 2).",
  );
}

/** Public storefront lookup — returns only public-safe fields. */
export async function getPublicStore(slug: string) {
  await connection();
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  if (!isDemoMode()) throw new Error("Public storefront lookup is wired up in Phase 4.");
  const d = buildDemoData();
  if (d.business.slug !== slug) return null;
  return {
    name: d.business.name,
    category: d.business.category,
    phone: d.business.phone,
    city: d.business.city,
    products: d.products
      .filter((p) => p.isActive)
      .map((p) => ({ id: p.id, name: p.name, description: p.description, category: p.category, pricePaise: p.pricePaise, imageUrl: p.imageUrl, available: p.stock > 0 })),
  };
}
