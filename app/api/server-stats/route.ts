import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Get CPU usage
    const getCpuUsage = async () => {
      try {
        const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
        return Number.parseFloat(stdout.trim()) || 0
      } catch {
        return 0
      }
    }

    // Get memory usage
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

    // Get disk usage
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

    // Get network stats
    const getNetworkStats = async () => {
      try {
        const { stdout } = await execAsync(
          "cat /proc/net/dev | grep -E '(eth0|ens|enp)' | head -1 | awk '{print $2, $10}'",
        )
        const [rxBytes, txBytes] = stdout.trim().split(" ").map(Number)
        return {
          download: Math.round((rxBytes || 0) / 1024 / 1024), // MB
          upload: Math.round((txBytes || 0) / 1024 / 1024), // MB
        }
      } catch {
        return { download: 0, upload: 0 }
      }
    }

    // Get system load
    const getSystemLoad = async () => {
      try {
        const { stdout } = await execAsync("cat /proc/loadavg | awk '{print $1, $2, $3}'")
        const [load1, load5, load15] = stdout.trim().split(" ").map(Number.parseFloat)
        return { load1: load1 || 0, load5: load5 || 0, load15: load15 || 0 }
      } catch {
        return { load1: 0, load5: 0, load15: 0 }
      }
    }

    // Get uptime
    const getUptime = async () => {
      try {
        const { stdout } = await execAsync("uptime -p")
        return stdout.trim().replace("up ", "") || "unknown"
      } catch {
        return "unknown"
      }
    }

    // Get active connections
    const getActiveConnections = async () => {
      try {
        const { stdout } = await execAsync("netstat -an | grep ESTABLISHED | wc -l")
        return Number.parseInt(stdout.trim()) || 0
      } catch {
        return 0
      }
    }

    // Get running processes
    const getProcessCount = async () => {
      try {
        const { stdout } = await execAsync("ps aux | wc -l")
        return Number.parseInt(stdout.trim()) - 1 || 0 // Subtract header line
      } catch {
        return 0
      }
    }

    // Get system temperature (if available)
    const getTemperature = async () => {
      try {
        const { stdout } = await execAsync("sensors | grep 'Core 0' | awk '{print $3}' | cut -d'+' -f2 | cut -d'°' -f1")
        return Number.parseFloat(stdout.trim()) || null
      } catch {
        return null
      }
    }

    // Execute all commands in parallel
    const [
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkStats,
      systemLoad,
      uptime,
      activeConnections,
      processCount,
      temperature,
    ] = await Promise.all([
      getCpuUsage(),
      getMemoryUsage(),
      getDiskUsage(),
      getNetworkStats(),
      getSystemLoad(),
      getUptime(),
      getActiveConnections(),
      getProcessCount(),
      getTemperature(),
    ])

    const serverData = {
      timestamp: new Date().toISOString(),
      cpu: Math.round(cpuUsage),
      memory: {
        percentage: Math.round(memoryUsage.percentage),
        used: memoryUsage.used,
        total: memoryUsage.total,
      },
      disk: diskUsage,
      network: networkStats,
      systemLoad,
      uptime,
      activeConnections,
      processCount,
      temperature,
      status:
        cpuUsage > 90 || memoryUsage.percentage > 90
          ? "critical"
          : cpuUsage > 70 || memoryUsage.percentage > 70
            ? "warning"
            : "healthy",
    }

    return NextResponse.json(serverData)
  } catch (error) {
    console.error("Error fetching server stats:", error)
    return NextResponse.json({ error: "Failed to fetch server stats" }, { status: 500 })
  }
}
