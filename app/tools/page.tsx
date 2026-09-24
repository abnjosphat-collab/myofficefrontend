'use client';

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/config';
import { ToolsIcon as Icon } from './ToolsIcon';
import { ToolSymbol } from './ToolSymbol';
import { EmployeeForm, MarkReadyForm, MovementForm, ToolForm, TITLES } from './ToolsForms';
import { ToolsDialog, ToolsPreferences, Help, ActionHint, AnimatedText, EvidencePicker, EvidenceGallery, type AddEvidence } from './ToolsUI';
import { ToolsRegister, StatusLabel } from './ToolsRegister';
import { ToolsCustomize, DEFAULT_OPTIONS, type SectionName } from './ToolsCustomize';
import { ToolsWorkspaceSearch } from './ToolsWorkspaceSearch';
import { ToolsNotifications } from './ToolsNotifications';
import { ToolsOverview } from './ToolsOverview';
import { ToolsPeople } from './ToolsPeople';
import { ToolsAccountAccess, ToolsAuth } from './ToolsAuth';
import { ToolsAnalytics, type ClientError, type FeedbackRecord, type UsageEvent } from './ToolsAnalytics';
import { ToolsFeedback } from './ToolsFeedback';
import { ToolsImport } from './ToolsImport';
import { ToolsExport } from './ToolsExport';
import { ToolsFeedbackInbox } from './ToolsFeedbackInbox';
import { SourceRegisterForm, ToolsSourceRegisters, type SourceRegisterRecord } from './ToolsSourceRegisters';
import { AnimatedSelect } from './AnimatedSelect';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import type { ExportTable } from './toolsExports';
import { historyReducer } from './history';
import { ToolsApiError, toolsApi } from './toolsApi';
import { countTools, selectVisibleActivity, selectVisibleTools, type ToolsTab } from './toolSelectors';
import { buildWorkspaceSearchIndex, searchWorkspace, type WorkspaceSearchResult } from './toolsSearch';
import { parseToolsPreferences, saveToolsPreferences, TOOLS_PREFERENCES_KEY } from './toolsPreferences';
import { inferEquipmentKind, primaryToolImage, SEED_TOOLS, SEED_ACTIVITY, CATEGORIES, DEPARTMENTS, STATUS, departmentOf, type Status, type Tool, type Movement, type ActionKind, type Employee, type Evidence, type WorkspaceAccount } from './prototype';
import s from './tools.module.css';

type Modal = { kind: ActionKind; tool?: Tool; employee?: Employee } | { kind: 'new'|'employee'|'auth'|'feedback'|'customize'|'import'|'export'|'source-register' } | { kind: 'edit'|'attachments'|'ready'; tool: Tool } | null;
const TOOLS_SESSION_KEY = 'myoffice.tools.session.v1';
const tabs = [{ value: 'register', label: 'Equipment', icon: 'box' }, { value: 'loans', label: 'In use', icon: 'out' }, { value: 'employees', label: 'Employees', icon: 'user' }, { value: 'activity', label: 'History', icon: 'history' }, { value: 'sources', label: 'Source registers', icon: 'upload', signedInOnly: true }, { value: 'accounts', label: 'Account access', icon: 'accounts', adminOnly: true }, { value: 'analytics', label: 'Analytics', icon: 'analytics', adminOnly: true }, { value: 'feedback', label: 'Feedback', icon: 'edit', adminOnly: true }] as const;
function AttachmentForm({ tool, addFiles, onSave }: { tool: Tool; addFiles: AddEvidence; onSave: (files: Evidence[]) => void }) {
  const [files, setFiles] = useState(tool.evidence || []);
  return <div className={s.form}><EvidencePicker value={files} onChange={setFiles} addFiles={addFiles} /><div className={s.formFooter}><button className={s.primary} onClick={() => onSave(files)}>Save attachments<Icon name="check" size={16} /></button></div></div>;
}

