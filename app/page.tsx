// app/page.tsx — Ozech MyOffice Enterprise ERP Dashboard
'use client';

import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ToolCase, Shield, Clock, Calculator, Package, ClipboardCheck,
  CalendarDays, AlertTriangle, Fan, Eye, ChevronDown, BarChart3,
  FileText, Folder, HardHat, Wrench, LineChart, Clock4, Megaphone,
  Building, Utensils, Church, Database,
  AlertOctagon, ShieldAlert, ClipboardList, FileWarning, PackageOpen,
  ClipboardPlus, Target, Activity, Search, Sparkles, MessageSquareWarning,
  Menu, Home, Settings,
  Bell, Plus, Bookmark, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock3, Lightbulb, ArrowRight, Server, Upload, User,
  ChevronsDownUp, ChevronsUpDown, X, Maximize2, SlidersHorizontal, Check,
  PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

// ─── Background wallpapers ───────────────────────────────────────────────────

const WALLPAPERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=2400&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=2400&q=80&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=2400&q=80&fit=crop',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2400&q=80&fit=crop',
];

// ─── Glass surface classes (frosted cards over photo background) ───────────

const GLASS = 'bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12]';
const GLASS_SOFT = 'bg-white/[0.05] backdrop-blur-xl border border-white/10';
const SHADOW_AMBIENT = 'shadow-[0_1px_1px_rgba(0,0,0,0.08),0_16px_32px_-20px_rgba(0,0,0,0.55)]';

// ─── Light theme ("white mode") equivalents ─────────────────────────────────

const LIGHT_GLASS = 'bg-white border border-gray-200';
const LIGHT_GLASS_SOFT = 'bg-white border border-gray-100';
const LIGHT_SHADOW = 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_16px_-10px_rgba(0,0,0,0.08)]';

function themeClasses(light: boolean) {
  return {
    glass: light ? LIGHT_GLASS : GLASS,
    glassSoft: light ? LIGHT_GLASS_SOFT : GLASS_SOFT,
    shadow: light ? LIGHT_SHADOW : SHADOW_AMBIENT,
    textPrimary: light ? 'text-gray-900' : 'text-white',
    textSecondary: light ? 'text-gray-500' : 'text-white/55',
    textTertiary: light ? 'text-gray-400' : 'text-white/35',
    textFaint: light ? 'text-gray-400' : 'text-white/40',
    textMuted: light ? 'text-gray-600' : 'text-white/70',
    border: light ? 'border-gray-200' : 'border-white/10',
    divide: light ? 'divide-gray-100' : 'divide-white/10',
    hoverBg: light ? 'hover:bg-gray-100' : 'hover:bg-white/10',
    hoverBgSoft: light ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]',
    hoverText: light ? 'hover:text-gray-900' : 'hover:text-white',
    groupHoverText: light ? 'group-hover:text-gray-900' : 'group-hover:text-white',
    chipBg: light ? 'bg-gray-100' : 'bg-white/10',
    inputBg: light
      ? 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-400'
      : 'bg-white/10 border border-white/10 text-white placeholder-white/40 focus:border-blue-300/50 focus:bg-white/15',
    trendUp: light ? 'text-emerald-600' : 'text-emerald-300',
    trendDown: light ? 'text-rose-600' : 'text-rose-300',
    ring: light ? 'ring-gray-100' : 'ring-slate-900/80',
    scrim: light ? 'bg-gray-900/10' : 'bg-slate-900/50',
    linkText: light ? 'text-blue-600' : 'text-blue-300',
    linkHover: light ? 'hover:text-blue-700' : 'hover:text-blue-200',
    pageBg: light ? 'bg-gray-50' : 'bg-slate-900',
  };
}

type Theme = { light: boolean; toggle: () => void } & ReturnType<typeof themeClasses>;

const ThemeContext = createContext<Theme>({ light: false, toggle: () => {}, ...themeClasses(false) });
const useTheme = () => useContext(ThemeContext);

// ─── Types ───────────────────────────────────────────────────────────────────

type Accent = 'blue' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'violet';

