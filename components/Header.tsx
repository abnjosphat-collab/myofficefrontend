// components/Header.tsx — Supabase auth + Google OAuth + role-aware UI
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Menu, X, LogIn, UserPlus, ChevronDown, LogOut, Shield,
  Users, Package, Folder, ClipboardCheck,
  AlertTriangle, PackageOpen, Fan, Clock, CalendarDays,
  ClipboardPlus, Clock4, Calculator, HardHat, ClipboardList,
  FileWarning, AlertOctagon, ShieldAlert, Eye, Target, MessageSquareWarning,
  LineChart, BarChart3, Megaphone, Home,
  Utensils, Church, Database, ToolCase, PackageMinus, Car, Wrench, Gauge,
  HeartHandshake, Settings, Activity, Droplets, Building2, FlaskConical,
  TrendingUp, Layers, Award, Zap, BookOpen, LayoutDashboard,
} from '@/components/shared/theme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/auth-context';

// ─── Role badge colours ───────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: 'bg-rose-500/25 text-rose-200 border border-rose-500/40',
  admin:       'bg-amber-500/25 text-amber-200 border border-amber-500/40',
  manager:     'bg-[#86BBD8]/25 text-[#86BBD8] border border-[#86BBD8]/40',
  user:        'bg-white/10 text-white/60 border border-white/20',
  viewer:      'bg-white/05 text-white/40 border border-white/10',
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  manager:     'Manager',
  user:        'User',
  viewer:      'Viewer',
};

// ─── Google logo SVG ──────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Auth Dialog (email + Google) ─────────────────────────────────────────────

