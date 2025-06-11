import Database from "better-sqlite3"
import path from "path"

const dbPath = path.join(process.cwd(), "data", "monitoring.db")
const db = new Database(dbPath)

// Initialize database
export const initDatabase = () => {
  // Create tables with India/Kolkata timezone
  db.exec(`
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
      synced BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS service_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now', '+05:30')),
      service_name TEXT,
      status TEXT,
      active BOOLEAN,
      synced BOOLEAN DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_server_metrics_timestamp ON server_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_network_events_timestamp ON network_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_service_status_timestamp ON service_status(timestamp);
  `)
}

// Insert server metrics with India timezone
export const insertServerMetrics = (data) => {
  const stmt = db.prepare(`
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
}

// Insert network event with India timezone
export const insertNetworkEvent = (eventType, description, duration) => {
  const stmt = db.prepare(`
    INSERT INTO network_events (timestamp, event_type, description, duration_seconds)
    VALUES (datetime('now', '+05:30'), ?, ?, ?)
  `)
  return stmt.run(eventType, description, duration || null)
}

// Get historical data (times already in India timezone)
export const getHistoricalData = (hours = 24) => {
  const stmt = db.prepare(`
    SELECT * FROM server_metrics 
    WHERE timestamp >= datetime('now', '+05:30', '-${hours} hours')
    ORDER BY timestamp DESC
  `)
  return stmt.all()
}

// Get network events (times already in India timezone)
export const getNetworkEvents = (hours = 24) => {
  const stmt = db.prepare(`
    SELECT * FROM network_events 
    WHERE timestamp >= datetime('now', '+05:30', '-${hours} hours')
    ORDER BY timestamp DESC
  `)
  return stmt.all()
}

// Export data as JSON with India timezone
export const exportData = (hours = 24) => {
  const metrics = getHistoricalData(hours)
  const events = getNetworkEvents(hours)

  return {
    exportTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    timezone: "Asia/Kolkata (UTC+05:30)",
    timeRange: `${hours} hours`,
    metrics,
    events,
    summary: {
      totalRecords: metrics.length,
      networkEvents: events.length,
      avgCpu: metrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / metrics.length,
      avgMemory: metrics.reduce((sum, m) => sum + (m.memory_percentage || 0), 0) / metrics.length,
    },
  }
}

// Get current India time for display
export const getCurrentIndiaTime = () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default db
