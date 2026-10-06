import { homeJson } from "@/lib/home/apiResponse";
import { getDailyBrief } from "@/lib/home/dailyBrief";

/** GET /api/home/brief -> { data: DailyBrief } (the edition in force now; never an error: there is always the automatic summary) */
export async function GET() {
  return homeJson({ data: await getDailyBrief() });
}
