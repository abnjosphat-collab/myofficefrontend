'use client';

import { useState, type FormEvent } from 'react';
import { ToolsIcon as Icon } from './ToolsIcon';
import { AnimatedText } from './ToolsUI';
import { AnimatedSelect } from './AnimatedSelect';
import type { ApprovalRole } from './complianceTypes';
import type { AccountRole, WorkspaceAccount } from './prototype';
import s from './tools.module.css';
import { Button } from '@/components/ui-system';

const APPROVAL_ROLES:Array<{value:ApprovalRole;label:string}>=[{value:'hos',label:'HOS'},{value:'hod',label:'HOD'},{value:'security',label:'Security'},{value:'finance',label:'Finance'},{value:'general_manager',label:'General manager'}];

const ROLE_OPTIONS=[{value:'viewer',label:'Viewer · reads their department'},{value:'issuer',label:'Issuer · records movements'},{value:'admin',label:'Admin · manages the system'}];
const sameRoles=(left:ApprovalRole[],right:ApprovalRole[])=>left.length===right.length&&left.every(role=>right.includes(role));

/** One account: who it is, what it may do, which department it sees and which gate-pass steps it may sign. Apply is live only once something differs. */
function AccountAccessRow({account,departments,onUpdate}:{account:WorkspaceAccount;departments:string[];onUpdate:(id:string,role:AccountRole,department?:string,approvalRoles?:ApprovalRole[])=>void|Promise<void>}) {
  const savedDepartment=account.department||departments[0]||'Engineering';
  const [role,setRole]=useState<AccountRole>(account.role);const [department,setDepartment]=useState(savedDepartment);
  const [approvalRoles,setApprovalRoles]=useState<ApprovalRole[]>(account.approvalRoles||[]);const [saving,setSaving]=useState(false);
  const changed=role!==account.role||(role!=='admin'&&department!==savedDepartment)||!sameRoles(approvalRoles,account.approvalRoles||[]);
  async function apply(){setSaving(true);try{await onUpdate(account.id,role,role==='admin'?undefined:department,approvalRoles);}finally{setSaving(false);}}
  return <div className={s.acctRow} role="row" data-changed={changed}>
    <div className={s.acctPerson} role="cell"><span className={s.acctAvatar} aria-hidden="true"><Icon name="user" size={20}/></span><span><strong>{account.name}</strong><small>{account.username}</small></span></div>
    <div className={s.acctCell} role="cell" data-label="Access"><AnimatedSelect ariaLabel={`Role for ${account.name}`} value={role} onChange={value=>setRole(value as AccountRole)} options={ROLE_OPTIONS}/></div>
    <div className={s.acctCell} role="cell" data-label="Department">{role==='admin'?<span className={s.acctAll}>All departments</span>:<AnimatedSelect ariaLabel={`Department for ${account.name}`} value={department} onChange={setDepartment} options={departments.map(value=>({value,label:value}))}/>}</div>
    <div className={s.acctCell} role="cell" data-label="Gate-pass signing"><div className={s.approvalRolePicker} role="group" aria-label={`Gate-pass signing roles for ${account.name}`}>{APPROVAL_ROLES.map(item=><label key={item.value} data-on={approvalRoles.includes(item.value)}><input type="checkbox" aria-label={`${item.label} approval role for ${account.name}`} checked={approvalRoles.includes(item.value)} onChange={event=>setApprovalRoles(current=>event.target.checked?[...current,item.value]:current.filter(value=>value!==item.value))}/><span>{item.label}</span></label>)}</div></div>
    <div className={s.acctActions} role="cell"><Button variant={changed?'primary':'secondary'} size="lg" className={s.sharedButton} disabled={!changed||saving} onClick={()=>void apply()}>{saving?'Applying…':changed?'Apply changes':'Up to date'}</Button>{account.role==='issuer'&&!changed&&<Button type="button" variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={()=>{setRole('viewer');void onUpdate(account.id,'viewer',savedDepartment,approvalRoles);}}>Revoke issuing</Button>}</div>
  </div>;
}

