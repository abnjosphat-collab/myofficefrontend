// app/login-preview/LoginPreview.tsx — a prototype of the sign-in screen over an Icelandic landscape with slow, drifting clouds (IcelandSky) and a
// still lake with mist (IcelandLand). The form is a mock: it submits nothing and talks to no account service. The card is the same shared
// one as the real sign-in (AuthCard), so it can be compared like for like with /login.
'use client';

import { AuthCard } from '@/components/app-shell/auth/AuthLayout';
import { Button, Field, Input } from '@/components/ui-system';
import { IcelandLand } from './IcelandLand';
import { IcelandSky } from './IcelandSky';
import s from './login-preview.module.css';

export function LoginPreview() {
  return (
    <div className={s.scene}>
      <IcelandSky className={s.sky} />
      <IcelandLand />
      <div className={`${s.mist} ${s.mistA}`} aria-hidden="true" />
      <div className={`${s.mist} ${s.mistB}`} aria-hidden="true" />
      <div className={s.layer}>
        <AuthCard title="Welcome back" description="Sign in to access MyOffice." headingId="login-preview-title">
          <form className="flex flex-col gap-4" onSubmit={event => event.preventDefault()}>
            <Field label="Email address"><Input type="email" placeholder="you@company.com" autoComplete="off" /></Field>
            <Field label="Password"><Input type="password" placeholder="Enter your password" autoComplete="off" /></Field>
            <Button type="submit" variant="primary" className="w-full">Sign in</Button>
          </form>
        </AuthCard>
      </div>
      <p className={s.note}>Preview: the form here does nothing.</p>
    </div>
  );
}
