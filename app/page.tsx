// app/page.tsx — Ozech MyOffice Homepage
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users, ToolCase, Shield, Clock, Calculator, Package, ClipboardCheck,
  CalendarDays, AlertTriangle, Fan, Eye, ChevronDown, BarChart3,
  FileText, Folder, HardHat, Wrench, LineChart, Clock4, Megaphone,
  Building, Utensils, Church, Database,
  AlertOctagon, ShieldAlert, ClipboardList, FileWarning, PackageOpen,
  ClipboardPlus, Target, Activity, ArrowRight, Search, Sparkles, MessageSquareWarning,
  ChevronsUp, ChevronsDown, Minimize2, Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// ─── Nature wallpapers — same 5 as PageShell ─────────────────────────────────

// 5K resolution, WebP, maximum quality — crisp at any screen size
const WALLPAPERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=5120&q=100&fm=webp&fit=crop', // Swiss Alps panorama
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=5120&q=100&fm=webp&fit=crop', // Ancient forest mist
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=5120&q=100&fm=webp&fit=crop', // Northern lights
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=5120&q=100&fm=webp&fit=crop', // Patagonia peaks
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=5120&q=100&fm=webp&fit=crop', // Misty meadow
];

// ─── Delay classes for stagger animation (no inline styles) ───────────────────

const DELAY_CLASSES = ['', 'oz-d1', 'oz-d2', 'oz-d3', 'oz-d4', 'oz-d5', 'oz-d6', 'oz-d7', 'oz-d8'] as const;

// ─── Module data ──────────────────────────────────────────────────────────────

// 5 harmonious tones: 3 blue-family + 1 warm accent + 1 alert-only
type ModuleColor = 'navy' | 'sky' | 'indigo' | 'amber' | 'rose';

interface Module {
  icon: React.ElementType;
  title: string;
  description: string;
  color: ModuleColor;
  href: string;
  tags?: string[];
}

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  modules: Module[];
}

