import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  try {
    const services = ["nginx", "apache2", "mysql", "postgresql", "redis-server", "docker", "ssh"]

    const getServiceStatus = async (serviceName: string) => {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${serviceName}`)
        const status = stdout.trim()
        return {
          name: serviceName,
          status: status === "active" ? "running" : status === "inactive" ? "stopped" : "unknown",
          active: status === "active",
        }
      } catch {
        return {
          name: serviceName,
          status: "not-installed",
          active: false,
        }
      }
    }

    const serviceStatuses = await Promise.all(services.map((service) => getServiceStatus(service)))

    // Filter out services that are not installed
    const installedServices = serviceStatuses.filter((service) => service.status !== "not-installed")

    return NextResponse.json(installedServices)
  } catch (error) {
    console.error("Error fetching service status:", error)
    return NextResponse.json({ error: "Failed to fetch service status" }, { status: 500 })
  }
}
