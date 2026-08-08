// components/app-shell/modules.ts — shared module/category data + usage tracking,
// extracted from app/page.tsx so any page's shell (sidebar, search, footer) can use it.
// All icons come from the shared design-system icon module (Phosphor-backed,
// solid/outline controlled globally by IconStyleProvider) — never import icons
// directly from lucide/tabler/phosphor on the design-system surface. See
// components/shared/design-system/icons.tsx.
import {
  Users, ToolCase, Package, CalendarDays, Fan,
  HardHat, Wrench, LineChart, Clock4, Megaphone,
  Building, Utensils, Church, ShieldAlert, FileWarning, PackageOpen,
  Target, MessageSquareWarning, Upload, Boxes, PackageMinus,
  Activity, RefreshCcw, FileCheck2, Factory, TrendingUp,
  CalendarClock, HeartHandshake, GraduationCap, FileBarChart,
  ShoppingBag, Wheat, Printer, Landmark, FileUser,
  Shield, Clock, Calculator, ClipboardCheck, AlertTriangle,
  Eye, Folder, Database, AlertOctagon,
  ClipboardList, ClipboardPlus, Plus, User, Gauge,
  Sun, Receipt, Settings, Award, Truck, Radar,
  Droplet, FileCheck, LayoutDashboard, ShoppingCart, Car,
  Wallet, DollarSign, ListTodo,
} from '@/components/shared/theme';
import type { Accent } from '@/components/shared/theme';
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
  metrics?: { label: string; value: string }[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: Accent;
  modules: Module[];
  growth?: string;
  /** Minimum role required to see this category at all (grid + sidebar + search).
   * Omitted = visible to everyone signed in, same as every existing category. */
  minRole?: UserRole;
}

export interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  accent: Accent;
  removable?: boolean;
  auto?: boolean;
}

