// app/farm/page.tsx
'use client';

import { useState, useEffect, ReactNode, ComponentType } from 'react';
import Link from "next/link";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calculator,
  FileText,
  Tractor,
  Truck,
  Fuel,
  Wrench,
  Warehouse,
  ToolCase,
  Users,
  Clock,
  ClipboardCheck,
  CalendarDays,
  LineChart,
  BarChart3,
  Eye,
  Scale,
  AlertTriangle,
  Package,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Building,
  Settings,
  Shield,
  FileCheck,
  Database,
  Layers,
  Server,
  ChevronUp,
  Fan,
  HardHat,
  Cpu,
  Megaphone,
  LucideIcon
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// =============== ANIMATION STYLES ===============
const animationStyles = `
  @keyframes fly-in-from-right {
    from {
      opacity: 0;
      transform: translateX(120px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fade-in-up-slow {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float-slow {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes fade-in-slow {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .animate-fly-in-from-right {
    animation: fly-in-from-right 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  .animate-fade-in-up-slow {
    animation: fade-in-up-slow 1.8s ease-out forwards;
  }

  .animate-float-slow {
    animation: float-slow 4s ease-in-out infinite;
  }

  .animate-fade-in-slow {
    animation: fade-in-slow 1.5s ease-out forwards;
    opacity: 0;
  }

  .animate-pulse-slow {
    animation: pulse-slow 2.5s ease-in-out infinite;
  }
`;

// =============== TYPES ===============
type ColorType = 'emerald' | 'amber' | 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'cyan' | 'orange';

interface ModuleItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: ColorType;
  link: string;
  badge?: string;
}

interface Category {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: ColorType;
  modules: ModuleItem[];
}

interface FinancialMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
}

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  farmName?: string;
}

interface QuickAction {
  icon: LucideIcon;
  label: string;
  color: ColorType;
  link: string;
}

