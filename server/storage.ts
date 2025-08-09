import { type ProxyRequest, type InsertProxyRequest, type ProxyStats, type InsertProxyStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Proxy Request methods
  createProxyRequest(request: InsertProxyRequest): Promise<ProxyRequest>;
  getProxyRequests(limit?: number, offset?: number): Promise<ProxyRequest[]>;
  getProxyRequestCount(): Promise<number>;
  clearProxyRequests(): Promise<void>;
  
  // Proxy Stats methods
  getProxyStats(): Promise<ProxyStats | undefined>;
  updateProxyStats(stats: Partial<InsertProxyStats>): Promise<ProxyStats>;
  incrementTotalRequests(): Promise<void>;
  updateActiveConnections(count: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private proxyRequests: Map<string, ProxyRequest>;
  private proxyStats: ProxyStats | null;
  private startTime: number;

  constructor() {
    this.proxyRequests = new Map();
    this.proxyStats = null;
    this.startTime = Date.now();
    this.initializeStats();
  }

  private initializeStats() {
    const id = randomUUID();
    this.proxyStats = {
      id,
      serverPort: parseInt(process.env.PORT || '5000'),
      activeConnections: 0,
      totalRequests: 0,
      uptime: 0,
      lastUpdated: new Date(),
    };
  }

  async createProxyRequest(insertRequest: InsertProxyRequest): Promise<ProxyRequest> {
    const id = randomUUID();
    const request: ProxyRequest = {
      ...insertRequest,
      id,
      timestamp: new Date(),
    };
    this.proxyRequests.set(id, request);
    await this.incrementTotalRequests();
    return request;
  }

  async getProxyRequests(limit: number = 50, offset: number = 0): Promise<ProxyRequest[]> {
    const requests = Array.from(this.proxyRequests.values());
    // Sort by timestamp descending (newest first)
    requests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return requests.slice(offset, offset + limit);
  }

  async getProxyRequestCount(): Promise<number> {
    return this.proxyRequests.size;
  }

  async clearProxyRequests(): Promise<void> {
    this.proxyRequests.clear();
  }

  async getProxyStats(): Promise<ProxyStats | undefined> {
    if (this.proxyStats) {
      // Update uptime dynamically
      const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      this.proxyStats.uptime = uptimeSeconds;
      this.proxyStats.lastUpdated = new Date();
    }
    return this.proxyStats || undefined;
  }

  async updateProxyStats(stats: Partial<InsertProxyStats>): Promise<ProxyStats> {
    if (!this.proxyStats) {
      this.initializeStats();
    }
    
    this.proxyStats = {
      ...this.proxyStats!,
      ...stats,
      lastUpdated: new Date(),
    };
    
    return this.proxyStats;
  }

  async incrementTotalRequests(): Promise<void> {
    if (this.proxyStats) {
      this.proxyStats.totalRequests += 1;
      this.proxyStats.lastUpdated = new Date();
    }
  }

  async updateActiveConnections(count: number): Promise<void> {
    if (this.proxyStats) {
      this.proxyStats.activeConnections = count;
      this.proxyStats.lastUpdated = new Date();
    }
  }
}

export const storage = new MemStorage();