export function ToolsAccountAccess({accounts,departments,onUpdateRole}:{accounts:WorkspaceAccount[];departments:string[];onUpdateRole:(id:string,role:AccountRole,department?:string,approvalRoles?:ApprovalRole[])=>void|Promise<void>}) {
  const count=(role:AccountRole)=>accounts.filter(account=>account.role===role).length;
  const summary=[{label:accounts.length===1?'Account':'Accounts',value:accounts.length},{label:count('admin')===1?'Admin':'Admins',value:count('admin')},{label:count('issuer')===1?'Issuer':'Issuers',value:count('issuer')},{label:count('viewer')===1?'Viewer':'Viewers',value:count('viewer')}];
  return <section className={s.acct} aria-labelledby="acct-title">
    <header className={s.acctHeader}><div><h2 id="acct-title">Account access</h2><p>Decide who can see and change the register, which department they work in, and who may sign gate passes.</p></div>
      <dl className={s.acctSummary}>{summary.map(item=><div key={item.label}><dd><AnimatedText value={item.value}>{item.value}</AnimatedText></dd><dt>{item.label}</dt></div>)}</dl></header>
    <p className={s.acctNote}><Icon name="info" size={16}/><span>People outside the admin group only see their own department. A gate-pass signing role does not allow editing the register: it only lets that person sign that one step, after confirming their password or PIN.</span></p>
    <div className={s.acctTable} role="table" aria-label="Accounts">
      <div className={s.acctHead} role="row"><span role="columnheader">Person</span><span role="columnheader">Access</span><span role="columnheader">Department</span><span role="columnheader">Gate-pass signing</span><span role="columnheader"><span className={s.srOnly}>Action</span></span></div>
      {accounts.map(account=><AccountAccessRow key={account.id} account={account} departments={departments} onUpdate={onUpdateRole}/>)}
    </div>
  </section>;
}

export function ToolsAuth({ accounts, currentAccount, onCreate, onLogin, onLogout, onCancel, allowCancel = true }: { accounts: WorkspaceAccount[]; currentAccount: WorkspaceAccount | null; onCreate: (account: WorkspaceAccount) => void | Promise<void>; onLogin: (username: string, password: string) => Promise<true | string>; onLogout: () => void; onCancel: () => void; allowCancel?: boolean }) {
  const [mode,setMode]=useState<'login'|'create'>('login'); const [name,setName]=useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('');
  async function submit(event:FormEvent){event.preventDefault();setError('');if(mode==='login'){const result=await onLogin(username,password);if(result!==true)setError(result);return;}if(accounts.some(account=>account.username.toLowerCase()===username.trim().toLowerCase())){setError('That username is already in use.');return;}await onCreate({id:crypto.randomUUID(),name:name.trim(),username:username.trim().toLowerCase(),password,role:'viewer',canIssue:false});}
  if (currentAccount) return <div className={s.profileMenu}><div className={s.profileIdentity}><span><Icon name="user" size={24}/></span><div><strong>{currentAccount.name}</strong><small>{currentAccount.username}</small></div></div><dl className={s.profileDetails}><div><dt>Access</dt><dd>{currentAccount.role==='admin'?'Administrator':currentAccount.role==='issuer'?'Issuer':'Viewer'}</dd></div>{currentAccount.department&&<div><dt>Department</dt><dd>{currentAccount.department}</dd></div>}</dl><p className={s.formHint}>This device keeps you signed in for up to seven days. Administrators manage permissions from Account access.</p><div className={s.formFooter}><Button type="button" variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={onCancel}>Close</Button><Button type="button" variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={onLogout}>Sign out</Button></div></div>;
  return <form className={s.form} onSubmit={submit}><div className={s.authMode}><button type="button" aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('');}}>Sign in</button><button type="button" aria-pressed={mode==='create'} onClick={()=>{setMode('create');setError('');}}>Sign up</button></div>{mode==='create'&&<div className={s.field}><label htmlFor="account-name">Your name</label><input id="account-name" aria-label="Your name" required minLength={2} value={name} onChange={event=>setName(event.target.value)} autoComplete="name"/></div>}<div className={s.field}><label htmlFor="account-username">Username or email</label><input id="account-username" aria-label="Username or email" required minLength={3} value={username} onChange={event=>setUsername(event.target.value)} autoComplete="username"/></div><div className={s.field}><label htmlFor="account-password">Password</label><input id="account-password" aria-label="Password" required minLength={6} type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete={mode==='login'?'current-password':'new-password'}/></div>{mode==='create'&&<p className={s.formHint}>New accounts start as Viewers. An administrator assigns the department and any issuing rights.</p>}{error&&<p className={s.warning} role="alert">{error}</p>}<p className={s.formHint}>Your password is verified by the backend and is never stored in this browser.</p><div className={s.formFooter}>{allowCancel&&<Button type="button" variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={onCancel}>Cancel</Button>}<Button type="submit" variant="primary" size="lg" className={`${s.sharedButton}`}>{mode==='login'?'Sign in':'Sign up'}<Icon name="arrow" size={16}/></Button></div></form>;
}
