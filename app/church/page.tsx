// app/church/page.tsx
'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from "next/link";
import { RequireAuth } from '@/components/shared/RequireAuth';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calculator,
  FileText,
  Users,
  UserPlus,
  CalendarDays,
  Clock,
  Video,
  BookOpen,
  Church,
  Bell,
  Mail,
  MapPin,
  Phone,
  Heart,
  Gift,
  Cross,
  Music,
  Mic,
  Camera,
  Wifi,
  FileCheck,
  ClipboardCheck,
  Settings,
  Shield,
  Database,
  Layers,
  Server,
  BarChart3,
  LineChart,
  Eye,
  AlertTriangle,
  Package,
  LogIn,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  ChevronUp,
  Download,
  Upload,
  Printer,
  Share2,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Volume2,
  Film,
  MessageSquare,
  ThumbsUp,
  Star,
  Award,
  Trophy,
  Crown,
  Gem,
  HeartHandshake,
  HandCoins,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  CalendarRange,
  UsersRound,
  UserCheck,
  UserX,
  Baby,
  HeartPulse,
  Stethoscope,
  BookHeart,
  BookMarked,
  Library,
  Newspaper,
  Podcast,
  Radio,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Mailbox,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Projector,
  Speaker,
  Headphones,
  LucideIcon,
  ChevronRight
} from "@/components/shared/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AppShell } from '@/components/app-shell';

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

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
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

  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    background-size: 1000px 100%;
  }
