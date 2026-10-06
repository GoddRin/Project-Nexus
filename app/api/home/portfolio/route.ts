import { homeJson } from "@/lib/home/apiResponse";
import { getPortfolioStats } from "@/lib/home/portfolio";

/** GET /api/home/portfolio -> { data: PortfolioStats | null } */
export async function GET() {
  return homeJson({ data: await getPortfolioStats() });
}
