import { homeJson } from "@/lib/home/apiResponse";
import { getTickerItems } from "@/lib/home/ticker";

/** GET /api/home/ticker -> { data: TickerItem[] } (the live ticker's mixed items) */
export async function GET() {
  return homeJson({ data: await getTickerItems() });
}
