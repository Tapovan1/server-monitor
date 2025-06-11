"use client"

import { useState, useEffect } from "react"
import { Download, AlertTriangle, Wifi, WifiOff, Database, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis } from "recharts"
import NetworkTest from "./network-test"

interface HistoricalData {
  metrics: any[]
  events: any[]
  summary: {
    totalRecords: number
    timeRange: string
    networkEvents: number
    lastUpdate: string
  }
}

interface NetworkStatus {
  networkOnline: boolean
  localServicesRunning: boolean
  status: string
  timestamp: string
}

export default function HistoricalAnalysis() {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [timeRange, setTimeRange] = useState(24)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState("")

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(`/api/historical-data?hours=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setHistoricalData(data)
      }
    } catch (error) {
      console.error("Error fetching historical data:", error)
    }
  }

  const fetchNetworkStatus = async () => {
    try {
      const response = await fetch("/api/network-status")
      if (response.ok) {
        const data = await response.json()
        setNetworkStatus(data)
      }
    } catch (error) {
      console.error("Error fetching network status:", error)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch(`/api/historical-data?hours=${timeRange}&format=export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `server-monitoring-india-${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  // Update India time every second
  useEffect(() => {
    const updateTime = () => {
      const indiaTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      setCurrentTime(indiaTime)
    }

    updateTime()
    const timeInterval = setInterval(updateTime, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    fetchHistoricalData()
    fetchNetworkStatus()
    setLoading(false)

    const interval = setInterval(() => {
      fetchNetworkStatus()
    }, 5000) // Check every 5 seconds now

    return () => clearInterval(interval)
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const chartData =
    historicalData?.metrics
      .slice(0, 50)
      .reverse()
      .map((metric) => ({
        time: new Date(metric.timestamp).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        }),
        cpu: metric.cpu_usage,
        memory: metric.memory_percentage,
        network: metric.network_status === "offline" ? null : metric.cpu_usage,
      })) || []

  return (
    <div className="space-y-6">
      {/* Network Test Component */}
      <NetworkTest />

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {networkStatus?.networkOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Network & System Status (Fast Detection: 5s)
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              India Time: {currentTime}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span>Network Connection</span>
              <Badge variant={networkStatus?.networkOnline ? "default" : "destructive"}>
                {networkStatus?.networkOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Local Services</span>
              <Badge variant={networkStatus?.localServicesRunning ? "default" : "destructive"}>
                {networkStatus?.localServicesRunning ? "Running" : "Stopped"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Data Collection</span>
              <Badge variant="default">
                <Database className="h-3 w-3 mr-1" />
                Active (15s intervals)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{historicalData?.summary.totalRecords || 0}</div>
            <p className="text-xs text-muted-foreground">Last {timeRange} hours (IST)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Network Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{historicalData?.summary.networkEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Outages detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detection Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">5s</div>
            <p className="text-xs text-muted-foreground">Network check interval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {historicalData?.summary.lastUpdate
                ? new Date(historicalData.summary.lastUpdate).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Most recent data (IST)</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Analysis - India Standard Time (UTC+05:30)</CardTitle>
          <CardDescription>
            View and export historical monitoring data in IST - Network checks every 5 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2">
              {[6, 12, 24, 48, 168].map((hours) => (
                <Button
                  key={hours}
                  variant={timeRange === hours ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(hours)}
                >
                  {hours < 24 ? `${hours}h` : `${hours / 24}d`}
                </Button>
              ))}
            </div>
            <Button onClick={exportData} className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export Data (IST)
            </Button>
          </div>

          {/* Historical Chart */}
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
            className="h-[400px]"
          >
            <LineChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="var(--color-cpu)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="var(--color-memory)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Network Events */}
      {historicalData?.events && historicalData.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Network Events (India Standard Time) - Fast Detection
            </CardTitle>
            <CardDescription>Recent network outages detected within 5-10 seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicalData.events.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}{" "}
                      IST
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={event.event_type === "network_down" ? "destructive" : "default"}>
                      {event.event_type.replace("_", " ")}
                    </Badge>
                    {event.duration_seconds && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Math.floor(event.duration_seconds / 60)}m {event.duration_seconds % 60}s
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          
          
         
        </CardContent>
       
      </Card>  
      )}
    </div>
  )
}
