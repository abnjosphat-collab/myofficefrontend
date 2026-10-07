// components/app-shell/modules.ts — shared module/category data + usage tracking,
// extracted from app/page.tsx so any page's shell (sidebar, search, footer) can use it.
// Icons come from the UI system's glyph layer (components/ui-system/foundations/glyphs.ts); categories are told apart by name and
// glyph, not by colour.
import {
  Users, ToolCase, Package, CalendarDays, Fan,
  HardHat, Wrench, LineChart, Clock4, Megaphone,
  Building, ShieldAlert, FileWarning, PackageOpen,
  Target, MessageSquareWarning, Upload, PackageMinus,
  Activity, FileCheck2, TrendingUp,
  CalendarClock, HeartHandshake, GraduationCap, FileBarChart,
  Shield, Clock, Calculator, ClipboardCheck, AlertTriangle,
  Eye, Folder, AlertOctagon,
  ClipboardList, ClipboardPlus, Plus, User, Gauge,
  Sun, Receipt, Settings, Award, Truck, Radar,
  FileCheck, LayoutDashboard,
  ListTodo, BookOpen,
} from '@/components/ui-system';
import type { UserRole } from '@/lib/supabase';
import { trackModuleOpen } from '@/lib/usage';

export interface Module {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  tags?: string[];
  badge?: string;
  featured?: boolean;
  /** Active only on this exact address (a landing page whose address is also the prefix of its sibling pages). */
  exact?: boolean;
  metrics?: { label: string; value: string }[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  modules: Module[];
  /** Minimum role required to see this category at all (grid + sidebar + search).
   * Omitted = visible to everyone signed in, same as every existing category. */
  minRole?: UserRole;
}

export interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  removable?: boolean;
  auto?: boolean;
  /** Static shortcuts from QUICK_ACTIONS — dismissed by id, not href. */
  builtin?: boolean;
}

