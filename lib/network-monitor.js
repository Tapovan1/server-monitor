import { exec } from "child_process"
import { promisify } from "util"
import { insertNetworkEvent, insertNetworkMonitoring } from "./database.js"

const execAsync = promisify(exec)

let lastNetworkStatus = "unknown"
let networkDownTime= null
let consecutiveFailures = 0

export const checkNetworkConnectivity = async () => {
  const startTime = Date.now()

  try {
    // Quick check - ping Google DNS with short timeout
    await execAsync("ping -c 1 -W 2 8.8.8.8", { timeout: 3000 })
    const pingTime = Date.now() - startTime
    consecutiveFailures = 0
    return { isOnline: true, pingTime, target: "8.8.8.8" }
  } catch {
    consecutiveFailures++
    console.log(`🔍 Internet ping failed (attempt ${consecutiveFailures})`)

    try {
      // Check local gateway with even shorter timeout
      const localStartTime = Date.now()
      await execAsync("ping -c 1 -W 1 192.168.1.1", { timeout: 2000 })
      const localPingTime = Date.now() - localStartTime
      console.log("🏠 Local network OK, internet may be down")
      return {
        isOnline: false,
        pingTime: localPingTime,
        target: "192.168.1.1",
        failureReason: "Internet down, local network OK",
      }
    } catch {
      const totalTime = Date.now() - startTime
      console.log("🔴 Both internet and local network failed")
      return {
        isOnline: false,
        pingTime: totalTime,
        target: "both",
        failureReason: "Complete network failure",
      }
    }
  }
}

export const checkLocalServices = async () => {
  try {
    // Check if local monitoring is working
    const { stdout } = await execAsync("ps aux | grep -v grep | grep node")
    return stdout.includes("node")
  } catch {
    return false
  }
}

export const monitorNetworkStatus = async () => {
  try {
    const startTime = Date.now()
    const networkCheck = await checkNetworkConnectivity()
    const checkDuration = Date.now() - startTime

    const currentStatus = networkCheck.isOnline ? "online" : "offline"
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

    // Always log network monitoring data (lightweight)
    insertNetworkMonitoring(currentStatus, networkCheck.pingTime, networkCheck.target, consecutiveFailures)

    console.log(`🌐 Network: ${currentStatus} (${networkCheck.pingTime}ms to ${networkCheck.target}) at ${timestamp}`)

    // Only log events when status changes
    if (currentStatus !== lastNetworkStatus && lastNetworkStatus !== "unknown") {
      if (currentStatus === "offline") {
        networkDownTime = new Date()
        insertNetworkEvent(
          "network_down",
          `Network connectivity lost (after ${consecutiveFailures} failed attempts)`,
          undefined,
          "primary",
          networkCheck.target,
          networkCheck.failureReason,
        )
        console.log(`🔴 NETWORK DOWN EVENT at ${timestamp} - Only network monitoring active`)
      } else {
        const downDuration = networkDownTime ? Math.floor((new Date().getTime() - networkDownTime.getTime()) / 1000) : 0
        insertNetworkEvent(
          "network_up",
          `Network connectivity restored (was down for ${downDuration}s)`,
          downDuration,
          "primary",
          networkCheck.target,
        )
        console.log(`🟢 NETWORK UP EVENT at ${timestamp} - Resuming full monitoring`)
        networkDownTime = null
        consecutiveFailures = 0
      }
    }

    lastNetworkStatus = currentStatus
    return {
      isOnline: networkCheck.isOnline,
      status: currentStatus,
      checkDuration,
      consecutiveFailures,
      pingTime: networkCheck.pingTime,
      target: networkCheck.target,
    }
  } catch (error) {
    console.error("❌ Error monitoring network status:", error)
    return { isOnline: false, status: "error", checkDuration: 0, consecutiveFailures, pingTime: 0, target: "error" }
  }
}

// Fast network check for immediate testing
export const fastNetworkCheck = async () => {
  console.log("⚡ Running FAST network check...")

  for (let i = 0; i < 3; i++) {
    const result = await monitorNetworkStatus()
    console.log(`Check ${i + 1}: ${result.status} (${result.pingTime}ms to ${result.target})`)

    if (result.status === "offline") {
      console.log("🔴 Network DOWN detected in fast check!")
      return result
    }

    // Wait 2 seconds between checks
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return await monitorNetworkStatus()
}
