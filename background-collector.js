// Background service to collect data even when network is down
import { startOfflineCollection } from "./lib/offline-collector.js";

console.log("🚀 Starting background monitoring service...")
console.log("This will collect data every 30 seconds, even when network is down")

// Start the offline collection
startOfflineCollection()

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏹️ Shutting down background collector...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n⏹️ Shutting down background collector...")
  process.exit(0)
})

// Keep the process running
setInterval(() => {
  // Just keep alive
}, 60000)
