import { NextResponse } from "next/server"
import { getHistoricalData, getNetworkEvents, exportData } from "@/lib/database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = Number.parseInt(searchParams.get("hours") || "24")
    const format = searchParams.get("format") || "json"

    if (format === "export") {
      const exportedData = exportData(hours)

      return new NextResponse(JSON.stringify(exportedData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="server-monitoring-${new Date().toISOString().split("T")[0]}.json"`,
        },
      })
    }

    const metrics = getHistoricalData(hours)
    const events = getNetworkEvents(hours)

    return NextResponse.json({
      metrics,
      events,
      summary: {
        totalRecords: metrics.length,
        timeRange: `${hours} hours`,
        networkEvents: events.length,
        lastUpdate: metrics[0]?.timestamp || null,
      },
    })
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 })
  }
}
