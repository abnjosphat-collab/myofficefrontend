'use client';

import { usePathname } from 'next/navigation';
import { ArrowLeft, Cube, LockKey, SpinnerGap } from '@phosphor-icons/react';
import { AuthForm } from '@/components/app-shell/AuthMenu';
import { useAuth } from '@/lib/auth-context';
import { isPublicWorkspacePath } from '@/lib/accessPaths';

export function MyOfficeAccessBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (isPublicWorkspacePath(pathname)) return <>{children}</>;

  if (loading) return <div className="fixed inset-0 grid place-items-center bg-[#08090b] text-white" role="status" aria-label="Checking MyOffice access"><SpinnerGap className="h-6 w-6 animate-spin text-violet-300" aria-hidden="true"/></div>;

  if (!user) return <main className="min-h-dvh bg-[#08090b] px-4 py-8 text-white">
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center justify-center">
      <section className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#111114] shadow-[0_32px_100px_rgba(0,0,0,.55)] md:grid-cols-[minmax(0,.88fr)_minmax(360px,1fr)]" aria-labelledby="myoffice-access-title">
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 p-7 md:border-b-0 md:border-r md:p-10">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"/>
          <div className="relative">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200"><LockKey size={22} weight="light" aria-hidden="true"/></span>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[.18em] text-violet-200/80">MyOffice access</p>
            <h1 id="myoffice-access-title" className="mt-3 max-w-md font-heading text-3xl font-medium leading-tight tracking-[-.025em] text-white md:text-[40px]">Sign in to enter the wider MyOffice workspace.</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/58">Tools &amp; Equipment remains a focused standalone workspace. MyOffice modules require a separate authorised account.</p>
          </div>
          <a href="/tools" className="relative mt-9 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-white/12 bg-white/[.055] px-4 text-sm font-medium text-white/86 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-300/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-violet-300">
            <ArrowLeft size={17} weight="light" aria-hidden="true"/>Return to Tools &amp; Equipment
          </a>
        </div>
        <div className="flex items-center justify-center bg-white/[.018] p-5 sm:p-8 md:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-5 flex items-center gap-3 text-white/62"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-violet-200"><Cube size={18} weight="light" aria-hidden="true"/></span><span className="text-xs">Sign in or create a MyOffice account</span></div>
            <AuthForm defaultMode="login" redirectTo={pathname}/>
          </div>
        </div>
      </section>
    </div>
  </main>;

  return <>{children}</>;
}
