import { NextResponse } from "next/server"
import { fastNetworkCheck, testNetworkDetection } from "@/lib/offline-collector"

export async function GET() {
  try {
    console.log("🧪 Starting network detection test...")

    // Run immediate test
    const result = await fastNetworkCheck()

    return NextResponse.json({
      message: "Network test completed - check console logs",
      result,
      instructions: [
        "1. Remove your network cable now",
        "2. Watch the console logs for detection",
        "3. Should detect within 5-10 seconds",
        "4. Reconnect cable to see 'network up' event",
      ],
    })
  } catch (error) {
    console.error("Error testing network:", error)
    return NextResponse.json({ error: "Failed to test network" }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log("🧪 Starting extended network test...")

    // Start the test in background
    testNetworkDetection()

    return NextResponse.json({
      message: "Extended network test started - check console for 30 seconds",
      instructions: [
        "Remove and reconnect your cable multiple times",
        "Each change should be detected within 5 seconds",
        "Check console logs for real-time detection",
      ],
    })
  } catch (error) {
    console.error("Error starting network test:", error)
    return NextResponse.json({ error: "Failed to start network test" }, { status: 500 })
  }
}
