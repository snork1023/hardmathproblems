import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, ArrowRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

const proxyFormSchema = z.object({
  targetUrl: z.string()
    .min(1, "Please enter a URL")
    .transform((url) => {
      // Add https:// if no protocol is specified
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    })
    .pipe(z.string().url("Please enter a valid URL")),
  followRedirects: z.boolean().default(true),
  enableCaching: z.boolean().default(false),
  userAgent: z.string().optional(),
  openMethod: z.enum(["new_tab", "about_blank"]).default("new_tab"),
});

type ProxyFormData = z.infer<typeof proxyFormSchema>;

export function ProxyForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enableAboutBlank, setEnableAboutBlank] = useState(() => {
    const saved = localStorage.getItem("enableAboutBlank");
    return saved !== null ? saved !== "false" : true;
  });

  const [buttonColor, setButtonColor] = useState(() => {
    return localStorage.getItem("buttonColor") || "#3b82f6";
  });

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const form = useForm<ProxyFormData>({
    resolver: zodResolver(proxyFormSchema),
    defaultValues: {
      targetUrl: "",
      followRedirects: true,
      enableCaching: false,
      userAgent: "",
      openMethod: "new_tab",
    },
  });

  useEffect(() => {
    // Listen for button color changes from settings
    const handleColorChange = (event: CustomEvent) => {
      setButtonColor(event.detail);
    };

    // Listen for about:blank setting changes
    const handleAboutBlankChange = (event: CustomEvent) => {
      setEnableAboutBlank(event.detail);
      // Update form when setting changes
      setTimeout(() => {
        const currentMethod = form.getValues("openMethod");
        if (!event.detail && currentMethod === "about_blank") {
          form.setValue("openMethod", "new_tab");
        }
      }, 0);
    };

    window.addEventListener('buttonColorChanged', handleColorChange as EventListener);
    window.addEventListener('aboutBlankChanged', handleAboutBlankChange as EventListener);

    return () => {
      window.removeEventListener('buttonColorChanged', handleColorChange as EventListener);
      window.removeEventListener('aboutBlankChanged', handleAboutBlankChange as EventListener);
    };
  }, []);

  const proxyMutation = useMutation({
    mutationFn: async (data: ProxyFormData) => {
      const ipMasking = localStorage.getItem("ipMasking") === "true";
      const requestData = { ...data, maskIp: ipMasking };
      return await apiRequest("POST", "/api/proxy/request", requestData);
    },
    onSuccess: (response, variables) => {
      const enableAboutBlank = localStorage.getItem("enableAboutBlank") !== "false";

      if (variables.openMethod === "about_blank" && enableAboutBlank) {
        // Create about:blank window and then navigate to the target URL
        const newWindow = window.open("about:blank", "_blank");
        if (newWindow) {
          // Navigate directly to the target URL
          setTimeout(() => {
            newWindow.location.href = variables.targetUrl;
          }, 100);
        }
      } else if (variables.openMethod === "new_tab") {
        // For "New Tab (Masked)" option, create a masked URL with actual website content
        const maskedContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Khan Academy - Study Materials</title>
            <meta charset="utf-8">
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                overflow: hidden; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
              }
              .loading { 
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                text-align: center; 
                color: #495057;
                z-index: 1000;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              iframe {
                width: 100vw;
                height: 100vh;
                border: none;
                position: absolute;
                top: 0;
                left: 0;
                display: none;
              }
            </style>
          </head>
          <body>
            <div class="loading" id="loading">
              <div class="spinner"></div>
              <div>Loading educational content...</div>
            </div>
            <iframe id="content" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-top-navigation-by-user-activation allow-modals allow-downloads" style="width: 100vw; height: 100vh; border: none; position: absolute; top: 0; left: 0; display: none;"></iframe>
            <script>
              const iframe = document.getElementById('content');
              const loading = document.getElementById('loading');
              let contentLoaded = false;
              let loadingStartTime = Date.now();
              let hasShownContent = false;

              function showError(message) {
                if (!hasShownContent) {
                  hasShownContent = true;
                  loading.innerHTML = \`
                    <div style="text-align: center; color: #dc3545; padding: 20px;">
                      <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
                      <div style="font-size: 20px; margin-bottom: 15px; color: #2c3e50;">Educational Content Access</div>
                      <div style="font-size: 16px; margin-bottom: 10px; color: #7f8c8d;">\${message}</div>
                      <div style="margin: 20px 0;">
                        <a href="${variables.targetUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; margin: 5px;">📖 Open Original Source</a>
                        <button onclick="window.location.reload()" style="display: inline-block; padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 6px; font-size: 16px; margin: 5px; cursor: pointer;">🔄 Try Again</button>
                      </div>
                      <div style="font-size: 14px; color: #95a5a6; margin-top: 15px;">
                        Some educational resources may have security restrictions
                      </div>
                    </div>
                  \`;
                }
              }

              function hideLoader() {
                if (!contentLoaded) {
                  contentLoaded = true;
                  hasShownContent = true;
                  loading.style.transition = 'opacity 0.5s ease';
                  loading.style.opacity = '0';
                  iframe.style.display = 'block';
                  iframe.style.opacity = '1';
                  setTimeout(() => {
                    if (loading.parentNode) {
                      loading.style.display = 'none';
                    }
                  }, 500);
                }
              }

              function directRedirect() {
                console.log('Using direct redirect approach');
                hasShownContent = true;
                loading.innerHTML = \`
                  <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🚀</div>
                    <div style="font-size: 20px; margin-bottom: 15px; color: #2c3e50;">Redirecting to Educational Content</div>
                    <div style="font-size: 16px; color: #7f8c8d;">Taking you to the source material...</div>
                  </div>
                \`;
                setTimeout(() => {
                  window.location.href = '${variables.targetUrl}';
                }, 1500);
              }

              async function loadContent() {
                try {
                  console.log('Starting content fetch for:', '${variables.targetUrl}');

                  // Attempt to fetch content through proxy
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 10000);

                  const response = await fetch('/api/proxy/content', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      targetUrl: '${variables.targetUrl}'
                    }),
                    signal: controller.signal
                  });

                  clearTimeout(timeoutId);

                  if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    console.log('Response content type:', contentType);

                    if (contentType.includes('text/html')) {
                      const html = await response.text();
                      console.log('Received HTML content, length:', html.length);

                      if (html && html.trim().length > 100) {
                        // Try to load in iframe first
                        try {
                          const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
                          const blobUrl = URL.createObjectURL(blob);

                          let iframeLoadTimeout;
                          let hasIframeLoaded = false;

                          iframe.onload = function() {
                            console.log('Iframe loaded successfully');
                            hasIframeLoaded = true;
                            if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);
                            hideLoader();
                            // Clean up blob URL
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
                          };

                          iframe.onerror = function(e) {
                            console.error('Iframe failed to load:', e);
                            if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);
                            if (!hasShownContent) {
                              directRedirect();
                            }
                          };

                          // Set iframe source
                          iframe.src = blobUrl;

                          // Fallback after 5 seconds if iframe doesn't load
                          iframeLoadTimeout = setTimeout(() => {
                            if (!hasIframeLoaded && !hasShownContent) {
                              console.log('Iframe timeout, falling back to direct redirect');
                              URL.revokeObjectURL(blobUrl);
                              directRedirect();
                            }
                          }, 5000);

                          return; // Successfully initiated iframe loading
                        } catch (iframeError) {
                          console.error('Iframe setup error:', iframeError);
                        }
                      }
                    }
                  }

                  // If we get here, proxy fetch failed or returned invalid content
                  throw new Error(\`Proxy fetch failed: \${response.status} - \${response.statusText}\`);

                } catch (error) {
                  console.error('Content loading error:', error);
                  
                  if (!hasShownContent) {
                    // Last resort: direct redirect
                    directRedirect();
                  }
                }
              }

              // Start loading process
              console.log('Initializing content loading...');
              loadContent();

              // Ultimate fallback - if nothing works after 8 seconds, redirect
              setTimeout(() => {
                if (!hasShownContent) {
                  console.log('Ultimate fallback triggered');
                  directRedirect();
                }
              }, 8000);
</script>
          </body>
          </html>
        `;

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(maskedContent);
        window.open(dataUrl, '_blank');
      } else {
        // Fallback: open directly
        window.open(variables.targetUrl, '_blank');
      }

      toast({
        title: "Success",
        description: "Opening study material in new window",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/stats"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProxyFormData) => {
    proxyMutation.mutate(data);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <Link className="text-primary text-lg" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Khan Academy Textbook Links</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="target-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Textbook Chapter URL
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="text-gray-400 text-sm" size={16} />
              </div>
              <Input
                id="target-url"
                type="text"
                placeholder="https://example.com"
                className="pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                data-testid="input-target-url"
                {...form.register("targetUrl")}
              />
            </div>
            {form.formState.errors.targetUrl && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.targetUrl.message}</p>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <Button
              type="submit"
              disabled={proxyMutation.isPending}
              style={{ backgroundColor: buttonColor }}
              className="text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 whitespace-nowrap"
              data-testid="button-access-site"
            >
              <ArrowRight size={16} />
              <span>{proxyMutation.isPending ? "Running..." : "Run"}</span>
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-2 p-0"
            data-testid="button-toggle-advanced"
          >
            {showAdvancedOptions ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            <span>Advanced Options</span>
          </Button>

          {showAdvancedOptions && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="follow-redirects"
                    checked={form.watch("followRedirects")}
                    onCheckedChange={(checked) => form.setValue("followRedirects", checked as boolean)}
                    data-testid="checkbox-follow-redirects"
                  />
                  <Label htmlFor="follow-redirects" className="text-sm text-gray-700">
                    Follow redirects
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable-caching"
                    checked={form.watch("enableCaching")}
                    onCheckedChange={(checked) => form.setValue("enableCaching", checked as boolean)}
                    data-testid="checkbox-enable-caching"
                  />
                  <Label htmlFor="enable-caching" className="text-sm text-gray-700">
                    Enable caching
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-agent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom User Agent
                  </Label>
                  <Input
                    id="user-agent"
                    type="text"
                    placeholder="Mozilla/5.0 (default)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    data-testid="input-user-agent"
                    {...form.register("userAgent")}
                  />
                </div>

                <div>
                  <Label htmlFor="open-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Opening Method
                  </Label>
                  <Select 
                    value={form.watch("openMethod")} 
                    onValueChange={(value: "new_tab" | "about_blank") => form.setValue("openMethod", value)}
                  >
                    <SelectTrigger className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_tab">New Tab (Masked)</SelectItem>
                      {enableAboutBlank && (
                        <SelectItem value="about_blank">About:Blank</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}