type ServerTool = { id:string; register_number:string; name:string; make_model?:string; serial_number?:string; category?:string; equipment_kind?:Tool['kind']; storage_location:string; department:string; section?:string; status:Status; condition?:string; notes?:string; approval_ref?:string; calibration?:string; specifications?:Record<string,string>; archived?:boolean; custody?:{employee_name?:string;expected_return_at?:string;original_due_at?:string;job_reference?:string;assigned_equipment?:string[]}; evidence?:Array<{id:string;original_name:string;content_type:string;size_bytes:number;url?:string}> };
type ToolNotification = { key:string; kind:'overdue'|'attention'; tool_id:string; tool_name:string; department:string; read:boolean };
const displayTimestamp = (value?:string) => { if (!value) return undefined; const parsed=new Date(value); return Number.isNaN(parsed.valueOf())?value:parsed.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
const fromServerTool = (row:ServerTool):Tool => ({ id:row.register_number,backendId:row.id,name:row.name,make:row.make_model||'',serial:row.serial_number||'',category:row.category||'Other equipment',kind:inferEquipmentKind(row.name,row.category||'',row.equipment_kind),status:row.status,location:row.storage_location,department:row.department,section:row.section,condition:row.condition||'Good',notes:row.notes,approvalRef:row.approval_ref,calibration:row.calibration,specifications:row.specifications||{},archived:row.archived,holder:row.custody?.employee_name,due:displayTimestamp(row.custody?.expected_return_at),dueISO:row.custody?.expected_return_at,originalDue:displayTimestamp(row.custody?.original_due_at),job:row.custody?.job_reference,assignedEquipment:row.custody?.assigned_equipment||[],evidence:(row.evidence||[]).filter(item=>item.url).map(item=>({id:item.id,name:item.original_name,type:item.content_type,size:item.size_bytes,url:item.url!})) });

export default function ToolsPage() {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: { tools: SEED_TOOLS, activity: SEED_ACTIVITY }, future: [] });
  const { tools, activity } = history.present;
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [accounts,setAccounts]=useState<WorkspaceAccount[]>([]);
  const [sourceRegisters,setSourceRegisters]=useState<SourceRegisterRecord[]>([]);
  const [currentAccount,setCurrentAccount]=useState<WorkspaceAccount|null>(null);
  const [usage,setUsage]=useState<UsageEvent[]>([]);
  const [clientErrors,setClientErrors]=useState<ClientError[]>([]);
  const [feedbackRecords,setFeedbackRecords]=useState<FeedbackRecord[]>([]);
  const [notificationAlerts,setNotificationAlerts]=useState<ToolNotification[]>([]);
  const [tab, setTab] = useState<ToolsTab>('register');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [department, setDepartment] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all' | 'archived'>('all');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [sort, setSort] = useState('register');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [preferencesReady,setPreferencesReady]=useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [feedback, setFeedback] = useState('');
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : .25;
  const searchRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<(token?:string)=>Promise<void>>(async()=>{});
  const objectUrls = useRef<string[]>([]);
  useEffect(() => () => { objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const saved = parseToolsPreferences(window.localStorage.getItem(TOOLS_PREFERENCES_KEY));
    if (saved) {
      setAppearance(saved.appearance);
      setOptions(saved.options);
      setView(saved.view);
      setSidebarCollapsed(saved.sidebarCollapsed);
      setOverviewOpen(saved.overviewOpen);
    }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    saveToolsPreferences({ appearance, options, view, sidebarCollapsed, overviewOpen });
  }, [appearance, options, view, sidebarCollapsed, overviewOpen, preferencesReady]);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TOOLS_SESSION_KEY);
      if (!stored) return;
      const account = JSON.parse(stored) as WorkspaceAccount;
      if (account.id && account.name && account.username && account.token) {
        setCurrentAccount({ ...account, role:account.role||'viewer', canIssue:account.role==='issuer', password: '' });
        void toolsApi.get<{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean}>('/auth/me',account.token).then(fresh=>{
          const updated:WorkspaceAccount={id:fresh.id,name:fresh.name,username:fresh.username,password:'',role:fresh.role,department:fresh.department,canIssue:fresh.can_issue,token:account.token};
          window.localStorage.setItem(TOOLS_SESSION_KEY,JSON.stringify(updated));setCurrentAccount(updated);
        }).catch(()=>{});
      }
      else window.localStorage.removeItem(TOOLS_SESSION_KEY);
    } catch { window.localStorage.removeItem(TOOLS_SESSION_KEY); }
  }, []);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false); };
    const closeAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== 'actions') setActionsOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActionsOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener(TOOLS_POPOVER_EVENT, closeAnother);
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener(TOOLS_POPOVER_EVENT, closeAnother);
      window.removeEventListener('keydown', closeEscape);
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (modal || selectedId || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, selectedId]);
  useEffect(()=>{const capture=(message:string,source?:string,stack?:string)=>{setClientErrors(current=>[{id:crypto.randomUUID(),message,at:new Date().toISOString()},...current]);if(currentAccount?.token)void fetch(`${API_BASE}/api/tools-workspace/analytics/errors`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${currentAccount.token}`},body:JSON.stringify({message,source,stack})}).catch(()=>{});};const onError=(event:ErrorEvent)=>capture(event.message||'Unknown browser error',event.filename,event.error?.stack);const onRejection=(event:PromiseRejectionEvent)=>capture(event.reason instanceof Error?event.reason.message:String(event.reason||'Unhandled promise rejection'),'promise',event.reason instanceof Error?event.reason.stack:undefined);window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);return()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);};},[currentAccount?.token]);

  async function reloadWorkspace(token = currentAccount?.token) {
    if (!token) return;
    const notificationsRequest=toolsApi.get<{alerts:ToolNotification[];unread_count:number}>('/notifications',token);
    const [people,equipment,trail,sources]=await Promise.all([
      toolsApi.get<Array<{id:string;employee_number:string;name:string;department:string;job_title?:string;supervisor_name?:string;active:boolean}>>('/employees',token),
      toolsApi.get<ServerTool[]>('/tools',token),
      toolsApi.get<Array<{id:string;tool_id:string;tool_name:string;action:string;detail?:string;actor_name?:string;employee_name?:string;event_at:string}>>('/history',token),
      toolsApi.get<SourceRegisterRecord[]>('/source-registers',token),
    ]);
    const loadedTools=equipment.map(fromServerTool);
    setEmployees(people.map(row=>({id:row.employee_number,backendId:row.id,employeeNumber:row.employee_number,name:row.name,department:row.department,jobTitle:row.job_title,supervisorName:row.supervisor_name,active:row.active})));
    const loadedActivity=trail.map(row=>({id:row.id,toolId:loadedTools.find(item=>item.backendId===row.tool_id)?.id||row.tool_id,title:`${row.tool_name} · ${row.action}`,detail:row.detail||row.employee_name||'',time:new Date(row.event_at).toLocaleString(),recordedBy:row.actor_name}));
    dispatch({type:'reset',snapshot:{tools:loadedTools,activity:loadedActivity}});
    setSourceRegisters(sources);
    if (currentAccount?.role==='admin') {
      const [analyticsData,workspaceAccounts]=await Promise.all([
        toolsApi.get<{usage:Array<{id:string;event:string;detail?:string;created_at:string;account_name?:string}>;errors:Array<{id:string;message:string;created_at:string}>;feedback:Array<{id:string;text?:string;audio_filename?:string;audio_url?:string;created_at:string;account_name?:string}>}>('/analytics',token),
        toolsApi.get<Array<{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean}>>('/accounts',token),
      ]);
      setUsage(analyticsData.usage.map(row=>({id:row.id,name:row.event,detail:row.detail,at:row.created_at,by:row.account_name})));
      setClientErrors(analyticsData.errors.map(row=>({id:row.id,message:row.message,at:row.created_at})));
      setFeedbackRecords(analyticsData.feedback.map(row=>({id:row.id,text:row.text,audioName:row.audio_filename,audioUrl:row.audio_url,at:row.created_at,by:row.account_name||'Workspace user'})));
      setAccounts(workspaceAccounts.map(account=>({...account,password:'',canIssue:account.can_issue})));
    } else {
      setUsage([]); setClientErrors([]); setFeedbackRecords([]); setAccounts([]);
    }
    try { setNotificationAlerts((await notificationsRequest).alerts); }
    catch(error) { toast.error('Equipment loaded, but notifications are temporarily unavailable.',{description:error instanceof Error?error.message:undefined}); }
  }
  reloadRef.current=reloadWorkspace;
  useEffect(()=>{ if (!currentAccount?.token) return; void reloadRef.current(currentAccount.token).catch(error=>{if(error instanceof ToolsApiError&&error.status===401){signOut(false);toast.error('Your saved session expired. Please sign in again.');return;}toast.error(error instanceof Error?error.message:'Could not load Tools & Equipment.');}); },[currentAccount?.token]);

  const departments = [...new Set([...DEPARTMENTS, ...tools.map(departmentOf)])];
  const visibleTabs = tabs.filter(item=>(!('signedInOnly' in item)||!item.signedInOnly||!!currentAccount)&&(!('adminOnly' in item)||!item.adminOnly||currentAccount?.role==='admin'));
  const scope = tools.filter(t => department === 'all' || departmentOf(t) === department);
  const activeTools = scope.filter(t => !t.archived);
  const counts = countTools(scope);
  const scopedNotifications=notificationAlerts.filter(alert=>department==='all'||alert.department===department);
  const unreadNotifications=scopedNotifications.filter(alert=>!alert.read).length;
  const visibleTools = useMemo(() => selectVisibleTools(tools,{department,status,search,category,location,tab,sort}), [tools, department, status, search, category, location, tab, sort]);
  const visibleActivity = selectVisibleActivity(activity,scope,search);
  const selected = tools.find(t => t.id === selectedId);
  const selectedFacts:Array<[string,string]> = selected ? [
    ['Register number',selected.id],['Make / model',selected.make||'Not recorded'],['Serial number',selected.serial||'Not recorded'],['Category',selected.category],['Equipment type',selected.kind.replaceAll('-',' ')],['Department',departmentOf(selected)],['Section',selected.section||'Not recorded'],['Location',selected.location],['Condition',selected.condition],['With',selected.holder||'Tool room'],
    ...(selected.holder?[['Expected return',selected.due||'Not recorded'],...(selected.originalDue&&selected.originalDue!==selected.due?[['Original deadline',selected.originalDue] as [string,string]]:[]),['Work order',selected.job||'Not recorded'],['Used for',selected.assignedEquipment?.join(', ')||'Not recorded']] as Array<[string,string]>:[]),
    ...Object.entries(selected.specifications||{}),...(selected.calibration?[['Calibration',selected.calibration] as [string,string]]:[]),...(selected.approvalRef?[['Register approval',selected.approvalRef] as [string,string]]:[]),
  ] : [];
  const workspaceSearchIndex = useMemo(() => buildWorkspaceSearchIndex(tools,employees,activity,sourceRegisters), [tools,employees,activity,sourceRegisters]);
  const workspaceSearchResults = useMemo(() => searchWorkspace(workspaceSearchIndex,search), [workspaceSearchIndex,search]);
  const locationSuggestions = [...new Set(tools.map(tool=>tool.location).filter(Boolean))].sort();
  const equipmentSuggestions = [...new Set(tools.flatMap(tool=>tool.assignedEquipment||[]).filter(Boolean))].sort();
  const activeFilters = Number(status !== 'all') + Number(category !== 'all') + Number(location !== 'all');
  const activeRefinements = tab === 'activity' ? 0 : activeFilters + Number(sort !== 'register');
  const clearFilters = () => { setSearch(''); setStatus('all'); setCategory('all'); setLocation('all'); };
  const resetRefinements = () => { clearFilters(); setSort('register'); };
  const openManageModal = (next: Exclude<Modal,null>) => { if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setModal({kind:'auth'}); toast.error('Sign in with an administrator or Issuer account to manage records.'); return; } setSelectedId(null); setModal(next); };
  const openSourceRegister = () => { if (!currentAccount) { setModal({kind:'auth'}); toast.error('Sign in to preserve a source register.'); return; } setModal({kind:'source-register'}); };
  const openAction = (kind: ActionKind, tool?: Tool, employee?:Employee) => {
    if (currentAccount?.role!=='issuer') { setSelectedId(null); setModal({kind:'auth'}); toast.error('Only an Issuer account can record equipment movements.'); return; }
    const targetDepartment=tool?departmentOf(tool):employee?.department;
    if (targetDepartment&&targetDepartment!==currentAccount.department) { toast.error(`This Issuer can work only with ${currentAccount.department} records.`); return; }
    setSelectedId(null); setModal({kind,tool,employee});
  };
  const filterTo = (next: Status | 'all', nextTab: ToolsTab = 'register') => { clearFilters(); setStatus(next); setTab(nextTab); };
  const addFiles: AddEvidence = files => files.map(file => { const url = URL.createObjectURL(file); objectUrls.current.push(url); return { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, url }; });
  const requireToken = () => {
    if (!currentAccount?.token) { setModal({kind:'auth'}); throw new Error('Sign in to save this change.'); }
    return currentAccount.token;
  };
  async function saveMovement(input: Movement) {
    const current=tools.find(item=>item.id===input.toolId);
    try {
      if (!current?.backendId) throw new Error('This equipment record has not been saved yet.');
      const employee=employees.find(item=>item.id===input.person||item.name===input.person||`${item.name} · ${item.employeeNumber}`===input.person);
      await toolsApi.post(`/tools/${current.backendId}/commands`,requireToken(),{kind:input.kind,employee_id:employee?.backendId||employee?.employeeNumber,employee_name:employee?.name,department:input.department,location:input.location,expected_return_at:input.dueISO||input.due,job_reference:input.job,assigned_equipment:input.assignedEquipment||[],condition:input.condition,notes:input.notes,approval_ref:input.approvalRef,calibration:input.calibration,idempotency_key:crypto.randomUUID()});
      await reloadWorkspace(); setModal(null); setFeedback('Change saved.'); toast.success('Change saved');
    } catch(error) { toast.error(error instanceof Error?error.message:'The movement could not be saved.'); }
  }
  async function uploadNewEvidence(tool:Tool,files:Evidence[]) {
    const fresh=files.filter(file=>file.url.startsWith('blob:'));
    if (!fresh.length || !tool.backendId) return;
    const body=new FormData();
    for (const item of fresh) { const blob=await fetch(item.url).then(response=>response.blob()); body.append('files',new File([blob],item.name,{type:item.type})); }
    await toolsApi.post(`/tools/${tool.backendId}/evidence`,requireToken(),body);
  }
  async function saveAttachments(tool:Tool,files:Evidence[]) {
    try { await uploadNewEvidence(tool,files); await reloadWorkspace(); setModal(null); toast.success('Attachments saved'); }
    catch(error) { toast.error(error instanceof Error?error.message:'Attachments could not be saved.'); }
  }
  async function saveTool(tool: Tool) {
    try {
      const editing=modal?.kind==='edit'; const id=tool.id||`TOOL-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
      const payload={register_number:id,name:tool.name,make_model:tool.make,serial_number:tool.serial,category:tool.category,equipment_kind:tool.kind,storage_location:tool.location,department:departmentOf(tool),section:tool.section,condition:tool.condition,notes:tool.notes,approval_ref:tool.approvalRef,calibration:tool.calibration,specifications:tool.specifications||{}};
      let saved:ServerTool;
      if (editing) { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); saved=await toolsApi.patch(`/tools/${tool.backendId}`,requireToken(),payload); }
      else saved=await toolsApi.post('/tools',requireToken(),payload);
      const mapped=fromServerTool(saved); await uploadNewEvidence(mapped,tool.evidence||[]);
      await reloadWorkspace(); setModal(null); clearFilters(); setTab('register'); setDepartment(departmentOf(tool)); toast.success(editing?'Equipment updated':'Equipment added');
    } catch(error) { toast.error(error instanceof Error?error.message:'The equipment could not be saved.'); }
  }
  async function archiveTool(tool:Tool) {
    if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setSelectedId(null); setModal({kind:'auth'}); toast.error('An administrator or Issuer account is required to archive equipment.'); return; }
    try { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); await toolsApi.post(`/tools/${tool.backendId}/archive`,requireToken()); await reloadWorkspace(); setSelectedId(null); toast.success(tool.archived?'Equipment restored':'Equipment archived'); }
    catch(error) { toast.error(error instanceof Error?error.message:'The equipment could not be archived.'); }
  }
  async function markToolReady(tool:Tool,resolutionNote:string) {
    try { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); await toolsApi.post(`/tools/${tool.backendId}/mark-ready`,requireToken(),{resolution_note:resolutionNote}); await reloadWorkspace(); setModal(null); setSelectedId(tool.id); setFeedback('Tool marked ready for use.'); toast.success('Tool is ready for use'); }
    catch(error) { toast.error(error instanceof Error?error.message:'The tool could not be marked ready.'); }
  }
  async function saveSourceRegister(file:File,sourceDepartment:string,notes:string) {
    try { const body=new FormData(); body.append('department',sourceDepartment); body.append('notes',notes); body.append('file',file); await toolsApi.post('/source-registers',requireToken(),body); await reloadWorkspace(); setModal(null); setTab('sources'); setSearch(''); toast.success('Source register stored permanently'); }
    catch(error) { toast.error(error instanceof Error?error.message:'The source register could not be uploaded.'); }
  }
  async function saveEmployee(employee:Employee) {
    try { await toolsApi.post('/employees',requireToken(),{employee_number:employee.employeeNumber,name:employee.name,department:employee.department,job_title:employee.jobTitle,supervisor_name:employee.supervisorName}); await reloadWorkspace(); setModal(null); setTab('employees'); toast.success(`${employee.name} added`); }
    catch(error) { toast.error(error instanceof Error?error.message:'The employee could not be saved.'); }
  }
  async function createAccount(account:WorkspaceAccount) {
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean}}>('/auth/register',{name:account.name,username:account.username,password:account.password}); const saved:WorkspaceAccount={...account,id:data.account.id,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,token:data.token}; window.localStorage.setItem(TOOLS_SESSION_KEY,JSON.stringify(saved)); setCurrentAccount(saved); setModal(null); toast.success(`Welcome, ${saved.name}`); }
    catch(error) { toast.error(error instanceof Error?error.message:'The account could not be created.'); }
  }
  async function login(username:string,password:string) {
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean}}>('/auth/login',{username,password}); const account:WorkspaceAccount={id:data.account.id,name:data.account.name,username:data.account.username,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,token:data.token}; window.localStorage.setItem(TOOLS_SESSION_KEY,JSON.stringify(account)); setCurrentAccount(account); setModal(null); toast.success(`Signed in as ${account.name}`); return true; }
    catch { return false; }
  }
  function signOut(showToast=true) { window.localStorage.removeItem(TOOLS_SESSION_KEY); setCurrentAccount(null); setEmployees([]); setSourceRegisters([]); setUsage([]); setClientErrors([]); setFeedbackRecords([]); setNotificationAlerts([]); dispatch({type:'reset',snapshot:{tools:SEED_TOOLS,activity:SEED_ACTIVITY}}); setModal(null); if(showToast)toast.success('Signed out'); }
  function track(name:string,detail?:string) { const event={id:crypto.randomUUID(),name,detail,at:new Date().toISOString()}; setUsage(current=>[event,...current]); if(currentAccount?.token)void toolsApi.post('/analytics/usage',currentAccount.token,{event:name,detail}).catch(()=>{}); }
  async function updateAccountRole(accountId:string,role:WorkspaceAccount['role'],assignedDepartment?:string) {
    try { await toolsApi.patch(`/accounts/${accountId}`,requireToken(),{role,department:assignedDepartment}); await reloadWorkspace(); toast.success(role==='issuer'?`Issuer access granted for ${assignedDepartment}`:'Account role updated'); }
    catch(error) { toast.error(error instanceof Error?error.message:'The account role could not be updated.'); }
  }
  function chooseSearchResult(result:WorkspaceSearchResult) {
    track('used workspace search',result.kind);
    const target=result.target;
    setFiltersOpen(false); setActionsOpen(false); setNotificationsOpen(false);
    if(target.type==='tool'){setTab('register');setSearch('');setSelectedId(target.toolId);return;}
    if(target.type==='tab'){
      if(['accounts','analytics','feedback'].includes(target.tab)&&currentAccount?.role!=='admin'){
        toast.error('This area is available to administrators.');
        return;
      }
      setTab(target.tab);setStatus('all');setSearch(target.query||'');return;
    }
    if(target.type==='modal'){setSearch('');if(target.modal==='source-register')openSourceRegister();else setModal({kind:target.modal});return;}
    setAppearance(target.appearance);setSearch('');track('theme changed',target.appearance==='dark'?'Dark':'Light');
  }
  async function submitFeedback(text:string,audio?:Blob) {
    try { const body=new FormData(); body.append('text',text); if(audio){const extension=audio.type==='audio/mp4'?'m4a':audio.type==='audio/ogg'?'ogg':audio.type==='audio/mpeg'?'mp3':audio.type.includes('wav')?'wav':'webm';body.append('audio',audio,`feedback.${extension}`);} await toolsApi.post('/feedback',requireToken(),body); await reloadWorkspace(); setModal(null); toast.success('Thank you — feedback saved.'); }
    catch(error) { toast.error(error instanceof Error?error.message:'Feedback could not be saved.'); }
  }
  async function applyImport(target:'equipment'|'employees',nextTools:Tool[],nextEmployees:Employee[]) {
    try { const rows=target==='equipment'?nextTools.map(item=>({register_number:item.id,name:item.name,make_model:item.make,serial_number:item.serial,category:item.category,equipment_kind:item.kind,storage_location:item.location,department:departmentOf(item),section:item.section,condition:item.condition,notes:item.notes})):nextEmployees.map(item=>({employee_number:item.employeeNumber,name:item.name,department:item.department,job_title:item.jobTitle,supervisor_name:item.supervisorName})); const result=await toolsApi.post<{accepted_count:number;rejected_count:number}>('/imports/commit',requireToken(),{target,rows}); await reloadWorkspace(); setModal(null); setTab(target==='equipment'?'register':'employees'); toast.success(`${result.accepted_count} records imported`,result.rejected_count?{description:`${result.rejected_count} rows need correction.`}:undefined); }
    catch(error) { toast.error(error instanceof Error?error.message:'The import could not be saved.'); }
  }
  const exportData:ExportTable = tab==='employees'?{title:'Tools employee register',headers:['Employee number','Name','Department','Job title'],rows:employees.map(item=>[item.employeeNumber,item.name,item.department,item.jobTitle||''])}:tab==='activity'?{title:'Tools issue and return history',headers:['Equipment','Event','Details','Recorded by','Date'],rows:visibleActivity.map(item=>[item.toolId,item.title,item.detail,item.recordedBy||'',item.time])}:tab==='analytics'?{title:'Tools usage analytics',headers:['Event','Details','Date'],rows:usage.map(item=>[item.name,item.detail||'',new Date(item.at).toLocaleString()])}:{title:'Tools and equipment register',headers:['Register number','Name','Department','Status','Employee','Location','Expected return'],rows:visibleTools.map(item=>[item.id,item.name,departmentOf(item),item.archived?'Archived':STATUS[item.status],item.holder||'',item.location,item.due||''])};
  async function markNotificationsViewed() {
    const keys=scopedNotifications.filter(alert=>!alert.read).map(alert=>alert.key);
    if (!keys.length||!currentAccount?.token) return;
    setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:true}:alert));
    try { await toolsApi.post('/notifications/read',currentAccount.token,{keys}); }
    catch(error) { setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:false}:alert)); toast.error(error instanceof Error?error.message:'Notifications could not be marked as viewed.'); }
  }


  const overview = <ToolsOverview counts={counts} open={overviewOpen} onOpenChange={setOverviewOpen} onShowAll={()=>filterTo('all')} onShowAvailable={()=>filterTo('available')} onShowLoans={()=>filterTo('all','loans')} onShowOverdue={()=>filterTo('overdue','loans')} reduced={!!reduced} duration={duration}/>;
  const register = <div className={s.registerBlock}>
    <div className={s.navigation}><div className={s.tabs} role="tablist" aria-label="Tools sections">{visibleTabs.map((item,index) => <button key={item.value} role="tab" id={`tools-tab-${item.value}`} tabIndex={tab === item.value ? 0 : -1} aria-selected={tab === item.value} aria-controls="tools-panel" onClick={() => { setTab(item.value); setStatus('all'); setFiltersOpen(false); track(`opened ${item.label.toLowerCase()}`); }} onKeyDown={event => { if (['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length-1 : (index + (event.key === 'ArrowRight' ? 1 : visibleTabs.length-1)) % visibleTabs.length; setTab(visibleTabs[next].value); setStatus('all'); document.getElementById(`tools-tab-${visibleTabs[next].value}`)?.focus(); } }}><Icon name={item.icon} size={18} />{item.label}{item.value === 'loans' && counts.issued>0 && <span className={s.tabCount}>{counts.issued}</span>}{tab === item.value && <motion.span layoutId="tools-tab-indicator" transition={{ duration }} className={s.tabLine} />}</button>)}</div><Help label="Workspace sections">Equipment is the live register, Source registers keeps original files, Employees lists recipients, and History is the audit trail. Administrators also manage accounts, analytics and feedback.</Help></div>
    <div className={s.toolbar}><ToolsWorkspaceSearch value={search} onChange={setSearch} results={workspaceSearchResults} onChoose={chooseSearchResult} inputRef={searchRef}/>{['register','loans'].includes(tab) && <><div className={s.filterCluster}><button className={s.secondary} aria-label="Open filter and sort controls" aria-expanded={filtersOpen} aria-controls="tools-filters" onClick={() => { const next = !filtersOpen; if (next) { announceToolsPopover('filters'); setActionsOpen(false); setNotificationsOpen(false); } setFiltersOpen(next); }}><Icon name="filter" />Filter &amp; sort{activeRefinements > 0 && <span className={s.filterCount}>{activeRefinements}</span>}<motion.span animate={{rotate:filtersOpen?180:0}} transition={{duration}}><Icon name="down" size={13}/></motion.span></button><Help label="Filters and sorting">Select Filter &amp; sort to narrow the register by status, category or location, or to change its order.</Help></div><div className={s.viewToggle} aria-label="View options"><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={18} /></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18} /></button></div></>}</div>
    <AnimatePresence initial={false}>{filtersOpen && ['register','loans'].includes(tab) && <motion.div id="tools-filters" className={s.filterReveal} initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }} transition={{ duration }}><div className={s.filters}>
      <div><span>Status</span><AnimatedSelect ariaLabel="Status" value={status} onChange={value=>setStatus(value as typeof status)} options={[{value:'all',label:'All active tools'},...Object.entries(STATUS).map(([value,label])=>({value,label})),...(tab!=='loans'?[{value:'archived',label:'Archived'}]:[])]}/></div>
      <div><span>Category</span><AnimatedSelect ariaLabel="Category filter" value={category} onChange={setCategory} options={[{value:'all',label:'All categories'},...CATEGORIES.map(value=>({value,label:value}))]}/></div>
      <label>Location<input aria-label="Filter by location" value={location==='all'?'':location} onChange={event=>setLocation(event.target.value||'all')} placeholder="Type any location…"/></label>
      <div><span>Sort</span><AnimatedSelect ariaLabel="Sort tools" value={sort} onChange={setSort} options={[{value:'register',label:'Register order'},{value:'name',label:'Name A–Z'},{value:'status',label:'Status'}]}/></div><button className={s.textButton} onClick={resetRefinements}><Icon name="reset" size={15} />Reset</button>
    </div></motion.div>}</AnimatePresence>
    {!['sources','accounts','analytics','feedback'].includes(tab)&&<div className={s.resultsHeader}><div className={s.resultLabel}><strong><AnimatedText value={`${tab}-${status}`}>{tab === 'activity' ? 'Issue and return history' : tab === 'employees' ? 'Employee register' : tab === 'loans' ? 'Equipment with employees' : status === 'archived' ? 'Archived equipment' : status !== 'all' ? STATUS[status] : 'Equipment register'}</AnimatedText></strong><span role="status" aria-live="polite"><AnimatedText value={tab === 'activity' ? `events-${visibleActivity.length}` : tab==='employees'?`employees-${employees.length}`:`tools-${visibleTools.length}`}>{tab === 'activity' ? `${visibleActivity.length} history records` : tab==='employees'?`${employees.length} ${employees.length===1?'employee':'employees'}`:`${visibleTools.length} ${visibleTools.length === 1 ? 'item' : 'items'}`}</AnimatedText></span>{(activeRefinements > 0 || search) && <button className={s.textButton} onClick={resetRefinements}>Clear search &amp; refinements</button>}</div>
      <div className={s.actionCluster} ref={actionsRef}><AnimatePresence initial={false}>{actionsOpen && <motion.div id="tools-actions" className={s.actionReveal} initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .3 }}><div className={s.secondaryActions}>{tab==='employees'?<button onClick={()=>{setActionsOpen(false);openManageModal({kind:'employee'});}}><Icon name="plus" size={16}/>Add employee</button>:tab!=='activity'?<><button onClick={() => {setActionsOpen(false);openAction('return');}} disabled={!counts.issued}><Icon name="back" size={16} />Record return</button><button onClick={() => {setActionsOpen(false);openManageModal({kind:'new'});}}><Icon name="plus" size={16} />Add equipment</button></>:null}<button onClick={()=>{setActionsOpen(false);openManageModal({kind:'import'});}}><Icon name="upload" size={16}/>Import</button><button onClick={()=>{setActionsOpen(false);setModal({kind:'export'});}}><Icon name="download" size={16}/>Download</button></div></motion.div>}</AnimatePresence><button className={s.actionsAnchor} aria-label="Actions" aria-controls="tools-actions" aria-expanded={actionsOpen} onClick={() => { const next = !actionsOpen; if (next) { announceToolsPopover('actions'); setFiltersOpen(false); setNotificationsOpen(false); } setActionsOpen(next); }}><Icon name="more" />Actions<motion.span animate={{ rotate: actionsOpen ? 180 : 0 }} transition={{ duration }}><Icon name="down" size={13} /></motion.span></button><Help label="Actions">Actions change with the section you are viewing and fold away when you do not need them.</Help></div>
    </div>}
    <div id="tools-panel" role="tabpanel" aria-labelledby={`tools-tab-${tab}`}>
      {tab === 'accounts'?<ToolsAccountAccess accounts={accounts} departments={departments} onUpdateRole={updateAccountRole}/>:tab==='sources'?<ToolsSourceRegisters items={sourceRegisters} search={search} onUpload={openSourceRegister}/>:tab === 'analytics'?<ToolsAnalytics usage={usage} errors={clientErrors} feedback={feedbackRecords}/>:tab==='feedback'?<ToolsFeedbackInbox items={feedbackRecords} onAdd={()=>setModal({kind:'feedback'})}/>:tab==='employees'?<ToolsPeople employees={employees} tools={tools} search={search} onAdd={()=>openManageModal({kind:'employee'})} onIssue={employee=>openAction('issue',undefined,employee)}/>:tab === 'activity' ? <div className={s.journal}>{visibleActivity.map(a=><button key={a.id} className={s.journalRow} onClick={()=>setSelectedId(a.toolId)}><span className={s.eventIcon}><Icon name="history" /></span><span><strong>{a.title}</strong><small>{a.detail}{a.recordedBy?` · Recorded by ${a.recordedBy}`:''}</small></span><time>{a.time}</time><Icon name="chevron" size={16} /></button>)}{!visibleActivity.length && <div className={s.empty}><Icon name="history" size={30}/><h2>No history yet</h2><p>Issue and return records will appear here with the employee, recorder and dates.</p></div>}</div>
        : !visibleTools.length ? <div className={s.empty}><Icon name={activeTools.length ? 'search' : 'box'} size={32}/><h2>{activeTools.length ? 'No matching equipment' : 'Start your equipment register'}</h2><p>{activeTools.length ? 'Try fewer filters or a different search.' : `Add the first tool or equipment item for ${department === 'all' ? 'your operation' : department}.`}</p><button className={s.primary} onClick={activeTools.length ? clearFilters : ()=>openManageModal({kind:'new'})}>{activeTools.length ? 'Clear search & filters' : 'Add the first item'}</button></div>
        : <AnimatePresence initial={false} mode="wait"><motion.div key={view} initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration}}><ToolsRegister tools={visibleTools} view={view} onSelect={setSelectedId} onAction={openAction}/></motion.div></AnimatePresence>}
    </div>
  </div>;
  const blocks: Record<SectionName,ReactNode> = { overview, register };
  return <ToolsPreferences.Provider value={{appearance,font:options.font,fontSize:options.fontSize,equipmentIcons:options.equipmentIcons,guidance:options.guidance}}><main className={`${s.surface} ${s.standalone}`} data-mode={appearance} data-font={options.font} data-sidebar={sidebarCollapsed?'collapsed':'open'} style={{'--font-scale':options.fontSize/100} as CSSProperties}><aside className={s.moduleSidebar} aria-label="Tools navigation"><div className={s.sidebarBrand}><span><Icon name="box" size={19}/></span>{!sidebarCollapsed&&<strong>Tools</strong>}<button aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setSidebarCollapsed(value=>!value)}><motion.span animate={{rotate:sidebarCollapsed?0:180}}><Icon name="chevron" size={15}/></motion.span></button></div><nav>{visibleTabs.map(item=><button key={item.value} aria-current={tab===item.value?'page':undefined} data-label={item.label} onClick={()=>{setTab(item.value);setSearch('');track('opened section',item.label);}}><Icon name={item.icon} size={18}/>{!sidebarCollapsed&&<span>{item.label}</span>}</button>)}</nav></aside><section className={s.workspace} aria-label="Tools and Equipment workspace">
    <div className={s.topline}><span className={s.wordmark}><span><Icon name="box" size={19}/></span>Tools &amp; Equipment</span><div className={s.previewControls}><ActionHint label="Share an idea, report a problem, or record audio feedback."><button className={s.feedbackButton} aria-label="Give feedback" onClick={()=>{setModal({kind:'feedback'});track('opened feedback');}}><Icon name="edit" size={16}/><span>Feedback</span></button></ActionHint><ToolsNotifications counts={counts} unread={unreadNotifications} open={notificationsOpen} onOpenChange={setNotificationsOpen} onViewed={markNotificationsViewed} duration={duration} onShowOverdue={()=>{filterTo('overdue','loans');setNotificationsOpen(false);}} onShowInspection={()=>{filterTo('attention');setNotificationsOpen(false);}}/><ActionHint label={`Use the ${appearance==='light'?'dark':'light'} appearance. Your choice is saved on this device.`}><button className={s.themeButton} aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} theme`} onClick={()=>{const next=appearance==='light'?'dark':'light';setAppearance(next);track('theme changed',next==='dark'?'Dark':'Light');}}><Icon name="appearance" size={17}/><span>{appearance==='light'?'Light':'Dark'}</span><small>Switch to {appearance==='light'?'dark':'light'}</small></button></ActionHint><ActionHint label="Adjust the layout, text size, typeface, equipment icons, and helpful hints."><button className={s.customizeButton} aria-label="Open settings" onClick={()=>setModal({kind:'customize'})}><Icon name="settings" size={17}/><span>Settings</span></button></ActionHint><ActionHint label={currentAccount?'View your account, role or sign out.':'Sign in to save records.'}><button className={s.accountButton} aria-label={currentAccount?`Account: ${currentAccount.name}`:'Sign in'} onClick={()=>setModal({kind:'auth'})}><Icon name="user" size={16}/><span>{currentAccount?.name||'Sign in'}</span>{currentAccount&&<i data-issuer={currentAccount.role==='issuer'}>{currentAccount.role==='admin'?'Admin':currentAccount.role==='issuer'?`Issuer · ${currentAccount.department}`:'Viewer'}</i>}</button></ActionHint></div></div>
    <header className={s.hero}><div className={s.heroCopy}><AnimatePresence initial={false}>{options.intro && <motion.div className={s.eyebrow} initial={{height:0,opacity:0,x:reduced?0:-6}} animate={{height:'auto',opacity:1,x:0}} exit={{height:0,opacity:0,x:reduced?0:-4}} transition={{duration}}>YOUR TOOLS, ACCOUNTED FOR</motion.div>}</AnimatePresence><div className={s.heroTitleRow}><motion.h1 initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:reduced?0:.065}}}}><motion.span variants={{hidden:{opacity:0,y:reduced?0:10},visible:{opacity:1,y:0}}}>Know where </motion.span><motion.span variants={{hidden:{opacity:0,y:reduced?0:10},visible:{opacity:1,y:0}}}>every </motion.span><motion.span className={s.titleAccent} variants={{hidden:{opacity:0,y:reduced?0:10},visible:{opacity:1,y:0}}}>tool is.</motion.span></motion.h1><button className={s.introToggle} aria-label={options.intro?'Hide introduction':'Show introduction'} aria-expanded={options.intro} aria-controls="tools-intro-copy" title={options.intro?'Collapse introduction':'Show introduction'} onClick={()=>setOptions(current=>({...current,intro:!current.intro}))}><motion.span animate={{rotate:options.intro?180:0}} transition={{duration}}><Icon name="down" size={15}/></motion.span></button></div><AnimatePresence initial={false}>{options.intro && <motion.p id="tools-intro-copy" className={s.heroIntro} initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration}}><motion.span initial="hidden" animate="visible" variants={{hidden:{},visible:{transition:{delayChildren:reduced?0:.08,staggerChildren:reduced?0:.07}}}}>{['Find it.','Hand it over.','Keep track.'].map(phrase=><motion.span key={phrase} variants={{hidden:{opacity:0,y:reduced?0:5},visible:{opacity:1,y:0}}}>{phrase}</motion.span>)}</motion.span></motion.p>}</AnimatePresence></div><button className={s.primary} onClick={()=>openAction('issue')} disabled={!counts.available}><Icon name="out" size={18}/>Issue a tool</button></header>
    <div className={s.workspaceBar}><div className={s.departmentSelect}><Icon name="department" size={17}/><AnimatedSelect ariaLabel="Department" value={department} onOpenChange={open=>{if(open){setFiltersOpen(false);setActionsOpen(false);setNotificationsOpen(false);}}} onChange={value=>{setDepartment(value);clearFilters();}} options={[{value:'all',label:'All departments'},...departments.map(value=>({value,label:value}))]}/></div><div className={s.quickTextSize} aria-label="Text size"><span aria-hidden="true">A</span><input aria-label="Text size" type="range" min="85" max="125" step="5" value={options.fontSize} onChange={event=>setOptions(current=>({...current,fontSize:Number(event.target.value)}))}/><strong>{options.fontSize}%</strong></div></div>
    <div className={s.liveFeedback} role="status" aria-live="polite"><AnimatedText value={feedback}>{feedback}</AnimatedText></div>
    <div className={s.workspaceSections}><AnimatePresence initial={false}>{options.order.filter(section=>!options.hidden.includes(section)).map(section=><motion.section key={section} aria-label={`${section} section`} layout={!reduced} initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={{duration}}>{blocks[section]}</motion.section>)}</AnimatePresence></div>

  </section></main>

  <ToolsDialog open={!!selected} onClose={()=>setSelectedId(null)} title={selected?.name || 'Tool details'} description={selected ? `${selected.id} · ${selected.make}` : ''} wide>
    {selected && <><div className={s.detailLead}><ToolSymbol kind={selected.kind} imageUrl={primaryToolImage(selected)} name={selected.name}/><div><StatusLabel status={selected.status} archived={selected.archived}/><p>{selected.category} · {departmentOf(selected)}{selected.section ? ` / ${selected.section}` : ''}</p></div><Help label="Tool details">Current custody, condition and supporting records. Edit details without changing the tool ID. Use a handover to change custody.</Help></div>
      <div className={s.detailColumns}><div><div className={s.fieldHeading}><h3>Full specifications</h3><span>Complete saved record</span></div><dl className={s.facts}>{selectedFacts.map(([label,value],index)=><div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {selected.status==='overdue' && <div className={s.notice}><Icon name="clock"/><div><strong>Return overdue</strong><p>Receive this tool or record an approved extension.</p></div></div>}{selected.status==='attention' && <div className={s.notice}><Icon name="alert"/><div><strong>Held for attention</strong><p>{selected.notes || 'Check the condition and supporting records before making this tool available.'}</p></div></div>}{selected.notes && selected.status!=='attention' && <p className={s.detailNote}>{selected.notes}</p>}</div>
      <div className={s.detailHistory}><div className={s.fieldHeading}><h3>Recent activity</h3><Help label="Movement history">Preview records show who holds the tool, the change and when it was recorded. Production audit records will be stored by the backend.</Help></div>{activity.filter(a=>a.toolId===selected.id).slice(0,4).map(a=><div key={a.id}><span/><p><strong>{a.title}</strong><small>{a.detail}</small><time>{a.time}</time></p></div>)}{!activity.some(a=>a.toolId===selected.id) && <p className={s.formHint}>No movements in this preview yet.</p>}</div></div>
      <div className={s.detailEvidence}><div className={s.fieldHeading}><strong>Condition evidence <small>{selected.evidence?.length || 0}</small></strong><button className={s.textButton} onClick={()=>openManageModal({kind:'attachments',tool:selected})}><Icon name="attachment" size={15}/>Add / manage files</button></div>{selected.evidence?.length ? <EvidenceGallery files={selected.evidence}/> : <p className={s.formHint}>Optional photos or PDF records of the tool’s condition.</p>}</div>
      <div className={s.detailActions}>{!selected.archived && (selected.status==='available' ? <button className={s.primary} onClick={()=>openAction('issue',selected)}>Issue tool<Icon name="out"/></button> : selected.status==='attention' ? <button className={s.primary} onClick={()=>openManageModal({kind:'ready',tool:selected})}><Icon name="check"/>Mark ready for use</button> : <><button className={s.primary} onClick={()=>openAction('return',selected)}>Receive return<Icon name="back"/></button><button className={s.secondary} onClick={()=>openAction('transfer',selected)}><Icon name="swap"/>Transfer</button><button className={s.secondary} onClick={()=>openAction('extend',selected)}><Icon name="clock"/>Extend</button></>)}<button className={s.secondary} onClick={()=>openManageModal({kind:'edit',tool:selected})}><Icon name="edit"/>Edit details</button><button className={s.textButton} disabled={!!selected.holder} title={selected.holder?'Receive this tool before archiving it.':'History is retained and the item can be restored.'} onClick={()=>archiveTool(selected)}><Icon name={selected.archived?'reset':'archive'} size={17}/>{selected.archived?'Restore tool':'Archive'}</button></div>
    </>}
  </ToolsDialog>
  <ToolsDialog open={!!modal} onClose={()=>setModal(null)} wide={['customize','feedback','import','export'].includes(modal?.kind||'')} title={modal?.kind==='customize'?'Settings':modal?.kind==='new'?'Add equipment':modal?.kind==='employee'?'Add an employee':modal?.kind==='auth'?'Workspace account':modal?.kind==='feedback'?'Feedback & suggestions':modal?.kind==='import'?'Import a register':modal?.kind==='source-register'?'Upload a source register':modal?.kind==='export'?'Download this view':modal?.kind==='edit'?'Edit equipment details':modal?.kind==='attachments'?'Condition evidence':modal?.kind==='ready'?'Return to ready for use':modal?TITLES[modal.kind]:''} description={modal?.kind==='customize'?'Display and workspace preferences.':modal?.kind==='attachments'?'Keep photos and supporting documents with the item.':modal?.kind==='employee'?'Add a person to this workspace’s independent register.':modal?.kind==='auth'?'Create an account or sign in. No email verification is required in this prototype.':modal?.kind==='feedback'?'Tell us what would make the product clearer, faster or more useful.':modal?.kind==='import'?'Preview and validate Excel, CSV or Word records before adding them.':modal?.kind==='source-register'?'Permanently preserve the original file before updating the live database.':modal?.kind==='ready'?'Record what was repaired or checked before releasing the tool.':modal?.kind==='export'?'A clean copy of the current section and filters.':'Just the details needed for a clear record.'}>
    {modal?.kind==='customize'?<ToolsCustomize options={options} setOptions={setOptions}/>:modal?.kind==='auth'?<ToolsAuth accounts={accounts} currentAccount={currentAccount} departments={departments} onCreate={createAccount} onLogin={login} onUpdateRole={updateAccountRole} onLogout={signOut} onCancel={()=>setModal(null)}/>:modal?.kind==='feedback'?<ToolsFeedback onSubmit={submitFeedback} onCancel={()=>setModal(null)}/>:modal?.kind==='import'?<ToolsImport onApply={applyImport} onCancel={()=>setModal(null)}/>:modal?.kind==='source-register'?<SourceRegisterForm departments={departments} onSave={saveSourceRegister} onCancel={()=>setModal(null)}/>:modal?.kind==='export'?<ToolsExport data={exportData} onDone={()=>{setModal(null);track('downloaded report',tab);}}/>:modal?.kind==='employee'?<EmployeeForm onSave={saveEmployee} onCancel={()=>setModal(null)}/>:modal?.kind==='new'||modal?.kind==='edit'?<ToolForm key={modal.kind==='edit'?modal.tool.id:'new'} initialTool={modal.kind==='edit'?modal.tool:undefined} defaultDepartment={department==='all'?'Engineering':department} addFiles={addFiles} onSave={saveTool} onCancel={()=>setModal(null)}/>:modal?.kind==='attachments'?<AttachmentForm key={modal.tool.id} tool={modal.tool} addFiles={addFiles} onSave={files=>void saveAttachments(modal.tool,files)}/>:modal?.kind==='ready'?<MarkReadyForm tool={modal.tool} onSave={note=>void markToolReady(modal.tool,note)} onCancel={()=>setModal(null)}/>:modal&&'tool' in modal?<MovementForm key={`${modal.kind}-${modal.tool?.id || 'select'}-${('employee' in modal?modal.employee?.id:'')||''}`} kind={modal.kind} initialTool={modal.tool} initialEmployee={'employee' in modal?modal.employee:undefined} tools={scope} employees={employees} locationSuggestions={locationSuggestions} equipmentSuggestions={equipmentSuggestions} issuerDepartment={currentAccount?.department} addFiles={addFiles} onSave={saveMovement} onCancel={()=>setModal(null)}/>:null}
  </ToolsDialog>
  </ToolsPreferences.Provider>;
}