const ACCENT: Record<Accent, {
  chip: string; icon: string; text: string; gradient: string; glow: string; solidGlow: string;
}> = {
  blue:    { chip: 'bg-blue-50',    icon: 'text-blue-600',    text: 'text-blue-700',    gradient: 'from-blue-500 to-blue-700',       glow: 'hover:shadow-[0_20px_45px_-18px_rgba(37,99,235,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(37,99,235,0.4)]' },
  amber:   { chip: 'bg-amber-50',   icon: 'text-amber-600',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-700',     glow: 'hover:shadow-[0_20px_45px_-18px_rgba(217,119,6,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(217,119,6,0.4)]' },
  indigo:  { chip: 'bg-indigo-50',  icon: 'text-indigo-600',  text: 'text-indigo-700',  gradient: 'from-indigo-500 to-indigo-700',   glow: 'hover:shadow-[0_20px_45px_-18px_rgba(79,70,229,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(79,70,229,0.4)]' },
  emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-700', glow: 'hover:shadow-[0_20px_45px_-18px_rgba(5,150,105,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(5,150,105,0.4)]' },
  cyan:    { chip: 'bg-cyan-50',    icon: 'text-cyan-600',    text: 'text-cyan-700',    gradient: 'from-cyan-500 to-cyan-700',       glow: 'hover:shadow-[0_20px_45px_-18px_rgba(8,145,178,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(8,145,178,0.4)]' },
  violet:  { chip: 'bg-violet-50',  icon: 'text-violet-600',  text: 'text-violet-700',  gradient: 'from-violet-500 to-violet-700',   glow: 'hover:shadow-[0_20px_45px_-18px_rgba(124,58,237,0.4)]',   solidGlow: 'shadow-[0_16px_32px_-12px_rgba(124,58,237,0.4)]' },
};

interface Module {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  tags?: string[];
  badge?: string;
  featured?: boolean;
  metrics?: { label: string; value: string }[];
}

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: Accent;
  modules: Module[];
  growth?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'core', title: 'Core Management', description: 'Foundational business operations',
    icon: Building, accent: 'blue', growth: '+12%',
    modules: [
      { icon: Users,    title: 'Personnel',  description: 'Employee profiles & team structure', href: '/employees',  tags: ['HR', 'People'], badge: '12', featured: true, metrics: [{ label: 'Active', value: '48' }, { label: 'Departments', value: '6' }] },
      { icon: ToolCase, title: 'Assets',     description: 'Track equipment across your site',  href: '/equipment',  tags: ['Equipment'], badge: '48', metrics: [{ label: 'Total', value: '234' }, { label: 'In Use', value: '189' }] },
      { icon: Package,  title: 'Inventory',  description: 'Manage stock levels & reorder points', href: '/inventory',  tags: ['Stock'], badge: '156', metrics: [{ label: 'Items', value: '1.2k' }, { label: 'Low Stock', value: '8' }] },
      { icon: Folder,   title: 'Documents',  description: 'Centralised document repository', href: '/documents',  tags: ['Files'], badge: '234', metrics: [{ label: 'Total', value: '2.4k' }, { label: 'Recent', value: '34' }] },
    ],
  },
  {
    id: 'operations', title: 'Operations & Maintenance', description: 'Keep operations running smoothly',
    icon: Wrench, accent: 'amber', growth: '+8%',
    modules: [
      { icon: ClipboardCheck, title: 'Maintenance',  description: 'Work orders & PM schedules',  href: '/maintenance',  tags: ['Work Orders'], badge: '23', featured: true, metrics: [{ label: 'Open', value: '12' }, { label: 'Completed', value: '156' }] },
      { icon: AlertTriangle,  title: 'Breakdowns',   description: 'Log equipment breakdowns',    href: '/breakdowns',   tags: ['Failures'], badge: '4', metrics: [{ label: 'Critical', value: '2' }, { label: 'MTTR', value: '4.2h' }] },
      { icon: PackageOpen,    title: 'Spares',       description: 'Spare parts inventory',       href: '/spares',       tags: ['Parts'], badge: '89', metrics: [{ label: 'Available', value: '342' }, { label: 'On Order', value: '56' }] },
      { icon: Fan,            title: 'Compressors',  description: 'Monitor compressor health',  href: '/compressors',  tags: ['Equipment'], badge: '6', metrics: [{ label: 'Running', value: '4' }, { label: 'Efficiency', value: '87%' }] },
      { icon: Clock,          title: 'Standby',      description: 'On-call schedules',          href: '/standby',     tags: ['Scheduling'], badge: '8', metrics: [{ label: 'On Call', value: '6' }, { label: 'Coverage', value: '92%' }] },
      { icon: CalendarDays,   title: 'Schedules',    description: 'Recurring maintenance tasks', href: '/schedules',    tags: ['Planning'], badge: '15' },
      { icon: ClipboardPlus,  title: 'Requisitions', description: 'Purchase & supply requests', href: '/requisitions', tags: ['Procurement'], badge: '7' },
      { icon: Wrench,         title: 'Services',     description: 'Track completed services',   href: '/services',     tags: ['Services', 'Invoices'], badge: '34' },
    ],
  },
  {
    id: 'time', title: 'Time & Attendance', description: 'Time tracking and leave management',
    icon: Clock4, accent: 'indigo', growth: '+5%',
    modules: [
      { icon: Clock4,       title: 'Timesheets', description: 'Daily attendance records',  href: '/timesheets', tags: ['Attendance'], badge: '42', metrics: [{ label: 'Today', value: '38' }, { label: 'On Leave', value: '4' }] },
      { icon: Calculator,   title: 'Overtime',   description: 'Overtime requests & approvals', href: '/overtime',   tags: ['Payroll'], badge: '6', metrics: [{ label: 'Pending', value: '3' }, { label: 'Approved', value: '12' }] },
      { icon: CalendarDays, title: 'Leaves',     description: 'Leave applications & balances', href: '/leaves',     tags: ['HR'], badge: '18', metrics: [{ label: 'Pending', value: '5' }, { label: 'Available', value: '87' }] },
    ],
  },
  {
    id: 'safety', title: 'Safety & Compliance', description: 'Highest safety standards',
    icon: Shield, accent: 'emerald', growth: '+3%',
    modules: [
      { icon: HardHat,       title: 'PPE',              description: 'Protective equipment tracking',  href: '/ppe',             tags: ['Safety'], badge: '56', metrics: [{ label: 'Issued', value: '234' }, { label: 'Due', value: '18' }] },
      { icon: ClipboardList, title: 'SHEQ Inspections', description: 'Structured safety inspections', href: '/sheq_inspection', tags: ['Compliance'], badge: '12', metrics: [{ label: 'Due', value: '4' }, { label: 'Completed', value: '89' }] },
      { icon: FileWarning,   title: 'Near Miss',        description: 'Near miss reporting',            href: '/near_miss',       tags: ['Incidents'], badge: '3', metrics: [{ label: 'Open', value: '2' }, { label: 'Resolved', value: '47' }] },
      { icon: AlertOctagon,  title: 'Work Stoppage',    description: 'SHEQ hold points tracking',     href: '/work_stoppage',   tags: ['Safety'], badge: '1' },
      { icon: ShieldAlert,   title: 'SHEQ',             description: 'Safety & quality hub',          href: '/sheq',            tags: ['Compliance'], badge: '28', featured: true },
      { icon: Eye,           title: 'VFL',              description: 'Visible Felt Leadership',       href: '/vfl',             tags: ['Leadership'], badge: '9' },
      { icon: Target,        title: 'PTO',              description: 'Planned Task Observation',      href: '/pto',             tags: ['Observation'], badge: '5' },
      { icon: MessageSquareWarning, title: 'Complaints', description: 'Safety complaints register',   href: '/safety_complaints', tags: ['Complaints', 'Safety'], badge: '2' },
    ],
  },
  {
    id: 'analytics', title: 'Analytics & Insights', description: 'Turn data into intelligence',
    icon: LineChart, accent: 'cyan', growth: '+22%',
    modules: [
      { icon: Eye,       title: 'Visualization', description: 'Interactive dashboards', href: '/visualization', tags: ['Charts'], badge: '15', featured: true },
      { icon: BarChart3, title: 'Reports',       description: 'Generate operational reports', href: '/reports',       tags: ['Export'], badge: '8' },
      { icon: Megaphone, title: 'Notice Board',  description: 'Company announcements', href: '/noticeboard',   tags: ['Comms'], badge: '3' },
    ],
  },
  {
    id: 'products', title: 'Other Products', description: 'Specialised industry platforms',
    icon: Sparkles, accent: 'violet', growth: '+15%',
    modules: [
      { icon: Building,  title: 'Room Rental', description: 'Property management', href: '/roomRental', tags: ['Property'], badge: '24' },
      { icon: Utensils,  title: 'Restaurant',  description: 'Menu & table management', href: '/restaurant', tags: ['F&B'], badge: '16' },
      { icon: Church,    title: 'Church',      description: 'Community management',   href: '/church',     tags: ['Community'], badge: '9' },
      { icon: Database,  title: 'Stores',      description: 'Store inventory system', href: '/stores',     tags: ['Retail'], badge: '31' },
    ],
  },
];

const KPI_DATA = [
  { id: 'employees', title: 'Total Employees',      value: '48',  change: '+12%', trend: 'up' as const,   icon: Users,          accent: 'blue' as Accent },
  { id: 'orders',     title: 'Active Work Orders',   value: '23',  change: '+8%',  trend: 'up' as const,   icon: ClipboardCheck, accent: 'amber' as Accent },
  { id: 'efficiency', title: 'Equipment Efficiency', value: '87%', change: '+3%',  trend: 'up' as const,   icon: Activity,       accent: 'emerald' as Accent },
  { id: 'safety',     title: 'Safety Score',         value: '96%', change: '-2%',  trend: 'down' as const, icon: Shield,         accent: 'indigo' as Accent },
];

const RECENT_ACTIVITIES = [
  { id: 1, action: 'New work order created', module: 'Maintenance', time: '2 mins', icon: ClipboardPlus, status: 'pending', user: 'John Doe' },
  { id: 2, action: 'Equipment breakdown reported', module: 'Breakdowns', time: '15 mins', icon: AlertTriangle, status: 'critical', user: 'Sarah Smith' },
  { id: 3, action: 'PPE inspection completed', module: 'Safety', time: '1 hour', icon: CheckCircle2, status: 'completed', user: 'Mike Johnson' },
  { id: 4, action: 'Timesheet approved', module: 'Time & Attendance', time: '2 hours', icon: Clock3, status: 'approved', user: 'Admin' },
  { id: 5, action: 'Inventory reorder triggered', module: 'Inventory', time: '3 hours', icon: Package, status: 'pending', user: 'System' },
];

const QUICK_ACTIONS = [
  { id: 'new-wo',  icon: Plus,     label: 'New Work Order',   href: '/maintenance', accent: 'amber' as Accent },
  { id: 'upload',  icon: Upload,   label: 'Upload Document',  href: '/documents',   accent: 'blue' as Accent },
  { id: 'add-emp', icon: User,     label: 'Add Employee',     href: '/employees',   accent: 'emerald' as Accent },
  { id: 'report',  icon: FileText, label: 'Generate Report',  href: '/reports',     accent: 'violet' as Accent },
];

const SYSTEM_STATUS = [
  { label: 'Server Status', latency: '45ms' },
  { label: 'Database', latency: '12ms' },
  { label: 'API Gateway', latency: '89ms' },
  { label: 'Cache Server', latency: '3ms' },
];

const TOTAL_MODULES = CATEGORIES.reduce((sum, c) => sum + c.modules.length, 0);
const TOTAL_CATEGORIES = CATEGORIES.length;

// ─── Motion variants ─────────────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Collapsible primitive (smooth height animation) ────────────────────────

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

// ─── Slide-over primitive (overlapping panel with close button) ────────────

function SlideOver({
  open, onClose, title, subtitle, accent = 'blue', width = 'max-w-md', children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  accent?: Accent; width?: string; children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className={`fixed top-0 right-0 h-full w-full ${width} ${t.glass} z-50 shadow-2xl flex flex-col`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            <div className={`relative px-6 py-6 bg-gradient-to-br ${a.gradient} shrink-0`}>
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                type="button"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-white font-semibold text-lg tracking-tight pr-10">{title}</h2>
              {subtitle && <p className="text-white/80 text-[13px] mt-1 pr-10">{subtitle}</p>}
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Top Navigation ─────────────────────────────────────────────────────────

function TopNavigation({
  onMenuToggle, searchQuery, onSearchChange, mobileSearchOpen, setMobileSearchOpen, onCustomize,
}: {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (v: boolean) => void;
  onCustomize: () => void;
}) {
  const t = useTheme();
  return (
    <header className={`sticky top-0 z-40 ${t.glass} border-x-0 border-t-0`}>
      {/* Shell Bar — SAP Fiori style: logo, app/breadcrumb title, search, utility icons, avatar */}
      <div className="flex items-center h-11 px-2 lg:px-3 gap-1">
        <button onClick={onMenuToggle} className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted} lg:hidden shrink-0`} type="button" title="Toggle menu">
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className={`flex items-center gap-2 shrink-0 h-11 px-2 ${t.hoverBgSoft} transition-colors`}>
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            M
          </div>
          <span className={`hidden sm:inline ${t.textPrimary} text-[14px] font-medium tracking-tight`}>MyOffice</span>
        </Link>

        <div className={`hidden sm:block h-5 w-px ${t.light ? 'bg-gray-200' : 'bg-white/15'} mx-1 shrink-0`} />
        <span className={`hidden sm:inline ${t.textSecondary} text-[13px] shrink-0`}>Home</span>

        <div className="flex-1" />

        {!mobileSearchOpen && (
          <div className="hidden md:flex w-full max-w-sm mx-2">
            <div className="relative w-full">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
              <input
                type="search"
                placeholder="Search modules, employees, documents…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center shrink-0">
          <button
            onClick={onCustomize}
            className={`hidden sm:flex items-center gap-1.5 h-11 px-3 text-[13px] font-medium ${t.textMuted} ${t.hoverText} ${t.hoverBg} transition-colors`}
            type="button"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden lg:inline">Customize</span>
          </button>
          <button
            onClick={t.toggle}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
            type="button"
            title={t.light ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {t.light ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted} md:hidden`}
            type="button"
            title="Search"
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button className={`relative h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`} type="button" title="Notifications">
            <Bell className="h-[18px] w-[18px]" />
            <span className={`absolute top-2.5 right-2.5 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ${t.light ? 'ring-white' : 'ring-slate-900'}`} />
          </button>
          <button className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`} type="button" title="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <button className={`flex items-center gap-1.5 h-11 pl-2 pr-2.5 ${t.hoverBg} transition-colors`} type="button">
            <div className={`h-7 w-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[11px] font-medium ring-1 ${t.light ? 'ring-gray-200' : 'ring-white/10'}`}>
              JD
            </div>
            <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint} hidden lg:block`} />
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative w-full">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
            <input
              type="search"
              autoFocus
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all`}
            />
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Sidebar Navigation ─────────────────────────────────────────────────────

function SidebarNavigation({
  isOpen, onClose, collapsed, onToggleCollapsed, favoriteModules,
}: {
  isOpen: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void;
  favoriteModules: { module: Module; accent: Accent }[];
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ favorites: true, modules: false, activity: false });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const t = useTheme();

  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCat = (id: string) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: BarChart3, label: 'Analytics', href: '/visualization' },
    { icon: FileText, label: 'Reports', href: '/reports' },
  ];

  return (
    <>
      {isOpen && <div className={`fixed inset-0 ${t.scrim} backdrop-blur-[1px] z-30 lg:hidden`} onClick={onClose} />}
      <aside
        className={`fixed top-11 left-0 h-[calc(100vh-44px)] ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64 ${t.glass} border-y-0 border-l-0 z-40 transition-[transform,width] duration-300 overflow-y-auto overflow-x-hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Collapse toggle — top, so it never collides with the Next.js dev indicator badge */}
        <div className={`hidden lg:flex items-center ${collapsed ? 'justify-center' : 'justify-end'} px-3 py-2 border-b ${t.border} shrink-0`}>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center justify-center h-8 w-8 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="p-4 space-y-0.5 flex-1">
          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${t.textMuted} ${t.hoverBg} ${t.hoverText} font-medium text-sm transition-colors ${collapsed ? 'lg:justify-center' : ''}`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </Link>
          ))}

          {/* Favorites — user-customizable via the bookmark icon on any module tile */}
          <div className={`mt-6 pt-5 border-t ${t.border} ${collapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('favorites')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span>Favorites</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.favorites ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.favorites}>
              <div className="space-y-0.5 pt-1">
                {favoriteModules.length === 0 ? (
                  <p className={`px-3 py-2 text-[12px] ${t.textFaint}`}>Hover a module and tap the bookmark icon to pin it here.</p>
                ) : (
                  favoriteModules.map(({ module, accent }) => {
                    const a = ACCENT[accent];
                    return (
                      <Link key={module.href} href={module.href} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors`}>
                        <Bookmark className={`h-3.5 w-3.5 ${a.icon} shrink-0`} fill="currentColor" strokeWidth={1.5} />
                        <span className="truncate">{module.title}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </Collapse>
          </div>

          {/* All Modules — full expandable navigation tree */}
          <div className={`mt-4 pt-4 border-t ${t.border} ${collapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('modules')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span>All Modules</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.modules ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.modules}>
              <div className="space-y-0.5 pt-1">
                {CATEGORIES.map(cat => {
                  const a = ACCENT[cat.accent];
                  const catOpen = !!expandedCats[cat.id];
                  return (
                    <div key={cat.id}>
                      <button
                        onClick={() => toggleCat(cat.id)}
                        type="button"
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors group`}
                      >
                        <div className={`p-1 rounded-md bg-gradient-to-br ${a.gradient} shrink-0`}>
                          <cat.icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="flex-1 truncate text-left">{cat.title}</span>
                        <span className={`text-[10px] ${t.textTertiary} tabular-nums`}>{cat.modules.length}</span>
                        <ChevronDown className={`h-3 w-3 ${t.textFaint} transition-transform shrink-0 ${catOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <Collapse open={catOpen}>
                        <div className="space-y-0.5 py-0.5 pl-8">
                          {cat.modules.map(module => (
                            <Link
                              key={module.href}
                              href={module.href}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] ${t.textTertiary} ${t.hoverBg} ${t.hoverText} transition-colors`}
                            >
                              <module.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{module.title}</span>
                            </Link>
                          ))}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </Collapse>
          </div>

          {/* Recent Activity — optional, moved here from the main dashboard */}
          <div className={`mt-4 pt-4 border-t ${t.border} ${collapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('activity')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span>Recent Activity</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.activity ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.activity}>
              <div className="space-y-0.5 pt-1">
                {RECENT_ACTIVITIES.map(activity => (
                  <div key={activity.id} className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-[12px] ${t.textMuted}`}>
                    <activity.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${t.textTertiary}`} />
                    <div className="min-w-0">
                      <p className="truncate">{activity.action}</p>
                      <p className={`text-[10.5px] ${t.textFaint}`}>{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Collapse>
          </div>

          {collapsed && (
            <div className={`hidden lg:flex flex-col items-center gap-1 pt-4 mt-4 border-t ${t.border}`}>
              {favoriteModules.slice(0, 5).map(({ module, accent }) => {
                const a = ACCENT[accent];
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    title={module.title}
                    className={`p-2 rounded-lg ${t.hoverBg} ${t.hoverText} transition-colors`}
                  >
                    <Bookmark className={`h-4 w-4 ${a.icon}`} fill="currentColor" strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ data }: { data: typeof KPI_DATA[0] }) {
  const Icon = data.icon;
  const a = ACCENT[data.accent];
  const t = useTheme();
  const trendColor = data.trend === 'up' ? t.trendUp : t.trendDown;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className={`relative ${t.glass} rounded-lg p-3.5 ${t.shadow} transition-shadow duration-300 ${a.glow}`}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`h-3.5 w-3.5 ${a.icon}`} />
        <p className={`${t.textSecondary} text-[11px] font-medium uppercase tracking-wide truncate`}>{data.title}</p>
      </div>
      <p className={`text-[28px] leading-none font-bold ${t.textPrimary} tracking-tight tabular-nums`}>{data.value}</p>
      <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${trendColor}`}>
        {data.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        <span>{data.change}</span>
        <span className={`${t.textTertiary} font-normal`}>vs last period</span>
      </div>
    </motion.div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

function QuickActionCard({ action }: { action: typeof QUICK_ACTIONS[0] }) {
  const Icon = action.icon;
  const a = ACCENT[action.accent];
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
      <Link href={action.href} className={`flex items-center gap-3 ${t.glassSoft} rounded-xl p-3.5 ${t.shadow} transition-shadow duration-300 group ${a.glow}`}>
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          <Icon className="h-[18px] w-[18px] text-white" />
        </div>
        <span className={`text-[13px] font-medium ${t.textMuted} ${t.groupHoverText} transition-colors`}>{action.label}</span>
      </Link>
    </motion.div>
  );
}


// ─── Module Card ─────────────────────────────────────────────────────────────

const tileTextContainer = {
  rest: {},
  hover: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

const tileTextItem = {
  rest: { opacity: 0.8, y: 0 },
  hover: { opacity: 1, y: -2, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

const tileIconItem = {
  rest: { scale: 1 },
  hover: { scale: 1.08, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

const letterContainer = {
  rest: {},
  hover: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const letterItem = {
  rest: { opacity: 0, y: 4 },
  hover: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function AnimatedText({
  text, className, as = 'p', trigger = 'hover',
}: {
  text: string; className: string; as?: 'h4' | 'p' | 'h2'; trigger?: 'hover' | 'mount';
}) {
  const Tag = motion[as] as typeof motion.p;
  const mountProps = trigger === 'mount' ? { initial: 'rest', animate: 'hover' } : {};
  return (
    <Tag variants={letterContainer} className={className} aria-label={text} {...mountProps}>
      <span aria-hidden="true">
        {text.split('').map((ch, i) => (
          <motion.span key={i} variants={letterItem} className="inline-block whitespace-pre">
            {ch}
          </motion.span>
        ))}
      </span>
    </Tag>
  );
}

function ModuleCard({
  module, accent, onQuickView, isFavorite, onToggleFavorite,
}: {
  module: Module; accent: Accent; onQuickView: () => void; isFavorite: boolean; onToggleFavorite: () => void;
}) {
  const a = ACCENT[accent];
  const primaryMetric = module.metrics?.[0];
  const t = useTheme();
  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      {/* Fiori flat/numeric tile — square app tile */}
      <motion.div variants={{ rest: { y: 0 }, hover: { y: -3 } }} transition={{ duration: 0.25 }}>
        <Link
          href={module.href}
          className={`flex flex-col justify-between aspect-[2/1] ${t.glassSoft} rounded-lg p-2.5 ${t.shadow} transition-shadow duration-300 ${t.hoverBgSoft} ${a.glow}`}
        >
          <div className="flex items-start justify-between">
            <motion.div variants={tileIconItem} className={`h-7 w-7 rounded-md ${a.chip} flex items-center justify-center shrink-0`}>
              <module.icon className={`h-3.5 w-3.5 ${a.icon}`} />
            </motion.div>
            {module.badge && (
              <span className={`text-[9px] font-medium ${t.textFaint} ${t.chipBg} rounded-full px-1.5 py-0.5 tabular-nums`}>
                {module.badge}
              </span>
            )}
          </div>

          <motion.div variants={tileTextContainer}>
            {primaryMetric && (
              <motion.p variants={tileTextItem} className={`text-base font-bold ${t.textPrimary} tabular-nums leading-none`}>
                {primaryMetric.value}
                <span className={`text-[9px] font-medium ${t.textTertiary} uppercase tracking-wide ml-1.5 align-middle`}>{primaryMetric.label}</span>
              </motion.p>
            )}
            <h4 className={`font-medium ${t.textMuted} text-[12.5px] mt-1 leading-snug line-clamp-1`}>
              {module.title}
            </h4>
            <AnimatedText
              as="p"
              text={module.description}
              className={`text-[10.5px] ${t.textTertiary} mt-0.5 leading-snug line-clamp-1`}
            />
          </motion.div>
        </Link>
      </motion.div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          className={`p-1 rounded-md ${t.chipBg} ${t.hoverBg} border ${t.border} transition-colors shadow-sm ${isFavorite ? 'text-blue-400' : t.textFaint} ${t.hoverText}`}
          type="button"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Bookmark className="h-3 w-3" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(); }}
          className={`p-1 rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} border ${t.border} transition-colors shadow-sm`}
          type="button"
          title="Quick view"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Category Section ───────────────────────────────────────────────────────

function CategorySection({
  category, isExpanded, onToggle, onQuickView, favorites, onToggleFavorite,
}: {
  category: Category; isExpanded: boolean; onToggle: () => void; onQuickView: (m: Module, accent: Accent) => void;
  favorites: Set<string>; onToggleFavorite: (href: string) => void;
}) {
  const a = ACCENT[category.accent];
  const t = useTheme();
  return (
    <motion.div
      variants={fadeUp}
      id={category.id}
      className={`${t.glass} rounded-2xl ${t.shadow} scroll-mt-24 overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 ${t.hoverBgSoft} text-left group transition-colors`}
        type="button"
      >
        <div className={`h-8 w-8 rounded-md bg-gradient-to-br ${a.gradient} flex items-center justify-center shrink-0 ${a.solidGlow} group-hover:scale-105 transition-transform`}>
          <category.icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className={`font-semibold ${t.textPrimary} text-[14px] tracking-tight`}>{category.title}</h3>
            <span className={`text-[11px] font-medium ${t.textTertiary} tabular-nums`}>{category.modules.length} modules</span>
            {category.growth && (
              <span className={`text-[11px] font-medium ${t.trendUp} bg-emerald-400/15 rounded-full px-1.5 py-0.5`}>{category.growth}</span>
            )}
          </div>
          <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>{category.description}</p>
        </div>
        <ChevronDown className={`h-4 w-4 ${t.textFaint} transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <Collapse open={isExpanded}>
        <div className={`px-4 pb-4 pt-1 border-t ${t.border}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4">
            {category.modules.map(module => (
              <ModuleCard
                key={module.href}
                module={module}
                accent={category.accent}
                onQuickView={() => onQuickView(module, category.accent)}
                isFavorite={favorites.has(module.href)}
                onToggleFavorite={() => onToggleFavorite(module.href)}
              />
            ))}
          </div>
        </div>
      </Collapse>
    </motion.div>
  );
}

// ─── Right-rail panel shell ─────────────────────────────────────────────────

function Panel({
  icon: Icon, iconClass, title, subtitle, children, defaultOpen = true, footer,
}: {
  icon: React.ElementType; iconClass: string; title: string; subtitle: string;
  children: React.ReactNode; defaultOpen?: boolean; footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className={`w-full flex items-center justify-between px-5 py-4 ${t.hoverBgSoft} transition-colors text-left`} type="button">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h4 className={`text-[13px] font-semibold ${t.textPrimary}`}>{title}</h4>
            <p className={`text-[11px] ${t.textFaint} truncate`}>{subtitle}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 ${t.textFaint} transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      <Collapse open={open}>
        <div className={`border-t ${t.border}`}>
          {children}
          {footer}
        </div>
      </Collapse>
    </motion.div>
  );
}

// ─── Module quick-view content (inside SlideOver) ───────────────────────────

function ModuleQuickView({ module, accent }: { module: Module; accent: Accent }) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-6 space-y-6">
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center ${a.solidGlow} shrink-0`}>
          <module.icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className={`font-semibold ${t.textPrimary} text-lg tracking-tight`}>{module.title}</h3>
          <p className={`text-[13px] ${t.textSecondary} mt-0.5`}>{module.description}</p>
        </div>
      </motion.div>

      {module.metrics && (
        <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3">
          {module.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }} className={`rounded-xl ${t.chipBg} border ${t.border} ${t.shadow} ${a.glow} transition-shadow duration-300 p-4 text-center`}>
              <p className={`text-2xl font-semibold ${t.textPrimary} tabular-nums`}>{m.value}</p>
              <p className={`text-[11px] ${t.textTertiary} uppercase tracking-wide mt-1`}>{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {module.tags && (
        <motion.div variants={fadeUp}>
          <p className={`text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-2`}>Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {module.tags.map(tag => (
              <span key={tag} className={`text-[12px] font-medium ${t.textMuted} ${t.chipBg} rounded-full px-2.5 py-1`}>{tag}</span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <Link
          href={module.href}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br ${a.gradient} text-white text-sm font-semibold ${a.solidGlow} ${a.glow} hover:brightness-105 transition-all`}
        >
          Open module <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Customize panel content (inside SlideOver) ─────────────────────────────

function CustomizeRow({
  icon: Icon, accent, title, description, active, onToggle,
}: {
  icon: React.ElementType; accent: Accent; title: string; description: string; active: boolean; onToggle: () => void;
}) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} whileHover={{ x: 2 }} className="flex items-center gap-3 py-3">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shrink-0 ${a.solidGlow} ${a.glow} transition-shadow duration-300`}>
        <Icon className="h-[18px] w-[18px] text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${t.textPrimary}`}>{title}</p>
        <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>{description}</p>
      </div>
      <button
        onClick={onToggle}
        type="button"
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${
          active ? 'bg-emerald-500 border-emerald-500 text-white' : `${t.chipBg} ${t.border} ${t.textFaint} hover:border-blue-300/50`
        }`}
        title={active ? 'Remove from dashboard' : 'Add to dashboard'}
      >
        {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </motion.div>
  );
}

// ─── Dashboard Header ────────────────────────────────────────────────────────

function DashboardHeader() {
  const [now, setNow] = useState<Date | null>(null);
  const t = useTheme();

  useEffect(() => {
    setNow(new Date());
    const intervalId = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const dateLabel = now?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeLabel = now?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-9">
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 mb-4 text-[12px] font-medium ${t.textFaint}`}>
        <span className={t.trendUp}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
        </span>
        {now && (
          <>
            <span className={t.textTertiary}>·</span>
            <span>{dateLabel}, {timeLabel}</span>
          </>
        )}
        <span className={t.textTertiary}>·</span>
        <span>FY2026 Q3</span>
      </div>

      <h2 className={`font-heading text-[32px] sm:text-[42px] leading-[1.08] font-semibold tracking-tight ${t.textPrimary} ${t.light ? '' : '[text-shadow:0_2px_24px_rgba(0,0,0,0.35)]'}`}>
        Your business, unified.
      </h2>
      <AnimatedText
        as="p"
        trigger="mount"
        text="Personnel, operations, safety, inventory and analytics — one modern ERP, built to run your entire organisation from a single, elegant workspace."
        className={`${t.textSecondary} text-[15px] mt-3 max-w-xl leading-relaxed`}
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-7">
        {[
          { label: 'Modules', value: String(TOTAL_MODULES) },
          { label: 'Departments', value: String(TOTAL_CATEGORIES) },
          { label: 'Team members', value: '48' },
          { label: 'Uptime', value: '99.98%' },
        ].map((stat, i) => (
          <div key={stat.label} className={`flex items-baseline gap-2 ${i > 0 ? `pl-8 border-l ${t.border}` : ''}`}>
            <span className={`text-[20px] font-semibold ${t.textPrimary} tracking-tight tabular-nums`}>{stat.value}</span>
            <span className={`text-[12px] ${t.textFaint}`}>{stat.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [light, setLight] = useState(true);
  const t = useMemo(() => ({ light, toggle: () => setLight(l => !l), ...themeClasses(light) }), [light]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [quickView, setQuickView] = useState<{ module: Module; accent: Accent } | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );
  const [hiddenKpis, setHiddenKpis] = useState<Set<string>>(new Set());
  const [hiddenActions, setHiddenActions] = useState<Set<string>>(new Set());
  const [favoriteHrefs, setFavoriteHrefs] = useState<Set<string>>(
    () => new Set(CATEGORIES.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href)))
  );
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [incomingWallpaper, setIncomingWallpaper] = useState<number | null>(null);
  const [wallpaperFadeIn, setWallpaperFadeIn] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (wallpaperIndex + 1) % WALLPAPERS.length;
      setIncomingWallpaper(next);
      requestAnimationFrame(() => requestAnimationFrame(() => setWallpaperFadeIn(true)));
      const swap = setTimeout(() => {
        setWallpaperIndex(next);
        setIncomingWallpaper(null);
        setWallpaperFadeIn(false);
      }, 2200);
      return () => clearTimeout(swap);
    }, 15000);
    return () => clearInterval(interval);
  }, [wallpaperIndex]);

  const toggleCategory = (id: string) => setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  const allExpanded = Object.values(expandedMap).every(Boolean);
  const toggleAll = () => setExpandedMap(Object.fromEntries(CATEGORIES.map(c => [c.id, !allExpanded])));

  const toggleKpi = (id: string) => setHiddenKpis(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAction = (id: string) => setHiddenActions(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleFavorite = (href: string) => setFavoriteHrefs(prev => {
    const next = new Set(prev);
    next.has(href) ? next.delete(href) : next.add(href);
    return next;
  });

  const favoriteModules = useMemo(() => {
    const result: { module: Module; accent: Accent }[] = [];
    for (const cat of CATEGORIES) {
      for (const module of cat.modules) {
        if (favoriteHrefs.has(module.href)) result.push({ module, accent: cat.accent });
      }
    }
    return result;
  }, [favoriteHrefs]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CATEGORIES;
    const query = searchQuery.toLowerCase();
    return CATEGORIES.map(cat => ({
      ...cat,
      modules: cat.modules.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags?.some(t => t.toLowerCase().includes(query))
      ),
    })).filter(cat => cat.modules.length > 0);
  }, [searchQuery]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);
  const visibleKpis = KPI_DATA.filter(k => !hiddenKpis.has(k.id));
  const visibleActions = QUICK_ACTIONS.filter(a => !hiddenActions.has(a.id));

  return (
    <ThemeContext.Provider value={t}>
    <div className={`relative flex h-screen flex-col ${t.light ? 'bg-gray-50' : ''}`}>
      {/* Rotating photo background — dark mode only; light mode uses a flat page background */}
      {!light && (
        <>
          <div className="fixed inset-0 -z-20 overflow-hidden bg-slate-900">
            <Image src={WALLPAPERS[wallpaperIndex]} alt="" fill priority className="object-cover object-center" />
          </div>
          {incomingWallpaper !== null && (
            <div className={`fixed inset-0 -z-20 overflow-hidden transition-opacity duration-[1200ms] ${wallpaperFadeIn ? 'opacity-100' : 'opacity-0'}`}>
              <Image src={WALLPAPERS[incomingWallpaper]} alt="" fill className="object-cover object-center" />
            </div>
          )}
          <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" />
        </>
      )}

      <TopNavigation
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        mobileSearchOpen={mobileSearchOpen}
        setMobileSearchOpen={setMobileSearchOpen}
        onCustomize={() => setCustomizeOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarNavigation
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          favoriteModules={favoriteModules}
        />

        <main className={`flex-1 overflow-y-auto transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'}`}>
          <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
            {/* Search Results Banner */}
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mb-6 px-4 py-3 ${t.glassSoft} rounded-xl flex items-center justify-between overflow-hidden`}
                >
                  <p className={`text-[13px] ${t.textMuted}`}>
                    <span className={`font-semibold ${t.textPrimary}`}>{totalResults}</span> module{totalResults === 1 ? '' : 's'} matching "<span className="font-medium">{searchQuery}</span>"
                  </p>
                  <button onClick={() => setSearchQuery('')} className={`text-[13px] ${t.linkText} ${t.linkHover} font-medium`} type="button">
                    Clear
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dashboard Header */}
            {!searchQuery && <DashboardHeader />}

            {/* KPIs */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
            >
              {visibleKpis.map(kpi => <KPICard key={kpi.id} data={kpi} />)}
            </motion.div>

            {/* Quick Actions */}
            {!searchQuery && visibleActions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-[13px] font-semibold ${t.textSecondary} uppercase tracking-wider`}>Quick Actions</h3>
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  {visibleActions.map(action => <QuickActionCard key={action.id} action={action} />)}
                </motion.div>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Modules */}
              <div className="xl:col-span-2 space-y-3" id="modules">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className={`text-[15px] font-semibold ${t.textPrimary} tracking-tight`}>ERP Modules</h3>
                    <p className={`text-[13px] ${t.textSecondary} mt-0.5`}>Organise and access your business operations</p>
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={toggleAll}
                      className={`flex items-center gap-1.5 text-[12px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 transition-colors shrink-0`}
                      type="button"
                    >
                      {allExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                      {allExpanded ? 'Collapse all' : 'Expand all'}
                    </button>
                  )}
                </div>

                {filteredCategories.length === 0 ? (
                  <div className={`${t.glass} rounded-2xl p-16 text-center`}>
                    <Search className={`h-9 w-9 ${t.textTertiary} mx-auto mb-3`} />
                    <p className={`${t.textMuted} font-medium text-sm`}>No modules found</p>
                    <p className={`text-[13px] ${t.textFaint} mt-1`}>Try adjusting your search terms</p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                    {filteredCategories.map(category => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        isExpanded={searchQuery ? true : (expandedMap[category.id] ?? true)}
                        onToggle={() => toggleCategory(category.id)}
                        onQuickView={(module, accent) => setQuickView({ module, accent })}
                        favorites={favoriteHrefs}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Right Rail */}
              <div className="xl:col-span-1">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="sticky top-24 space-y-4">
                  <Panel
                    icon={Server} iconClass="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_16px_-6px_rgba(5,150,105,0.5)]"
                    title="System Status" subtitle="All systems operational"
                    defaultOpen={false}
                  >
                    <div className="px-5 py-4 space-y-3">
                      {SYSTEM_STATUS.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className={`text-[13px] ${t.textMuted}`}>{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span className={`text-[12px] ${t.textTertiary} tabular-nums`}>{item.latency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel
                    icon={Lightbulb} iconClass="bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_8px_16px_-6px_rgba(217,119,6,0.5)]"
                    title="Tips & Shortcuts" subtitle="Work faster with MyOffice"
                    defaultOpen={false}
                  >
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <p className={`text-[13px] font-medium ${t.textPrimary}`}>Global search</p>
                        <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>Type in the search bar to jump to any module instantly</p>
                      </div>
                      <div>
                        <p className={`text-[13px] font-medium ${t.textPrimary}`}>Favourites</p>
                        <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>Featured modules are pinned to your sidebar for quick access</p>
                      </div>
                      <div>
                        <p className={`text-[13px] font-medium ${t.textPrimary}`}>Customize dashboard</p>
                        <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>Use the Customize button up top to add or remove cards</p>
                      </div>
                    </div>
                  </Panel>
                </motion.div>
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>

      {/* Module quick-view overlay */}
      <SlideOver
        open={!!quickView}
        onClose={() => setQuickView(null)}
        title={quickView?.module.title ?? ''}
        subtitle="Module quick view"
        accent={quickView?.accent ?? 'blue'}
      >
        {quickView && <ModuleQuickView module={quickView.module} accent={quickView.accent} />}
      </SlideOver>

      {/* Customize dashboard overlay */}
      <SlideOver
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize your dashboard"
        subtitle="Add or remove cards from your home page"
        accent="violet"
        width="max-w-lg"
      >
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-6">
          <motion.p variants={fadeUp} className={`text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1`}>Key metrics</motion.p>
          <motion.div variants={staggerContainer} className={`divide-y ${t.divide}`}>
            {KPI_DATA.map(kpi => (
              <CustomizeRow
                key={kpi.id}
                icon={kpi.icon}
                accent={kpi.accent}
                title={kpi.title}
                description={`Currently showing ${kpi.value}`}
                active={!hiddenKpis.has(kpi.id)}
                onToggle={() => toggleKpi(kpi.id)}
              />
            ))}
          </motion.div>

          <motion.p variants={fadeUp} className={`text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider mt-6 mb-1`}>Quick actions</motion.p>
          <motion.div variants={staggerContainer} className={`divide-y ${t.divide}`}>
            {QUICK_ACTIONS.map(action => (
              <CustomizeRow
                key={action.id}
                icon={action.icon}
                accent={action.accent}
                title={action.label}
                description="Shortcut tile on your dashboard"
                active={!hiddenActions.has(action.id)}
                onToggle={() => toggleAction(action.id)}
              />
            ))}
          </motion.div>
        </motion.div>
      </SlideOver>

      <style>{`
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
    </ThemeContext.Provider>
  );
}
