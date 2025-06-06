import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Get top 10 processes by CPU usage
    const { stdout } = await execAsync(
      "ps aux --sort=-%cpu | head -11 | tail -10 | awk '{print $2, $3, $4, $11}' | sed 's/[[:space:]]*$//'",
    )

    const processes = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        const pid = parts[0]
        const cpu = Number.parseFloat(parts[1]) || 0
        const memory = Number.parseFloat(parts[2]) || 0
        const command = parts.slice(3).join(" ")

        return {
          pid: Number.parseInt(pid),
          cpu,
          memory,
          command: command.length > 30 ? command.substring(0, 30) + "..." : command,
        }
      })
      .filter((process) => process.pid && !isNaN(process.pid))

    return NextResponse.json(processes)
  } catch (error) {
    console.error("Error fetching processes:", error)
    return NextResponse.json({ error: "Failed to fetch processes" }, { status: 500 })
  }
}
