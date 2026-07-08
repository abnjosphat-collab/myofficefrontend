// app/page.tsx — Ozech MyOffice Enterprise ERP Dashboard
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ToolCase, Shield, Clock, Calculator, Package, ClipboardCheck,
  CalendarDays, AlertTriangle, Fan, Eye, EyeOff, ChevronDown, ChevronLeft, ChevronRight, BarChart3,
  FileText, Folder, HardHat, Wrench, LineChart, Clock4, Megaphone,
  Building, Utensils, Church, Database,
  AlertOctagon, ShieldAlert, ClipboardList, FileWarning, PackageOpen,
  ClipboardPlus, Target, Activity, Search, Boxes, LayoutGrid, MessageSquareWarning,
  Menu, Settings,
  Bell, Plus, Bookmark, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock3, Lightbulb, ArrowRight, Upload, User, Zap,
  ChevronsDownUp, ChevronsUpDown, X, Maximize2, SlidersHorizontal, Check,
  PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from 'lucide-react';
import {
  useTheme, Collapse, AnimatedText, PulsingIcon, CenterModal,
  staggerContainer, fadeUp, ACCENT, ACCENT_RGBA, type Accent,
} from '@/components/shared/theme';

// ─── Background wallpapers ───────────────────────────────────────────────────

const WALLPAPERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=2400&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=2400&q=80&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=2400&q=80&fit=crop',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2400&q=80&fit=crop',
];

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  accent: Accent;
  removable?: boolean;
  auto?: boolean;
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
    icon: Boxes, accent: 'violet', growth: '+15%',
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

const ALL_MODULES_BY_HREF = new Map<string, { module: Module; accent: Accent }>(
  CATEGORIES.flatMap(c => c.modules.map(m => [m.href, { module: m, accent: c.accent }] as const))
);

// ─── Usage tracking (localStorage) — powers "frequently used" auto quick actions ──

const USAGE_KEY = 'oz_moduleUsage';
const AUTO_QA_DISMISSED_KEY = 'oz_qaDismissed';
const MANUAL_QA_KEY = 'oz_qaManual';
const FREQUENT_THRESHOLD = 3;
const FREQUENT_LIMIT = 3;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable — non-fatal */ }
}

function trackModuleUsage(href: string) {
  const counts = readJSON<Record<string, number>>(USAGE_KEY, {});
  counts[href] = (counts[href] ?? 0) + 1;
  writeJSON(USAGE_KEY, counts);
}

