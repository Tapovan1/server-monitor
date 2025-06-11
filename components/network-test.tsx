"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TestTube, Play, AlertTriangle, Database } from "lucide-react"

export default function NetworkTest() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const runQuickTest = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-network")
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error("Test failed:", error)
    } finally {
      setTesting(false)
    }
  }

  const runExtendedTest = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-network", { method: "POST" })
      const data = await response.json()
      setTestResult(data)

      // Auto-stop after 30 seconds
      setTimeout(() => setTesting(false), 30000)
    } catch (error) {
      console.error("Extended test failed:", error)
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Smart Network Detection Test
        </CardTitle>
        <CardDescription>
          Test network detection - Only network events saved when down, full system data when up
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={runQuickTest} disabled={testing} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Quick Test (10 seconds)
          </Button>

          <Button onClick={runExtendedTest} disabled={testing} variant="outline" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Extended Test (30 seconds)
          </Button>
        </div>

        {testing && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>Testing network detection... Remove your cable now!</span>
            </div>
          </div>
        )}

        {testResult && (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 font-medium">{testResult.message}</p>
            </div>

            {testResult.instructions && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Instructions:
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {testResult.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-orange-500">•</span>
                      {instruction}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">When Network UP</span>
            </div>
            <ul className="text-sm text-green-600 space-y-1">
              <li>• Full system monitoring</li>
              <li>• CPU, Memory, Disk data</li>
              <li>• Network statistics</li>
              <li>• Process information</li>
            </ul>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">When Network DOWN</span>
            </div>
            <ul className="text-sm text-red-600 space-y-1">
              <li>• Only network events saved</li>
              <li>• No CPU/Memory collection</li>
              <li>• Ping times and failures</li>
              <li>• Outage duration tracking</li>
            </ul>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Smart Collection Settings:</strong>
          </p>
          <ul className="space-y-1 ml-4">
            <li>• Network check: Every 5 seconds (always)</li>
            <li>• System data: Every 15 seconds (only when network UP)</li>
            <li>• Detection time: 5-10 seconds max</li>
            <li>• Database: Efficient storage</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
