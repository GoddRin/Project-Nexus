import { homeJson } from "@/lib/home/apiResponse";
import { getOpsSnapshot } from "@/lib/home/ops";

/** GET /api/home/ops -> { data: OpsSnapshot | null } */
export async function GET() {
  return homeJson({ data: await getOpsSnapshot() });
}
