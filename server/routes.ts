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

  // Handle content fetching for iframe embedding
  app.post("/api/proxy/content", async (req, res) => {
    try {
      const { targetUrl } = req.body;
      
      if (!targetUrl) {
        return res.status(400).json({ message: "Target URL is required" });
      }

      console.log(`Fetching content from: ${targetUrl}`);

      let html = '';
      let success = false;

      // First, try to fetch directly
      try {
        const directResponse = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(15000)
        });

        if (directResponse.ok) {
          html = await directResponse.text();
          success = true;
          console.log('Successfully fetched content directly');
        }
      } catch (directError) {
        console.log('Direct fetch failed, trying Wayback Machine:', directError.message);
      }

      // If direct fetch fails, try Wayback Machine
      if (!success) {
        try {
          // First, get the latest snapshot URL from Wayback Machine
          const waybackApiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
          const waybackResponse = await fetch(waybackApiUrl);
          
          if (waybackResponse.ok) {
            const waybackData = await waybackResponse.json();
            
            if (waybackData.archived_snapshots?.closest?.available) {
              const archivedUrl = waybackData.archived_snapshots.closest.url;
              console.log(`Fetching from Wayback Machine: ${archivedUrl}`);
              
              const archivedResponse = await fetch(archivedUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                }
              });
              
              if (archivedResponse.ok) {
                html = await archivedResponse.text();
                success = true;
                console.log('Successfully fetched content from Wayback Machine');
              }
            }
          }
        } catch (waybackError) {
          console.log('Wayback Machine fetch failed:', waybackError.message);
        }
      }

      // If both methods fail, create a simple fallback page
      if (!success || !html) {
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Content Unavailable</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .url {
                color: #666;
                word-break: break-all;
                margin-top: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Content Unavailable</h2>
              <p>Unable to fetch content from the requested URL.</p>
              <p class="url">Requested: ${targetUrl}</p>
              <p><a href="${targetUrl}" target="_blank">Open Original Site</a></p>
            </div>
          </body>
          </html>
        `;
      }
      
      // Process the HTML to make relative URLs absolute and add security headers
      if (success) {
        const url = new URL(targetUrl);
        const baseUrl = `${url.protocol}//${url.host}`;
        
        // Replace relative URLs with absolute ones
        html = html.replace(/href="\/([^"]*?)"/g, `href="${baseUrl}/$1"`);
        html = html.replace(/src="\/([^"]*?)"/g, `src="${baseUrl}/$1"`);
        html = html.replace(/action="\/([^"]*?)"/g, `action="${baseUrl}/$1"`);
        html = html.replace(/url\(\/([^)]*?)\)/g, `url(${baseUrl}/$1)`);
        
        // Remove Wayback Machine toolbar and navigation if present
        html = html.replace(/<script[^>]*archive\.org[^>]*>.*?<\/script>/gi, '');
        html = html.replace(/<div[^>]*wm-ipp[^>]*>.*?<\/div>/gi, '');
        html = html.replace(/\/\*\s*playback\s*timers\s*\*\/.*?\/\*\s*End\s*Wayback\s*Rewrite\s*\*\//gi, '');
        
        // Add a base tag to help with relative URLs
        if (!html.includes('<base ')) {
          html = html.replace(/<head[^>]*>/i, `$&\n<base href="${baseUrl}/">`);
        }
        
        // Remove any meta tags that might block iframe embedding
        html = html.replace(/<meta[^>]*http-equiv["']?=["']?X-Frame-Options[^>]*>/gi, '');
        html = html.replace(/<meta[^>]*name["']?=["']?viewport[^>]*>/gi, '<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      }
      
      // Set proper headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(html);

    } catch (error) {
      console.error("Content fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch content",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
