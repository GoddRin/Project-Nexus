interface OverpassOptions {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  nodes?: number[];
}

export async function fetchOverpass(
  query: string,
  options?: OverpassOptions,
  timeoutMs: number = 20000
): Promise<OverpassElement[]> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[Overpass] Querying endpoint: ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ProjectNexusMap/1.0 (contact@projectnexus.dev)",
          "Accept": "application/json",
        },
        signal: controller.signal,
        next: options?.next,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Overpass] Endpoint ${endpoint} failed with HTTP status ${res.status}`);
        lastError = new Error(`HTTP ${res.status} from ${endpoint}`);
        continue;
      }

      const data = await res.json() as { elements?: OverpassElement[]; remark?: string };
      
      if (data && data.remark) {
        console.warn(`[Overpass] Endpoint ${endpoint} returned 200 but has remark: ${data.remark}`);
        lastError = new Error(`Remark from ${endpoint}: ${data.remark}`);
        continue;
      }

      if (data && data.elements) {
        console.log(`[Overpass] Successfully retrieved ${data.elements.length} elements from ${endpoint}`);
        return data.elements;
      }

      lastError = new Error(`Invalid response format from ${endpoint}`);
    } catch (err) {
      const errorObject = err instanceof Error ? err : new Error(String(err));
      console.error(`[Overpass] Error querying endpoint ${endpoint}:`, errorObject.message);
      lastError = errorObject;
    }
  }

  throw lastError || new Error("All Overpass endpoints failed");
}
