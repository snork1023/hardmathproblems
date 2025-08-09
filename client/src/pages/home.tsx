import { useQuery } from "@tanstack/react-query";
import { ProxyForm } from "@/components/proxy-form";
import { StatusCard } from "@/components/status-card";
import { QuickActions } from "@/components/quick-actions";
import { RequestLogs } from "@/components/request-logs";
import { Globe, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: stats } = useQuery({
    queryKey: ["/api/proxy/stats"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-gray-50 min-h-screen font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-white text-sm" size={16} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">WebProxy</h1>
                <p className="text-xs text-gray-500">HTTP/HTTPS Proxy Server</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600" data-testid="text-server-status">
                  Server Running
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-gray-400 hover:text-gray-600"
                data-testid="button-settings"
              >
                <Settings size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Proxy Form */}
        <ProxyForm />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Card */}
          <StatusCard
            serverPort={stats?.serverPort || 5000}
            activeConnections={stats?.activeConnections || 0}
            totalRequests={stats?.totalRequests || 0}
            uptime={stats?.uptime ? formatUptime(stats.uptime) : "0m"}
          />

          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Request Logs */}
        <RequestLogs />
      </main>
    </div>
  );
}
