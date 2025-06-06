"use client"

import { useState, useEffect } from "react"
import { Activity, Cpu, HardDrive, Network, Server, Wifi, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Line, LineChart, XAxis, YAxis } from "recharts"

// Mock data generator for server metrics
const generateServerData = () => {
  const now = new Date()
  const timeString = now.toLocaleTimeString()

  return {
    timestamp: timeString,
    cpu: Math.floor(Math.random() * 100),
    memory: Math.floor(Math.random() * 100),
    disk: Math.floor(Math.random() * 100),
    network: {
      upload: Math.floor(Math.random() * 1000),
      download: Math.floor(Math.random() * 2000),
    },
    activeConnections: Math.floor(Math.random() * 500) + 100,
    responseTime: Math.floor(Math.random() * 200) + 50,
    uptime: "99.9%",
    status: Math.random() > 0.1 ? "healthy" : "warning",
  }
}

// Generate initial chart data
const generateChartData = () => {
  return Array.from({ length: 10 }, (_, i) => ({
    time: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes() - 9 + i).padStart(2, "0")}`,
    cpu: Math.floor(Math.random() * 100),
    memory: Math.floor(Math.random() * 100),
    network: Math.floor(Math.random() * 1000),
  }))
}

export default function RealtimeDashboard() {
  const [serverData, setServerData] = useState(generateServerData())
  const [chartData, setChartData] = useState(generateChartData())
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(true)

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newData = generateServerData()
      setServerData(newData)
      setLastUpdate(new Date())

      // Update chart data (keep last 10 points)
      setChartData((prev) => {
        const newPoint = {
          time: newData.timestamp,
          cpu: newData.cpu,
          memory: newData.memory,
          network: newData.network.download,
        }
        return [...prev.slice(1), newPoint]
      })

      // Simulate connection status
      setIsConnected(Math.random() > 0.05)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getProgressColor = (value: number) => {
    if (value < 50) return "bg-green-500"
    if (value < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Server Monitor</h1>
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
              <div className="text-2xl font-bold">{serverData.memory}%</div>
              <Progress value={serverData.memory} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">8.2 GB / 16 GB used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.network.download} MB/s</div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>↓ {serverData.network.download} MB/s</span>
                <span>↑ {serverData.network.upload} MB/s</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData.responseTime}ms</div>
              <p className="text-xs text-muted-foreground mt-2">Average response time</p>
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
              <CardTitle>Network Traffic</CardTitle>
              <CardDescription>Data transfer over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  network: {
                    label: "Network",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[300px]"
              >
                <AreaChart data={chartData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="network"
                    stroke="var(--color-network)"
                    fill="var(--color-network)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Server Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Overall Health</span>
                <Badge className={getStatusColor(serverData.status)}>{serverData.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Uptime</span>
                <span className="font-mono">{serverData.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Connections</span>
                <span className="font-mono">{serverData.activeConnections}</span>
              </div>
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
                  <span>2.1</span>
                </div>
                <Progress value={21} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>5 min</span>
                  <span>1.8</span>
                </div>
                <Progress value={18} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>15 min</span>
                  <span>1.5</span>
                </div>
                <Progress value={15} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Web Server", status: "running" },
                { name: "Database", status: "running" },
                { name: "Cache", status: "running" },
                { name: "Queue", status: "warning" },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <span>{service.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`} />
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