`;

// =============== TYPES ===============
type ColorType = 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'emerald' | 'cyan' | 'rose';

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
  churchName?: string;
  avatar?: string;
}

interface QuickAction {
  icon: LucideIcon;
  label: string;
  color: ColorType;
  link: string;
}

interface ServiceSchedule {
  id: number;
  title: string;
  time: string;
  date: string;
  type: string;
  speaker: string;
  location: string;
  attendees: number;
}

interface RecentDonation {
  id: number;
  name: string;
  amount: number;
  type: string;
  date: string;
  status: 'completed' | 'pending';
}

interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'conference' | 'meeting' | 'service' | 'outreach';
  attendees: number;
}

// =============== COMPONENTS ===============
function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const userData: UserData = {
        id: 1,
        email,
        name: mode === 'signup' ? name : email.split('@')[0],
        role: mode === 'signup' ? 'pastor' : 'member',
        churchName: mode === 'signup' ? churchName : 'Grace Community Church'
      };

      localStorage.setItem('token', 'demo_token');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('church', churchName || 'Grace Community Church');
      
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
          <Church className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">
          {mode === 'login' ? 'Welcome Back' : 'Join ChurchTrack'}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {mode === 'login' ? 'Sign in to manage your church' : 'Start managing your church ministry'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <div>
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Church Name"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300/50 rounded text-sm bg-white/80 backdrop-blur-sm text-gray-900"
                required
              />
            </div>
          </>
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
          className="w-full bg-gradient-to-r from-purple-600 to-brand-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-brand-700 disabled:opacity-50 text-sm shadow-lg hover:shadow-xl transition-all duration-300"
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
            className="text-xs text-purple-600 hover:text-purple-800 hover:underline transition-colors duration-300"
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
    gradient: string;
  }> = {
    purple: { 
      bg: 'bg-purple-600', 
      hover: 'hover:bg-purple-700', 
      light: 'bg-purple-100/70', 
      text: 'text-purple-800', 
      border: 'border-purple-200/60',
      icon: 'text-purple-700',
      card: 'bg-purple-50/80',
      gradient: 'from-purple-500/90 to-brand-500/90'
    },
    blue: { 
      bg: 'bg-brand-600', 
      hover: 'hover:bg-brand-700', 
      light: 'bg-brand-100/70', 
      text: 'text-brand-800', 
      border: 'border-brand-200/60',
      icon: 'text-brand-700',
      card: 'bg-brand-50/80',
      gradient: 'from-brand-500/90 to-cyan-500/90'
    },
    green: { 
      bg: 'bg-green-600', 
      hover: 'hover:bg-green-700', 
      light: 'bg-green-100/70', 
      text: 'text-green-800', 
      border: 'border-green-200/60',
      icon: 'text-green-700',
      card: 'bg-green-50/80',
      gradient: 'from-green-500/90 to-emerald-500/90'
    },
    amber: { 
      bg: 'bg-amber-600', 
      hover: 'hover:bg-amber-700', 
      light: 'bg-amber-100/70', 
      text: 'text-amber-800', 
      border: 'border-amber-200/60',
      icon: 'text-amber-700',
      card: 'bg-amber-50/80',
      gradient: 'from-amber-500/90 to-orange-500/90'
    },
    red: { 
      bg: 'bg-red-600', 
      hover: 'hover:bg-red-700', 
      light: 'bg-red-100/70', 
      text: 'text-red-800', 
      border: 'border-red-200/60',
      icon: 'text-red-700',
      card: 'bg-red-50/80',
      gradient: 'from-red-500/90 to-rose-500/90'
    },
    indigo: { 
      bg: 'bg-indigo-600', 
      hover: 'hover:bg-indigo-700', 
      light: 'bg-indigo-100/70', 
      text: 'text-indigo-800', 
      border: 'border-indigo-200/60',
      icon: 'text-indigo-700',
      card: 'bg-indigo-50/80',
      gradient: 'from-indigo-500/90 to-purple-500/90'
    },
    emerald: { 
      bg: 'bg-emerald-600', 
      hover: 'hover:bg-emerald-700', 
      light: 'bg-emerald-100/70', 
      text: 'text-emerald-800', 
      border: 'border-emerald-200/60',
      icon: 'text-emerald-700',
      card: 'bg-emerald-50/80',
      gradient: 'from-emerald-500/90 to-green-500/90'
    },
    cyan: { 
      bg: 'bg-cyan-600', 
      hover: 'hover:bg-cyan-700', 
      light: 'bg-cyan-100/70', 
      text: 'text-cyan-800', 
      border: 'border-cyan-200/60',
      icon: 'text-cyan-700',
      card: 'bg-cyan-50/80',
      gradient: 'from-cyan-500/90 to-brand-500/90'
    },
    rose: { 
      bg: 'bg-rose-600', 
      hover: 'hover:bg-rose-700', 
      light: 'bg-rose-100/70', 
      text: 'text-rose-800', 
      border: 'border-rose-200/60',
      icon: 'text-rose-700',
      card: 'bg-rose-50/80',
      gradient: 'from-rose-500/90 to-pink-500/90'
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
    <div className="rounded-xl border border-purple-200/40 bg-purple-50/70 backdrop-blur-sm shadow-xl hover:shadow-2xl mb-6 transition-all duration-500">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-purple-100/50 rounded-t-xl transition-all duration-500"
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
        <div className="p-5 pt-0 border-t border-purple-200/40">
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
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-purple-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            metric.trend === 'up' ? 'bg-green-100' : 
            metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <IconComponent className={`h-4 w-4 ${
              metric.trend === 'up' ? 'text-green-600' : 
              metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          metric.trend === 'up' ? 'text-green-600' : 
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

// Service Schedule Component
function ServiceScheduleItem({ service }: { service: ServiceSchedule }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-purple-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-purple-100">
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-800">{service.title}</h4>
          <p className="text-sm text-gray-600">{service.time} • {service.date}</p>
          <p className="text-xs text-gray-500 mt-1">{service.speaker} • {service.location}</p>
        </div>
      </div>
      <div className="text-right">
        <Badge className="bg-purple-100 text-purple-800">{service.type}</Badge>
        <p className="text-sm text-gray-600 mt-1">{service.attendees} attendees</p>
      </div>
    </div>
  );
}

