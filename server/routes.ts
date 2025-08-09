import type { Express } from "express";
import { createServer, type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { storage } from "./storage";
import { insertProxyRequestSchema } from "@shared/schema";
import { z } from "zod";

const proxyRequestBodySchema = z.object({
  targetUrl: z.string().url("Invalid URL format"),
  followRedirects: z.boolean().optional().default(true),
  enableCaching: z.boolean().optional().default(false),
  userAgent: z.string().optional(),
  maskIp: z.boolean().optional().default(false),
});

export async function registerRoutes(app: Express): Promise<Server> {
  let activeConnections = 0;

  // Get proxy stats
  app.get("/api/proxy/stats", async (_req, res) => {
    try {
      const stats = await storage.getProxyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting proxy stats:", error);
      res.status(500).json({ message: "Failed to get proxy stats" });
    }
  });

  // Get proxy request logs
  app.get("/api/proxy/requests", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const requests = await storage.getProxyRequests(limit, offset);
      const total = await storage.getProxyRequestCount();
      
      res.json({ requests, total });
    } catch (error) {
      console.error("Error getting proxy requests:", error);
      res.status(500).json({ message: "Failed to get proxy requests" });
    }
  });

  // Clear proxy request logs
  app.delete("/api/proxy/requests", async (_req, res) => {
    try {
      await storage.clearProxyRequests();
      res.json({ message: "Request logs cleared successfully" });
    } catch (error) {
      console.error("Error clearing proxy requests:", error);
      res.status(500).json({ message: "Failed to clear request logs" });
    }
  });

  // Handle proxy requests
  app.post("/api/proxy/request", async (req, res) => {
    const startTime = Date.now();
    activeConnections++;
    await storage.updateActiveConnections(activeConnections);

    try {
      const body = proxyRequestBodySchema.parse(req.body);
      const { targetUrl, userAgent, maskIp } = body;

      console.log(`Proxying request to: ${targetUrl}`);

      // Make a direct HTTP request instead of using proxy middleware
      const url = new URL(targetUrl);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };
      
      if (userAgent) {
        headers['User-Agent'] = userAgent;
      } else {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      }
      
      if (maskIp) {
        headers['X-Forwarded-For'] = '127.0.0.1';
        headers['X-Real-IP'] = '127.0.0.1';
      }

      // Make the request
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: body.followRedirects ? 'follow' : 'manual',
      });

      const duration = Date.now() - startTime;
      const responseText = await response.text();
      const responseSize = Buffer.byteLength(responseText, 'utf8');

      // Log the successful request
      await storage.createProxyRequest({
        targetUrl,
        method: 'GET',
        statusCode: response.status,
        duration,
        responseSize,
        userAgent: userAgent || req.get('User-Agent') || null,
        errorMessage: null,
      });

      // Return the response
      res.status(response.status);
      
      // Copy response headers
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      res.send(responseText);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error("Proxy request error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid request", 
          errors: error.errors 
        });
      } else {
        // Log the failed request
        try {
          const targetUrl = req.body?.targetUrl || '';
          if (targetUrl) {
            await storage.createProxyRequest({
              targetUrl,
              method: 'GET',
              statusCode: 500,
              duration,
              responseSize: 0,
              userAgent: req.get('User-Agent') || null,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } catch (logError) {
          console.error("Error logging failed proxy request:", logError);
        }

        res.status(500).json({ 
          message: "Proxy request failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } finally {
      activeConnections--;
      await storage.updateActiveConnections(Math.max(0, activeConnections));
    }
  });

  // Server control endpoints
  app.post("/api/proxy/restart", async (_req, res) => {
    // In a real implementation, this would restart the server
    res.json({ message: "Server restart initiated" });
  });

  app.post("/api/proxy/stop", async (_req, res) => {
    // In a real implementation, this would stop the server
    res.json({ message: "Server stop initiated" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
