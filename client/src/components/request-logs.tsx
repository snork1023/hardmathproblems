import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { List, RotateCcw, X } from "lucide-react";
import type { ProxyRequest } from "@shared/schema";

interface RequestLogsData {
  requests: ProxyRequest[];
  total: number;
}

export function RequestLogs() {
  const [page, setPage] = useState(0);
  const limit = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<RequestLogsData>({
    queryKey: ["/api/proxy/requests", { limit, offset: page * limit }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/proxy/requests");
    },
    onSuccess: () => {
      toast({
        title: "Logs Cleared",
        description: "All request logs have been cleared",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proxy/requests"] });
      setPage(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-success/10 text-success";
    if (status >= 400 && status < 500) return "bg-warning/10 text-warning";
    if (status >= 500) return "bg-error/10 text-error";
    return "bg-gray-100 text-gray-700";
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET": return "bg-blue-100 text-blue-800";
      case "POST": return "bg-green-100 text-green-800";
      case "PUT": return "bg-purple-100 text-purple-800";
      case "DELETE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <List className="text-primary" size={20} />
          <span>Recent Requests</span>
        </h3>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => refetch()}
            size="sm"
            variant="ghost"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center space-x-1"
            data-testid="button-refresh-logs"
          >
            <RotateCcw size={12} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => clearLogsMutation.mutate()}
            disabled={clearLogsMutation.isPending}
            size="sm"
            variant="ghost"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center space-x-1"
            data-testid="button-clear-logs"
          >
            <X size={12} />
            <span>{clearLogsMutation.isPending ? "Clearing..." : "Clear"}</span>
          </Button>
        </div>
      </div>

      {!data?.requests.length ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <List size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>No proxy requests yet</p>
          <p className="text-sm">Requests will appear here after you access websites through the proxy</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-gray-600 font-medium">Time</th>
                  <th className="text-left py-3 text-gray-600 font-medium">Method</th>
                  <th className="text-left py-3 text-gray-600 font-medium">URL</th>
                  <th className="text-left py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-3 text-gray-600 font-medium">Duration</th>
                  <th className="text-left py-3 text-gray-600 font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.requests.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50" data-testid={`row-request-${log.id}`}>
                    <td className="py-3 text-gray-600" data-testid="text-timestamp">
                      {formatTimestamp(log.timestamp.toString())}
                    </td>
                    <td className="py-3">
                      <Badge 
                        className={`px-2 py-1 text-xs font-medium ${getMethodColor(log.method)}`}
                        data-testid="badge-method"
                      >
                        {log.method}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-900 max-w-xs truncate" data-testid="text-url" title={log.targetUrl}>
                      {log.targetUrl}
                    </td>
                    <td className="py-3">
                      <Badge 
                        className={`px-2 py-1 text-xs font-medium ${getStatusColor(log.statusCode)}`}
                        data-testid="badge-status"
                      >
                        {log.statusCode}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-600" data-testid="text-duration">
                      {log.duration}ms
                    </td>
                    <td className="py-3 text-gray-600" data-testid="text-size">
                      {formatSize(log.responseSize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span data-testid="text-pagination-info">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} requests
            </span>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                size="sm"
                variant="outline"
                className="px-3 py-1"
                data-testid="button-previous-page"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                size="sm"
                variant="outline"
                className="px-3 py-1"
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}