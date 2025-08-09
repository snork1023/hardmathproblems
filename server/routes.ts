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

      // Parse the target URL
      const url = new URL(targetUrl);
      
      // Prepare headers for IP masking
      const headers: Record<string, string> = {};
      if (userAgent) {
        headers['User-Agent'] = userAgent;
      }
      
      if (maskIp) {
        // Add headers to mask the real IP
        headers['X-Forwarded-For'] = '127.0.0.1';
        headers['X-Real-IP'] = '127.0.0.1';
        headers['X-Remote-Addr'] = '127.0.0.1';
      }
      
      // Create proxy middleware
      const proxy = createProxyMiddleware({
        target: `${url.protocol}//${url.host}`,
        changeOrigin: true,
        followRedirects: body.followRedirects,
        headers,
        onProxyReq: (proxyReq, req, res) => {
          // Log the outgoing request
          console.log(`Proxying ${req.method} ${targetUrl}`);
        },
        onProxyRes: async (proxyRes, req, res) => {
          const duration = Date.now() - startTime;
          const responseSize = parseInt(proxyRes.headers['content-length'] || '0');
          
          // Log the proxy request
          try {
            await storage.createProxyRequest({
              targetUrl,
              method: req.method || 'GET',
              statusCode: proxyRes.statusCode || 0,
              duration,
              responseSize,
              userAgent: userAgent || req.get('User-Agent') || '',
              errorMessage: null,
            });
          } catch (logError) {
            console.error("Error logging proxy request:", logError);
          }
        },
        onError: async (err, req, res) => {
          const duration = Date.now() - startTime;
          
          // Log the error
          try {
            await storage.createProxyRequest({
              targetUrl,
              method: req.method || 'GET',
              statusCode: 500,
              duration,
              responseSize: 0,
              userAgent: userAgent || req.get('User-Agent') || '',
              errorMessage: err.message,
            });
          } catch (logError) {
            console.error("Error logging proxy error:", logError);
          }

          if (!res.headersSent) {
            res.status(500).json({ 
              message: "Proxy request failed", 
              error: err.message,
              targetUrl 
            });
          }
        },
      });

      // Use the proxy middleware
      proxy(req, res, () => {
        // This callback is called if the proxy doesn't handle the request
        if (!res.headersSent) {
          res.status(404).json({ message: "Resource not found" });
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log validation errors
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid request", 
          errors: error.errors 
        });
      } else {
        console.error("Proxy request error:", error);
        res.status(500).json({ 
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Still log the failed request
      try {
        const targetUrl = req.body?.targetUrl || '';
        if (targetUrl) {
          await storage.createProxyRequest({
            targetUrl,
            method: req.method || 'GET',
            statusCode: 400,
            duration,
            responseSize: 0,
            userAgent: req.get('User-Agent') || '',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } catch (logError) {
        console.error("Error logging failed proxy request:", logError);
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