const CATEGORIES: Category[] = [
  {
    id: 'core',
    title: 'Core Management',
    description: 'The foundation of your business — people, assets, stock, and documents.',
    icon: Building,
    iconBg: 'bg-[#EAF1F8]',
    iconColor: 'text-[#2A4D69]',
    modules: [
      { icon: Users,    title: 'Personnel',  description: 'Employee profiles, history, and team structure', color: 'sky',   href: '/employees',  tags: ['HR', 'People'] },
      { icon: ToolCase, title: 'Assets',     description: 'Track equipment and machinery across your site',  color: 'navy',  href: '/equipment',  tags: ['Equipment'] },
      { icon: Package,  title: 'Inventory',  description: 'Manage stock levels and reorder points',          color: 'sky',   href: '/inventory',  tags: ['Stock'] },
      { icon: Folder,   title: 'Documents',  description: 'Centralised, searchable document repository',     color: 'navy',  href: '/documents',  tags: ['Files'] },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & Maintenance',
    description: 'Keep your operations running smoothly with proactive maintenance tools.',
    icon: Wrench,
    iconBg: 'bg-[#FEF5E4]',
    iconColor: 'text-[#916310]',
    modules: [
      { icon: ClipboardCheck, title: 'Maintenance',  description: 'Work orders, PM schedules, and job cards',  color: 'amber', href: '/maintenance',  tags: ['Work Orders'] },
      { icon: AlertTriangle,  title: 'Breakdowns',   description: 'Log and track equipment breakdowns',         color: 'rose',  href: '/breakdowns',   tags: ['Failures'] },
      { icon: PackageOpen,    title: 'Spares',       description: 'Spare parts inventory and allocation',       color: 'navy',  href: '/spares',       tags: ['Parts'] },
      { icon: Fan,            title: 'Compressors',  description: 'Monitor compressor performance and health',  color: 'sky',   href: '/compressors',  tags: ['Equipment'] },
      { icon: Clock,          title: 'Standby',      description: 'On-call schedules and coverage tracking',    color: 'indigo', href: '/standby',     tags: ['Scheduling'] },
      { icon: CalendarDays,   title: 'Schedules',    description: 'Maintenance tasks and recurring schedules',  color: 'amber', href: '/schedules',    tags: ['Planning'] },
      { icon: ClipboardPlus,  title: 'Requisitions', description: 'Purchase and supply request management',     color: 'navy',  href: '/requisitions', tags: ['Procurement'] },
    ],
  },
  {
    id: 'time',
    title: 'Time & Attendance',
    description: 'Accurate time tracking and leave management for your whole team.',
    icon: Clock4,
    iconBg: 'bg-[#ECEDFD]',
    iconColor: 'text-[#3648AA]',
    modules: [
      { icon: Clock4,       title: 'Timesheets', description: 'Daily attendance records and time tracking',  color: 'indigo', href: '/timesheets', tags: ['Attendance'] },
      { icon: Calculator,   title: 'Overtime',   description: 'Overtime requests, approvals, and reporting',  color: 'amber',  href: '/overtime',   tags: ['Payroll'] },
      { icon: CalendarDays, title: 'Leaves',     description: 'Leave applications, balances, and approvals',  color: 'sky',    href: '/leaves',     tags: ['HR'] },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Compliance',
    description: 'Maintain the highest safety standards and regulatory compliance.',
    icon: Shield,
    iconBg: 'bg-[#E2EEF8]',
    iconColor: 'text-[#1576A0]',
    modules: [
      { icon: HardHat,       title: 'PPE',              description: 'Protective equipment issue and tracking',       color: 'navy',   href: '/ppe',             tags: ['Safety'] },
      { icon: ClipboardList, title: 'SHEQ Inspections', description: 'Structured safety and quality inspections',     color: 'sky',    href: '/sheq_inspection', tags: ['Compliance'] },
      { icon: FileWarning,   title: 'Near Miss',         description: 'Near miss reporting and corrective actions',    color: 'amber',  href: '/near_miss',       tags: ['Incidents'] },
      { icon: AlertOctagon,  title: 'Work Stoppage',    description: 'SHEQ hold points and work stoppage tracking',   color: 'rose',   href: '/work_stoppage',   tags: ['Safety'] },
      { icon: ShieldAlert,   title: 'SHEQ',             description: 'Safety, health, environment and quality hub',   color: 'indigo', href: '/sheq',            tags: ['Compliance'] },
      { icon: Eye,           title: 'VFL',              description: 'Visible Felt Leadership safety observations',    color: 'sky',    href: '/vfl',             tags: ['Leadership'] },
      { icon: Target,        title: 'PTO',              description: 'Planned Task Observation for safe execution',    color: 'navy',   href: '/pto',             tags: ['Observation'] },
      { icon: MessageSquareWarning, title: 'Complaints',  description: 'Safety complaints register with accountability',  color: 'rose',   href: '/safety_complaints', tags: ['Complaints', 'Safety'] },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    description: 'Turn your operational data into clear, actionable intelligence.',
    icon: LineChart,
    iconBg: 'bg-[#E2EEF8]',
    iconColor: 'text-[#1576A0]',
    modules: [
      { icon: Eye,       title: 'Visualization', description: 'Interactive dashboards and data visualizations', color: 'sky',   href: '/visualization', tags: ['Charts'] },
      { icon: BarChart3, title: 'Reports',       description: 'Generate and export operational reports',         color: 'navy',  href: '/reports',       tags: ['Export'] },
      { icon: Megaphone, title: 'Notice Board',  description: 'Company announcements and communications',        color: 'amber', href: '/noticeboard',   tags: ['Comms'] },
    ],
  },
  {
    id: 'products',
    title: 'Other Products',
    description: 'Specialised platforms for different industries and business types.',
    icon: Sparkles,
    iconBg: 'bg-[#EAF1F8]',
    iconColor: 'text-[#2A4D69]',
    modules: [
      { icon: Building,  title: 'Room Rental', description: 'Property and rental management platform', color: 'navy',   href: '/roomRental', tags: ['Property'] },
      { icon: Utensils,  title: 'Restaurant',  description: 'Menu, orders, and table management',      color: 'amber',  href: '/restaurant', tags: ['F&B'] },
      { icon: Church,    title: 'Church',      description: 'Church management and community tools',   color: 'indigo', href: '/church',     tags: ['Community'] },
      { icon: Database,  title: 'Stores',      description: 'Store inventory and management system',   color: 'navy',   href: '/stores',     tags: ['Retail'] },
    ],
  },
];

// ─── Colour map — botanical green palette (steel anchor + 4 greens) ──────────

const COLOR_MAP: Record<ModuleColor, { bg: string; icon: string; border: string }> = {
  navy:   { bg: 'bg-[#86BBD8]/[0.16]',    icon: 'text-[#86BBD8]',    border: 'border-[#86BBD8]/[0.26]'    },
  sky:    { bg: 'bg-teal-400/[0.14]',      icon: 'text-teal-300',     border: 'border-teal-400/[0.22]'     },
  indigo: { bg: 'bg-emerald-500/[0.15]',   icon: 'text-emerald-400',  border: 'border-emerald-500/[0.24]'  },
  amber:  { bg: 'bg-green-400/[0.14]',     icon: 'text-green-300',    border: 'border-green-400/[0.22]'    },
  rose:   { bg: 'bg-emerald-300/[0.14]',   icon: 'text-emerald-300',  border: 'border-emerald-300/[0.22]'  },
};

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ module, index = 0 }: { module: Module; index?: number }) {
  const c = COLOR_MAP[module.color];
  const Icon = module.icon;
  const delayClass = DELAY_CLASSES[Math.min(index, 8)];
  return (
    <Link
      href={module.href}
      className={`group block oz-card-fly-in${delayClass ? ` ${delayClass}` : ''}`}
    >
      <div className="h-full bg-white/[0.07] rounded-xl border border-white/[0.10] p-4 group-hover:bg-white/[0.13] group-hover:border-white/[0.20] group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border} shrink-0`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-white/90 text-sm leading-tight group-hover:text-white transition-colors">
              {module.title}
            </h4>
            <p className="text-xs text-white/45 mt-0.5 leading-relaxed line-clamp-2">
              {module.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, expanded, onToggle }: {
  category: Category;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = category.icon;

  return (
    <div className="oz-glass-dark rounded-2xl overflow-hidden mb-3">
      {/* Dark glass header — white text */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.07] transition-colors duration-150 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.14]">
            <Icon className="h-5 w-5 text-white/90" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-heading tracking-tight">{category.title}</h3>
            <p className="text-xs text-white/50 mt-0.5 hidden sm:block">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Badge variant="outline" className="text-xs border-white/20 text-white/45 bg-white/[0.07] hidden sm:flex">
            {category.modules.length}
          </Badge>
          <ChevronDown
            className={`h-4 w-4 text-white/45 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-1 bg-white/[0.03]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 mt-3">
              {category.modules.map((module, idx) => (
                <ModuleCard key={module.href} module={module} index={idx} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Search Results ───────────────────────────────────────────────────────────

function SearchResults({ query }: { query: string }) {
  const allModules = CATEGORIES.flatMap(cat =>
    cat.modules.map(m => ({ ...m, category: cat.title }))
  );
  const q = query.toLowerCase();
  const results = allModules.filter(
    m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q))
  );

  if (results.length === 0) {
    return (
      <div className="text-center py-10">
        <Search className="h-9 w-9 text-white/25 mx-auto mb-3" />
        <p className="text-white font-semibold drop-shadow">No modules match &ldquo;{query}&rdquo;</p>
        <p className="text-sm text-white/55 mt-1">Try a different keyword or browse below.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-white/65 mb-4">
        <span className="font-semibold text-white">{results.length}</span> module{results.length !== 1 ? 's' : ''} match &ldquo;{query}&rdquo;
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {results.map((module, idx) => (
          <div key={module.href}>
            <p className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1.5">{module.category}</p>
            <ModuleCard module={module} index={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'modules', value: '28', icon: Activity },
  { label: 'categories', value: '6', icon: Building },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );
  const toggleCategory = (id: string) =>
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () =>
    setExpandedMap(Object.fromEntries(CATEGORIES.map(c => [c.id, true])));
  const collapseAll = () =>
    setExpandedMap(Object.fromEntries(CATEGORIES.map(c => [c.id, false])));
  const anyExpanded = Object.values(expandedMap).some(Boolean);

  useEffect(() => {
    const t = setInterval(() => {
      const next = (current + 1) % WALLPAPERS.length;
      setIncoming(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });
      const swap = setTimeout(() => {
        setCurrent(next);
        setIncoming(null);
        setFadeIn(false);
      }, 3200);
      return () => clearTimeout(swap);
    }, 90000);
    return () => clearInterval(t);
  }, [current]);

  const totalModules = CATEGORIES.reduce((s, c) => s + c.modules.length, 0);

  return (
    <div className="relative min-h-screen">
      {/* Base wallpaper */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <Image src={WALLPAPERS[current]} alt="" fill className="object-cover object-center" />
      </div>
      {/* Incoming wallpaper — crossfade */}
      {incoming !== null && (
        <div className={`fixed inset-0 -z-20 overflow-hidden oz-bg-entering${fadeIn ? ' oz-bg-visible' : ''}`}>
          <Image src={WALLPAPERS[incoming]} alt="" fill className="object-cover object-center" />
        </div>
      )}
      {/* Cinematic vignette — darker at edges, luminous centre */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/52 via-black/20 to-black/55" />

      <Header />

      {/* ── Compact Hero ── */}
      <section className="oz-hero text-white">
        <div className="oz-hero-glow" aria-hidden="true" />

        <div className="container mx-auto px-4 py-5 md:py-7 relative z-10">
          <div className="max-w-xl mx-auto text-center">

            {/* Logo + headline on one row */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#86BBD8]/90 flex items-center justify-center text-[#1e3a52] font-bold text-sm font-heading shadow oz-float shrink-0">
                O
              </div>
              <h1 className="text-lg md:text-2xl font-extrabold leading-snug font-heading text-left">
                Organise Your Business.{' '}
                <span className="text-[#86BBD8]">Intelligently.</span>
              </h1>
            </div>

            {/* Search — accessible label hidden off-screen */}
            <div className="relative mb-2.5">
              <label htmlFor="hero-search" className="sr-only">Search all modules</label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7B8E] pointer-events-none" />
              <input
                id="hero-search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${totalModules} modules…`}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-xl text-sm text-[#2A4D69] placeholder-[#9AABB8] bg-white shadow-md border-0 outline-none focus:ring-2 focus:ring-[#86BBD8]/60"
              />
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-1.5">
              {[
                { label: 'Personnel', href: '/employees' },
                { label: 'Maintenance', href: '/maintenance' },
                { label: 'Leaves', href: '/leaves' },
                { label: 'Safety', href: '/sheq' },
                { label: 'Reports', href: '/reports' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs px-3 py-2 sm:px-2.5 sm:py-1 rounded-full bg-white/10 hover:bg-white/22 text-white/75 hover:text-white transition-all duration-200 border border-white/15"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar — compact single row */}
        <div className="bg-black/18 border-t border-white/10 relative z-10">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {STATS.map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-[#86BBD8]" />
                    <span className="text-sm font-bold text-white font-heading">{stat.value}</span>
                    <span className="text-xs text-white/45">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="container mx-auto px-4 py-6">

        {/* Top bar */}
        {!searchQuery && (
          <div className="oz-glass-dark flex items-center justify-between mb-3 rounded-2xl px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-white font-heading tracking-tight">All Modules</h2>
              <p className="text-xs text-white/50 mt-0.5">Click any module to open it.</p>
            </div>
            <div className="flex items-center gap-1.5">
              {showCategories ? (
                <>
                  <button
                    type="button"
                    onClick={anyExpanded ? collapseAll : expandAll}
                    title={anyExpanded ? 'Collapse all categories' : 'Expand all categories'}
                    className="flex items-center gap-1 text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/[0.10] hover:bg-white/[0.18] text-white border border-white/15 transition-all duration-150 backdrop-blur-sm"
                  >
                    {anyExpanded
                      ? <><ChevronsUp className="h-3 w-3" /> Collapse</>
                      : <><ChevronsDown className="h-3 w-3" /> Expand</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategories(false)}
                    title="Hide all categories"
                    className="flex items-center gap-1 text-xs px-2.5 py-2 sm:px-2 sm:py-1.5 rounded-lg bg-white/[0.10] hover:bg-white/[0.18] text-white/65 border border-white/15 transition-all duration-150 backdrop-blur-sm"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowCategories(true); expandAll(); }}
                  title="Show all categories"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#86BBD8]/20 hover:bg-[#86BBD8]/35 text-white border border-[#86BBD8]/25 transition-all duration-150"
                >
                  <Maximize2 className="h-3 w-3" /> Show Modules
                </button>
              )}
              <Link href="/reports">
                <Button size="sm" className="text-xs bg-[#86BBD8]/80 hover:bg-[#86BBD8] text-[#071420] font-semibold gap-1.5">
                  Reports <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Collapsed summary pill — shown when categories are hidden */}
        {!searchQuery && !showCategories && (
          <div className="oz-glass-dark rounded-2xl p-4 mb-3 flex items-center justify-between">
            <p className="text-sm text-white font-medium">
              {CATEGORIES.reduce((s, c) => s + c.modules.length, 0)} modules across {CATEGORIES.length} categories
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/18 transition-all backdrop-blur-sm"
              >
                Browse
              </button>
            </div>
          </div>
        )}

        {/* Search results or category list */}
        {searchQuery ? (
          <div className="oz-glass-dark rounded-2xl p-5">
            <SearchResults query={searchQuery} />
            <div className="mt-6 pt-5 border-t border-white/[0.09]">
              <p className="text-xs text-white/45 mb-3 font-medium">Or browse by category:</p>
              {CATEGORIES.map(cat => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  expanded={expandedMap[cat.id] ?? true}
                  onToggle={() => toggleCategory(cat.id)}
                />
              ))}
            </div>
          </div>
        ) : showCategories ? (
          CATEGORIES.map(cat => (
            <CategorySection
              key={cat.id}
              category={cat}
              expanded={expandedMap[cat.id] ?? true}
              onToggle={() => toggleCategory(cat.id)}
            />
          ))
        ) : null}

        {/* Info callout */}
        <div className="mt-5 oz-glass-dark rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#86BBD8]/20 shrink-0">
              <FileText className="h-5 w-5 text-[#86BBD8]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm font-heading tracking-tight">Everything in one place</h3>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                MyOffice connects your people, equipment, safety records, and operational data into a single source of truth.
              </p>
            </div>
            <Link href="/employees" className="shrink-0">
              <Button className="bg-[#86BBD8]/80 hover:bg-[#86BBD8] text-[#071420] font-semibold gap-1.5 text-xs whitespace-nowrap">
                Get Started <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