function AuthForm({ defaultMode = 'login', onClose }: {
  defaultMode?: 'login' | 'signup';
  onClose?: () => void;
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode]                   = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [name, setName]                   = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // page redirects; no need to reset
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your full name'); return;
    }

    setLoading(true);

    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, name);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // Signup and login both auto-sign-in immediately (no email verification)
      onClose?.();
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-[#2A4D69]/10 p-6">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <div className="h-10 w-10 rounded-full bg-[#2A4D69] flex items-center justify-center text-white font-bold font-heading text-sm">
            O
          </div>
        </div>
        <h2 className="text-lg font-bold text-[#2A4D69] font-heading">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-xs text-[#6B7B8E] mt-1">
          {mode === 'login' ? 'Sign in to access MyOffice' : 'Join your team on MyOffice'}
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg border border-[#2A4D69]/20 hover:border-[#2A4D69]/40 hover:bg-[#2A4D69]/05 transition-all duration-200 text-sm font-medium text-[#1a1a2e] mb-4"
      >
        {googleLoading ? (
          <div className="h-4 w-4 border-2 border-[#2A4D69]/30 border-t-[#2A4D69] rounded-full animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        {googleLoading ? 'Redirecting…' : `Continue with Google`}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#2A4D69]/10" />
        <span className="text-xs text-[#6B7B8E]">or with email</span>
        <div className="flex-1 h-px bg-[#2A4D69]/10" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#2A4D69]">Full name</Label>
            <Input
              type="text"
              placeholder="As on official documents"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm"
              required
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#2A4D69]">Email address</Label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#2A4D69]">Password</Label>
          <Input
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold mt-1"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'login' ? 'Signing in…' : 'Creating account…'}
            </span>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </Button>

        <p className="text-center text-xs text-[#6B7B8E] pt-1">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-[#2A4D69] font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Engineering',
    items: [
      { icon: LayoutDashboard, title: 'Eng. Dashboard',   href: '/engineering-dashboard', desc: 'KPIs, availability & reliability' },
      { icon: Activity,        title: 'Equipment Status', href: '/equipment-status',       desc: 'Live fleet status board' },
      { icon: ClipboardCheck,  title: 'Job Cards',        href: '/job-cards',              desc: 'Work orders & job card system' },
      { icon: Layers,          title: 'Shift Handover',   href: '/handover',               desc: 'End-of-shift handover reports' },
      { icon: TrendingUp,      title: 'Reliability',      href: '/reliability',            desc: 'MTBF / MTTR analytics' },
      { icon: Droplets,        title: 'Lubrication',      href: '/lubrication',            desc: 'Lube schedules & oil analysis' },
      { icon: FlaskConical,    title: 'Cond. Monitoring', href: '/condition-monitoring',   desc: 'Vibration, thermal, oil samples' },
      { icon: Gauge,           title: 'Production',       href: '/production',             desc: 'Daily production & mill data' },
      { icon: Building2,       title: 'Contractors',      href: '/contractors',            desc: 'Contractor & OEM management' },
      { icon: Shield,          title: 'Compliance',       href: '/compliance-register',    desc: 'Statutory inspections & certs' },
      { icon: BookOpen,        title: 'Failure Modes',    href: '/failure-modes',          desc: 'Failure mode register & FMEA' },
      { icon: Award,           title: 'Competency',       href: '/competency',             desc: 'Skills & certification matrix' },
      { icon: BarChart3,       title: 'Monthly Report',   href: '/engineering_report',     desc: 'Monthly engineering performance report' },
    ],
  },
  {
    label: 'Core',
    items: [
      { icon: Users,        title: 'Personnel',  href: '/employees',  desc: 'Employee profiles & team' },
      { icon: Car,          title: 'Drivers',    href: '/drivers',    desc: 'Authorised drivers registry' },
      { icon: ToolCase,     title: 'Assets',     href: '/equipment',  desc: 'Equipment tracking' },
      { icon: Package,      title: 'Inventory',  href: '/inventory',  desc: 'Stock management' },
      { icon: Folder,       title: 'Documents',  href: '/documents',  desc: 'Centralized storage' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: ClipboardCheck, title: 'Maintenance',   href: '/maintenance',    desc: 'Work orders & PM' },
      { icon: AlertTriangle,  title: 'Breakdowns',    href: '/breakdowns',     desc: 'Equipment failures' },
      { icon: Gauge,          title: 'Availability',  href: '/availabilities', desc: 'Machine availability %' },
      { icon: PackageOpen,    title: 'Spares',        href: '/spares',         desc: 'Spare parts stock' },
      { icon: PackageMinus,   title: 'Issues',        href: '/issues',         desc: 'Goods issued to staff' },
      { icon: Fan,            title: 'Compressors',   href: '/compressors',    desc: 'Compressor monitoring' },
      { icon: Clock,          title: 'Shifts',        href: '/shifts',         desc: 'Shift cycles & standby' },
      { icon: CalendarDays,   title: 'Schedules',     href: '/schedules',      desc: 'Task scheduling' },
      { icon: ClipboardPlus,  title: 'Requisitions',  href: '/requisitions',   desc: 'Purchase requests' },
      { icon: Wrench,         title: 'Third Party Services', href: '/services', desc: 'Contractor jobs & approval circuit' },
    ],
  },
  {
    label: 'Time & HR',
    items: [
      { icon: Clock4,       title: 'Timesheets', href: '/timesheets', desc: 'Attendance tracking' },
      { icon: Calculator,   title: 'Overtime',   href: '/overtime',   desc: 'OT approvals' },
      { icon: CalendarDays, title: 'Leaves',     href: '/leaves',     desc: 'Leave management' },
    ],
  },
  {
    label: 'Safety',
    items: [
      { icon: HardHat,      title: 'PPE',               href: '/ppe',              desc: 'Protective equipment' },
      { icon: ClipboardList, title: 'SHEQ Inspections', href: '/sheq_inspection',  desc: 'Safety inspections' },
      { icon: FileWarning,  title: 'Near Miss',         href: '/near_miss',        desc: 'Incident reporting' },
      { icon: AlertOctagon, title: 'Work Stoppage',     href: '/work_stoppage',    desc: 'SHEQ hold points' },
      { icon: ShieldAlert,  title: 'SHEQ',              href: '/sheq',             desc: 'Safety & quality' },
      { icon: Eye,          title: 'VFL',               href: '/vfl',              desc: 'Felt leadership' },
      { icon: Target,       title: 'PTO',               href: '/pto',              desc: 'Task observations' },
      { icon: MessageSquareWarning, title: 'Safety Complaints', href: '/safety_complaints', desc: 'Complaints register' },
      { icon: HeartHandshake,       title: 'Pachedu',           href: '/pachedu',           desc: 'Behavioural observations' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { icon: LineChart, title: 'Visualization', href: '/visualization', desc: 'Dashboards & charts' },
      { icon: BarChart3, title: 'Reports',       href: '/reports',       desc: 'Generate reports' },
      { icon: Megaphone, title: 'Notice Board',  href: '/noticeboard',   desc: 'Announcements' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: Home,     title: 'Room Rental', href: '/roomRental',  desc: 'Property management' },
      { icon: Utensils, title: 'Restaurant',  href: '/restaurant',  desc: 'F&B management' },
      { icon: Church,   title: 'Church',      href: '/church',      desc: 'Community platform' },
      { icon: Database, title: 'Stores',      href: '/stores',      desc: 'Inventory system' },
      { icon: Car,      title: 'RoadReady',   href: '/drivingSchool', desc: 'Driving school booking' },
    ],
  },
];

// ─── Desktop dropdown ──────────────────────────────────────────────────────────

function NavDropdown({ group }: { group: typeof NAV_GROUPS[0] }) {
  const wide = group.items.length > 6;
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-white/85 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium"
      >
        {group.label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div className={`oz-nav-dropdown absolute top-full left-0 mt-1.5 hidden group-hover:block rounded-2xl p-1.5 z-[200] max-h-[calc(100vh-5rem)] overflow-y-auto ${wide ? 'w-[460px]' : 'min-w-[220px]'}`}>
        <div className={wide ? 'grid grid-cols-2 gap-0' : 'flex flex-col'}>
          {group.items.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/10 transition-all duration-150"
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-[#86BBD8]/15 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white leading-tight">{item.title}</div>
                  <div className="text-xs text-white/50 mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

export function Header() {
  const { user, profile, loading, signOut, isAtLeast } = useAuth();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [dialogOpen,  setDialogOpen]  = useState(false);

  const isLoggedIn = !!user;
  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatar_url ?? null;
  const role = profile?.role ?? 'user';
  const isAdmin = isAtLeast('admin');

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    window.location.reload();
  };

  return (
    <header className="oz-header sticky top-0 z-[120] w-full border-b border-white/[0.10]">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#86BBD8] flex items-center justify-center text-[#1e3a52] font-bold text-sm font-heading">
              O
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm font-heading leading-none">MyOffice</span>
              <span className="block text-[10px] text-[#86BBD8] leading-none mt-0.5">by Ozech</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            <Link href="/" className="text-sm text-white/85 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium">
              Home
            </Link>
            {NAV_GROUPS.map(group => (
              <NavDropdown key={group.label} group={group} />
            ))}
          </nav>

          {/* Right: auth */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="h-6 w-16 rounded-lg bg-white/10 animate-pulse" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">
                {/* Role badge (admin+ only) */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_STYLES[role]} transition-opacity hover:opacity-80`}
                  >
                    <Shield className="h-3 w-3" />
                    {ROLE_LABELS[role]}
                  </Link>
                )}

                {/* Avatar + name */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                  <Avatar className="h-6 w-6">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-[#86BBD8] text-[#1e3a52] text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white font-medium">{displayName}</span>
                </div>

                {/* Admin link */}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 hidden sm:flex">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 hidden sm:flex"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/85 hover:text-white hover:bg-white/10 gap-1.5 font-medium"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                    <DialogTitle className="sr-only">Sign In</DialogTitle>
                    <AuthForm defaultMode="login" onClose={() => setDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-[#86BBD8] hover:bg-[#78afc9] text-[#1e3a52] font-semibold gap-1.5 shadow-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Get Started
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                    <DialogTitle className="sr-only">Create Account</DialogTitle>
                    <AuthForm defaultMode="signup" />
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Mobile toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-white/10 pb-4">
            <Link
              href="/"
              className="flex items-center min-h-[44px] px-4 text-sm text-white/85 hover:text-white hover:bg-white/10 font-medium transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            {NAV_GROUPS.map(group => (
              <div key={group.label} className="border-t border-white/[0.06]">
                <button
                  type="button"
                  className="w-full flex items-center justify-between min-h-[44px] px-4 text-sm text-white/85 hover:text-white hover:bg-white/10 font-medium transition-colors"
                  onClick={() => setMobileGroup(mobileGroup === group.label ? null : group.label)}
                >
                  {group.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileGroup === group.label ? 'rotate-180' : ''}`} />
                </button>
                {mobileGroup === group.label && (
                  <div className="bg-black/20">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 min-h-[44px] pl-8 pr-4 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[#86BBD8]/70" />
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile auth section */}
            <div className="pt-3 mt-1 border-t border-white/10 px-4">
              {isLoggedIn ? (
                <div>
                  <div className="flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                        <AvatarFallback className="bg-[#86BBD8] text-[#1e3a52] text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm text-white font-medium">{displayName}</div>
                        {isAdmin && (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${ROLE_STYLES[role]}`}>
                            <Shield className="h-2.5 w-2.5" />
                            {ROLE_LABELS[role]}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 h-10">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/10 text-sm text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex gap-3 pt-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 h-11 border-white/20 text-white bg-white/10 hover:bg-white/20 font-medium">
                        Sign In
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                      <AuthForm defaultMode="login" />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1 h-11 bg-[#86BBD8] hover:bg-[#78afc9] text-[#1e3a52] font-semibold">
                        Get Started
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                      <AuthForm defaultMode="signup" />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