// =============== COMPONENTS ===============
function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const userData: UserData = {
        id: 1,
        email,
        name: mode === 'signup' ? name : email.split('@')[0],
        role: 'farmer',
        farmName: mode === 'signup' ? `${name}'s Farm` : 'My Farm'
      };

      localStorage.setItem('token', 'demo_token');
      localStorage.setItem('user', JSON.stringify(userData));
      
      setLoading(false);
      window.location.reload();
    }, 1000);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-white/30">
      <div className="text-center mb-4">
        <div className="flex justify-center mb-3">
          <Tractor className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">
          {mode === 'login' ? 'Welcome Back' : 'Join FarmTrack'}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {mode === 'login' ? 'Sign in to manage your farm' : 'Start tracking farm finances'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <input
              type="text"
              placeholder="Farm Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
              required
            />
          </div>
        )}

        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
            required
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
            required
          />
        </div>

        {mode === 'signup' && (
          <div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
              required
            />
          </div>
        )}

        {error && (
          <div className="p-2 bg-red-50/80 backdrop-blur-sm text-red-700 rounded text-xs border border-red-200/50">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 rounded-lg hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 text-sm shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2" />
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </span>
          ) : (
            mode === 'login' ? 'Sign In' : 'Get Started'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs text-emerald-600 hover:text-emerald-800 hover:underline transition-colors duration-300"
          >
            {mode === 'login' 
              ? "Need an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper function for colors
function getColorClasses(color: ColorType) {
  const colorMap: Record<ColorType, {
    bg: string;
    hover: string;
    light: string;
    text: string;
    border: string;
    icon: string;
    card: string;
  }> = {
    emerald: { 
      bg: 'bg-emerald-600', 
      hover: 'hover:bg-emerald-700', 
      light: 'bg-emerald-100/70', 
      text: 'text-emerald-800', 
      border: 'border-emerald-200/60',
      icon: 'text-emerald-700',
      card: 'bg-emerald-50/80'
    },
    amber: { 
      bg: 'bg-amber-600', 
      hover: 'hover:bg-amber-700', 
      light: 'bg-amber-100/70', 
      text: 'text-amber-800', 
      border: 'border-amber-200/60',
      icon: 'text-amber-700',
      card: 'bg-amber-50/80'
    },
    blue: { 
      bg: 'bg-brand-600', 
      hover: 'hover:bg-brand-700', 
      light: 'bg-brand-100/70', 
      text: 'text-brand-800', 
      border: 'border-brand-200/60',
      icon: 'text-brand-700',
      card: 'bg-brand-50/80'
    },
    green: { 
      bg: 'bg-green-600', 
      hover: 'hover:bg-green-700', 
      light: 'bg-green-100/70', 
      text: 'text-green-800', 
      border: 'border-green-200/60',
      icon: 'text-green-700',
      card: 'bg-green-50/80'
    },
    red: { 
      bg: 'bg-red-600', 
      hover: 'hover:bg-red-700', 
      light: 'bg-red-100/70', 
      text: 'text-red-800', 
      border: 'border-red-200/60',
      icon: 'text-red-700',
      card: 'bg-red-50/80'
    },
    purple: { 
      bg: 'bg-purple-600', 
      hover: 'hover:bg-purple-700', 
      light: 'bg-purple-100/70', 
      text: 'text-purple-800', 
      border: 'border-purple-200/60',
      icon: 'text-purple-700',
      card: 'bg-purple-50/80'
    },
    indigo: { 
      bg: 'bg-indigo-600', 
      hover: 'hover:bg-indigo-700', 
      light: 'bg-indigo-100/70', 
      text: 'text-indigo-800', 
      border: 'border-indigo-200/60',
      icon: 'text-indigo-700',
      card: 'bg-indigo-50/80'
    },
    cyan: { 
      bg: 'bg-cyan-600', 
      hover: 'hover:bg-cyan-700', 
      light: 'bg-cyan-100/70', 
      text: 'text-cyan-800', 
      border: 'border-cyan-200/60',
      icon: 'text-cyan-700',
      card: 'bg-cyan-50/80'
    },
    orange: { 
      bg: 'bg-orange-600', 
      hover: 'hover:bg-orange-700', 
      light: 'bg-orange-100/70', 
      text: 'text-orange-800', 
      border: 'border-orange-200/60',
      icon: 'text-orange-700',
      card: 'bg-orange-50/80'
    },
  };
  return colorMap[color];
}

// Module Card Component
function ModuleCard({ module, index, isVisible }: { module: ModuleItem; index: number; isVisible: boolean }) {
  const colors = getColorClasses(module.color);
  const IconComponent = module.icon;
  
  return (
    <Link href={module.link} className="block group">
      <div className={`h-full transition-all duration-1500 ease-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-60'}`}
        style={{ 
          transitionDelay: `${index * 250}ms`,
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
        <Card className={`border ${colors.border} h-full hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 ${colors.card} backdrop-blur-sm`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg ${colors.light} flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg backdrop-blur-sm`}>
                <IconComponent className={`h-5 w-5 ${colors.icon} transition-all duration-500 group-hover:scale-110`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-800 text-sm truncate group-hover:text-gray-900 transition-colors duration-300">
                    {module.title}
                  </h3>
                  {module.badge && (
                    <Badge className={`text-xs ${colors.text} ${colors.border} bg-white/60 backdrop-blur-sm`}>
                      {module.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-700/90 text-xs line-clamp-2">
                  {module.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}

// Category Accordion Component
function CategoryAccordion({ 
  category, 
  isExpanded, 
  onToggle,
  index 
}: { 
  category: Category; 
  isExpanded: boolean; 
  onToggle: () => void;
  index: number;
}) {
  const colors = getColorClasses(category.color);
  const [modulesVisible, setModulesVisible] = useState(false);
  const CategoryIcon = category.icon;
  
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setModulesVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModulesVisible(false);
    }
  }, [isExpanded]);
  
  return (
    <div className="rounded-xl border border-emerald-200/40 bg-emerald-50/70 backdrop-blur-sm shadow-xl hover:shadow-2xl mb-6 transition-all duration-500">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-emerald-100/50 rounded-t-xl transition-all duration-500"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${colors.light} transition-all duration-500 ${isExpanded ? 'scale-110 shadow-lg' : 'shadow-md'} backdrop-blur-sm`}>
            <CategoryIcon className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-800 text-base">{category.title}</h3>
            <p className="text-gray-700/90 text-sm">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-xs ${colors.text} ${colors.border} bg-white/60 backdrop-blur-sm transition-all duration-500 ${isExpanded ? 'scale-110' : ''}`}>
            {category.modules.length} modules
          </Badge>
          <div className={`p-2 rounded-full ${colors.light} transition-all duration-500 shadow-md backdrop-blur-sm`}>
            <ChevronDown className={`h-5 w-5 ${colors.icon} transition-transform duration-700 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-1000 ease-in-out ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="p-5 pt-0 border-t border-emerald-200/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-5">
            {category.modules.map((module, moduleIndex) => (
              <ModuleCard 
                key={module.link} 
                module={module} 
                index={moduleIndex}
                isVisible={modulesVisible}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Financial Metric Component
function FinancialMetric({ metric }: { metric: FinancialMetric }) {
  const IconComponent = metric.icon;
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-emerald-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            metric.trend === 'up' ? 'bg-emerald-100' : 
            metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <IconComponent className={`h-4 w-4 ${
              metric.trend === 'up' ? 'text-emerald-600' : 
              metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          metric.trend === 'up' ? 'text-emerald-600' : 
          metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
           metric.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
          {metric.change}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
    </div>
  );
}

// =============== MAIN PAGE ===============
export default function FarmPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'financial': true,
    'assets': true,
    'operations': true,
    'analytics': true,
  });

  // Financial metrics data
  const financialMetrics: FinancialMetric[] = [
    { label: 'Monthly Revenue', value: '$45,820', change: '+12.5%', trend: 'up', icon: DollarSign },
    { label: 'Operating Costs', value: '$28,450', change: '+8.2%', trend: 'down', icon: TrendingDown },
    { label: 'Net Profit', value: '$17,370', change: '+18.3%', trend: 'up', icon: TrendingUp },
    { label: 'Fuel Costs', value: '$3,240', change: '+15.1%', trend: 'down', icon: Fuel },
  ];

  // Quick actions for dashboard
  const quickActions: QuickAction[] = [
    { icon: DollarSign, label: 'Record Expense', color: 'red', link: '/expenses' },
    { icon: Calculator, label: 'Calculate Profit', color: 'emerald', link: '/profit' },
    { icon: Tractor, label: 'Log Maintenance', color: 'amber', link: '/maintenance' },
    { icon: PieChart, label: 'View Reports', color: 'purple', link: '/reports' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser: UserData = JSON.parse(userData);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoggedIn(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    window.location.reload();
  };

  // Define farm-specific categories
  const categories: Category[] = [
    {
      id: 'financial',
      title: 'Financial Management',
      description: 'Track expenses, revenues, and profitability',
      icon: DollarSign,
      color: 'emerald',
      modules: [
        { icon: DollarSign, title: "Income Tracking", description: "Record sales and revenue", color: "green", link: "/income", badge: "Revenue" },
        { icon: TrendingDown, title: "Expense Manager", description: "Track all farm costs", color: "red", link: "/expenses", badge: "Costs" },
        { icon: PieChart, title: "Profit & Loss", description: "Calculate net profit", color: "emerald", link: "/profit-loss", badge: "P&L" },
        { icon: Calculator, title: "Budget Planning", description: "Plan farm budgets", color: "blue", link: "/budget" },
        { icon: FileText, title: "Tax Records", description: "Organize for tax season", color: "purple", link: "/taxes" },
        { icon: Scale, title: "Cost Analysis", description: "Analyze spending", color: "amber", link: "/cost-analysis" },
      ]
    },
    {
      id: 'assets',
      title: 'Assets & Fleet',
      description: 'Manage equipment, vehicles, and infrastructure',
      icon: Tractor,
      color: 'amber',
      modules: [
        { icon: Tractor, title: "Equipment", description: "Track farm machinery", color: "orange", link: "/equipment", badge: "Fleet" },
        { icon: Truck, title: "Vehicles", description: "Manage trucks and transport", color: "amber", link: "/vehicles" },
        { icon: Fuel, title: "Fuel Tracking", description: "Monitor fuel usage", color: "red", link: "/fuel" },
        { icon: Wrench, title: "Maintenance", description: "Schedule equipment care", color: "blue", link: "/maintenance" },
        { icon: Warehouse, title: "Storage", description: "Manage farm storage", color: "indigo", link: "/storage" },
        { icon: ToolCase, title: "Tools", description: "Track farm tools", color: "cyan", link: "/tools" },
      ]
    },
    {
      id: 'operations',
      title: 'Farm Operations',
      description: 'Daily activities and workforce management',
      icon: ClipboardCheck,
      color: 'blue',
      modules: [
        { icon: Users, title: "Workforce", description: "Manage farm workers", color: "indigo", link: "/workers" },
        { icon: Clock, title: "Labor Hours", description: "Track working hours", color: "purple", link: "/labor" },
        { icon: ClipboardCheck, title: "Tasks", description: "Schedule farm activities", color: "blue", link: "/tasks" },
        { icon: CalendarDays, title: "Calendar", description: "Plan seasonal work", color: "green", link: "/calendar" },
        { icon: Package, title: "Inventory", description: "Track farm supplies", color: "amber", link: "/inventory" },
        { icon: AlertTriangle, title: "Issues", description: "Report and track problems", color: "red", link: "/issues" },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'Data visualization and performance insights',
      icon: BarChart3,
      color: 'purple',
      modules: [
        { icon: LineChart, title: "Dashboard", description: "Real-time farm metrics", color: "indigo", link: "/dashboard", badge: "Live" },
        { icon: BarChart3, title: "Reports", description: "Generate farm reports", color: "green", link: "/reports" },
        { icon: PieChart, title: "Analysis", description: "Analyze farm data", color: "purple", link: "/analysis" },
        { icon: Eye, title: "Forecasting", description: "Predict future results", color: "blue", link: "/forecasting" },
        { icon: FileCheck, title: "Compliance", description: "Regulatory compliance", color: "amber", link: "/compliance" },
        { icon: Shield, title: "Safety", description: "Track safety records", color: "red", link: "/safety" },
      ]
    },
  ];

  const financialModules = categories.find(cat => cat.id === 'financial')?.modules || [];
  const assetModules = categories.find(cat => cat.id === 'assets')?.modules || [];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    categories.forEach(cat => {
      allExpanded[cat.id] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    categories.forEach(cat => {
      allCollapsed[cat.id] = false;
    });
    setExpandedCategories(allCollapsed);
  };

  // Mobile menu handler
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-emerald-800 text-sm font-medium">Loading FarmTrack...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{animationStyles}</style>
      
      {/* Beautiful Farm Background Image */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-green-900/30"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=2070')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.85,
            filter: 'brightness(1.05) contrast(1.1) saturate(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/30 via-transparent to-emerald-900/20" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-emerald-200/40 bg-emerald-900/70 backdrop-blur-xl backdrop-saturate-150">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/90 to-green-500/90 shadow-lg">
                  <Tractor className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-lg drop-shadow-lg">FarmTrack</span>
                  <span className="text-xs text-emerald-200">Business Management</span>
                </div>
              </Link>

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-white hover:bg-white/10"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/" className="text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm drop-shadow-sm font-medium">
                  Dashboard
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center gap-2 text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm drop-shadow-sm font-medium">
                    Finances
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-48 bg-emerald-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-2 z-50">
                    {financialModules.slice(0, 5).map((module) => {
                      const Icon = module.icon;
                      return (
                        <Link key={module.link} href={module.link} className="flex items-center gap-3 p-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                          <Icon className="h-4 w-4 text-white/70" />
                          {module.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="relative group">
                  <button className="flex items-center gap-2 text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm drop-shadow-sm font-medium">
                    Assets
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-48 bg-emerald-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-2 z-50">
                    {assetModules.slice(0, 5).map((module) => {
                      const Icon = module.icon;
                      return (
                        <Link key={module.link} href={module.link} className="flex items-center gap-3 p-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                          <Icon className="h-4 w-4 text-white/70" />
                          {module.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <Link href="/operations" className="text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm drop-shadow-sm font-medium">
                  Operations
                </Link>
                <Link href="/reports" className="text-sm text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm drop-shadow-sm font-medium">
                  Reports
                </Link>
              </nav>

              {/* Right Side Actions - Desktop */}
              <div className="hidden lg:flex items-center gap-3">
                {isLoggedIn ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border-2 border-white/30">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500/80 to-green-500/80 text-white text-sm">
                          {user?.name?.charAt(0) || 'F'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium drop-shadow-sm">{user?.name || 'Farmer'}</span>
                        <span className="text-xs text-emerald-200">{user?.farmName || 'Family Farm'}</span>
                      </div>
                    </div>
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-sm bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-white hover:text-white transition-all duration-300 font-medium">
                          <LogIn className="h-4 w-4 mr-2" /> Login
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                        <DialogHeader>
                          <DialogTitle className="sr-only">Login to FarmTrack</DialogTitle>
                        </DialogHeader>
                        <AuthForm />
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-sm transition-all duration-300 shadow-lg hover:shadow-xl text-white font-medium">
                          <UserPlus className="h-4 w-4 mr-2" /> Sign Up
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                        <DialogHeader>
                          <DialogTitle className="sr-only">Sign Up for FarmTrack</DialogTitle>
                        </DialogHeader>
                        <AuthForm />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden border-t border-emerald-200/20 bg-emerald-900/95 backdrop-blur-xl mt-2 py-4 rounded-b-xl">
                <div className="space-y-1 px-4">
                  <Link 
                    href="/" 
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 p-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                  >
                    Dashboard
                  </Link>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 text-sm text-white/90">
                      Finances
                    </div>
                    <div className="ml-4 space-y-1">
                      {financialModules.slice(0, 3).map((module) => {
                        const Icon = module.icon;
                        return (
                          <Link 
                            key={module.link} 
                            href={module.link}
                            onClick={closeMobileMenu}
                            className="flex items-center gap-3 p-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                          >
                            <Icon className="h-4 w-4 text-white/60" />
                            {module.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-3 text-sm text-white/90">
                      Assets
                    </div>
                    <div className="ml-4 space-y-1">
                      {assetModules.slice(0, 3).map((module) => {
                        const Icon = module.icon;
                        return (
                          <Link 
                            key={module.link} 
                            href={module.link}
                            onClick={closeMobileMenu}
                            className="flex items-center gap-3 p-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                          >
                            <Icon className="h-4 w-4 text-white/60" />
                            {module.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <Link 
                    href="/operations" 
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 p-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                  >
                    Operations
                  </Link>
                  
                  <Link 
                    href="/reports" 
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 p-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                  >
                    Reports
                  </Link>
                </div>

                {/* Mobile Auth Actions */}
                <div className="mt-4 pt-4 border-t border-emerald-200/20 px-4">
                  {isLoggedIn ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3">
                        <Avatar className="h-10 w-10 border-2 border-white/30">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500/80 to-green-500/80 text-white">
                            {user?.name?.charAt(0) || 'F'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium">{user?.name || 'Farmer'}</span>
                          <span className="text-xs text-emerald-200">{user?.farmName || 'Family Farm'}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={handleLogout} 
                        variant="outline" 
                        className="w-full text-white border-white/30 hover:bg-white/10 hover:text-white"
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            onClick={closeMobileMenu}
                            className="w-full bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-white hover:text-white"
                          >
                            <LogIn className="h-4 w-4 mr-2" /> Login
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Login to FarmTrack</DialogTitle>
                          </DialogHeader>
                          <AuthForm />
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={closeMobileMenu}
                            className="w-full bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white"
                          >
                            <UserPlus className="h-4 w-4 mr-2" /> Sign Up
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Sign Up for FarmTrack</DialogTitle>
                          </DialogHeader>
                          <AuthForm />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="mb-8 text-center animate-fade-in-up-slow">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
              FarmTrack Business Suite
            </h1>
            <p className="text-lg text-emerald-100 max-w-3xl mx-auto mb-6 drop-shadow-md">
              Complete financial management and operational tracking for modern farms
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Button 
                size="sm" 
                onClick={expandAll}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 transition-all duration-300"
              >
                Expand All
              </Button>
              <Button 
                size="sm" 
                onClick={collapseAll}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/30 transition-all duration-300"
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Dashboard Grid for Logged In Users */}
          {isLoggedIn ? (
            <>
              {/* Welcome Card */}
              <div className="mb-8 animate-fade-in-up-slow" style={{ animationDelay: '200ms' }}>
                <Card className="border-emerald-200/40 bg-gradient-to-r from-emerald-900/50 to-green-900/50 backdrop-blur-xl shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-4 border-white/30 shadow-lg">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500/90 to-green-500/90 text-white text-lg">
                            {user?.name?.charAt(0) || 'F'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-bold text-white">Welcome back, {user?.name || 'Farmer'}! 👋</h2>
                          <p className="text-emerald-100">Manage your farm operations from one place</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                          <DollarSign className="h-4 w-4 mr-2" /> Record Transaction
                        </Button>
                        <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white">
                          Quick Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Metrics */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up-slow" style={{ animationDelay: '400ms' }}>
                {financialMetrics.map((metric, index) => (
                  <FinancialMetric key={metric.label} metric={metric} />
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mb-8 animate-fade-in-up-slow" style={{ animationDelay: '600ms' }}>
                <h3 className="text-xl font-bold text-white mb-4 drop-shadow-lg">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    const colors = getColorClasses(action.color);
                    return (
                      <Link 
                        key={action.label} 
                        href={action.link}
                        className="group block"
                      >
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-emerald-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                          <div className={`p-3 rounded-lg ${colors.light} w-fit mb-3 group-hover:scale-110 transition-transform duration-500`}>
                            <Icon className={`h-5 w-5 ${colors.icon}`} />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{action.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Hero for Non-Logged In Users */
            <div className="mb-12 animate-fade-in-up-slow">
              <Card className="border-emerald-200/40 bg-gradient-to-r from-emerald-900/60 to-green-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Transform Your Farm Management
                      </h2>
                      <p className="text-emerald-100 mb-6 max-w-2xl">
                        Join thousands of farmers who use FarmTrack to streamline operations, 
                        track finances, and increase profitability. Start your free trial today.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 text-base">
                              <UserPlus className="h-5 w-5 mr-2" /> Get Started Free
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                            <DialogHeader>
                              <DialogTitle className="sr-only">Sign Up for FarmTrack</DialogTitle>
                            </DialogHeader>
                            <AuthForm />
                          </DialogContent>
                        </Dialog>
                      
                      </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur-3xl animate-pulse-slow" />
                        <div className="relative bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-2xl">
                          <Tractor className="h-24 w-24 text-white animate-float-slow" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Module Categories */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Farm Management Modules</h2>
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                {categories.reduce((total, cat) => total + cat.modules.length, 0)} tools available
              </Badge>
            </div>

            <div className="space-y-4">
              {categories.map((category, index) => (
                <CategoryAccordion
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategories[category.id] || false}
                  onToggle={() => toggleCategory(category.id)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Features Section */}
          {!isLoggedIn && (
            <div className="mb-12 animate-fade-in-slow" style={{ animationDelay: '800ms' }}>
              <h2 className="text-2xl font-bold text-white text-center mb-8 drop-shadow-lg">Why Farmers Choose FarmTrack</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Calculator,
                    title: "Financial Clarity",
                    description: "Track every expense and revenue stream with precision",
                    color: "emerald"
                  },
                  {
                    icon: Tractor,
                    title: "Asset Management",
                    description: "Maintain equipment and vehicles with scheduled tracking",
                    color: "amber"
                  },
                  {
                    icon: BarChart3,
                    title: "Smart Analytics",
                    description: "Make data-driven decisions with comprehensive reports",
                    color: "purple"
                  }
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  const colors = getColorClasses(feature.color as ColorType);
                  return (
                    <Card key={feature.title} className={`border ${colors.border} ${colors.card} backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2`}>
                      <CardContent className="p-6">
                        <div className={`p-3 rounded-xl ${colors.light} w-fit mb-4`}>
                          <Icon className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg mb-2">{feature.title}</h3>
                        <p className="text-gray-700/90">{feature.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="text-center animate-fade-in-slow" style={{ animationDelay: '1000ms' }}>
            <Card className="border-emerald-200/40 bg-gradient-to-r from-emerald-900/70 to-green-900/70 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Ready to transform your farm management?
                </h3>
                <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                  Join the community of modern farmers who trust FarmTrack for their business success.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {isLoggedIn ? (
                    <Button className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
                      Explore All Features <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600 hover:to-green-600 text-white px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
                            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Sign Up for FarmTrack</DialogTitle>
                          </DialogHeader>
                          <AuthForm />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white px-8 py-3 text-lg"
                      >
                        Schedule a Demo
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-emerald-200/30 bg-emerald-900/60 backdrop-blur-xl mt-12">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/90 to-green-500/90 shadow-lg">
                  <Tractor className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-white text-lg">FarmTrack</span>
                  <p className="text-xs text-emerald-200">Farm Business Intelligence</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-6 text-sm">
                <Link href="#" className="text-emerald-100 hover:text-white transition-colors duration-300">
                  Privacy Policy
                </Link>
                <Link href="#" className="text-emerald-100 hover:text-white transition-colors duration-300">
                  Terms of Service
                </Link>
                <Link href="#" className="text-emerald-100 hover:text-white transition-colors duration-300">
                  Support
                </Link>
                <Link href="#" className="text-emerald-100 hover:text-white transition-colors duration-300">
                  Contact
                </Link>
              </div>
              
              <div className="text-xs text-emerald-200">
                © {new Date().getFullYear()} FarmTrack. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}