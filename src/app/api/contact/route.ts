import { handleLead } from "@/lib/leads/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleLead("contact", request);
}
