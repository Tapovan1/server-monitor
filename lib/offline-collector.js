import { exec } from "child_process"
import { promisify } from "util"
import { insertServerMetrics, initDatabase } from "./database"
import { monitorNetworkStatus } from "./network-monitor"
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

const collectServerData = async () => {
  try {
    // Check network status first
    const networkStatus = await monitorNetworkStatus()

    // Collect server metrics (same as API route)
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

    const getTemperature = async () => {
      try {
        const { stdout } = await execAsync("sensors | grep 'Core 0' | awk '{print $3}' | cut -d'+' -f2 | cut -d'°' -f1")
        return Number.parseFloat(stdout.trim()) || null
      } catch {
        return null
      }
    }

    // Collect all data
    const [cpuUsage, memoryUsage, diskUsage, networkStats, systemLoad, activeConnections, processCount, temperature] =
      await Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskUsage(),
        getNetworkStats(),
        getSystemLoad(),
        getActiveConnections(),
        getProcessCount(),
        getTemperature(),
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
      temperature,
      status:
        cpuUsage > 90 || memoryUsage.percentage > 90
          ? "critical"
          : cpuUsage > 70 || memoryUsage.percentage > 70
            ? "warning"
            : "healthy",
      networkStatus: networkStatus.status,
    }

    // Store data locally
    const result = insertServerMetrics(serverData)

    if (result && !networkStatus.isOnline) {
      console.log(`📊 Data collected offline: CPU ${serverData.cpu}%, Memory ${serverData.memory.percentage}%`)
    }

    return serverData
  } catch (error) {
    console.error("Error collecting server data:", error)
    return null
  }
}

// Start background data collection
export const startOfflineCollection = () => {
  if (collectionInterval) {
    clearInterval(collectionInterval)
  }

  console.log("🚀 Starting offline data collection every 30 seconds...")

  // Collect immediately
  collectServerData()

  // Then collect every 30 seconds
  collectionInterval = setInterval(collectServerData, 30000)
}

// Stop background collection
export const stopOfflineCollection = () => {
  if (collectionInterval) {
    clearInterval(collectionInterval)
    collectionInterval = null
    console.log("⏹️ Stopped offline data collection")
  }
}

// Export for manual collection
export { collectServerData }
