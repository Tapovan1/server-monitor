import { NextResponse } from "next/server"
import { checkNetworkConnectivity, checkLocalServices } from "@/lib/network-monitor"

export async function GET() {
  try {
    const [isOnline, localServicesRunning] = await Promise.all([checkNetworkConnectivity(), checkLocalServices()])

    return NextResponse.json({
      networkOnline: isOnline,
      localServicesRunning,
      timestamp: new Date().toISOString(),
      status: isOnline ? "online" : "offline",
    })
  } catch (error) {
    console.error("Error checking network status:", error)
    return NextResponse.json(
      {
        error: "Failed to check network status",
        networkOnline: false,
        localServicesRunning: false,
        status: "error",
      },
      { status: 500 },
    )
  }
}