// Donation Item Component
function DonationItem({ donation }: { donation: RecentDonation }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-green-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-green-100 text-green-800">
            {donation.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium text-sm text-gray-800">{donation.name}</h4>
          <p className="text-xs text-gray-600">{donation.type}</p>
        </div>
      </div>
      <div className="text-right">
        {/* Fixed locale — a bare toLocaleString() uses the runtime's default, which differs
            between the server (SSR) and the browser, causing a hydration mismatch. */}
        <p className="font-medium text-gray-800">${donation.amount.toLocaleString('en-US')}</p>
        <Badge className={`text-xs ${donation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {donation.status}
        </Badge>
      </div>
    </div>
  );
}

// =============== MAIN PAGE ===============
function ChurchPageContent() {
  const [isLoggedIn] = useState(true);
  const [user] = useState<UserData | null>(null);
  const [churchName] = useState('Grace Community Church');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'financial': true,
    'membership': true,
    'ministry': true,
    'media': true,
  });

  // Financial metrics data
  const financialMetrics: FinancialMetric[] = [
    { label: 'Monthly Tithes', value: '$28,450', change: '+15.2%', trend: 'up', icon: DollarSign },
    { label: 'Weekly Offerings', value: '$8,920', change: '+8.5%', trend: 'up', icon: Gift },
    { label: 'Annual Budget', value: '$350,000', change: 'On Track', trend: 'neutral', icon: PieChart },
    { label: 'Outreach Funds', value: '$12,500', change: '+22.1%', trend: 'up', icon: HeartHandshake },
  ];

  // Quick actions for dashboard
  const quickActions: QuickAction[] = [
    { icon: UserPlus, label: 'Add Member', color: 'blue', link: '/members/add' },
    { icon: DollarSign, label: 'Record Donation', color: 'green', link: '/donations/add' },
    { icon: CalendarDays, label: 'Schedule Event', color: 'purple', link: '/events/add' },
    { icon: Video, label: 'Start Live Stream', color: 'red', link: '/live' },
  ];

  // Service schedules
  const serviceSchedules: ServiceSchedule[] = [
    { id: 1, title: 'Sunday Worship', time: '10:00 AM', date: 'Today', type: 'Worship', speaker: 'Pastor John', location: 'Main Sanctuary', attendees: 320 },
    { id: 2, title: 'Youth Night', time: '7:00 PM', date: 'Friday', type: 'Youth', speaker: 'Youth Pastor', location: 'Youth Hall', attendees: 85 },
    { id: 3, title: 'Bible Study', time: '7:00 PM', date: 'Wednesday', type: 'Study', speaker: 'Elder Smith', location: 'Room 201', attendees: 45 },
    { id: 4, title: 'Prayer Meeting', time: '6:00 AM', date: 'Daily', type: 'Prayer', speaker: 'Prayer Team', location: 'Chapel', attendees: 25 },
  ];

  // Recent donations
  const recentDonations: RecentDonation[] = [
    { id: 1, name: 'John Smith', amount: 500, type: 'Tithe', date: 'Today', status: 'completed' },
    { id: 2, name: 'Mary Johnson', amount: 250, type: 'Offering', date: 'Yesterday', status: 'completed' },
    { id: 3, name: 'David Wilson', amount: 1000, type: 'Building Fund', date: '2 days ago', status: 'pending' },
    { id: 4, name: 'Sarah Brown', amount: 150, type: 'Missions', date: '3 days ago', status: 'completed' },
  ];

  // Upcoming events
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, title: 'Annual Conference', date: 'Mar 15-17', time: '9:00 AM', type: 'conference', attendees: 500 },
    { id: 2, title: 'Leadership Meeting', date: 'Mar 10', time: '2:00 PM', type: 'meeting', attendees: 12 },
    { id: 3, title: 'Community Outreach', date: 'Mar 22', time: '10:00 AM', type: 'outreach', attendees: 50 },
    { id: 4, title: 'Easter Service', date: 'Mar 31', time: '9:00 AM', type: 'service', attendees: 800 },
  ];


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('church');
    window.location.reload();
  };

  // Define church-specific categories
  const categories: Category[] = [
    {
      id: 'financial',
      title: 'Financial Management',
      description: 'Track tithes, offerings, and church finances',
      icon: DollarSign,
      color: 'green',
      modules: [
        { icon: DollarSign, title: "Tithe Records", description: "Track member tithes", color: "green", link: "/tithes", badge: "Income" },
        { icon: Gift, title: "Offerings", description: "Weekly offering records", color: "emerald", link: "/offerings", badge: "Giving" },
        { icon: PieChart, title: "Budget Planning", description: "Annual church budget", color: "blue", link: "/budget" },
        { icon: Calculator, title: "Expense Tracking", description: "Track church expenses", color: "red", link: "/expenses", badge: "Costs" },
        { icon: FileText, title: "Financial Reports", description: "Generate reports", color: "purple", link: "/reports" },
        { icon: CreditCard, title: "Online Giving", description: "Digital donations", color: "indigo", link: "/online-giving", badge: "Digital" },
      ]
    },
    {
      id: 'membership',
      title: 'Membership & Visitors',
      description: 'Manage members, visitors, and church growth',
      icon: Users,
      color: 'blue',
      modules: [
        { icon: Users, title: "Member Directory", description: "Church member database", color: "blue", link: "/members", badge: "Database" },
        { icon: UserPlus, title: "Visitor Tracking", description: "Track first-time visitors", color: "cyan", link: "/visitors", badge: "Growth" },
        { icon: Baby, title: "Baptism Records", description: "Track baptisms", color: "cyan", link: "/baptisms" },
        { icon: UserCheck, title: "Attendance", description: "Weekly attendance", color: "green", link: "/attendance" },
        { icon: HeartPulse, title: "Membership Classes", description: "New member training", color: "rose", link: "/membership-classes" },
        { icon: BookHeart, title: "Small Groups", description: "Manage home groups", color: "purple", link: "/small-groups" },
      ]
    },
    {
      id: 'ministry',
      title: 'Ministry & Events',
      description: 'Manage ministries, events, and schedules',
      icon: CalendarDays,
      color: 'purple',
      modules: [
        { icon: CalendarDays, title: "Event Calendar", description: "Church event schedule", color: "purple", link: "/calendar", badge: "Schedule" },
        { icon: UsersRound, title: "Ministry Teams", description: "Volunteer management", color: "indigo", link: "/ministries" },
        { icon: Trophy, title: "Conferences", description: "Major church conferences", color: "amber", link: "/conferences" },
        { icon: BookOpen, title: "Bible Studies", description: "Study group schedules", color: "blue", link: "/bible-studies" },
        { icon: HeartHandshake, title: "Outreach", description: "Community outreach", color: "red", link: "/outreach" },
        { icon: Cross, title: "Missions", description: "Mission trip planning", color: "green", link: "/missions" },
      ]
    },
    {
      id: 'media',
      title: 'Media & Communications',
      description: 'Manage content, live streams, and communications',
      icon: Video,
      color: 'red',
      modules: [
        { icon: Video, title: "Live Streaming", description: "Stream services online", color: "red", link: "/live", badge: "Live" },
        { icon: Film, title: "Video Archive", description: "Past service videos", color: "rose", link: "/videos" },
        { icon: Newspaper, title: "Church Blog", description: "News and updates", color: "blue", link: "/blog" },
        { icon: Podcast, title: "Sermon Podcast", description: "Audio sermon library", color: "purple", link: "/podcast" },
        { icon: Mail, title: "Email Newsletters", description: "Member communications", color: "green", link: "/newsletters" },
        { icon: Smartphone, title: "Church App", description: "Mobile app management", color: "indigo", link: "/app", badge: "Mobile" },
      ]
    },
    {
      id: 'operations',
      title: 'Church Operations',
      description: 'Facility management and administration',
      icon: Settings,
      color: 'amber',
      modules: [
        { icon: Church, title: "Facility Booking", description: "Room and equipment", color: "amber", link: "/facility", badge: "Rooms" },
        { icon: Shield, title: "Safety & Security", description: "Emergency protocols", color: "red", link: "/safety" },
        { icon: Database, title: "Database Backup", description: "Data management", color: "blue", link: "/backup" },
        { icon: FileCheck, title: "Legal Compliance", description: "Regulatory requirements", color: "green", link: "/compliance" },
        { icon: Layers, title: "Inventory", description: "Church supplies", color: "purple", link: "/inventory" },
        { icon: Server, title: "IT Systems", description: "Technology management", color: "indigo", link: "/it" },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'Church growth analytics and insights',
      icon: BarChart3,
      color: 'indigo',
      modules: [
        { icon: LineChart, title: "Growth Dashboard", description: "Real-time analytics", color: "indigo", link: "/dashboard", badge: "Live" },
        { icon: BarChart3, title: "Attendance Reports", description: "Growth trends", color: "blue", link: "/attendance-reports" },
        { icon: PieChart, title: "Giving Analysis", description: "Donation patterns", color: "green", link: "/giving-analysis" },
        { icon: Eye, title: "Visitor Analytics", description: "Visitor trends", color: "cyan", link: "/visitor-analytics" },
        { icon: TrendingUp, title: "Forecasting", description: "Growth predictions", color: "purple", link: "/forecasting" },
        { icon: Award, title: "Impact Metrics", description: "Ministry effectiveness", color: "amber", link: "/impact" },
      ]
    },
  ];

  const financialModules = categories.find(cat => cat.id === 'financial')?.modules || [];
  const membershipModules = categories.find(cat => cat.id === 'membership')?.modules || [];

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

  return (
    <AppShell>
      <style jsx global>{animationStyles}</style>
      {/* Page Header */}
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
          <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-[#2A4D69] font-medium">Church</span>
        </nav>
        <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">ChurchTrack — Ministry Management</h1>
        <p className="text-[#6B7B8E] mt-1">Manage finances, membership, ministries, and media for {churchName}.</p>
      </div>
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="mb-8 text-center animate-fade-in-up-slow">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
              ChurchTrack Ministry Suite
            </h1>
            <p className="text-lg text-purple-100 max-w-3xl mx-auto mb-6 drop-shadow-md">
              Comprehensive church management for modern ministries
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
                <Card className="border-purple-200/40 bg-gradient-to-r from-purple-900/50 to-brand-900/50 backdrop-blur-xl shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-4 border-white/30 shadow-lg">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500/90 to-brand-500/90 text-white text-lg">
                            {user?.name?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-xl font-bold text-white">Welcome, {user?.name || 'Pastor'}! 🙏</h2>
                          <p className="text-purple-100">Managing {churchName} • {user?.role || 'Member'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button className="bg-gradient-to-r from-purple-500/90 to-brand-500/90 hover:from-purple-600 hover:to-brand-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                          <Video className="h-4 w-4 mr-2" /> Start Live Stream
                        </Button>
                        <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white">
                          <CalendarDays className="h-4 w-4 mr-2" /> View Calendar
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
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-purple-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
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

              {/* Service Schedule & Recent Donations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-in-up-slow" style={{ animationDelay: '800ms' }}>
                {/* Service Schedule */}
                <Card className="border-purple-200/40 bg-white/90 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Service Schedule</h3>
                      <Badge className="bg-purple-100 text-purple-800">This Week</Badge>
                    </div>
                    <div className="space-y-3">
                      {serviceSchedules.map((service) => (
                        <ServiceScheduleItem key={service.id} service={service} />
                      ))}
                    </div>
                    <Button variant="ghost" className="w-full mt-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                      View Full Schedule
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Donations */}
                <Card className="border-green-200/40 bg-white/90 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Recent Donations</h3>
                      <Badge className="bg-green-100 text-green-800">This Week</Badge>
                    </div>
                    <div className="space-y-3">
                      {recentDonations.map((donation) => (
                        <DonationItem key={donation.id} donation={donation} />
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Weekly Total</span>
                        <span className="font-bold text-gray-800">$1,900</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Events */}
              <div className="mb-8 animate-fade-in-up-slow" style={{ animationDelay: '1000ms' }}>
                <Card className="border-brand-200/40 bg-white/90 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800">Upcoming Events</h3>
                      <Button variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                        <CalendarDays className="h-4 w-4 mr-2" /> Add Event
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {upcomingEvents.map((event) => (
                        <div key={event.id} className="bg-gradient-to-br from-brand-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl p-4 border border-brand-100 hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className={`${
                              event.type === 'conference' ? 'bg-purple-100 text-purple-800' :
                              event.type === 'meeting' ? 'bg-brand-100 text-brand-800' :
                              event.type === 'service' ? 'bg-green-100 text-green-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {event.type}
                            </Badge>
                            <Users className="h-4 w-4 text-gray-500" />
                          </div>
                          <h4 className="font-bold text-gray-800 mb-2">{event.title}</h4>
                          <p className="text-sm text-gray-600 mb-1">
                            <CalendarDays className="h-3 w-3 inline mr-1" />
                            {event.date} • {event.time}
                          </p>
                          <p className="text-sm text-gray-500">{event.attendees} expected</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Stream Status */}
              <div className="mb-8 animate-fade-in-slow" style={{ animationDelay: '1200ms' }}>
                <Card className="border-red-200/40 bg-gradient-to-r from-red-900/20 to-purple-900/20 backdrop-blur-xl shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-100/80 backdrop-blur-sm">
                          <Video className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Live Stream Status</h3>
                          <p className="text-red-100">Sunday Service • March 10, 2024</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">312</div>
                          <div className="text-sm text-red-100">Live Viewers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">1.2k</div>
                          <div className="text-sm text-red-100">Total Views</div>
                        </div>
                        <Button className="bg-gradient-to-r from-red-500/90 to-purple-500/90 hover:from-red-600 hover:to-purple-600 text-white">
                          <PlayCircle className="h-4 w-4 mr-2" /> Go Live
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            /* Hero for Non-Logged In Users */
            <div className="mb-12 animate-fade-in-up-slow">
              <Card className="border-purple-200/40 bg-gradient-to-r from-purple-900/60 to-brand-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Transform Your Church Management
                      </h2>
                      <p className="text-purple-100 mb-6 max-w-2xl">
                        Join thousands of churches using ChurchTrack to streamline ministry operations, 
                        track giving, manage members, and grow your congregation. Start your free trial today.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-500/90 to-brand-500/90 hover:from-purple-600 hover:to-brand-600 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 text-base">
                              <UserPlus className="h-5 w-5 mr-2" /> Get Started Free
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                            <DialogHeader>
                              <DialogTitle className="sr-only">Sign Up for ChurchTrack</DialogTitle>
                            </DialogHeader>
                            <AuthForm />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white px-6 py-3 text-base"
                        >
                          <Eye className="h-5 w-5 mr-2" /> View Demo
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-brand-500/20 rounded-full blur-3xl animate-pulse-slow" />
                        <div className="relative bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-2xl">
                          <Church className="h-24 w-24 text-white animate-float-slow" />
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
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Ministry Management Modules</h2>
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
              <h2 className="text-2xl font-bold text-white text-center mb-8 drop-shadow-lg">Why Churches Choose ChurchTrack</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: DollarSign,
                    title: "Financial Transparency",
                    description: "Track tithes, offerings, and expenses with precision",
                    color: "green"
                  },
                  {
                    icon: Users,
                    title: "Member Management",
                    description: "Organize member data, attendance, and growth",
                    color: "blue"
                  },
                  {
                    icon: Video,
                    title: "Digital Ministry",
                    description: "Live streaming, video archives, and online giving",
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

          {/* Stats Section */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-slow" style={{ animationDelay: '1000ms' }}>
            {[
              { label: 'Churches Using', value: '2,500+', icon: Church, color: 'purple' },
              { label: 'Members Managed', value: '500K+', icon: Users, color: 'blue' },
              { label: 'Donations Processed', value: '$50M+', icon: DollarSign, color: 'green' },
              { label: 'Live Streams', value: '10K+', icon: Video, color: 'red' },
            ].map((stat, index) => {
              const Icon = stat.icon;
              const colors = getColorClasses(stat.color as ColorType);
              return (
                <div key={stat.label} className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colors.light}`}>
                      <Icon className={`h-4 w-4 ${colors.icon}`} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">{stat.value}</div>
                      <div className="text-xs text-gray-600">{stat.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="text-center animate-fade-in-slow" style={{ animationDelay: '1200ms' }}>
            <Card className="border-purple-200/40 bg-gradient-to-r from-purple-900/70 to-brand-900/70 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Ready to transform your church management?
                </h3>
                <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                  Join the community of modern ministries who trust ChurchTrack for their growth and administration.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {isLoggedIn ? (
                    <Button className="bg-gradient-to-r from-purple-500/90 to-brand-500/90 hover:from-purple-600 hover:to-brand-600 text-white px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
                      Explore All Features <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-purple-500/90 to-brand-500/90 hover:from-purple-600 hover:to-brand-600 text-white px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
                            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm border-white/30 bg-transparent backdrop-blur-none">
                          <DialogHeader>
                            <DialogTitle className="sr-only">Sign Up for ChurchTrack</DialogTitle>
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
    </AppShell>
  );
}

export default function ChurchPage() {
  return <RequireAuth><ChurchPageContent /></RequireAuth>;
}