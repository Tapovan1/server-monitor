"use client"

import { useState, useEffect } from "react"
import { Activity, Cpu, HardDrive, Network, Server, Thermometer, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis } from "recharts"

interface ServerData {
  timestamp: string
  cpu: number
  memory: {
    percentage: number
    used: number
    total: number
  }
  disk: {
    total: string
    used: string
    available: string
    percentage: number
  }
  network: {
    download: number
    upload: number
  }
  systemLoad: {
    load1: number
    load5: number
    load15: number
  }
  uptime: string
  activeConnections: number
  processCount: number
  temperature: number | null
  status: string
}

interface Service {
  name: string
  status: string
  active: boolean
}

interface Process {
  pid: number
  cpu: number
  memory: number
  command: string
}

export default function UbuntuDashboard() {
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [loading, setLoading] = useState(true)

  // Fetch server data
  const fetchServerData = async () => {
    try {
      const response = await fetch("/api/server-stats")
      if (response.ok) {
        const data = await response.json()
        setServerData(data)
        setIsConnected(true)

        // Update chart data
        const newPoint = {
          time: new Date(data.timestamp).toLocaleTimeString(),
          cpu: data.cpu,
          memory: data.memory.percentage,
          network: data.network.download,
        }

        setChartData((prev) => {
          const updated = [...prev, newPoint]
          return updated.slice(-10) // Keep last 10 points
        })

        setLastUpdate(new Date())
        setLoading(false)
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error("Error fetching server data:", error)
      setIsConnected(false)
    }
  }

  // Fetch services data
  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services")
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }

  // Fetch processes data
  const fetchProcesses = async () => {
    try {
      const response = await fetch("/api/processes")
      if (response.ok) {
        const data = await response.json()
        setProcesses(data)
      }
    } catch (error) {
      console.error("Error fetching processes:", error)
    }
  }

  // Initial fetch and setup interval
  useEffect(() => {
    fetchServerData()
    fetchServices()
    fetchProcesses()

    const interval = setInterval(() => {
      fetchServerData()
      fetchServices()
      fetchProcesses()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "critical":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500"
      case "stopped":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Ubuntu server data...</p>
        </div>
      </div>
    )
  }

  if (!serverData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load server data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ubuntu Server Monitor</h1>
            <p className="text-gray-600">Real-time system monitoring dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm text-gray-600">{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
            <Badge variant="outline">Last update: {lastUpdate.toLocaleTimeString()}</Badge>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.cpu}%</div>
              <Progress value={serverData.cpu} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {serverData.cpu < 50 ? "Normal" : serverData.cpu < 80 ? "High" : "Critical"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.memory.percentage}%</div>
              <Progress value={serverData.memory.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {serverData.memory.used.toFixed(1)} GB / {serverData.memory.total.toFixed(1)} GB used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.disk.percentage}%</div>
              <Progress value={serverData.disk.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {serverData.disk.used} / {serverData.disk.total} used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.network.download} MB</div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>↓ {serverData.network.download} MB</span>
                <span>↑ {serverData.network.upload} MB</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>CPU & Memory Usage</CardTitle>
              <CardDescription>Real-time system resource usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cpu: {
                    label: "CPU",
                    color: "hsl(var(--chart-1))",
                  },
                  memory: {
                    label: "Memory",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={chartData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="cpu" stroke="var(--color-cpu)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="var(--color-memory)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Processes</CardTitle>
              <CardDescription>Processes by CPU usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processes.slice(0, 8).map((process) => (
                  <div key={process.pid} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{process.command}</p>
                      <p className="text-muted-foreground">PID: {process.pid}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{process.cpu.toFixed(1)}%</p>
                      <p className="text-muted-foreground">{process.memory.toFixed(1)}% mem</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Overall Health</span>
                <Badge className={getStatusColor(serverData.status)}>{serverData.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Uptime</span>
                <span className="font-mono text-sm">{serverData.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Connections</span>
                <span className="font-mono">{serverData.activeConnections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Running Processes</span>
                <span className="font-mono">{serverData.processCount}</span>
              </div>
              {serverData.temperature && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </span>
                  <span className="font-mono">{serverData.temperature}°C</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Load
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>1 min</span>
                  <span>{serverData.systemLoad.load1.toFixed(2)}</span>
                </div>
                <Progress value={Math.min(serverData.systemLoad.load1 * 25, 100)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>5 min</span>
                  <span>{serverData.systemLoad.load5.toFixed(2)}</span>
                </div>
                <Progress value={Math.min(serverData.systemLoad.load5 * 25, 100)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>15 min</span>
                  <span>{serverData.systemLoad.load15.toFixed(2)}</span>
                </div>
                <Progress value={Math.min(serverData.systemLoad.load15 * 25, 100)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.slice(0, 6).map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <span className="capitalize">{service.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getServiceStatusColor(service.status)}`} />
                    <span className="text-sm capitalize">{service.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
