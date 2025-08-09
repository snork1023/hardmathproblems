import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const proxyRequests = pgTable("proxy_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetUrl: text("target_url").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  duration: integer("duration").notNull(), // in milliseconds
  responseSize: integer("response_size").notNull(), // in bytes
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
});

export const insertProxyRequestSchema = createInsertSchema(proxyRequests).omit({
  id: true,
  timestamp: true,
});

export type InsertProxyRequest = z.infer<typeof insertProxyRequestSchema>;
export type ProxyRequest = typeof proxyRequests.$inferSelect;

export const proxyStats = pgTable("proxy_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverPort: integer("server_port").notNull().default(8080),
  activeConnections: integer("active_connections").notNull().default(0),
  totalRequests: integer("total_requests").notNull().default(0),
  uptime: integer("uptime").notNull().default(0), // in seconds
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertProxyStatsSchema = createInsertSchema(proxyStats).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProxyStats = z.infer<typeof insertProxyStatsSchema>;
export type ProxyStats = typeof proxyStats.$inferSelect;
