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
  // Initialize enableAboutBlank from localStorage immediately
  const [enableAboutBlank, setEnableAboutBlank] = useState(() => {
    const saved = localStorage.getItem("enableAboutBlank");
    return saved !== null ? saved !== "false" : true;
  });

  const [buttonColor, setButtonColor] = useState(() => {
    return localStorage.getItem("buttonColor") || "#3b82f6";
  });

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const queryClient = useQueryClient();

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
    };

    window.addEventListener('buttonColorChanged', handleColorChange as EventListener);
    window.addEventListener('aboutBlankChanged', handleAboutBlankChange as EventListener);

    return () => {
      window.removeEventListener('buttonColorChanged', handleColorChange as EventListener);
      window.removeEventListener('aboutBlankChanged', handleAboutBlankChange as EventListener);
    };
  }, []);

  // Update form default when enableAboutBlank changes
  useEffect(() => {
    if (!enableAboutBlank && form.getValues("openMethod") === "about_blank") {
      form.setValue("openMethod", "new_tab");
    }
    // Set the default based on enableAboutBlank setting
    if (enableAboutBlank && form.getValues("openMethod") === "new_tab" && !form.getValues("targetUrl")) {
      form.setValue("openMethod", "about_blank");
    }
  }, [enableAboutBlank, form]);

  const proxyMutation = useMutation({
    mutationFn: async (data: ProxyFormData) => {
      // Check if IP masking is enabled in localStorage
      const ipMasking = localStorage.getItem("ipMasking") === "true";
      const requestData = { ...data, maskIp: ipMasking };
      const response = await apiRequest("POST", "/api/proxy/request", requestData);
      return response;
    },
    onSuccess: (response, variables) => {
      // Check if about:blank is enabled
      const enableAboutBlank = localStorage.getItem("enableAboutBlank") !== "false";

      // Open the URL based on selected method and settings
      if (variables.openMethod === "about_blank" && enableAboutBlank) {
        // Open in about:blank and redirect to the target URL
        const newWindow = window.open("about:blank");
        if (newWindow) {
          // Simply redirect the about:blank window to the target URL
          newWindow.location.href = variables.targetUrl;
        }
      } else {
        // Open in new tab with data URL to mask the URL
        const maskedUrl = `data:text/html;charset=utf-8,<html><head><title>Study Material</title></head><body style="margin:0;padding:0;"><iframe src="${variables.targetUrl}" style="width:100%;height:100vh;border:none;" allowfullscreen></iframe></body></html>`;
        window.open(maskedUrl, '_blank');
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
        <div className="flex flex-col sm:flex-col gap-4">
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
              className={`${buttonColor} text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 whitespace-nowrap`}
              data-testid="button-access-site"
            >
              <ArrowRight size={16} />
              <span>{proxyMutation.isPending ? "Running..." : "Run"}</span>
            </Button>
          </div>
        </div>

        {/* Advanced Options Toggle */}
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