const INTRO_SLIDES: { icon: React.ElementType; accent: Accent; title: string; description: string }[] = [
  { icon: LayoutGrid, accent: 'blue',   title: 'Welcome to MyOffice', description: 'One workspace for personnel, operations, safety, inventory and analytics.' },
  { icon: Search,    accent: 'cyan',    title: 'Find anything, instantly', description: 'Use the search bar up top to jump straight to any module, employee or document.' },
  { icon: Bookmark,  accent: 'violet',  title: 'Make it yours', description: 'Bookmark the modules you use most — they’ll appear in Favorites in the left pane.' },
  { icon: ShieldAlert, accent: 'emerald', title: 'Stay ahead of safety', description: 'Track PPE, inspections and compliance in real time from the Safety & Compliance hub.' },
];

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
    <header
      className={`sticky top-0 z-40 ${t.glass} backdrop-saturate-150 border-x-0 border-t-0`}
      style={{ boxShadow: t.light ? '0 8px 30px -14px rgba(15,23,42,0.18)' : '0 8px 30px -12px rgba(0,0,0,0.5)' }}
    >
      {/* Shell Bar — SAP Fiori style: logo, search, utility icons, avatar */}
      <div className="flex items-center h-11 px-2 lg:px-3 gap-1">
        <button onClick={onMenuToggle} className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted} lg:hidden shrink-0`} type="button" title="Toggle menu">
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className={`flex items-center gap-2 shrink-0 h-11 px-2 ${t.hoverBgSoft} transition-colors`} title="Home">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            M
          </div>
          <span className={`hidden sm:inline ${t.textPrimary} text-[14px] font-medium tracking-tight`}>MyOffice</span>
        </Link>

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
                className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:shadow-[0_6px_20px_-6px_rgba(59,130,246,0.25)] transition-all duration-300`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCustomize}
            className={`hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} ${t.shadow} hover:shadow-[0_8px_20px_-8px_rgba(124,58,237,0.4)] transition-shadow duration-300`}
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
              className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:shadow-[0_6px_20px_-6px_rgba(59,130,246,0.25)] transition-all duration-300`}
            />
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Sidebar Navigation ─────────────────────────────────────────────────────

function SidebarCategoryRow({ cat, isOpen, onToggle }: { cat: Category; isOpen: boolean; onToggle: () => void }) {
  const t = useTheme();
  // Click-only — hover-to-expand here fought with scrolling the sidebar.
  const catOpen = isOpen;
  return (
    <div>
      <button
        onClick={onToggle}
        type="button"
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px group`}
      >
        <cat.icon className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} ${t.groupHoverText} transition-colors`} />
        <span className="flex-1 truncate text-left">{cat.title}</span>
        <span className={`text-[10px] ${t.textTertiary} tabular-nums`}>{cat.modules.length}</span>
        <motion.span animate={{ rotate: catOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
          <ChevronDown className={`h-3 w-3 ${t.textFaint}`} />
        </motion.span>
      </button>
      <Collapse open={catOpen}>
        <div className="space-y-0.5 py-0.5 pl-8">
          {cat.modules.map(module => (
            <Link
              key={module.href}
              href={module.href}
              onClick={() => trackModuleUsage(module.href)}
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
}

function SidebarNavigation({
  isOpen, onClose, collapsed, onToggleCollapsed, favoriteModules,
}: {
  isOpen: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void;
  favoriteModules: { module: Module; accent: Accent }[];
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ favorites: true, modules: false, activity: false, status: false, tips: false });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [hovered, setHovered] = useState(false);
  const [scrollEdge, setScrollEdge] = useState<'top' | 'bottom' | null>(null);
  const t = useTheme();

  // While pinned-collapsed, hovering the rail temporarily reveals the full sidebar —
  // same "reveal on hover" pattern as the module tiles, without changing the pinned preference.
  const visuallyCollapsed = collapsed && !hovered;

  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCat = (id: string) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

  // Flash a brief edge glow when scroll hits the top/bottom of the nav rail — a small,
  // tactile "you've reached the end" signal instead of an abrupt hard stop.
  const flashEdge = (edge: 'top' | 'bottom') => {
    setScrollEdge(edge);
    window.setTimeout(() => setScrollEdge(prev => (prev === edge ? null : prev)), 550);
  };
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 0) flashEdge('top');
    else if (el.scrollHeight - el.scrollTop - el.clientHeight <= 1) flashEdge('bottom');
  };

  return (
    <>
      {isOpen && <div className={`fixed inset-0 ${t.scrim} backdrop-blur-[1px] z-30 lg:hidden`} onClick={onClose} />}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onScroll={handleScroll}
        className={`fixed top-11 left-0 h-[calc(100vh-44px)] ${visuallyCollapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64 ${t.glass} border-y-0 border-l-0 z-40 transition-[transform,width,box-shadow] duration-300 overflow-y-auto overflow-x-hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ boxShadow: t.light ? '10px 0 32px -18px rgba(15,23,42,0.28), 1px 0 0 rgba(15,23,42,0.04)' : '10px 0 40px -16px rgba(0,0,0,0.55), 1px 0 0 rgba(255,255,255,0.04)' }}
      >
        {/* Scroll-edge signal — a soft glow flash at the rail's top/bottom when scroll reaches it */}
        <AnimatePresence>
          {scrollEdge === 'top' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none sticky top-0 left-0 right-0 h-6 -mb-6 z-10"
              style={{ background: `linear-gradient(to bottom, ${ACCENT_RGBA.blue}, transparent)` }}
            />
          )}
        </AnimatePresence>

        {/* Collapse toggle — top, so it never collides with the Next.js dev indicator badge */}
        <div className={`hidden lg:block px-3 py-2.5 border-b ${t.border} shrink-0`}>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-2 h-8 ${visuallyCollapsed ? 'w-8 justify-center px-0' : 'w-full px-2.5'} rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} ${t.hoverText} ${t.shadow} transition-all`}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!visuallyCollapsed && <span className="text-[12px] font-medium">Collapse</span>}
          </button>
        </div>

        <motion.nav variants={staggerContainer} initial="hidden" animate="show" className="p-4 space-y-0.5 flex-1">
          {/* Favorites — user-customizable via the bookmark icon on any module tile */}
          <motion.div variants={fadeUp} className={`mt-6 pt-5 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
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
                  favoriteModules.map(({ module }) => (
                    <Link key={module.href} href={module.href} onClick={() => trackModuleUsage(module.href)} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px group`}>
                      <Bookmark className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} group-hover:text-blue-400 transition-colors`} strokeWidth={1.75} />
                      <span className="truncate">{module.title}</span>
                    </Link>
                  ))
                )}
              </div>
            </Collapse>
          </motion.div>

          {/* All Modules — full expandable navigation tree */}
          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
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
                {CATEGORIES.map(cat => (
                  <SidebarCategoryRow key={cat.id} cat={cat} isOpen={!!expandedCats[cat.id]} onToggle={() => toggleCat(cat.id)} />
                ))}
              </div>
            </Collapse>
          </motion.div>

          {/* Recent Activity — optional, moved here from the main dashboard */}
          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
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
          </motion.div>

          {/* System Status — relocated from the old right rail */}
          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('status')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Status
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.status ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.status}>
              <div className="space-y-1.5 pt-1 px-3">
                {SYSTEM_STATUS.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className={t.textMuted}>{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className={`${t.textTertiary} tabular-nums`}>{item.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Collapse>
          </motion.div>

          {/* Tips & Shortcuts — relocated from the old right rail */}
          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('tips')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" />
                Tips & Shortcuts
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.tips ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.tips}>
              <div className="space-y-2.5 pt-1 px-3 pb-1">
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Global search</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Type in the search bar to jump to any module instantly</p>
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Favourites</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Tap a module's bookmark icon to pin it here</p>
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Customize dashboard</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Use the Customize button up top to add or remove cards</p>
                </div>
              </div>
            </Collapse>
          </motion.div>

          {visuallyCollapsed && (
            <div className={`hidden lg:flex flex-col items-center gap-1 pt-4 mt-4 border-t ${t.border}`}>
              {favoriteModules.slice(0, 5).map(({ module }) => (
                <Link
                  key={module.href}
                  href={module.href}
                  title={module.title}
                  className={`p-2 rounded-lg ${t.hoverBg} ${t.hoverText} transition-colors group`}
                >
                  <Bookmark className={`h-4 w-4 ${t.textFaint} group-hover:text-blue-400 transition-colors`} strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          )}
        </motion.nav>

        {/* Scroll-edge signal — bottom */}
        <AnimatePresence>
          {scrollEdge === 'bottom' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none sticky bottom-0 left-0 right-0 h-6 -mt-6 shrink-0"
              style={{ background: `linear-gradient(to top, ${ACCENT_RGBA.blue}, transparent)` }}
            />
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ data, index }: { data: typeof KPI_DATA[0]; index: number }) {
  const Icon = data.icon;
  const a = ACCENT[data.accent];
  const t = useTheme();
  const trendColor = data.trend === 'up' ? t.trendUp : t.trendDown;
  const restShadow = `0 0 1px rgba(255,255,255,0.06) inset, 0 22px 40px -14px ${ACCENT_RGBA[data.accent]}, 0 6px 14px -6px rgba(0,0,0,0.22)`;
  const hoverShadow = `0 0 1px rgba(255,255,255,0.1) inset, 0 34px 64px -16px ${ACCENT_RGBA[data.accent]}, 0 12px 24px -8px rgba(0,0,0,0.3)`;
  return (
    <motion.div
      initial="hidden"
      animate="show"
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      variants={{
        hidden: { opacity: 0, boxShadow: restShadow },
        show: { opacity: 1, boxShadow: restShadow, transition: { duration: 1.4, ease: 'easeInOut', delay: index * 0.22 } },
        hover: { y: -7, scale: 1.025, boxShadow: hoverShadow, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={`group relative ${t.glass} rounded-lg p-3.5`}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <PulsingIcon className="h-3.5 w-3.5 flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
          <Icon className={`h-3.5 w-3.5 ${a.icon}`} />
        </PulsingIcon>
        <p className={`${t.textSecondary} text-[11px] font-medium uppercase tracking-wide truncate`}>{data.title}</p>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.22 + 0.4, duration: 0.8, ease: 'easeInOut' }}
        className={`text-[28px] leading-none font-bold ${t.textPrimary} tracking-tight tabular-nums`}
      >
        {data.value}
      </motion.p>
      <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${trendColor}`}>
        <motion.span
          animate={{ y: data.trend === 'up' ? [0, -2, 0] : [0, 2, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
        >
          {data.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        </motion.span>
        <span>{data.change}</span>
        <span className={`${t.textTertiary} font-normal`}>vs last period</span>
      </div>
    </motion.div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

function QuickActionCard({ action, onRemove }: { action: QuickAction; onRemove?: () => void }) {
  const Icon = action.icon;
  const a = ACCENT[action.accent];
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="relative group">
      <Link href={action.href} onClick={() => trackModuleUsage(action.href)} className={`flex items-center gap-3 ${t.glassSoft} rounded-xl p-3.5 ${t.shadow} transition-shadow duration-300 ${a.glow}`}>
        <div className="h-9 w-9 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Icon className={`h-5 w-5 ${a.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`text-[13px] font-medium ${t.textMuted} ${t.groupHoverText} transition-colors truncate block`}>{action.label}</span>
          {action.auto && <span className={`text-[9.5px] font-medium ${t.textFaint} uppercase tracking-wide`}>Frequently used</span>}
        </div>
      </Link>
      {onRemove && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className={`absolute top-1.5 right-1.5 p-1 rounded-md ${t.hoverBg} ${t.textFaint} ${t.hoverText} opacity-0 group-hover:opacity-100 transition-all`}
          type="button"
          title={action.auto ? 'Dismiss suggestion' : 'Remove from quick actions'}
        >
          <X className="h-3 w-3" />
        </button>
      )}
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

function ModuleCard({
  module, accent, onQuickView, isFavorite, onToggleFavorite, isQuickAction, onToggleQuickAction,
}: {
  module: Module; accent: Accent; onQuickView: () => void; isFavorite: boolean; onToggleFavorite: () => void;
  isQuickAction: boolean; onToggleQuickAction: () => void;
}) {
  const a = ACCENT[accent];
  const primaryMetric = module.metrics?.[0];
  const t = useTheme();
  // Dwell before the quick-view popup fires — a quick pass over the icon shouldn't pop it open.
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armQuickView = () => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(onQuickView, 380);
  };
  const disarmQuickView = () => { if (dwellRef.current) clearTimeout(dwellRef.current); };

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
          onClick={() => trackModuleUsage(module.href)}
          className={`flex flex-col justify-between aspect-[2/1] ${t.glassSoft} rounded-lg p-2.5 ${t.shadow} transition-shadow duration-300 ${t.hoverBgSoft} ${a.glow}`}
        >
          <div className="flex items-start justify-between">
            <motion.div variants={tileIconItem} className="shrink-0">
              <module.icon className={`h-[18px] w-[18px] ${a.icon}`} />
            </motion.div>
            {module.badge && (
              <span className={`text-[9px] font-medium ${t.textFaint} ${t.chipBg} rounded-full px-1.5 py-0.5 tabular-nums opacity-100 group-hover:opacity-0 transition-opacity duration-150`}>
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
          className={`p-1 rounded-md ${t.hoverBg} transition-colors ${isFavorite ? 'text-blue-400' : t.textFaint} ${t.hoverText}`}
          type="button"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Bookmark className="h-3.5 w-3.5" fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleQuickAction(); }}
          className={`p-1 rounded-md ${t.hoverBg} transition-colors ${isQuickAction ? 'text-amber-400' : t.textFaint} ${t.hoverText}`}
          type="button"
          title={isQuickAction ? 'Remove from quick actions' : 'Add to quick actions'}
        >
          <Zap className="h-3.5 w-3.5" fill={isQuickAction ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); disarmQuickView(); onQuickView(); }}
          onMouseEnter={armQuickView}
          onMouseLeave={disarmQuickView}
          className={`p-1 rounded-md ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
          type="button"
          title="Quick view"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Category Section ───────────────────────────────────────────────────────

function CategorySection({
  category, isExpanded, onToggle, onQuickView, favorites, onToggleFavorite, quickActions, onToggleQuickAction,
}: {
  category: Category; isExpanded: boolean; onToggle: () => void; onQuickView: (m: Module, accent: Accent) => void;
  favorites: Set<string>; onToggleFavorite: (href: string) => void;
  quickActions: Set<string>; onToggleQuickAction: (href: string) => void;
}) {
  const a = ACCENT[category.accent];
  const t = useTheme();
  // Click-only — a hover-to-expand preview here fought with mouse-wheel scrolling
  // (resting the cursor over a category while scrolling would pop it open).
  const visuallyExpanded = isExpanded;
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
        <div className="h-8 w-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <category.icon className={`h-5 w-5 ${a.icon}`} />
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
        <ChevronDown className={`h-4 w-4 ${t.textFaint} transition-transform shrink-0 ${visuallyExpanded ? 'rotate-180' : ''}`} />
      </button>

      <Collapse open={visuallyExpanded}>
        <div className={`px-4 pb-4 pt-1 border-t ${t.border}`}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={visuallyExpanded ? 'show' : 'hidden'}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4"
          >
            {category.modules.map(module => (
              <motion.div key={module.href} variants={fadeUp}>
                <ModuleCard
                  module={module}
                  accent={category.accent}
                  onQuickView={() => onQuickView(module, category.accent)}
                  isFavorite={favorites.has(module.href)}
                  onToggleFavorite={() => onToggleFavorite(module.href)}
                  isQuickAction={quickActions.has(module.href)}
                  onToggleQuickAction={() => onToggleQuickAction(module.href)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Collapse>
    </motion.div>
  );
}


// ─── Module quick-view content (inside popup modal) ─────────────────────────

function ModuleQuickView({ module, accent }: { module: Module; accent: Accent }) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <PulsingIcon className="h-9 w-9 flex items-center justify-center shrink-0">
          <module.icon className={`h-6 w-6 ${a.icon}`} />
        </PulsingIcon>
        <div>
          <h3 className={`font-medium ${t.textPrimary} text-[12.5px] tracking-tight`}>{module.title}</h3>
          <AnimatedText
            as="p"
            trigger="mount"
            text={module.description}
            className={`text-[10.5px] ${t.textSecondary} mt-0.5`}
          />
        </div>
      </div>

      {module.metrics && (
        <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-2">
          {module.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }} className={`rounded-lg ${t.chipBg} ${t.shadow} ${a.glow} transition-shadow duration-300 p-2 text-center`}>
              <p className={`text-base font-bold ${t.textPrimary} tabular-nums leading-none`}>{m.value}</p>
              <p className={`text-[9px] ${t.textTertiary} uppercase tracking-wide mt-1`}>{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {module.tags && (
        <motion.div variants={fadeUp}>
          <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {module.tags.map(tag => (
              <span key={tag} className={`text-[10.5px] font-medium ${t.textMuted} ${t.chipBg} rounded-full px-2 py-0.5`}>{tag}</span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
        <Link
          href={module.href}
          onClick={() => trackModuleUsage(module.href)}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-gradient-to-br ${a.gradient} text-white text-[11.5px] font-semibold ${a.solidGlow} ${a.glow} hover:brightness-110 transition-all duration-300 ease-out`}
        >
          Open module <ArrowRight className="h-3 w-3" />
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
    <motion.div variants={fadeUp} whileHover={{ x: 2 }} className="flex items-center gap-3 py-2.5">
      <PulsingIcon className="h-9 w-9 flex items-center justify-center shrink-0">
        <Icon className={`h-5 w-5 ${a.icon}`} />
      </PulsingIcon>
      <div className="flex-1 min-w-0">
        <p className={`text-[12.5px] font-medium ${t.textPrimary}`}>{title}</p>
        <AnimatedText as="p" trigger="mount" text={description} className={`text-[10.5px] ${t.textSecondary} mt-0.5`} />
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

// ─── Intro slides — a brief, auto-advancing welcome carousel ────────────────

function IntroSlides() {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const t = useTheme();

  const next = () => setIndex(i => (i + 1) % INTRO_SLIDES.length);
  const prev = () => setIndex(i => (i - 1 + INTRO_SLIDES.length) % INTRO_SLIDES.length);

  // Long dwell per slide (~75s) — this is a slow-reveal welcome banner, not a ticker.
  // Paused whenever hidden so a background timer doesn't silently advance while unseen.
  useEffect(() => {
    if (hidden) return;
    const id = setInterval(next, 75_000);
    return () => clearInterval(id);
  }, [hidden]);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        type="button"
        className={`flex items-center gap-1.5 text-[12px] font-medium ${t.textFaint} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 mt-6 mb-2 transition-colors`}
      >
        <Eye className="h-3.5 w-3.5" /> Show intro slides
      </button>
    );
  }

  const slide = INTRO_SLIDES[index];
  const a = ACCENT[slide.accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`relative ${t.glass} rounded-xl overflow-hidden mt-6 mb-2`}
      style={{ boxShadow: `0 1px 1px rgba(255,255,255,0.06) inset, 0 32px 56px -20px ${ACCENT_RGBA[slide.accent]}, 0 10px 20px -10px rgba(0,0,0,0.28)` }}
    >
      <div className="relative flex items-center gap-3 px-5 py-6 min-h-[112px]">
        <button
          onClick={prev}
          type="button"
          title="Previous slide"
          className={`shrink-0 p-1.5 rounded-full ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 flex-1 min-w-0"
          >
            <PulsingIcon className="h-11 w-11 flex items-center justify-center shrink-0">
              <slide.icon className={`h-7 w-7 ${a.icon}`} />
            </PulsingIcon>
            <div className="min-w-0">
              <p className={`text-[15px] font-semibold ${t.textPrimary}`}>{slide.title}</p>
              <AnimatedText
                as="p"
                trigger="mount"
                text={slide.description}
                className={`text-[13px] ${t.textSecondary} mt-1 max-w-lg leading-relaxed`}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={next}
          type="button"
          title="Next slide"
          className={`shrink-0 p-1.5 rounded-full ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {INTRO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              title={`Slide ${i + 1}`}
              type="button"
              className={`h-1.5 rounded-full transition-all ${i === index ? `w-4 ${a.icon.replace('text-', 'bg-')}` : `w-1.5 ${t.chipBg}`}`}
            />
          ))}
          <button
            onClick={() => setHidden(true)}
            className={`ml-2 p-1 rounded-md ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
            type="button"
            title="Hide intro slides"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Count-up number (plays once on mount, after an optional delay) ─────────

function CountUp({ value, suffix = '', delay = 0, duration = 1 }: { value: number; suffix?: string; delay?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const decimals = Number.isInteger(value) ? 0 : (String(value).split('.')[1]?.length ?? 0);

  useEffect(() => {
    let raf: number;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }
      const progress = Math.min(1, elapsed);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, duration]);

  return <>{display.toFixed(decimals)}{suffix}</>;
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

      <motion.h2
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`font-heading text-[32px] sm:text-[42px] leading-[1.08] font-semibold tracking-tight ${t.textPrimary} ${t.light ? '' : '[text-shadow:0_2px_24px_rgba(0,0,0,0.35)]'}`}
      >
        Your business, unified.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className={`${t.textSecondary} text-[15px] mt-3 max-w-xl leading-relaxed`}
      >
        Personnel, operations, safety, inventory and analytics — one modern ERP, built to run your entire organisation from a single, elegant workspace.
      </motion.p>

      <IntroSlides />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        transition={{ delayChildren: 0.9 }}
        className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-7"
      >
        {[
          { label: 'Modules', value: TOTAL_MODULES, suffix: '' },
          { label: 'Departments', value: TOTAL_CATEGORIES, suffix: '' },
          { label: 'Team members', value: 48, suffix: '' },
          { label: 'Uptime', value: 99.98, suffix: '%' },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} className="flex items-baseline gap-2 relative">
            {i > 0 && (
              <motion.span
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
                className="absolute -left-4 top-0.5 bottom-0.5 w-px origin-top"
                style={{ background: t.light ? '#e5e7eb' : 'rgba(255,255,255,0.1)' }}
              />
            )}
            <span className={`text-[20px] font-semibold ${t.textPrimary} tracking-tight tabular-nums`}>
              <CountUp value={stat.value} suffix={stat.suffix} delay={0.9 + i * 0.1} />
            </span>
            <span className={`text-[12px] ${t.textFaint}`}>{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const t = useTheme();
  const light = t.light;

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
  // These three are localStorage-backed. They start empty (matching what the server
  // renders, since localStorage doesn't exist during SSR) and are populated in an
  // effect right after mount — reading them synchronously in useState would make the
  // client's first render disagree with the server's and trigger a hydration error.
  const [quickActionHrefs, setQuickActionHrefs] = useState<Set<string>>(new Set());
  const [dismissedAutoHrefs, setDismissedAutoHrefs] = useState<Set<string>>(new Set());
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setQuickActionHrefs(new Set(readJSON<string[]>(MANUAL_QA_KEY, [])));
    setDismissedAutoHrefs(new Set(readJSON<string[]>(AUTO_QA_DISMISSED_KEY, [])));
    setUsageCounts(readJSON<Record<string, number>>(USAGE_KEY, {}));
  }, []);
  // Re-read usage counts whenever the tab regains focus — covers the common case of
  // clicking into a module (which records a visit) then navigating back.
  useEffect(() => {
    const refresh = () => setUsageCounts(readJSON<Record<string, number>>(USAGE_KEY, {}));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

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
  // Persist directly inside the action (rather than via a useEffect keyed on the state)
  // so the write always uses the just-computed value — a mount-time effect reacting to
  // this state would fire alongside the localStorage *load* effect using a stale closure
  // and clobber whatever was just restored.
  const toggleQuickAction = (href: string) => setQuickActionHrefs(prev => {
    const next = new Set(prev);
    next.has(href) ? next.delete(href) : next.add(href);
    writeJSON(MANUAL_QA_KEY, Array.from(next));
    return next;
  });
  // Dismissing an auto-suggested (frequently-used) quick action opts it out permanently —
  // unlike a manual pin, there's nothing in quickActionHrefs to just un-toggle.
  const dismissAutoAction = (href: string) => setDismissedAutoHrefs(prev => {
    const next = new Set(prev).add(href);
    writeJSON(AUTO_QA_DISMISSED_KEY, Array.from(next));
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

  const customQuickActions = useMemo(() => {
    const result: QuickAction[] = [];
    for (const cat of CATEGORIES) {
      for (const module of cat.modules) {
        if (quickActionHrefs.has(module.href)) {
          result.push({ id: module.href, icon: module.icon, label: module.title, href: module.href, accent: cat.accent, removable: true });
        }
      }
    }
    return result;
  }, [quickActionHrefs]);

  // Modules visited often enough get auto-suggested as quick actions, unless already
  // pinned/built-in or previously dismissed.
  const frequentQuickActions = useMemo(() => {
    const builtinHrefs = new Set(QUICK_ACTIONS.map(a => a.href));
    return Object.entries(usageCounts)
      .filter(([href, count]) =>
        count >= FREQUENT_THRESHOLD &&
        !builtinHrefs.has(href) &&
        !quickActionHrefs.has(href) &&
        !dismissedAutoHrefs.has(href) &&
        ALL_MODULES_BY_HREF.has(href)
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, FREQUENT_LIMIT)
      .map(([href]): QuickAction => {
        const entry = ALL_MODULES_BY_HREF.get(href)!;
        return { id: href, icon: entry.module.icon, label: entry.module.title, href, accent: entry.accent, removable: true, auto: true };
      });
  }, [usageCounts, quickActionHrefs, dismissedAutoHrefs]);

  const visibleActions: QuickAction[] = [
    ...QUICK_ACTIONS.filter(a => !hiddenActions.has(a.id)),
    ...customQuickActions,
    ...frequentQuickActions,
  ];

  return (
    <div
      className="relative flex h-screen flex-col"
      style={t.light ? { background: 'linear-gradient(160deg, #f8fafc 0%, #eef2f7 45%, #eef0f8 100%)' } : undefined}
    >
      {/* Rotating photo background — dark mode only; light mode uses a soft tinted gradient */}
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
              {visibleKpis.map((kpi, i) => <KPICard key={kpi.id} data={kpi} index={i} />)}
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
                  {visibleActions.map(action => (
                    <QuickActionCard
                      key={action.id}
                      action={action}
                      onRemove={action.removable ? () => toggleQuickAction(action.href) : undefined}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Modules — now full-width; System Status & Tips live in the left sidebar */}
            <div className="space-y-3" id="modules">
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
                      quickActions={quickActionHrefs}
                      onToggleQuickAction={toggleQuickAction}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Module quick-view overlay */}
      <CenterModal
        open={!!quickView}
        onClose={() => setQuickView(null)}
        title={quickView?.module.title ?? ''}
        subtitle="Module quick view"
        accent={quickView?.accent ?? 'blue'}
      >
        {quickView && <ModuleQuickView module={quickView.module} accent={quickView.accent} />}
      </CenterModal>

      {/* Customize dashboard overlay */}
      <CenterModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize your dashboard"
        subtitle="Add or remove cards from your home page"
        accent="violet"
        width="max-w-lg"
      >
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-5">
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
      </CenterModal>

      <style>{`
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
