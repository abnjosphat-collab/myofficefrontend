"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Monitor, Sun, Moon, Grid, List, Kanban } from "@/components/shared/theme";

export default function SettingsDialog({ preferences, onSave }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(preferences);

  const handleSave = () => {
    onSave(settings);
    setOpen(false);
  };

  const handleReset = () => {
    setSettings(preferences);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings & Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your maintenance dashboard experience and appearance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* View Preferences */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">View Preferences</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="viewMode" className="text-sm font-normal">
                  Default View Mode
                </Label>
                <Select 
                  value={settings.viewMode} 
                  onValueChange={(value) => setSettings({...settings, viewMode: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">
                      <div className="flex items-center gap-2">
                        <Grid className="h-3 w-3" />
                        Grid
                      </div>
                    </SelectItem>
                    <SelectItem value="list">
                      <div className="flex items-center gap-2">
                        <List className="h-3 w-3" />
                        List
                      </div>
                    </SelectItem>
                    <SelectItem value="kanban">
                      <div className="flex items-center gap-2">
                        <Kanban className="h-3 w-3" />
                        Kanban
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="compactView" className="text-sm font-normal">
                  Compact View
                </Label>
                <Switch
                  id="compactView"
                  checked={settings.compactView}
                  onCheckedChange={(checked) => setSettings({...settings, compactView: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showCompleted" className="text-sm font-normal">
                  Show Completed Tasks
                </Label>
                <Switch
                  id="showCompleted"
                  checked={settings.showCompleted}
                  onCheckedChange={(checked) => setSettings({...settings, showCompleted: checked})}
                />
              </div>
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Behavior</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm font-normal">
                  Enable Notifications
                </Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoSave" className="text-sm font-normal">
                  Auto-save Changes
                </Label>
                <Switch
                  id="autoSave"
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => setSettings({...settings, autoSave: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="quickActions" className="text-sm font-normal">
                  Quick Actions Panel
                </Label>
                <Switch
                  id="quickActions"
                  checked={settings.quickActions}
                  onCheckedChange={(checked) => setSettings({...settings, quickActions: checked})}
                />
              </div>
            </div>
          </div>

          {/* Dashboard Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Dashboard</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="dashboardStats" className="text-sm font-normal">
                  Show Statistics Cards
                </Label>
                <Switch
                  id="dashboardStats"
                  checked={settings.dashboardStats}
                  onCheckedChange={(checked) => setSettings({...settings, dashboardStats: checked})}
                />
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Appearance</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="text-sm font-normal">
                  Theme
                </Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value) => setSettings({...settings, theme: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3" />
                        System
                      </div>
                    </SelectItem>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-3 w-3" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-3 w-3" />
                        Dark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}