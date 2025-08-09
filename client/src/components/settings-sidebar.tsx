import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Moon, Sun, Shield, Globe, Eye, EyeOff, RefreshCw, Bell, FileText, Minimize2, AlertTriangle, Keyboard, Palette, Settings, Save } from "lucide-react";

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
  const [panicUrl, setPanicUrl] = useState("https://google.com");
  const [panicKey, setPanicKey] = useState("F9");
  const [buttonColor, setButtonColor] = useState("blue");
  const [hideScrollbars, setHideScrollbars] = useState(false);
  const [autoSaveSettings, setAutoSaveSettings] = useState(true);
  const [enableShortcuts, setEnableShortcuts] = useState(true);
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
    const savedPanicUrl = localStorage.getItem("panicUrl");
    const savedPanicKey = localStorage.getItem("panicKey");
    const savedButtonColor = localStorage.getItem("buttonColor");
    const savedHideScrollbars = localStorage.getItem("hideScrollbars");
    const savedAutoSaveSettings = localStorage.getItem("autoSaveSettings");
    const savedEnableShortcuts = localStorage.getItem("enableShortcuts");
    
    setIpMasking(savedIpMasking === "true");
    setAutoRefresh(savedAutoRefresh !== "false"); // default true
    setNotifications(savedNotifications !== "false"); // default true
    setEnableLogging(savedEnableLogging !== "false"); // default true
    setCompactMode(savedCompactMode === "true");
    setPanicUrl(savedPanicUrl || "https://google.com");
    setPanicKey(savedPanicKey || "F9");
    setButtonColor(savedButtonColor || "blue");
    setHideScrollbars(savedHideScrollbars === "true");
    setAutoSaveSettings(savedAutoSaveSettings !== "false"); // default true
    setEnableShortcuts(savedEnableShortcuts !== "false"); // default true
  }, []);

  // Panic button handler
  const handlePanicButton = useCallback(() => {
    window.location.href = panicUrl;
  }, [panicUrl]);

  // Keyboard event handler for panic button
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableShortcuts) return;
    
    if (event.key === panicKey || event.code === panicKey) {
      event.preventDefault();
      handlePanicButton();
    }
  }, [panicKey, enableShortcuts, handlePanicButton]);

  // Add keyboard event listener
  useEffect(() => {
    if (enableShortcuts) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableShortcuts]);

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



  const updatePanicUrl = (newUrl: string) => {
    setPanicUrl(newUrl);
    localStorage.setItem("panicUrl", newUrl);
    toast({
      title: "Panic URL Updated",
      description: `Will redirect to: ${newUrl}`,
    });
  };

  const updatePanicKey = (newKey: string) => {
    setPanicKey(newKey);
    localStorage.setItem("panicKey", newKey);
    toast({
      title: "Panic Key Updated",
      description: `Press ${newKey} to activate panic mode`,
    });
  };

  const toggleHideScrollbars = () => {
    const newHideScrollbars = !hideScrollbars;
    setHideScrollbars(newHideScrollbars);
    localStorage.setItem("hideScrollbars", newHideScrollbars.toString());
    
    // Apply scrollbar hiding to document
    if (newHideScrollbars) {
      document.documentElement.style.scrollbarWidth = 'none';
      (document.documentElement.style as any).msOverflowStyle = 'none';
      document.body.style.overflowY = 'scroll';
    } else {
      document.documentElement.style.scrollbarWidth = 'auto';
      (document.documentElement.style as any).msOverflowStyle = 'auto';
      document.body.style.overflowY = 'auto';
    }

    toast({
      title: newHideScrollbars ? "Scrollbars Hidden" : "Scrollbars Visible",
      description: newHideScrollbars 
        ? "Scrollbars are now hidden for cleaner appearance" 
        : "Scrollbars are now visible",
    });
  };

  const toggleAutoSaveSettings = () => {
    const newAutoSaveSettings = !autoSaveSettings;
    setAutoSaveSettings(newAutoSaveSettings);
    localStorage.setItem("autoSaveSettings", newAutoSaveSettings.toString());

    toast({
      title: newAutoSaveSettings ? "Auto Save Enabled" : "Auto Save Disabled",
      description: newAutoSaveSettings 
        ? "Settings will save automatically" 
        : "Manual save required",
    });
  };

  const toggleEnableShortcuts = () => {
    const newEnableShortcuts = !enableShortcuts;
    setEnableShortcuts(newEnableShortcuts);
    localStorage.setItem("enableShortcuts", newEnableShortcuts.toString());

    toast({
      title: newEnableShortcuts ? "Shortcuts Enabled" : "Shortcuts Disabled",
      description: newEnableShortcuts 
        ? "Keyboard shortcuts are now active" 
        : "Keyboard shortcuts are disabled",
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

  const updateButtonColor = (newColor: string) => {
    setButtonColor(newColor);
    localStorage.setItem("buttonColor", newColor);
    toast({
      title: "Button Color Updated", 
      description: `Changed to ${newColor} theme`,
    });
  };

  // Color options for button customization
  const colorOptions = [
    { name: "Blue", value: "blue", bg: "bg-blue-500", hover: "hover:bg-blue-600" },
    { name: "Green", value: "green", bg: "bg-green-500", hover: "hover:bg-green-600" },
    { name: "Purple", value: "purple", bg: "bg-purple-500", hover: "hover:bg-purple-600" },
    { name: "Red", value: "red", bg: "bg-red-500", hover: "hover:bg-red-600" },
    { name: "Orange", value: "orange", bg: "bg-orange-500", hover: "hover:bg-orange-600" },
    { name: "Pink", value: "pink", bg: "bg-pink-500", hover: "hover:bg-pink-600" },
    { name: "Indigo", value: "indigo", bg: "bg-indigo-500", hover: "hover:bg-indigo-600" },
    { name: "Teal", value: "teal", bg: "bg-teal-500", hover: "hover:bg-teal-600" },
    { name: "Cyan", value: "cyan", bg: "bg-cyan-500", hover: "hover:bg-cyan-600" },
    { name: "Emerald", value: "emerald", bg: "bg-emerald-500", hover: "hover:bg-emerald-600" },
    { name: "Lime", value: "lime", bg: "bg-lime-500", hover: "hover:bg-lime-600" },
    { name: "Yellow", value: "yellow", bg: "bg-yellow-500", hover: "hover:bg-yellow-600" },
    { name: "Amber", value: "amber", bg: "bg-amber-500", hover: "hover:bg-amber-600" },
    { name: "Rose", value: "rose", bg: "bg-rose-500", hover: "hover:bg-rose-600" },
    { name: "Violet", value: "violet", bg: "bg-violet-500", hover: "hover:bg-violet-600" },
    { name: "Fuchsia", value: "fuchsia", bg: "bg-fuchsia-500", hover: "hover:bg-fuchsia-600" },
    { name: "Sky", value: "sky", bg: "bg-sky-500", hover: "hover:bg-sky-600" },
    { name: "Stone", value: "stone", bg: "bg-stone-500", hover: "hover:bg-stone-600" },
    { name: "Slate", value: "slate", bg: "bg-slate-500", hover: "hover:bg-slate-600" },
    { name: "Gray", value: "gray", bg: "bg-gray-500", hover: "hover:bg-gray-600" },
  ];

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

            {/* Panic Button */}
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="text-red-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-red-800 dark:text-red-300">
                        Emergency Redirect
                      </Label>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Press {panicKey} or click button for quick escape
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-red-600 dark:text-red-400 mb-1">
                      Redirect URL
                    </Label>
                    <Input
                      type="text"
                      value={panicUrl}
                      onChange={(e) => updatePanicUrl(e.target.value)}
                      placeholder="https://google.com"
                      className="text-xs h-8 border-red-200 dark:border-red-700 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-red-600 dark:text-red-400 mb-1">
                      Panic Key
                    </Label>
                    <Select value={panicKey} onValueChange={updatePanicKey}>
                      <SelectTrigger className="text-xs h-8 border-red-200 dark:border-red-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F9">F9</SelectItem>
                        <SelectItem value="F10">F10</SelectItem>
                        <SelectItem value="F11">F11</SelectItem>
                        <SelectItem value="F12">F12</SelectItem>
                        <SelectItem value="Escape">Escape</SelectItem>
                        <SelectItem value="Delete">Delete</SelectItem>
                        <SelectItem value="Insert">Insert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={handlePanicButton}
                    className="w-full bg-red-500 hover:bg-red-600 text-white text-xs h-8 font-medium"
                    data-testid="button-panic"
                  >
                    <AlertTriangle size={12} className="mr-2" />
                    Emergency Redirect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Button Color Customization */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Palette className="text-purple-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Button Colors
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Choose from 20 color options
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateButtonColor(color.value)}
                      className={`w-8 h-8 rounded-lg ${color.bg} ${color.hover} transition-all duration-200 ${
                        buttonColor === color.value 
                          ? 'ring-2 ring-gray-400 dark:ring-gray-300 scale-110' 
                          : 'hover:scale-105'
                      }`}
                      title={color.name}
                      data-testid={`color-${color.value}`}
                    />
                  ))}
                </div>
                
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                  Current: {colorOptions.find(c => c.value === buttonColor)?.name || 'Blue'}
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Settings className="text-indigo-500" size={20} />
                    <div>
                      <Label className="text-sm font-medium text-gray-900 dark:text-white">
                        Advanced Options
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Additional customization settings
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Keyboard className="text-indigo-500" size={16} />
                      <Label className="text-sm text-gray-700 dark:text-gray-300">
                        Keyboard Shortcuts
                      </Label>
                    </div>
                    <Switch
                      checked={enableShortcuts}
                      onCheckedChange={toggleEnableShortcuts}
                      data-testid="switch-enable-shortcuts"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="text-indigo-500" size={16} />
                      <Label className="text-sm text-gray-700 dark:text-gray-300">
                        Hide Scrollbars
                      </Label>
                    </div>
                    <Switch
                      checked={hideScrollbars}
                      onCheckedChange={toggleHideScrollbars}
                      data-testid="switch-hide-scrollbars"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Save className="text-indigo-500" size={16} />
                      <Label className="text-sm text-gray-700 dark:text-gray-300">
                        Auto Save Settings
                      </Label>
                    </div>
                    <Switch
                      checked={autoSaveSettings}
                      onCheckedChange={toggleAutoSaveSettings}
                      data-testid="switch-auto-save"
                    />
                  </div>
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