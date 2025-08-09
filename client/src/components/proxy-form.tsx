import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

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
});

type ProxyFormData = z.infer<typeof proxyFormSchema>;

export function ProxyForm() {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProxyFormData>({
    resolver: zodResolver(proxyFormSchema),
    defaultValues: {
      targetUrl: "",
      followRedirects: true,
      enableCaching: false,
      userAgent: "",
    },
  });

  const proxyMutation = useMutation({
    mutationFn: async (data: ProxyFormData) => {
      const response = await apiRequest("POST", "/api/proxy/request", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proxy request completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/stats"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Proxy Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProxyFormData) => {
    proxyMutation.mutate(data);
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <Link className="text-primary text-lg" />
        <h2 className="text-lg font-semibold text-gray-900">Access Website Through Proxy</h2>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="target-url" className="block text-sm font-medium text-gray-700 mb-2">
              Target URL
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="text-gray-400 text-sm" size={16} />
              </div>
              <Input
                id="target-url"
                type="text"
                placeholder="google.com or https://example.com"
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
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 whitespace-nowrap"
              data-testid="button-access-site"
            >
              <ArrowRight size={16} />
              <span>{proxyMutation.isPending ? "Accessing..." : "Access Site"}</span>
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
              
              <div>
                <Label htmlFor="user-agent" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom User Agent
                </Label>
                <Input
                  id="user-agent"
                  type="text"
                  placeholder="Mozilla/5.0 (default)"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  data-testid="input-user-agent"
                  {...form.register("userAgent")}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
