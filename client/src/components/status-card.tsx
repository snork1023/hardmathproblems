import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, RotateCcw, StopCircle } from "lucide-react";

interface StatusCardProps {
  serverPort: number;
  activeConnections: number;
  totalRequests: number;
  uptime: string;
}

export function StatusCard({ serverPort, activeConnections, totalRequests, uptime }: StatusCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/proxy/restart");
    },
    onSuccess: () => {
      toast({
        title: "Server Restart",
        description: "Server restart initiated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restart Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/proxy/stop");
    },
    onSuccess: () => {
      toast({
        title: "Server Stop",
        description: "Server stop initiated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Stop Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <BarChart3 className="text-primary" size={20} />
          <span>Proxy Status</span>
        </h3>
        <Badge className="bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium">
          Active
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Server Port</span>
          <span className="text-sm font-medium text-gray-900" data-testid="text-server-port">
            {serverPort}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Connections</span>
          <span className="text-sm font-medium text-gray-900" data-testid="text-active-connections">
            {activeConnections}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Requests</span>
          <span className="text-sm font-medium text-gray-900" data-testid="text-total-requests">
            {totalRequests}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Uptime</span>
          <span className="text-sm font-medium text-gray-900" data-testid="text-uptime">
            {uptime}
          </span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <Button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="button-restart-server"
          >
            <RotateCcw size={12} className="mr-2" />
            {restartMutation.isPending ? "Restarting..." : "Restart"}
          </Button>
          <Button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="flex-1 bg-error hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="button-stop-server"
          >
            <StopCircle size={12} className="mr-2" />
            {stopMutation.isPending ? "Stopping..." : "Stop"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
