// components/Header.tsx
// Self-contained — reads auth state from localStorage internally.
// Accepts optional legacy props for backward compatibility with existing pages.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu, X, LogIn, UserPlus, ChevronDown, LogOut,
  Users, Package, Folder, ClipboardCheck,
  AlertTriangle, PackageOpen, Fan, Clock, CalendarDays,
  ClipboardPlus, Clock4, Calculator, HardHat, ClipboardList,
  FileWarning, AlertOctagon, ShieldAlert, Eye, Target,
  LineChart, BarChart3, Megaphone, Home,
  Utensils, Church, Database, ToolCase, PackageMinus, Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Auth Form ────────────────────────────────────────────────────────────────

function AuthForm({ defaultMode = 'login' }: { defaultMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const userData = {
        id: 1,
        email,
        name: mode === 'signup' ? name : email.split('@')[0],
        role: 'user',
      };
      localStorage.setItem('token', 'demo_token');
      localStorage.setItem('user', JSON.stringify(userData));
      setLoading(false);
      window.location.reload();
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-[#2A4D69]/10 p-6">
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

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#2A4D69]">Full name</Label>
            <Input
              type="text"
              placeholder="As it appears on official documents"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border-[#2A4D69]/20 focus:border-[#2A4D69] focus:ring-[#2A4D69]/20 text-sm"
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
            className="border-[#2A4D69]/20 focus:border-[#2A4D69] focus:ring-[#2A4D69]/20 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#2A4D69]">Password</Label>
          <Input
            type="password"
            placeholder="Your secure password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border-[#2A4D69]/20 focus:border-[#2A4D69] focus:ring-[#2A4D69]/20 text-sm"
            required
          />
        </div>

        {mode === 'signup' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#2A4D69]">Confirm password</Label>
            <Input
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="border-[#2A4D69]/20 focus:border-[#2A4D69] focus:ring-[#2A4D69]/20 text-sm"
              required
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold mt-1 transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
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
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-[#2A4D69] font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}

// ─── Nav Data ─────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
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
      { icon: ClipboardCheck, title: 'Maintenance',   href: '/maintenance',   desc: 'Work orders & PM' },
      { icon: AlertTriangle,  title: 'Breakdowns',    href: '/breakdowns',    desc: 'Equipment failures' },
      { icon: PackageOpen,    title: 'Spares',        href: '/spares',        desc: 'Spare parts stock' },
      { icon: PackageMinus,   title: 'Issues',        href: '/issues',        desc: 'Goods issued to staff' },
      { icon: Fan,            title: 'Compressors',   href: '/compressors',   desc: 'Compressor monitoring' },
      { icon: Clock,          title: 'Standby',       href: '/standby',       desc: 'On-call schedules' },
      { icon: CalendarDays,   title: 'Schedules',     href: '/schedules',     desc: 'Task scheduling' },
      { icon: ClipboardPlus,  title: 'Requisitions',  href: '/requisitions',  desc: 'Purchase requests' },
    ],
  },
  {
    label: 'Time & HR',
    items: [
      { icon: Clock4,      title: 'Timesheets',  href: '/timesheets',  desc: 'Attendance tracking' },
      { icon: Calculator,  title: 'Overtime',    href: '/overtime',    desc: 'OT approvals' },
      { icon: CalendarDays, title: 'Leaves',     href: '/leaves',      desc: 'Leave management' },
    ],
  },
  {
    label: 'Safety',
    items: [
      { icon: HardHat,      title: 'PPE',             href: '/ppe',            desc: 'Protective equipment' },
      { icon: ClipboardList, title: 'SHEQ Inspections', href: '/sheq_inspection', desc: 'Safety inspections' },
      { icon: FileWarning,  title: 'Near Miss',       href: '/near_miss',      desc: 'Incident reporting' },
      { icon: AlertOctagon, title: 'Work Stoppage',   href: '/work_stoppage',  desc: 'SHEQ hold points' },
      { icon: ShieldAlert,  title: 'SHEQ',            href: '/sheq',           desc: 'Safety & quality' },
      { icon: Eye,          title: 'VFL',             href: '/vfl',            desc: 'Felt leadership' },
      { icon: Target,       title: 'PTO',             href: '/pto',            desc: 'Task observations' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { icon: LineChart,  title: 'Visualization',  href: '/visualization',  desc: 'Dashboards & charts' },
      { icon: BarChart3,  title: 'Reports',        href: '/reports',        desc: 'Generate reports' },
      { icon: Megaphone,  title: 'Notice Board',   href: '/noticeboard',    desc: 'Announcements' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: Home,     title: 'Room Rental',  href: '/roomRental',  desc: 'Property management' },
      { icon: Utensils, title: 'Restaurant',   href: '/restaurant',  desc: 'F&B management' },
      { icon: Church,   title: 'Church',       href: '/church',      desc: 'Community platform' },
      { icon: Database, title: 'Stores',       href: '/stores',      desc: 'Inventory system' },
    ],
  },
];

// ─── Desktop Dropdown ─────────────────────────────────────────────────────────

function NavDropdown({ group }: { group: typeof NAV_GROUPS[0] }) {
  return (
    <div className="relative group">
      <button type="button" className="flex items-center gap-1 text-sm text-white/85 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 font-medium">
        {group.label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div className="absolute top-full left-0 mt-2 hidden group-hover:block min-w-[220px] bg-[#1e3a52] rounded-xl shadow-2xl border border-white/10 p-1.5 z-50">
        {group.items.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/10 transition-all duration-150 group/item"
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-[#86BBD8]/15">
                <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
              </div>
              <div>
                <div className="text-sm font-medium text-white leading-tight">{item.title}</div>
                <div className="text-xs text-white/50 mt-0.5">{item.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Header Component ─────────────────────────────────────────────────────────

interface LegacyHeaderProps {
  isLoggedIn?: boolean;
  user?: unknown;
  onLogout?: () => void;
}

export function Header(_legacyProps?: LegacyHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setIsLoggedIn(true);
        setUser(JSON.parse(userData));
      } catch {
        // malformed user data — ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setMobileOpen(false);
    window.location.reload();
  };

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full bg-[#2A4D69] border-b border-white/10 shadow-md">
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

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-[#86BBD8] text-[#1e3a52] text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white font-medium">{user?.name || 'User'}</span>
                </div>
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
                <Dialog>
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
                    <AuthForm defaultMode="login" />
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
                    <AuthForm defaultMode="signup" />
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Mobile menu toggle */}
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
          <div className="lg:hidden border-t border-white/10 py-3 space-y-1 pb-4">
            <Link
              href="/"
              className="block px-3 py-2 text-sm text-white/85 hover:text-white hover:bg-white/10 rounded-lg font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/85 hover:text-white hover:bg-white/10 rounded-lg font-medium"
                  onClick={() => setMobileGroup(mobileGroup === group.label ? null : group.label)}
                >
                  {group.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileGroup === group.label ? 'rotate-180' : ''}`} />
                </button>
                {mobileGroup === group.label && (
                  <div className="pl-4 mt-1 space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile auth */}
            <div className="pt-3 mt-3 border-t border-white/10">
              {isLoggedIn ? (
                <div className="px-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-[#86BBD8] text-[#1e3a52] text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white">{user?.name}</span>
                  </div>
                  <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 px-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 border-white/20 text-white bg-white/10 hover:bg-white/20">
                        Sign In
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                      <AuthForm defaultMode="login" />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex-1 bg-[#86BBD8] hover:bg-[#78afc9] text-[#1e3a52] font-semibold">
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
