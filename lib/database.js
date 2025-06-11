import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, "monitoring.db")
let db = null

// Initialize database connection
const getDatabase = () => {
  if (!db) {
    try {
      db = new Database(dbPath)
      initDatabase()
    } catch (error) {
      console.error("Database connection error:", error)
      return null
    }
  }
  return db
}

// Initialize database
export const initDatabase = () => {
  const database = getDatabase()
  if (!database) return

  // Create tables with India/Kolkata timezone
  database.exec(`
    CREATE TABLE IF NOT EXISTS server_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now', '+05:30')),
      cpu_usage REAL,
      memory_percentage REAL,
      memory_used REAL,
      memory_total REAL,
      disk_percentage REAL,
      disk_used TEXT,
      disk_total TEXT,
      network_download INTEGER,
      network_upload INTEGER,
      load_1min REAL,
      load_5min REAL,
      load_15min REAL,
      active_connections INTEGER,
      process_count INTEGER,
      temperature REAL,
      status TEXT,
      network_status TEXT DEFAULT 'online',
      synced BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS network_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now', '+05:30')),
      event_type TEXT,
      description TEXT,
      duration_seconds INTEGER,
      network_interface TEXT,
      ping_target TEXT,
      failure_reason TEXT,
      synced BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS network_monitoring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now', '+05:30')),
      status TEXT,
      ping_time_ms INTEGER,
      target_host TEXT,
      interface_status TEXT,
      consecutive_failures INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_server_metrics_timestamp ON server_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_network_events_timestamp ON network_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_network_monitoring_timestamp ON network_monitoring(timestamp);
  `)
}

// Insert server metrics with India timezone (only when network is UP)
export const insertServerMetrics = (data) => {
  const database = getDatabase()
  if (!database) return null

  try {
    const stmt = database.prepare(`
      INSERT INTO server_metrics (
        timestamp, cpu_usage, memory_percentage, memory_used, memory_total,
        disk_percentage, disk_used, disk_total, network_download, network_upload,
        load_1min, load_5min, load_15min, active_connections, process_count,
        temperature, status, network_status
      ) VALUES (datetime('now', '+05:30'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      data.cpu,
      data.memory.percentage,
      data.memory.used,
      data.memory.total,
      data.disk.percentage,
      data.disk.used,
      data.disk.total,
      data.network.download,
      data.network.upload,
      data.systemLoad.load1,
      data.systemLoad.load5,
      data.systemLoad.load15,
      data.activeConnections,
      data.processCount,
      data.temperature,
      data.status,
      data.networkStatus || "online",
    )
  } catch (error) {
    console.error("Error inserting server metrics:", error)
    return null
  }
}

// Insert network event with more details
export const insertNetworkEvent = (
  eventType,
  description,
  duration,
  networkInterface,
  pingTarget,
  failureReason,
) => {
  const database = getDatabase()
  if (!database) return null

  try {
    const stmt = database.prepare(`
      INSERT INTO network_events (timestamp, event_type, description, duration_seconds, network_interface, ping_target, failure_reason)
      VALUES (datetime('now', '+05:30'), ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(eventType, description, duration || null, networkInterface, pingTarget, failureReason)
  } catch (error) {
    console.error("Error inserting network event:", error)
    return null
  }
}

// Insert network monitoring data (lightweight, always collected)
export const insertNetworkMonitoring = (
  status,
  pingTim,
  target,
  consecutiveFailures,
) => {
  const database = getDatabase()
  if (!database) return null

  try {
    const stmt = database.prepare(`
      INSERT INTO network_monitoring (timestamp, status, ping_time_ms, target_host, consecutive_failures)
      VALUES (datetime('now', '+05:30'), ?, ?, ?, ?)
    `)
    return stmt.run(status, pingTime, target, consecutiveFailures)
  } catch (error) {
    console.error("Error inserting network monitoring:", error)
    return null
  }
}

// Get historical data (times already in India timezone)
export const getHistoricalData = (hours = 24) => {
  const database = getDatabase()
  if (!database) return []

  try {
    const stmt = database.prepare(`
      SELECT * FROM server_metrics 
      WHERE timestamp >= datetime('now', '+05:30', '-${hours} hours')
      ORDER BY timestamp DESC
    `)
    return stmt.all()
  } catch (error) {
    console.error("Error getting historical data:", error)
    return []
  }
}

// Get network events (times already in India timezone)
export const getNetworkEvents = (hours = 24) => {
  const database = getDatabase()
  if (!database) return []

  try {
    const stmt = database.prepare(`
      SELECT * FROM network_events 
      WHERE timestamp >= datetime('now', '+05:30', '-${hours} hours')
      ORDER BY timestamp DESC
    `)
    return stmt.all()
  } catch (error) {
    console.error("Error getting network events:", error)
    return []
  }
}

// Get network monitoring data (lightweight network checks)
export const getNetworkMonitoring = (hours = 24) => {
  const database = getDatabase()
  if (!database) return []

  try {
    const stmt = database.prepare(`
      SELECT * FROM network_monitoring 
      WHERE timestamp >= datetime('now', '+05:30', '-${hours} hours')
      ORDER BY timestamp DESC
      LIMIT 100
    `)
    return stmt.all()
  } catch (error) {
    console.error("Error getting network monitoring:", error)
    return []
  }
}

// Export data as JSON with India timezone
export const exportData = (hours = 24) => {
  const metrics = getHistoricalData(hours)
  const events = getNetworkEvents(hours)
  const networkMonitoring = getNetworkMonitoring(hours)

  return {
    exportTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    timezone: "Asia/Kolkata (UTC+05:30)",
    timeRange: `${hours} hours`,
    note: "Server metrics collected only when network is UP. Network events always monitored.",
    serverMetrics: metrics,
    networkEvents: events,
    networkMonitoring: networkMonitoring,
    summary: {
      totalServerRecords: metrics.length,
      networkEvents: events.length,
      networkChecks: networkMonitoring.length,
      avgCpu: metrics.length > 0 ? metrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / metrics.length : 0,
      avgMemory:
        metrics.length > 0 ? metrics.reduce((sum, m) => sum + (m.memory_percentage || 0), 0) / metrics.length : 0,
    },
  }
}

export default getDatabase