export const CATEGORIES: Category[] = [
  {
    id: 'core', title: 'Core Management', description: 'Foundational business operations',
    icon: Building, accent: 'blue', growth: '+12%',
    modules: [
      { icon: Users,    title: 'Personnel',  description: 'Employee profiles & team structure', href: '/employees',  tags: ['HR', 'People'], badge: '12', featured: true, metrics: [{ label: 'Active', value: '48' }, { label: 'Departments', value: '6' }] },
      { icon: ToolCase, title: 'Equipment', description: 'Track equipment across your site',  href: '/equipment',  tags: ['Equipment'], badge: '48', metrics: [{ label: 'Total', value: '234' }, { label: 'In Use', value: '189' }] },
      { icon: Package,  title: 'Inventory',  description: 'Manage stock levels & reorder points', href: '/inventory',  tags: ['Stock'], badge: '156', metrics: [{ label: 'Items', value: '1.2k' }, { label: 'Low Stock', value: '8' }] },
      { icon: Folder,   title: 'Documents',  description: 'Centralised document repository', href: '/documents',  tags: ['Files'], badge: '234', metrics: [{ label: 'Total', value: '2.4k' }, { label: 'Recent', value: '34' }] },
      { icon: PackageMinus, title: 'Stock Issues', description: 'Items issued to personnel', href: '/issues', tags: ['Inventory'], badge: '19' },
      { icon: Receipt,      title: 'Quotations',   description: 'Generate customer quotations', href: '/quotations', tags: ['Finance'] },
      { icon: Truck,        title: 'Drivers',      description: 'Authorised driver register', href: '/drivers', tags: ['Fleet'] },
      { icon: HardHat,      title: 'Contractors',  description: 'Contractor & vendor management', href: '/contractors', tags: ['Vendors'] },
      { icon: Award,        title: 'Competency',   description: 'Employee competency matrix', href: '/competency', tags: ['HR', 'Skills'] },
      { icon: Settings,     title: 'Admin Panel',  description: 'System administration', href: '/admin', tags: ['System'] },
    ],
  },
  {
    id: 'finance', title: 'Finance & Accounting', description: 'Track revenue, expenses and profitability',
    icon: Wallet, accent: 'emerald', minRole: 'manager',
    modules: [
      { icon: DollarSign, title: 'Accounting', description: 'Transactions, expenses, receipts & profit/loss', href: '/accounting', tags: ['Finance', 'Accounting'], featured: true },
    ],
  },
  {
    id: 'manager-tools', title: 'Manager Tools', description: 'Planning and progress tracking for managers',
    icon: ListTodo, accent: 'violet', minRole: 'manager',
    modules: [
      { icon: ListTodo, title: 'Events & Tasks', description: 'Post events and to-dos, track completion by type', href: '/tasks-events', tags: ['Planning'], featured: true },
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
      { icon: Wrench,         title: 'Third Party Services', description: 'Contractor jobs through the PR/PO/GRV approval circuit', href: '/services', tags: ['Services', 'Invoices', 'Contractors'], badge: '34' },
      { icon: Activity,       title: 'Equipment Status',  description: 'Live equipment status board', href: '/equipment-status', tags: ['Status'] },
      { icon: Gauge,          title: 'Equipment Availability', description: 'Utilisation & downtime tracking', href: '/av', tags: ['Uptime'] },
      { icon: Radar,          title: 'Condition Monitoring', description: 'Oil, vibration & thermography', href: '/condition-monitoring', tags: ['Predictive'] },
      { icon: AlertOctagon,   title: 'Failure Modes',    description: 'FMEA register', href: '/failure-modes', tags: ['FMEA'] },
      { icon: TrendingUp,     title: 'Reliability',      description: 'MTBF / MTTR metrics', href: '/reliability', tags: ['Metrics'] },
      { icon: FileCheck2,     title: 'Job Cards',        description: 'Work order job cards', href: '/job-cards', tags: ['Work Orders'] },
      { icon: RefreshCcw,     title: 'Shift Handover',   description: 'Shift handover reports', href: '/handover', tags: ['Shifts'] },
      { icon: Droplet,        title: 'Lubrication',      description: 'Lubrication schedules', href: '/lubrication', tags: ['PM'] },
      { icon: Factory,        title: 'Production',       description: 'Production interface', href: '/production', tags: ['Output'] },
    ],
  },
  {
    id: 'time', title: 'Time & Attendance', description: 'Time tracking and leave management',
    icon: Clock4, accent: 'indigo', growth: '+5%',
    modules: [
      { icon: Clock4,       title: 'Timesheets', description: 'Daily attendance records',  href: '/timesheets', tags: ['Attendance'], badge: '42', metrics: [{ label: 'Today', value: '38' }, { label: 'On Leave', value: '4' }] },
      { icon: Calculator,   title: 'Overtime',   description: 'Overtime requests & approvals', href: '/overtime',   tags: ['Payroll'], badge: '6', metrics: [{ label: 'Pending', value: '3' }, { label: 'Approved', value: '12' }] },
      { icon: CalendarDays, title: 'Leaves',     description: 'Leave applications & balances', href: '/leaves',     tags: ['HR'], badge: '18', metrics: [{ label: 'Pending', value: '5' }, { label: 'Available', value: '87' }] },
      { icon: Sun,          title: 'Shifts',     description: 'Shift cycles & standby rosters', href: '/shifts',     tags: ['Scheduling'], badge: '9' },
      { icon: Gauge,        title: 'Availabilities', description: 'Equipment availability records', href: '/availabilities', tags: ['Uptime'], badge: '11' },
      { icon: CalendarClock, title: 'Leave Management', description: 'Leave requests admin view', href: '/leave-management', tags: ['HR'] },
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
      { icon: FileCheck,     title: 'Compliance Register', description: 'Statutory compliance tracking', href: '/compliance-register', tags: ['Compliance'] },
      { icon: HeartHandshake, title: 'Pachedu',     description: 'Behavioural safety observations', href: '/pachedu', tags: ['Observation'] },
      { icon: GraduationCap, title: 'Training',      description: 'Training & certification tracking', href: '/training', tags: ['Certifications'] },
    ],
  },
  {
    id: 'analytics', title: 'Analytics & Insights', description: 'Turn data into intelligence',
    icon: LineChart, accent: 'cyan', growth: '+22%',
    modules: [
      { icon: Eye,       title: 'Visualization', description: 'Interactive dashboards', href: '/visualization', tags: ['Charts'], badge: '15', featured: true },
      { icon: Megaphone, title: 'Notice Board',  description: 'Company announcements', href: '/noticeboard',   tags: ['Comms'], badge: '3' },
      { icon: LayoutDashboard, title: 'Engineering Dashboard', description: 'Live engineering KPIs', href: '/engineering-dashboard', tags: ['Dashboard'] },
      { icon: FileBarChart,    title: 'Engineering Report',    description: 'Monthly engineering report', href: '/engineering_report', tags: ['Reports'] },
      { icon: Activity,        title: 'Usage Analyzer',        description: 'How the app is used — clicks, dwell, feedback', href: '/usage-analyzer', tags: ['Analytics'] },
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
      { icon: ShoppingBag,  title: 'Boutique',    description: 'Fashion retail platform', href: '/boutique', tags: ['Retail'] },
      { icon: ShoppingCart, title: 'E-Commerce',  description: 'Online storefront',      href: '/ecommerce', tags: ['Retail'] },
      { icon: Wheat,        title: 'Farm',        description: 'Farm operations management', href: '/farm', tags: ['Agriculture'] },
      { icon: Printer,      title: 'Print Shop',  description: 'Invitations & resume design', href: '/designhome', tags: ['Design'] },
      { icon: Landmark,     title: 'BankSecure',  description: 'Digital banking platform', href: '/bank', tags: ['Finance'] },
      { icon: FileUser,     title: 'CV Builder',  description: 'Professional CV/resume builder', href: '/cv-builder', tags: ['Career'] },
      { icon: Car,          title: 'RoadReady',   description: 'Driving school booking & scheduling', href: '/drivingSchool', tags: ['Education'] },
    ],
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-wo',  icon: Plus,     label: 'New Work Order',   href: '/maintenance', accent: 'amber' },
  { id: 'upload',  icon: Upload,   label: 'Upload Document',  href: '/documents',   accent: 'blue' },
  { id: 'add-emp', icon: User,     label: 'Add Employee',     href: '/employees',   accent: 'emerald' },
];

export const TOTAL_MODULES = CATEGORIES.reduce((sum, c) => sum + c.modules.length, 0);
export const TOTAL_CATEGORIES = CATEGORIES.length;

export const ALL_MODULES_BY_HREF = new Map<string, { module: Module; accent: Accent }>(
  CATEGORIES.flatMap(c => c.modules.map(m => [m.href, { module: m, accent: c.accent }] as const))
);

// ─── Usage tracking (localStorage) — powers "frequently used" auto quick actions ──

export const USAGE_KEY = 'oz_moduleUsage';
export const AUTO_QA_DISMISSED_KEY = 'oz_qaDismissed';
export const MANUAL_QA_KEY = 'oz_qaManual';
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
