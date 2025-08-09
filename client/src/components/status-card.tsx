import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, RotateCcw, StopCircle, Shield, Globe, Clock, Activity } from "lucide-react";

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
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <BarChart3 className="text-primary" size={20} />
          <span>System Status</span>
        </h3>
        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
          Active
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Globe className="text-blue-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Server Port</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-server-port">
            {serverPort}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="text-green-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Active Sessions</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-active-connections">
            {activeConnections}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BarChart3 className="text-purple-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Problems Solved</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-total-requests">
            {totalRequests}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Clock className="text-orange-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Study Time</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-uptime">
            {uptime}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="text-indigo-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Privacy Mode</span>
          </div>
          <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded text-xs">
            Enabled
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BarChart3 className="text-red-500" size={16} />
            <span className="text-sm text-gray-600 dark:text-gray-300">Performance</span>
          </div>
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs">
            Optimal
          </Badge>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex space-x-2">
          <Button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="button-restart-server"
          >
            <RotateCcw size={12} className="mr-2" />
            {restartMutation.isPending ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="button-stop-server"
          >
            <StopCircle size={12} className="mr-2" />
            {stopMutation.isPending ? "Pausing..." : "Pause"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
