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
      let fetchMethod = 'none';

      // Strategy 1: Direct fetch with comprehensive headers
      try {
        console.log('Attempting direct fetch...');
        const directResponse = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(20000),
          redirect: 'follow'
        });

        if (directResponse.ok) {
          const contentType = directResponse.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            html = await directResponse.text();
            if (html && html.trim().length > 100) { // Basic validation
              success = true;
              fetchMethod = 'direct';
              console.log('Successfully fetched content directly');
            }
          }
        }
      } catch (directError) {
        console.log('Direct fetch failed:', directError.message);
      }

      // Strategy 2: Try with different User-Agent (mobile)
      if (!success) {
        try {
          console.log('Attempting mobile user-agent fetch...');
          const mobileResponse = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
            },
            signal: AbortSignal.timeout(15000),
          });

          if (mobileResponse.ok) {
            const contentType = mobileResponse.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
              html = await mobileResponse.text();
              if (html && html.trim().length > 100) {
                success = true;
                fetchMethod = 'mobile';
                console.log('Successfully fetched content with mobile user-agent');
              }
            }
          }
        } catch (mobileError) {
          console.log('Mobile fetch failed:', mobileError.message);
        }
      }

      // Strategy 3: Wayback Machine
      if (!success) {
        try {
          console.log('Attempting Wayback Machine fetch...');
          const waybackApiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
          const waybackResponse = await fetch(waybackApiUrl, {
            signal: AbortSignal.timeout(10000)
          });
          
          if (waybackResponse.ok) {
            const waybackData = await waybackResponse.json();
            
            if (waybackData.archived_snapshots?.closest?.available) {
              const archivedUrl = waybackData.archived_snapshots.closest.url;
              console.log(`Fetching from Wayback Machine: ${archivedUrl}`);
              
              const archivedResponse = await fetch(archivedUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                signal: AbortSignal.timeout(15000)
              });
              
              if (archivedResponse.ok) {
                html = await archivedResponse.text();
                if (html && html.trim().length > 100) {
                  success = true;
                  fetchMethod = 'wayback';
                  console.log('Successfully fetched content from Wayback Machine');
                }
              }
            }
          }
        } catch (waybackError) {
          console.log('Wayback Machine fetch failed:', waybackError.message);
        }
      }

      // Strategy 4: Create a comprehensive fallback page
      if (!success || !html || html.trim().length < 100) {
        console.log('All fetch methods failed, creating fallback page');
        const urlObj = new URL(targetUrl);
        html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Educational Content - ${urlObj.hostname}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              .icon {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                color: #2c3e50;
                margin-bottom: 1rem;
              }
              .url {
                color: #7f8c8d;
                word-break: break-all;
                background: #f8f9fa;
                padding: 10px;
                border-radius: 6px;
                margin: 1rem 0;
                font-family: monospace;
                font-size: 0.9rem;
              }
              .actions {
                margin-top: 2rem;
              }
              .btn {
                display: inline-block;
                padding: 12px 24px;
                margin: 8px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: all 0.3s ease;
              }
              .btn-primary {
                background: #3498db;
                color: white;
              }
              .btn-primary:hover {
                background: #2980b9;
                transform: translateY(-2px);
              }
              .btn-secondary {
                background: #95a5a6;
                color: white;
              }
              .btn-secondary:hover {
                background: #7f8c8d;
                transform: translateY(-2px);
              }
              .info {
                margin-top: 1.5rem;
                padding: 1rem;
                background: #e8f4f8;
                border-left: 4px solid #3498db;
                border-radius: 4px;
                text-align: left;
                font-size: 0.9rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📚</div>
              <h1>Educational Content Access</h1>
              <p>We're having trouble loading the educational content from this source.</p>
              <div class="url">${targetUrl}</div>
              <div class="info">
                <strong>What happened?</strong><br>
                The educational resource may have security restrictions or connectivity issues that prevent direct access through our learning portal.
              </div>
              <div class="actions">
                <a href="${targetUrl}" target="_blank" class="btn btn-primary">
                  📖 Open Original Source
                </a>
                <button onclick="window.parent.location.reload()" class="btn btn-secondary">
                  🔄 Try Again
                </button>
              </div>
            </div>
            <script>
              // Attempt to redirect after a short delay if user doesn't interact
              setTimeout(() => {
                if (confirm('Would you like to open the original educational resource in a new tab?')) {
                  window.open('${targetUrl}', '_blank');
                }
              }, 3000);
            </script>
          </body>
          </html>
        `;
        fetchMethod = 'fallback';
      }
      
      // Process and enhance the HTML content
      if (success && html) {
        try {
          const url = new URL(targetUrl);
          const baseUrl = `${url.protocol}//${url.host}`;
          
          // Enhanced URL rewriting for better compatibility
          html = html.replace(/href=["']\/([^"']*?)["']/g, `href="${baseUrl}/$1"`);
          html = html.replace(/src=["']\/([^"']*?)["']/g, `src="${baseUrl}/$1"`);
          html = html.replace(/action=["']\/([^"']*?)["']/g, `action="${baseUrl}/$1"`);
          html = html.replace(/url\(["']?\/([^)"']*?)["']?\)/g, `url("${baseUrl}/$1")`);
          
          // Remove Wayback Machine artifacts
          html = html.replace(/<script[^>]*archive\.org[^>]*>.*?<\/script>/gis, '');
          html = html.replace(/<div[^>]*wm-ipp[^>]*>.*?<\/div>/gis, '');
          html = html.replace(/\/\*\s*playback\s*timers\s*\*\/.*?\/\*\s*End\s*Wayback\s*Rewrite\s*\*/gis, '');
          
          // Remove problematic meta tags and add necessary ones
          html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options[^>]*>/gi, '');
          html = html.replace(/<meta[^>]*name=["']?viewport[^>]*>/gi, '');
          
          // Add necessary meta tags and base
          if (!html.includes('<base ')) {
            html = html.replace(/<head[^>]*>/i, `$&\n    <base href="${baseUrl}/">`);
          }
          
          html = html.replace(/<head[^>]*>/i, `$&\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
          
          // Add comprehensive fallback loading system and iframe compatibility styles
          const enhancedStyles = `
            <style>
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow-x: auto; }
              * { box-sizing: border-box; }
              
              /* Fallback loading overlay */
              #fallback-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                backdrop-filter: blur(5px);
                transition: opacity 0.5s ease-out;
              }
              
              #fallback-loader.hidden {
                opacity: 0;
                pointer-events: none;
              }
              
              .loader-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
              }
              
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              
              .loader-text {
                color: #495057;
                font-size: 16px;
                text-align: center;
                margin-bottom: 10px;
              }
              
              .loader-progress {
                width: 200px;
                height: 4px;
                background: #e9ecef;
                border-radius: 2px;
                overflow: hidden;
                margin-bottom: 15px;
              }
              
              .loader-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #007bff, #0056b3);
                width: 0%;
                transition: width 0.3s ease;
                animation: progress 3s ease-in-out;
              }
              
              @keyframes progress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
              }
              
              .loader-subtitle {
                color: #6c757d;
                font-size: 14px;
                text-align: center;
              }
            </style>
          `;
          
          const fallbackScript = `
            <script>
              (function() {
                // Create fallback loader if it doesn't exist
                if (!document.getElementById('fallback-loader')) {
                  const loader = document.createElement('div');
                  loader.id = 'fallback-loader';
                  loader.innerHTML = \`
                    <div class="loader-spinner"></div>
                    <div class="loader-text">Loading educational content...</div>
                    <div class="loader-progress">
                      <div class="loader-progress-bar"></div>
                    </div>
                    <div class="loader-subtitle">Please wait while we prepare your study materials</div>
                  \`;
                  document.body.insertBefore(loader, document.body.firstChild);
                }
                
                let loadStartTime = Date.now();
                let loaderElement = document.getElementById('fallback-loader');
                let hasLoaded = false;
                
                // Function to hide loader
                function hideLoader() {
                  if (!hasLoaded && loaderElement) {
                    hasLoaded = true;
                    loaderElement.classList.add('hidden');
                    setTimeout(() => {
                      if (loaderElement && loaderElement.parentNode) {
                        loaderElement.parentNode.removeChild(loaderElement);
                      }
                    }, 500);
                  }
                }
                
                // Multiple strategies to detect when page is ready
                let readyChecks = 0;
                let maxChecks = 30; // 15 seconds max
                
                function checkIfReady() {
                  readyChecks++;
                  
                  // Check if main content is visible
                  const hasVisibleContent = (
                    document.body.offsetHeight > 100 ||
                    document.querySelectorAll('img, video, iframe, canvas').length > 0 ||
                    document.querySelectorAll('div, section, article, main').length > 5
                  );
                  
                  // Check if enough time has passed
                  const timeElapsed = Date.now() - loadStartTime;
                  const minLoadTime = 1500; // Minimum 1.5 seconds
                  
                  if ((hasVisibleContent && timeElapsed > minLoadTime) || 
                      readyChecks >= maxChecks || 
                      timeElapsed > 15000) {
                    hideLoader();
                    return;
                  }
                  
                  // Continue checking
                  setTimeout(checkIfReady, 500);
                }
                
                // Start checking when DOM is ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(checkIfReady, 100);
                  });
                } else {
                  setTimeout(checkIfReady, 100);
                }
                
                // Fallback: Always hide after reasonable time
                setTimeout(hideLoader, 20000);
                
                // Hide on window load as backup
                window.addEventListener('load', () => {
                  setTimeout(hideLoader, 1000);
                });
                
                // Error handling
                window.addEventListener('error', (e) => {
                  console.warn('Page load error detected:', e.message);
                  setTimeout(hideLoader, 2000);
                });
                
              })();
            </script>
          `;
          
          html = html.replace(/<\/head>/i, `${enhancedStyles}\n$&`);
          html = html.replace(/<\/body>/i, `${fallbackScript}\n$&`);
          
        } catch (processError) {
          console.log('HTML processing error:', processError.message);
        }
      }
      
      // Set comprehensive response headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Content-Security-Policy', "frame-ancestors *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: *; font-src 'self' *; connect-src 'self' *;");
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log(`Content served using method: ${fetchMethod}, size: ${html.length} characters`);
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
