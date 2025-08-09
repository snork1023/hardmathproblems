import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Download, Settings, Zap } from "lucide-react";

export function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/proxy/requests");
    },
    onSuccess: () => {
      toast({
        title: "Cache Cleared",
        description: "All cached responses have been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Cache Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportLogs = async () => {
    try {
      // In a real implementation, this would download actual logs
      const response = await fetch("/api/proxy/requests");
      const data = await response.json();
      
      // Convert to CSV format
      const csvContent = [
        "Timestamp,Method,URL,Status,Duration,Size",
        ...data.requests.map((req: any) => [
          req.timestamp,
          req.method,
          req.targetUrl,
          req.statusCode,
          req.duration + "ms",
          req.responseSize + "B"
        ].join(","))
      ].join("\n");
      
      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proxy-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Logs Exported",
        description: "Request logs downloaded as CSV file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export logs",
        variant: "destructive",
      });
    }
  };

  const openSettings = () => {
    toast({
      title: "Settings",
      description: "Server settings panel would open here",
    });
  };

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
        <Zap className="text-primary" size={20} />
        <span>Quick Actions</span>
      </h3>
      
      <div className="space-y-3">
        <Button
          onClick={() => clearCacheMutation.mutate()}
          disabled={clearCacheMutation.isPending}
          className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 text-left rounded-lg border-0"
          variant="ghost"
          data-testid="button-clear-cache"
        >
          <div className="w-8 h-8 bg-blue-100 text-primary rounded-lg flex items-center justify-center">
            <Trash2 size={14} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {clearCacheMutation.isPending ? "Clearing..." : "Clear Cache"}
            </div>
            <div className="text-xs text-gray-500">Remove all cached responses</div>
          </div>
        </Button>
        
        <Button
          onClick={exportLogs}
          className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 text-left rounded-lg border-0"
          variant="ghost"
          data-testid="button-export-logs"
        >
          <div className="w-8 h-8 bg-green-100 text-success rounded-lg flex items-center justify-center">
            <Download size={14} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Export Logs</div>
            <div className="text-xs text-gray-500">Download request logs as CSV</div>
          </div>
        </Button>
        
        <Button
          onClick={openSettings}
          className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 text-left rounded-lg border-0"
          variant="ghost"
          data-testid="button-server-settings"
        >
          <div className="w-8 h-8 bg-orange-100 text-warning rounded-lg flex items-center justify-center">
            <Settings size={14} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Server Settings</div>
            <div className="text-xs text-gray-500">Configure proxy parameters</div>
          </div>
        </Button>
      </div>
    </Card>
  );
}
