const NHL_API_BASE = process.env.NHL_API_BASE_URL || "https://api-web.nhle.com";

/**
 * Fetch from the NHL API. Returns parsed JSON.
 * Throws on non-2xx responses.
 */
export async function fetchNHL<T = unknown>(path: string): Promise<T> {
  const url = `${NHL_API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // No cache in scripts; Next.js API routes can add their own caching
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`NHL API error: ${res.status} ${res.statusText} for ${url}`);
  }

  return res.json() as Promise<T>;
}
