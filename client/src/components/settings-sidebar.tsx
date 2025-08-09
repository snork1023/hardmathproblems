import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { X, Moon, Sun, Shield, Globe, Eye, EyeOff, RefreshCw, Bell, FileText, Minimize2 } from "lucide-react";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSidebar({ isOpen, onClose }: SettingsSidebarProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [ipMasking, setIpMasking] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [showIp, setShowIp] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [enableLogging, setEnableLogging] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const { toast } = useToast();

  // Load theme preference from localStorage (default to light theme)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Load all preferences from localStorage
  useEffect(() => {
    const savedIpMasking = localStorage.getItem("ipMasking");
    const savedAutoRefresh = localStorage.getItem("autoRefresh");
    const savedNotifications = localStorage.getItem("notifications");
    const savedEnableLogging = localStorage.getItem("enableLogging");
    const savedCompactMode = localStorage.getItem("compactMode");
    
    setIpMasking(savedIpMasking === "true");
    setAutoRefresh(savedAutoRefresh !== "false"); // default true
    setNotifications(savedNotifications !== "false"); // default true
    setEnableLogging(savedEnableLogging !== "false"); // default true
    setCompactMode(savedCompactMode === "true");
  }, []);

  // Fetch current IP address
  const fetchCurrentIp = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setCurrentIp(data.ip);
    } catch (error) {
      setCurrentIp("Unable to fetch IP");
    }
  };

  useEffect(() => {
    if (isOpen && showIp && !currentIp) {
      fetchCurrentIp();
    }
  }, [isOpen, showIp, currentIp]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    toast({
      title: "Theme Updated",
      description: `Switched to ${newDarkMode ? "dark" : "light"} mode`,
    });
  };

  const toggleIpMasking = () => {
    const newIpMasking = !ipMasking;
    setIpMasking(newIpMasking);
    localStorage.setItem("ipMasking", newIpMasking.toString());

    toast({
      title: newIpMasking ? "IP Masking Enabled" : "IP Masking Disabled",
      description: newIpMasking 
        ? "Your IP address will be masked in proxy requests" 
        : "Your real IP address will be used",
    });
  };

  const toggleAutoRefresh = () => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    localStorage.setItem("autoRefresh", newAutoRefresh.toString());

    toast({
      title: newAutoRefresh ? "Auto Refresh Enabled" : "Auto Refresh Disabled",
      description: newAutoRefresh 
        ? "Statistics will refresh automatically" 
        : "Manual refresh required",
    });
  };

  const toggleNotifications = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    localStorage.setItem("notifications", newNotifications.toString());

    toast({
      title: newNotifications ? "Notifications Enabled" : "Notifications Disabled",
      description: newNotifications 
        ? "You will receive status notifications" 
        : "Notifications are turned off",
    });
  };

  const toggleEnableLogging = () => {
    const newEnableLogging = !enableLogging;
    setEnableLogging(newEnableLogging);
    localStorage.setItem("enableLogging", newEnableLogging.toString());

    toast({
      title: newEnableLogging ? "Logging Enabled" : "Logging Disabled",
      description: newEnableLogging 
        ? "All requests will be logged" 
        : "Request logging is disabled",
    });
  };

  const toggleCompactMode = () => {
    const newCompactMode = !compactMode;
    setCompactMode(newCompactMode);
    localStorage.setItem("compactMode", newCompactMode.toString());

    toast({
      title: newCompactMode ? "Compact Mode Enabled" : "Compact Mode Disabled",
      description: newCompactMode 
        ? "Interface will use compact layout" 
        : "Standard layout restored",
    });
  };

  const toggleShowIp = () => {
    setShowIp(!showIp);
    if (!showIp && !currentIp) {
      fetchCurrentIp();
    }
  };

  const maskIp = (ip: string) => {
    if (!ip || ip === "Unable to fetch IP") return ip;
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              data-testid="button-close-settings"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Theme Settings */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {darkMode ? (
                      <Moon className="text-blue-500" size={20} />
                    ) : (
                      <Sun className="text-orange-500" size={20} />
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Dark Theme
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Toggle between light and dark appearance
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={toggleDarkMode}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </CardContent>
            </Card>

            {/* IP Address Information */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="text-green-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Current IP Address
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        View your current public IP
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleShowIp}
                    className="flex items-center space-x-2"
                    data-testid="button-toggle-ip-visibility"
                  >
                    {showIp ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showIp ? "Hide" : "Show"}</span>
                  </Button>
                </div>

                {showIp && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">IP Address:</span>
                      <Badge 
                        variant="outline" 
                        className="font-mono text-xs"
                        data-testid="badge-current-ip"
                      >
                        {currentIp ? (ipMasking ? maskIp(currentIp) : currentIp) : "Loading..."}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* IP Masking */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="text-purple-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        IP Masking
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Hide your real IP address in requests
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ipMasking}
                    onCheckedChange={toggleIpMasking}
                    data-testid="switch-ip-masking"
                  />
                </div>

                {ipMasking && (
                  <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      IP masking is enabled. Your requests will use proxy headers to hide your real IP.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto Refresh */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="text-blue-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Auto Refresh
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Automatically refresh statistics
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={toggleAutoRefresh}
                    data-testid="switch-auto-refresh"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="text-orange-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Notifications
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Show status notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={toggleNotifications}
                    data-testid="switch-notifications"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Request Logging */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="text-indigo-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Request Logging
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Log all proxy requests
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableLogging}
                    onCheckedChange={toggleEnableLogging}
                    data-testid="switch-logging"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compact Mode */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Minimize2 className="text-gray-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Compact Mode
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use compact interface layout
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={toggleCompactMode}
                    data-testid="switch-compact-mode"
                  />
                </div>
              </CardContent>
            </Card>

            <Separator className="dark:border-gray-700" />

            {/* Additional Info */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nothing Suspicious At All Just Homework
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Version 1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}