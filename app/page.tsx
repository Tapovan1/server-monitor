import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UbuntuDashboard from "@/components/ubuntu-dashboard"
import HistoricalAnalysis from "@/components/historical-analysis"

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="live" className="w-full">
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="live">Live Monitor</TabsTrigger>
              <TabsTrigger value="history">Historical Data</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="live" className="mt-0">
          <UbuntuDashboard />
        </TabsContent>

        <TabsContent value="history" className="mt-0 p-6">
          <div className="max-w-7xl mx-auto">
            <HistoricalAnalysis />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