export const CATEGORIES: Category[] = [
  {
    id: 'core', title: 'Core Management', description: 'Foundational business operations',
    icon: Building,
    modules: [
      { icon: Users,    title: 'Personnel',  description: 'Employee profiles & team structure', href: '/employees',  tags: ['HR', 'People'], badge: '12', featured: true, metrics: [{ label: 'Active', value: '48' }, { label: 'Departments', value: '6' }] },
      { icon: ToolCase, title: 'Equipment', description: 'Track equipment across your site',  href: '/equipment',  tags: ['Equipment'], badge: '48', metrics: [{ label: 'Total', value: '234' }, { label: 'In Use', value: '189' }] },
      { icon: ToolCase, title: 'Tools & Equipment', description: 'Standalone tool register, custody, history and insights', href: '/tools', tags: ['Tools', 'Engineering', 'Register'], featured: true },
      { icon: Package,  title: 'Inventory',  description: 'Manage stock levels & reorder points', href: '/inventory',  tags: ['Stock'], badge: '156', metrics: [{ label: 'Items', value: '1.2k' }, { label: 'Low Stock', value: '8' }] },
      { icon: Folder,   title: 'Documents',  description: 'Centralised document repository', href: '/documents',  tags: ['Files'], badge: '234', metrics: [{ label: 'Total', value: '2.4k' }, { label: 'Recent', value: '34' }] },
      { icon: BookOpen, title: 'SOP Library', description: 'Living, versioned standard operating procedures', href: '/sop-library', tags: ['SOPs', 'Governance'] },
      { icon: PackageMinus, title: 'Stock Issues', description: 'Items issued to personnel', href: '/issues', tags: ['Inventory'], badge: '19' },
      { icon: Receipt,      title: 'Quotations',   description: 'Generate customer quotations', href: '/quotations', tags: ['Finance'] },
      { icon: Truck,        title: 'Drivers',      description: 'Authorised driver register', href: '/drivers', tags: ['Fleet'] },
      { icon: HardHat,      title: 'Contractors',  description: 'Contractor & vendor management', href: '/contractors', tags: ['Vendors'] },
      { icon: Award,        title: 'Competency',   description: 'Employee competency matrix', href: '/competency', tags: ['HR', 'Skills'] },
      { icon: Settings,     title: 'Admin Panel',  description: 'System administration', href: '/admin', tags: ['System'] },
    ],
  },
  {
    id: 'manager-tools', title: 'Manager Tools', description: 'Planning and progress tracking for managers',
    icon: ListTodo, minRole: 'manager',
    modules: [
      { icon: ListTodo, title: 'Events & Tasks', description: 'Post events and to-dos, track completion by type', href: '/tasks-events', tags: ['Planning'], featured: true },
    ],
  },
  {
    id: 'maintenance', title: 'Maintenance', description: 'Work orders, requests, schedules and the planner',
    icon: Wrench,
    modules: [
      { icon: LayoutDashboard, title: 'Overview',     description: 'What needs attention today', href: '/maintenance-preview', exact: true, tags: ['Maintenance'], featured: true },
      { icon: ClipboardCheck,  title: 'Work orders',  description: 'Raise, assign, do and sign off jobs', href: '/maintenance-preview/work-orders', tags: ['Work Orders'] },
      { icon: ClipboardPlus,   title: 'Requests',     description: 'Ask for work; approve with a signature', href: '/maintenance-preview/requests', tags: ['Requests'] },
      { icon: CalendarClock,   title: 'Schedules',    description: 'Recurring work that raises work orders', href: '/maintenance-preview/schedules', tags: ['Planned'] },
      { icon: CalendarDays,    title: 'Planner',      description: 'People against days, leave visible', href: '/maintenance-preview/planner', tags: ['Planning'] },
      { icon: AlertTriangle,   title: 'Breakdowns',   description: 'Log equipment breakdowns',    href: '/breakdowns',   tags: ['Failures'] },
      { icon: Radar,           title: 'Condition Monitoring', description: 'Oil, vibration & thermography', href: '/condition-monitoring', tags: ['Predictive'] },
      { icon: TrendingUp,      title: 'Reliability',  description: 'MTBF / MTTR metrics', href: '/reliability', tags: ['Metrics'] },
    ],
  },
  {
    id: 'operations', title: 'Operations & Maintenance', description: 'Keep operations running smoothly',
    icon: Wrench,
    modules: [
      { icon: PackageOpen,    title: 'Spares',       description: 'Spare parts inventory',       href: '/spares',       tags: ['Parts'], badge: '89', metrics: [{ label: 'Available', value: '342' }, { label: 'On Order', value: '56' }] },
      { icon: Fan,            title: 'Compressors',  description: 'Monitor compressor health',  href: '/compressors',  tags: ['Equipment'], badge: '6', metrics: [{ label: 'Running', value: '4' }, { label: 'Efficiency', value: '87%' }] },
      { icon: Clock,          title: 'Standby',      description: 'On-call schedules',          href: '/standby',     tags: ['Scheduling'], badge: '8', metrics: [{ label: 'On Call', value: '6' }, { label: 'Coverage', value: '92%' }] },
      { icon: ClipboardPlus,  title: 'Requisitions', description: 'Purchase & supply requests', href: '/requisitions', tags: ['Procurement'], badge: '7' },
      { icon: Wrench,         title: 'Third Party Services', description: 'Contractor jobs through the PR/PO/GRV approval circuit', href: '/services', tags: ['Services', 'Invoices', 'Contractors'], badge: '34' },
      { icon: FileCheck2,     title: 'Job Cards',        description: 'Work order job cards', href: '/job-cards', tags: ['Work Orders'] },
    ],
  },
  {
    id: 'time', title: 'Time & Attendance', description: 'Time tracking and leave management',
    icon: Clock4,
    modules: [
      { icon: Clock4,       title: 'Timesheets', description: 'Daily attendance records',  href: '/timesheets', tags: ['Attendance'], badge: '42', metrics: [{ label: 'Today', value: '38' }, { label: 'On Leave', value: '4' }] },
      { icon: HardHat,      title: 'Artisan Timesheets', description: 'Formal monthly daily timesheets for artisans', href: '/artisan-timesheets', tags: ['Attendance', 'Artisans', 'HR'] },
      { icon: Calculator,   title: 'Overtime',   description: 'Overtime requests & approvals', href: '/overtime',   tags: ['Payroll'], badge: '6', metrics: [{ label: 'Pending', value: '3' }, { label: 'Approved', value: '12' }] },
      { icon: CalendarDays, title: 'Leaves',     description: 'Leave applications & balances', href: '/leaves',     tags: ['HR'], badge: '18', metrics: [{ label: 'Pending', value: '5' }, { label: 'Available', value: '87' }] },
      { icon: Sun,          title: 'Shifts',     description: 'Shift cycles & standby rosters', href: '/shifts',     tags: ['Scheduling'], badge: '9' },
      { icon: Gauge,        title: 'Availabilities', description: 'Equipment availability records', href: '/availabilities', tags: ['Uptime'], badge: '11' },
      { icon: Gauge,        title: 'Availability Overview', description: 'Equipment availability dashboard', href: '/availability', tags: ['Uptime'] },
    ],
  },
  {
    id: 'safety', title: 'Safety & Compliance', description: 'Highest safety standards',
    icon: Shield,
    modules: [
      { icon: HardHat,       title: 'PPE',              description: 'Protective equipment tracking',  href: '/ppe',             tags: ['Safety'], badge: '56', metrics: [{ label: 'Issued', value: '234' }, { label: 'Due', value: '18' }] },
      { icon: ClipboardList, title: 'SHEQ Inspections', description: 'Structured safety inspections', href: '/sheq_inspection', tags: ['Compliance'], badge: '12', metrics: [{ label: 'Due', value: '4' }, { label: 'Completed', value: '89' }] },
      { icon: FileWarning,   title: 'Near Miss',        description: 'Near miss reporting',            href: '/near_miss',       tags: ['Incidents'], badge: '3', metrics: [{ label: 'Open', value: '2' }, { label: 'Resolved', value: '47' }] },
      { icon: AlertOctagon,  title: 'Work Stoppage',    description: 'SHEQ hold points tracking',     href: '/work_stoppage',   tags: ['Safety'], badge: '1' },
      { icon: ShieldAlert,   title: 'SHEQ',             description: 'Safety & quality hub',          href: '/sheq',            tags: ['Compliance'], badge: '28', featured: true },
      { icon: Eye,           title: 'VFL',              description: 'Visible Felt Leadership',       href: '/vfl',             tags: ['Leadership'], badge: '9' },
      { icon: Target,        title: 'PTO',              description: 'Planned Task Observation',      href: '/pto',             tags: ['Observation'], badge: '5' },
      { icon: MessageSquareWarning, title: 'Complaints', description: 'Safety complaints register',   href: '/safety_complaints', tags: ['Complaints', 'Safety'], badge: '2' },
      { icon: FileCheck,     title: 'Compliance Register', description: 'Statutory compliance tracking', href: '/compliance-register', tags: ['Compliance'] },
      { icon: HeartHandshake, title: 'Pachedu',     description: 'Behavioural safety observations', href: '/pachedu', tags: ['Observation'] },
      { icon: GraduationCap, title: 'Training',      description: 'Training & certification tracking', href: '/training', tags: ['Certifications'] },
    ],
  },
  {
    id: 'analytics', title: 'Analytics & Insights', description: 'Turn data into intelligence',
    icon: LineChart,
    modules: [
      { icon: Megaphone, title: 'Notice Board',  description: 'Company announcements', href: '/noticeboard',   tags: ['Comms'], badge: '3' },
      { icon: LayoutDashboard, title: 'Engineering Dashboard', description: 'Live engineering KPIs', href: '/engineering-dashboard', tags: ['Dashboard'] },
      { icon: FileBarChart,    title: 'Engineering Report',    description: 'Monthly engineering report', href: '/engineering_report', tags: ['Reports'] },
      { icon: Activity,        title: 'Usage Analyzer',        description: 'How the app is used — clicks, dwell, feedback', href: '/usage-analyzer', tags: ['Analytics'] },
    ],
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-wo',  icon: Plus,     label: 'New Work Order',   href: '/maintenance', builtin: true, removable: true },
  { id: 'upload',  icon: Upload,   label: 'Upload Document',  href: '/documents', builtin: true, removable: true },
  { id: 'add-emp', icon: User,     label: 'Add Employee',     href: '/employees', builtin: true, removable: true },
];

export const TOTAL_MODULES = CATEGORIES.reduce((sum, c) => sum + c.modules.length, 0);
export const TOTAL_CATEGORIES = CATEGORIES.length;

export const ALL_MODULES_BY_HREF = new Map<string, { module: Module }>(
  CATEGORIES.flatMap(c => c.modules.map(m => [m.href, { module: m }] as const))
);

// ─── Usage tracking (localStorage) — powers "frequently used" auto quick actions ──

export const USAGE_KEY = 'oz_moduleUsage';
export const AUTO_QA_DISMISSED_KEY = 'oz_qaDismissed';
export const BUILTIN_QA_DISMISSED_KEY = 'oz_qaBuiltinDismissed';
export const MANUAL_QA_KEY = 'oz_qaManual';
export const INTRO_SLIDES_HIDDEN_KEY = 'oz_introSlidesHidden';
export const FAVORITES_KEY = 'oz_favorites';
export const SIDEBAR_COLLAPSED_KEY = 'oz_sidebarCollapsed';
export const FREQUENT_THRESHOLD = 3;
export const FREQUENT_LIMIT = 3;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function writeJSON(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable — non-fatal */ }
}

export function trackModuleUsage(href: string) {
  const counts = readJSON<Record<string, number>>(USAGE_KEY, {});
  counts[href] = (counts[href] ?? 0) + 1;
  writeJSON(USAGE_KEY, counts);
  // Also record a rich timestamped event for the Usage Analyzer (single
  // instrumentation point — every module-open caller flows through here).
  trackModuleOpen(href, ALL_MODULES_BY_HREF.get(href)?.module.title);
}
