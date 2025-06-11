import { exec } from "child_process"
import { promisify } from "util"
import { insertNetworkEvent } from "./database.js"

const execAsync = promisify(exec)

let lastNetworkStatus = "unknown"
let networkDownTime = null

export const checkNetworkConnectivity = async () => {
  try {
    // Check internet connectivity
    await execAsync("ping -c 1 -W 5 8.8.8.8", { timeout: 10000 })
    return true
  } catch {
    try {
      // Check local network
      await execAsync("ping -c 1 -W 3 192.168.1.1", { timeout: 5000 })
      return true
    } catch {
      return false
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
  const isOnline = await checkNetworkConnectivity()
  const currentStatus = isOnline ? "online" : "offline"

  if (currentStatus !== lastNetworkStatus) {
    if (currentStatus === "offline") {
      networkDownTime = new Date()
      insertNetworkEvent("network_down", "Network connectivity lost")
      console.log("🔴 Network is DOWN - Storing data locally")
    } else {
      const downDuration = networkDownTime ? Math.floor((new Date().getTime() - networkDownTime.getTime()) / 1000) : 0

      insertNetworkEvent("network_up", "Network connectivity restored", downDuration)
      console.log(`🟢 Network is UP - Was down for ${downDuration} seconds`)
      networkDownTime = null
    }

    lastNetworkStatus = currentStatus
  }

  return { isOnline, status: currentStatus }
}
