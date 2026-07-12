"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import QuickCreateDialog from "./QuickCreateDialog";
import SettingsDialog from "./SettingsDialog";
import { RefreshCw, ArrowLeft, Home, Wrench } from "@/components/shared/theme";
import Link from "next/link";

export default function MaintenanceHeader({ 
  onRefresh, 
  isLoading, 
  onCreateWorkOrder, 
  preferences, 
  onSavePreferences 
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="flex items-center gap-3 ml-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 shadow-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Maintenance Pro</span>
                <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider hidden sm:inline-block">
                  Smart Work Order Management
                </span>
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <Home className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Dashboard</TooltipContent>
            </Tooltip>
            <Link href="/employees" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Personnel
            </Link>
            <Link href="/equipment" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Assets
            </Link>
            <Link href="/reports" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Reports
            </Link>
            <Link href="/maintenance" className="text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors">
              Maintenance
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <QuickCreateDialog onCreate={onCreateWorkOrder} />
            <SettingsDialog 
              preferences={preferences} 
              onSave={onSavePreferences} 
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}