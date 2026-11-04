import { cache } from "react";
import { siteForHost } from "./domain";
import { CORE } from "./catalog";
import type { Site } from "./types";
export const resolveSite = cache(
  async (input: string): Promise<Site | null> => {
    const known = siteForHost(input);
    if (known) return known;
    const host = input.toLowerCase().split(":")[0];
    if (!/^[a-z0-9][a-z0-9-]{1,62}\.self\.com\.tw$/.test(host)) return null;
    try {
      const r = await fetch(
        CORE + "?action=domain-check&host=" + encodeURIComponent(host),
        { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
      );
      if (!r.ok) return null;
      const d = await r.json();
      return {
        kind: "brand",
        host,
        slug: d.slug,
        name: d.name,
        wordmark: d.wordmark || d.name,
        origin: "https://" + host,
      };
    } catch {
      return null;
    }
  },
);
