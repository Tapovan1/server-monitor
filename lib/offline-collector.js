import { exec } from "child_process"
import { promisify } from "util"
import { insertServerMetrics, initDatabase } from "./database.js"
import { monitorNetworkStatus, fastNetworkCheck as networkFastCheck } from "./network-monitor.js"
import fs from "fs"
import path from "path"

const execAsync = promisify(exec)

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize database on startup
try {
  initDatabase()
  console.log("✅ Database initialized successfully")
} catch (error) {
  console.error("❌ Database initialization failed:", error)
}

let collectionInterval = null
let networkCheckInterval = null
let isNetworkDown = false

const collectServerData = async () => {
  try {
    // Only collect full server data when network is UP
    if (isNetworkDown) {
      console.log("🔴 Network is down - Skipping CPU/Memory collection")
      return null
    }

    // Collect server metrics only when network is online
    const getCpuUsage = async () => {
      try {
        const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
        return Number.parseFloat(stdout.trim()) || 0
      } catch {
        return 0
      }
    }

    const getMemoryUsage = async () => {
      try {
        const { stdout } = await execAsync(
          "free | grep Mem | awk '{printf \"%.1f %.1f %.1f\", $3/$2 * 100.0, $3/1024/1024, $2/1024/1024}'",
        )
        const [percentage, used, total] = stdout.trim().split(" ").map(Number.parseFloat)
        return { percentage: percentage || 0, used: used || 0, total: total || 0 }
      } catch {
        return { percentage: 0, used: 0, total: 0 }
      }
    }

    const getDiskUsage = async () => {
      try {
        const { stdout } = await execAsync("df -h / | awk 'NR==2{printf \"%s %s %s %s\", $2,$3,$4,$5}'")
        const [total, used, available, percentage] = stdout.trim().split(" ")
        return {
          total,
          used,
          available,
          percentage: Number.parseInt(percentage.replace("%", "")) || 0,
        }
      } catch {
        return { total: "0G", used: "0G", available: "0G", percentage: 0 }
      }
    }

    const getNetworkStats = async () => {
      try {
        const { stdout } = await execAsync(
          "cat /proc/net/dev | grep -E '(eth0|ens|enp)' | head -1 | awk '{print $2, $10}'",
        )
        const [rxBytes, txBytes] = stdout.trim().split(" ").map(Number)
        return {
          download: Math.round((rxBytes || 0) / 1024 / 1024),
          upload: Math.round((txBytes || 0) / 1024 / 1024),
        }
      } catch {
        return { download: 0, upload: 0 }
      }
    }

    const getSystemLoad = async () => {
      try {
        const { stdout } = await execAsync("cat /proc/loadavg | awk '{print $1, $2, $3}'")
        const [load1, load5, load15] = stdout.trim().split(" ").map(Number.parseFloat)
        return { load1: load1 || 0, load5: load5 || 0, load15: load15 || 0 }
      } catch {
        return { load1: 0, load5: 0, load15: 0 }
      }
    }

    const getActiveConnections = async () => {
      try {
        const { stdout } = await execAsync("netstat -an | grep ESTABLISHED | wc -l")
        return Number.parseInt(stdout.trim()) || 0
      } catch {
        return 0
      }
    }

    const getProcessCount = async () => {
      try {
        const { stdout } = await execAsync("ps aux | wc -l")
        return Number.parseInt(stdout.trim()) - 1 || 0
      } catch {
        return 0
      }
    }

    // Collect all data
    const [cpuUsage, memoryUsage, diskUsage, networkStats, systemLoad, activeConnections, processCount] =
      await Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskUsage(),
        getNetworkStats(),
        getSystemLoad(),
        getActiveConnections(),
        getProcessCount(),
      ])

    const serverData = {
      cpu: Math.round(cpuUsage),
      memory: {
        percentage: Math.round(memoryUsage.percentage),
        used: memoryUsage.used,
        total: memoryUsage.total,
      },
      disk: diskUsage,
      network: networkStats,
      systemLoad,
      activeConnections,
      processCount,
      temperature: null,
      status:
        cpuUsage > 90 || memoryUsage.percentage > 90
          ? "critical"
          : cpuUsage > 70 || memoryUsage.percentage > 70
            ? "warning"
            : "healthy",
      networkStatus: "online",
    }

    // Store data locally
    const result = insertServerMetrics(serverData)

    if (result) {
      const timestamp = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
      console.log(`📊 Data collected at ${timestamp}: CPU ${serverData.cpu}%, Memory ${serverData.memory.percentage}%`)
    }

    return serverData
  } catch (error) {
    console.error("Error collecting server data:", error)
    return null
  }
}

const checkNetworkAndUpdate = async () => {
  try {
    const networkResult = await monitorNetworkStatus()
    const wasNetworkDown = isNetworkDown
    isNetworkDown = !networkResult.isOnline

    // Log network status change
    if (wasNetworkDown !== isNetworkDown) {
      if (isNetworkDown) {
        console.log("🔴 Network DOWN - Stopping CPU/Memory collection, monitoring network only")
      } else {
        console.log("🟢 Network UP - Resuming full system monitoring")
      }
    }

    return networkResult
  } catch (error) {
    console.error("Error checking network:", error)
    isNetworkDown = true
    return { isOnline: false, status: "error" }
  }
}

// Start background data collection
export const startOfflineCollection = () => {
  if (collectionInterval) {
    clearInterval(collectionInterval)
  }

  if (networkCheckInterval) {
    clearInterval(networkCheckInterval)
  }

  console.log("🚀 Starting smart data collection...")
  console.log("📊 Full system data: Only when network is UP")
  console.log("🌐 Network monitoring: Always (every 5 seconds)")

  // Check network immediately
  checkNetworkAndUpdate()

  // Check network every 5 seconds (always)
  networkCheckInterval = setInterval(checkNetworkAndUpdate, 5000)

  // Collect server data every 15 seconds (only when network is UP)
  collectionInterval = setInterval(() => {
    if (!isNetworkDown) {
      collectServerData()
    } else {
      console.log("⏸️ Network down - Skipping system data collection")
    }
  }, 15000)
}

// Stop background collection
export const stopOfflineCollection = () => {
  if (collectionInterval) {
    clearInterval(collectionInterval)
    collectionInterval = null
  }

  if (networkCheckInterval) {
    clearInterval(networkCheckInterval)
    networkCheckInterval = null
  }

  console.log("⏹️ Stopped offline data collection")
}

// Test network detection immediately
export const testNetworkDetection = async () => {
  console.log("🧪 TESTING NETWORK DETECTION...")
  console.log("Remove your network cable now and watch for detection...")

  for (let i = 0; i < 10; i++) {
    console.log(`\n--- Test ${i + 1}/10 ---`)
    await networkFastCheck()
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}

// Re-export the fast network check function
export const fastNetworkCheck = networkFastCheck

// Export for manual collection
export { collectServerData }
