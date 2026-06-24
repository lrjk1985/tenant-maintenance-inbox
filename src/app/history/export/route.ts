import { NextResponse, type NextRequest } from "next/server";

import { auditLogsToCsv } from "@/lib/audit-csv";
import { filterAuditLogs, parseAuditCategory } from "@/lib/audit-search";
import { getHistoryData } from "@/lib/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = parseAuditCategory(searchParams.get("category"));
  const query = searchParams.get("q")?.trim() ?? "";
  const dateFrom = searchParams.get("from")?.trim() ?? "";
  const dateTo = searchParams.get("to")?.trim() ?? "";
  const data = await getHistoryData();
  const visibleLogs = filterAuditLogs(data.auditLogs, data.staff, query, {
    category,
    dateFrom,
    dateTo,
  });
  const csv = auditLogsToCsv(visibleLogs, data.staff);
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="maintenance-history-${fileDate}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
