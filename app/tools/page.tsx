'use client';

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/config';
import { ToolsIcon as Icon } from './ToolsIcon';
import { ToolSymbol } from './ToolSymbol';
import { EmployeeForm, MarkReadyForm, MovementForm, ToolForm, TITLES } from './ToolsForms';
import { ToolsDialog, ToolsPreferences, Help, ActionHint, AnimatedText, EvidencePicker, EvidenceGallery, tileEmergeProps, type AddEvidence } from './ToolsUI';
import { ToolsRegister, StatusLabel } from './ToolsRegister';
import { ToolsCustomize, DEFAULT_OPTIONS, type SectionName } from './ToolsCustomize';
import { ToolsWorkspaceSearch } from './ToolsWorkspaceSearch';
import { ToolsNotifications } from './ToolsNotifications';
import { ToolsProfileMenu } from './ToolsProfileMenu';
import { ToolsHomepage } from './ToolsHomepage';

import { ToolsPeople } from './ToolsPeople';
import { EligibleEmployeesList } from './ToolsEligibility';
import { ToolsAccountAccess, ToolsAuth } from './ToolsAuth';
import { ToolsAnalytics, type ClientError, type FeedbackRecord, type UsageEvent } from './ToolsAnalytics';
import { ToolsFeedback } from './ToolsFeedback';
import { ToolsImport } from './ToolsImport';
import { ToolsExport } from './ToolsExport';
import { ToolsFeedbackInbox } from './ToolsFeedbackInbox';
import { SourceRegisterForm, ToolsSourceRegisters, type SourceRegisterRecord } from './ToolsSourceRegisters';
import { INCIDENT_LABELS, ToolsCompliance } from './ToolsCompliance';
import type { ApprovalRole, ComplianceData, InspectionType } from './complianceTypes';
import { AnimatedSelect } from './AnimatedSelect';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import { clearToolsSession, readToolsSession, saveToolsSession } from './toolsSession';
import type { ExportTable } from './toolsExports';
import { historyReducer } from './history';
import { ToolsApiError, toolsApi, toolsLoginErrorMessage } from './toolsApi';
import { countTools, selectVisibleActivity, selectVisibleTools, type ToolsTab } from './toolSelectors';
import { buildWorkspaceSearchIndex, searchWorkspace, type WorkspaceSearchResult } from './toolsSearch';
import { APPEARANCE_KEY, migrateAppearance, persistAppearance } from '@/components/ui-system/appearance/appearance';
import { parseToolsPreferences, saveToolsPreferences, TOOLS_PREFERENCES_KEY } from './toolsPreferences';
import { DEFAULT_ICON_PACK, loadSidebarNav, rankTabs, recordTabUse, saveSidebarNav, type SidebarNavState } from './sidebarNav';
import { SidebarIcon } from './ToolsSidebarIcon';
import { abbreviateDepartment, categoryOf, inferEquipmentKind, primaryToolImage, SEED_TOOLS, SEED_ACTIVITY, CATEGORIES, DEPARTMENTS, STATUS, departmentOf, type Status, type Tool, type Movement, type ActionKind, type Employee, type Evidence, type WorkspaceAccount } from './prototype';
import { loadToolsWorkspace, mapAnalytics, type ServerTool, type ToolNotification, type WorkspaceSource, type WorkspaceSourceResult } from './workspaceLoad';
import s from './tools.module.css';
import { Button, LoadingPulse } from '@/components/ui-system';

type Modal = { kind: ActionKind; tool?: Tool; employee?: Employee } | { kind: 'new'|'employee'|'auth'|'feedback'|'customize'|'import'|'export'|'source-register' } | { kind: 'edit'|'attachments'|'ready'; tool: Tool } | null;
const tabs = [{ value: 'homepage', label: 'Overview', icon: 'home' }, { value: 'register', label: 'Equipment', icon: 'box' }, { value: 'loans', label: 'In use', icon: 'out' }, { value: 'employees', label: 'Employees', icon: 'user' }, { value: 'compliance', label: 'Compliance', icon: 'check', signedInOnly:true }, { value: 'activity', label: 'History', icon: 'history' }, { value: 'sources', label: 'Source registers', icon: 'upload', signedInOnly: true }, { value: 'accounts', label: 'Account access', icon: 'accounts', adminOnly: true }, { value: 'analytics', label: 'Analytics', icon: 'analytics', adminOnly: true }, { value: 'feedback', label: 'Feedback', icon: 'edit', adminOnly: true }] as const;
function AttachmentForm({ tool, addFiles, onSave }: { tool: Tool; addFiles: AddEvidence; onSave: (files: Evidence[]) => void }) {
  const [files, setFiles] = useState(tool.evidence || []);
  return <div className={s.form}><EvidencePicker value={files} onChange={setFiles} addFiles={addFiles} /><div className={s.formFooter}><Button variant="primary" size="lg" className={`${s.sharedButton}`} onClick={() => onSave(files)}>Save attachments<Icon name="check" size={16} /></Button></div></div>;
}

const displayTimestamp = (value?:string) => { if (!value) return undefined; const parsed=new Date(value); return Number.isNaN(parsed.valueOf())?value:parsed.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
const fromServerTool = (row:ServerTool):Tool => ({ id:row.register_number,backendId:row.id,name:row.name,make:row.make_model||'',serial:row.serial_number||'',category:categoryOf(row.name,row.category),kind:inferEquipmentKind(row.name,categoryOf(row.name,row.category),row.equipment_kind),status:row.status,location:row.storage_location,department:row.department,section:row.section,condition:row.condition||'Good',notes:row.notes,approvalRef:row.approval_ref,calibration:row.calibration,specifications:row.specifications||{},archived:row.archived,holder:row.custody?.employee_name,due:displayTimestamp(row.custody?.expected_return_at),dueISO:row.custody?.expected_return_at,originalDue:displayTimestamp(row.custody?.original_due_at),job:row.custody?.job_reference,assignedEquipment:row.custody?.assigned_equipment||[],evidence:(row.evidence||[]).filter(item=>item.url).map(item=>({id:item.id,name:item.original_name,type:item.content_type,size:item.size_bytes,url:item.url!})),homeStorageLocation:row.home_storage_location,storageConditions:row.storage_conditions,maintenanceRequirements:row.maintenance_requirements,preUseCheckRequired:row.pre_use_check_required,weeklyInspectionRequired:row.weekly_inspection_required,monthlyInspectionRequired:row.monthly_inspection_required,quarterlyInspectionRequired:row.quarterly_inspection_required,calibrationRequired:row.calibration_required,calibrationFrequencyDays:row.calibration_frequency_days,replacementValue:row.replacement_value,criticality:row.criticality,cctvRequired:row.cctv_required,gpsRequired:row.gps_required,requiredPpe:row.required_ppe||[],ownershipType:row.ownership_type||'company',contractorName:row.contractor_name,oemManualRef:row.oem_manual_ref,purchaseDate:row.purchase_date??undefined,procurementCost:row.procurement_cost??undefined,insured:row.insured??undefined,lastVerified:row.last_verified??undefined,workingStatus:row.working_status??undefined,eligibleEmployees:(row.eligible_employees||[]).map(item=>({id:item.id,employeeNumber:item.employee_number,name:item.name,department:item.department,jobTitle:item.job_title})),inspectionDue:row.inspection_due||[],latestInspections:row.latest_inspections||{} });

type SourceState={loaded:boolean;loading:boolean;error?:string};
const emptySourceState=():Record<WorkspaceSource,SourceState>=>({employees:{loaded:false,loading:false},tools:{loaded:false,loading:false},history:{loaded:false,loading:false},sources:{loaded:false,loading:false},notifications:{loaded:false,loading:false},compliance:{loaded:false,loading:false},analytics:{loaded:false,loading:false},accounts:{loaded:false,loading:false}});
function ToolsDataState({title,state,onRetry,compact=false}:{title:string;state:SourceState;onRetry:()=>void;compact?:boolean}) {
  // The same loading animation as every other page (ui-system LoadingPulse).
  if(state.loading&&!state.loaded) return <LoadingPulse label={`Loading ${title.toLowerCase()}`} compact={compact} />;
  if(state.error) return <div className={`${s.dataState} ${s.dataStateError} ${compact?s.dataStateCompact:''}`} role="alert"><Icon name="alert" size={20}/><div><strong>{state.loaded?`${title} may be out of date`:`${title} unavailable`}</strong><p>{state.error}</p></div><Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={onRetry}>{state.loading?'Retrying…':'Retry'}</Button></div>;
  if(state.loading&&state.loaded) return <div className={`${s.dataState} ${s.dataStateCompact} ${s.dataStateRefreshing}`} role="status"><span className={s.loadingSignal} aria-hidden="true"><i/><i/><i/></span><div><strong>Refreshing {title.toLowerCase()}</strong><p>Current records remain visible.</p></div></div>;
  return null;
}

export default function ToolsPage() {
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
  const [complianceData,setComplianceData]=useState<ComplianceData>({competencies:[],inspections:[],incidents:[],gate_passes:[]});
  const [sourceState,setSourceState]=useState(emptySourceState);
  const [sessionChecking,setSessionChecking]=useState(true);
  const [tab, setTab] = useState<ToolsTab>('homepage');
  const [view, setViewState] = useState<'grid' | 'list'>('list');
  const [viewChosen, setViewChosen] = useState(false);
  const setView = (next: 'grid' | 'list') => { setViewState(next); setViewChosen(true); };
  const [department, setDepartment] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all' | 'archived'>('all');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [sort, setSort] = useState('register');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [preferencesReady,setPreferencesReady]=useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [feedback, setFeedback] = useState('');
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : .25;
  const searchRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const feedbackFabRef=useRef<HTMLDivElement>(null);
  const [sidebarNav,setSidebarNav]=useState<SidebarNavState>({recent:[],iconsOpen:true,iconPack:DEFAULT_ICON_PACK});
  const reloadRef = useRef<(account?:WorkspaceAccount|null)=>Promise<void>>(async()=>{});
  const loadRequestId = useRef(0);
  const loadAbortRef = useRef<AbortController|null>(null);
  const objectUrls = useRef<string[]>([]);
  useEffect(() => () => { loadAbortRef.current?.abort();objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const saved = parseToolsPreferences(window.localStorage.getItem(TOOLS_PREFERENCES_KEY));
    // Shared appearance (v1 > Tools > legacy > defaults) owns font/size/guidance;
    // Tools prefs still own view, sidebar, and section layout.
    const shared = migrateAppearance(window.localStorage);
    setOptions({ ...(saved ? saved.options : { ...DEFAULT_OPTIONS }), font: shared.font, fontSize: shared.fontSize, guidance: shared.guidance });
    if (saved) {
      setViewState(saved.view);
      setViewChosen(saved.viewChosen === true);
      setSidebarCollapsed(saved.sidebarCollapsed);
      setSidebarNav(loadSidebarNav(window.localStorage));
    }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    saveToolsPreferences({ options, view, viewChosen, sidebarCollapsed });
    persistAppearance(window.localStorage, { version: 1, font: options.font, fontSize: options.fontSize, guidance: options.guidance });
    saveSidebarNav(window.localStorage, sidebarNav);
  }, [options, view, viewChosen, sidebarCollapsed, sidebarNav, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== APPEARANCE_KEY) return;
      const shared = migrateAppearance(window.localStorage);
      setOptions(previous => ({ ...previous, font: shared.font, fontSize: shared.fontSize, guidance: shared.guidance }));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [preferencesReady]);
  useEffect(()=>{if(!feedbackOpen)return;const onPointerDown=(event:PointerEvent)=>{if(!feedbackFabRef.current?.contains(event.target as Node))setFeedbackOpen(false);};const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setFeedbackOpen(false);};const onAnother=(event:Event)=>{if((event as CustomEvent<string>).detail!=='feedback')setFeedbackOpen(false);};document.addEventListener('pointerdown',onPointerDown);document.addEventListener('keydown',onKey);window.addEventListener(TOOLS_POPOVER_EVENT,onAnother);return()=>{document.removeEventListener('pointerdown',onPointerDown);document.removeEventListener('keydown',onKey);window.removeEventListener(TOOLS_POPOVER_EVENT,onAnother);};},[feedbackOpen]);
  useEffect(() => {
    void (async()=>{try {
      const account = readToolsSession(window.localStorage);
      if (!account) return;
      if (account.id && account.name && account.username && account.token) {
        try {
          const fresh=await toolsApi.get<{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:ApprovalRole[];signing_pin_configured?:boolean}>('/auth/me',account.token);
          const updated:WorkspaceAccount={id:fresh.id,name:fresh.name,username:fresh.username,password:'',role:fresh.role,department:fresh.department,canIssue:fresh.can_issue,approvalRoles:fresh.approval_roles||[],signingPinConfigured:fresh.signing_pin_configured,token:account.token};
          saveToolsSession(window.localStorage,updated);setCurrentAccount(updated);
        } catch(error) {
          clearToolsSession(window.localStorage);
          if(error instanceof ToolsApiError&&error.status===401) toast.error('Your saved Tools session expired. Please sign in again.');
          else toast.error('Your saved Tools session could not be checked.',{description:error instanceof Error?error.message:undefined});
        }
      }
      else clearToolsSession(window.localStorage);
    } catch { clearToolsSession(window.localStorage); }
    finally { setSessionChecking(false); }})();
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

  async function reloadWorkspace(account = currentAccount) {
    if (!account?.token) return;
    loadAbortRef.current?.abort();
    const controller=new AbortController();
    loadAbortRef.current=controller;
    const requestId=++loadRequestId.current;
    const requested:WorkspaceSource[]=['employees','tools','history','sources','notifications','compliance',...(account.role==='admin'?['analytics','accounts'] as WorkspaceSource[]:[])];
    setSourceState(current=>Object.fromEntries(Object.entries(current).map(([source,state])=>[source,requested.includes(source as WorkspaceSource)?{...state,loading:true,error:undefined}:state])) as Record<WorkspaceSource,SourceState>);
    const applySource=({source,value,error}:WorkspaceSourceResult)=>{
      if(controller.signal.aborted||requestId!==loadRequestId.current) return;
      if(value!==undefined) {
        if(source==='employees') setEmployees(value.map(row=>({id:row.employee_number,backendId:row.id,employeeNumber:row.employee_number,name:row.name,department:row.department,jobTitle:row.job_title,supervisorName:row.supervisor_name,active:row.active})));
        else if(source==='tools') dispatch({type:'replace-tools',tools:value.map(fromServerTool)});
        else if(source==='history') dispatch({type:'replace-activity',activity:value.map(row=>({id:row.id,toolId:row.tool_id,title:`${row.tool_name} · ${row.action}`,detail:row.detail||row.employee_name||'',time:new Date(row.event_at).toLocaleString(),recordedBy:row.actor_name}))});
        else if(source==='sources') setSourceRegisters(value);
        else if(source==='notifications') setNotificationAlerts(value.alerts);
        else if(source==='compliance') setComplianceData(value);
        else if(source==='analytics') { const mapped=mapAnalytics(value);setUsage(mapped.usage);setClientErrors(mapped.errors);setFeedbackRecords(mapped.feedback); }
        else if(source==='accounts') setAccounts(value.map(item=>({...item,password:'',canIssue:item.can_issue,approvalRoles:item.approval_roles||[],signingPinConfigured:item.signing_pin_configured})));
      }
      setSourceState(current=>({...current,[source]:{loaded:value!==undefined||current[source].loaded,loading:false,error}}));
    };
    try { await loadToolsWorkspace(account.token,account.role,toolsApi.get,controller.signal,applySource); }
    catch(error) { if(controller.signal.aborted) return;throw error; }
    if(account.role!=='admin') { setUsage([]);setClientErrors([]);setFeedbackRecords([]);setAccounts([]); }
  }
  reloadRef.current=reloadWorkspace;
  useEffect(()=>{ if (!currentAccount?.token) return; void reloadRef.current(currentAccount).catch(error=>{if(error instanceof ToolsApiError&&error.status===401){signOut(false);toast.error('Your saved session expired. Please sign in again.');return;}toast.error(error instanceof Error?error.message:'Could not load Tools & Equipment.');}); },[currentAccount]);
  useEffect(()=>{
    if (!sessionChecking && !currentAccount) setModal(current=>current?.kind==='auth'?current:{kind:'auth'});
  },[sessionChecking,currentAccount]);
  useEffect(()=>{
    if (currentAccount?.role!=='admin' && currentAccount?.department) setDepartment(currentAccount.department);
  },[currentAccount?.role,currentAccount?.department]);

  const departments = [...new Set([...DEPARTMENTS, ...tools.map(departmentOf)])];
  const accountDepartments = currentAccount?.role==='admin' || !currentAccount?.department ? departments : [currentAccount.department,...departments.filter(value=>value!==currentAccount.department)];
  const canSeeAllDepartments = !currentAccount || currentAccount.role==='admin' || !currentAccount.department;
  const departmentOptions = [...(canSeeAllDepartments?[{value:'all',label:'All departments'}]:[]),...accountDepartments.map(value=>({value,label:value}))];
  const visibleTabs = tabs.filter(item=>(!('signedInOnly' in item)||!item.signedInOnly||!!currentAccount)&&(!('adminOnly' in item)||!item.adminOnly||currentAccount?.role==='admin'));
  const scope = tools.filter(t => department === 'all' || departmentOf(t) === department);
  const activeTools = scope.filter(t => !t.archived);
  const scopedNotifications=notificationAlerts.filter(alert=>department==='all'||alert.department===department);
  const counts={...countTools(scope),inspectionDue:scopedNotifications.filter(alert=>alert.kind==='inspection_due').length,investigationsOverdue:scopedNotifications.filter(alert=>alert.kind==='investigation_overdue').length,overdueEscalations:scopedNotifications.filter(alert=>alert.kind==='overdue_6h').length};
  const unreadNotifications=scopedNotifications.filter(alert=>!alert.read).length;
  const visibleTools = useMemo(() => selectVisibleTools(tools,{department,status,search,category,location,tab,sort}), [tools, department, status, search, category, location, tab, sort]);
  const visibleActivity = selectVisibleActivity(activity,scope,search);
  const activeSource:WorkspaceSource=tab==='employees'?'employees':tab==='activity'?'history':tab==='sources'?'sources':tab==='accounts'?'accounts':tab==='compliance'?'compliance':tab==='analytics'||tab==='feedback'?'analytics':'tools';
  const activeSourceState=sourceState[activeSource];
  const activeSourceTitle=tab==='employees'?'Employee register':tab==='activity'?'Issue and return history':tab==='sources'?'Source registers':tab==='accounts'?'Account access':tab==='compliance'?'Compliance records':tab==='analytics'?'Analytics':tab==='feedback'?'Feedback':'Equipment register';
  const authenticationRequired=!sessionChecking&&!currentAccount;
  const retryWorkspace=()=>void reloadWorkspace(currentAccount);
  const selected = tools.find(t => t.id === selectedId);
  const selectedFacts:Array<[string,string]> = selected ? [
    ['Register number',selected.id],['Make / model',selected.make||'Not recorded'],['Serial number',selected.serial||'Not recorded'],['Category',selected.category],['Equipment type',selected.kind.replaceAll('-',' ')],['Ownership',selected.ownershipType==='contractor'?`Contractor · ${selected.contractorName||'Not recorded'}`:'Company owned'],['OEM manual / checklist',selected.oemManualRef||'Not recorded'],['Department',departmentOf(selected)],['Section',selected.section||'Not recorded'],['Current location',selected.location],['Designated storage',selected.homeStorageLocation||selected.location],['Storage conditions',selected.storageConditions||'Not recorded'],['Maintenance requirements',selected.maintenanceRequirements||'Not recorded'],['Required PPE',selected.requiredPpe?.join(', ')||'Not recorded'],['Criticality',selected.criticality?.replaceAll('_',' ')||'Standard'],['Safeguards',[selected.cctvRequired&&'CCTV',selected.gpsRequired&&'GPS'].filter(Boolean).join(' · ')||'Standard locked storage'],['Condition',selected.condition],['Working status',selected.workingStatus==='working'?'Working':selected.workingStatus==='not_working'?'Not working':'Not recorded'],['Date of purchase',selected.purchaseDate||'Not recorded'],['Procurement cost',selected.procurementCost!=null?`USD ${selected.procurementCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'Not recorded'],['Insured',selected.insured==null?'Not recorded':selected.insured?'Yes':'No'],['Last verified',selected.lastVerified||'Not recorded'],['With',selected.holder||'Tool room'],
    ...(selected.holder?[['Expected return',selected.due||'Not recorded'],...(selected.originalDue&&selected.originalDue!==selected.due?[['Original deadline',selected.originalDue] as [string,string]]:[]),['Work order',selected.job||'Not recorded'],['Used for',selected.assignedEquipment?.join(', ')||'Not recorded']] as Array<[string,string]>:[]),
    ...Object.entries(selected.specifications||{}),...(selected.calibration?[['Calibration',selected.calibration] as [string,string]]:[]),...(selected.approvalRef?[['Register approval',selected.approvalRef] as [string,string]]:[]),['Checks due',selected.inspectionDue?.map(item=>item.replaceAll('_',' ')).join(', ')||'None'],
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
      await toolsApi.post(`/tools/${current.backendId}/commands`,requireToken(),{kind:input.kind,employee_id:employee?.backendId||employee?.employeeNumber,employee_name:employee?.name,department:input.department,location:input.location,expected_return_at:input.dueISO||input.due,job_reference:input.job,assigned_equipment:input.assignedEquipment||[],condition:input.condition,notes:input.notes,approval_ref:input.approvalRef,calibration:input.calibration,pre_use_check_completed:input.preUseCheckCompleted,override_due_checks:input.overrideDueChecks||undefined,override_reason:input.overrideReason||undefined,idempotency_key:crypto.randomUUID()});
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
      const editing=modal?.kind==='edit';
      const payload={register_number:tool.id||undefined,name:tool.name,make_model:tool.make,serial_number:tool.serial,category:tool.category,equipment_kind:tool.kind,storage_location:tool.location,department:departmentOf(tool),section:tool.section,condition:tool.condition,notes:tool.notes,approval_ref:tool.approvalRef,calibration:tool.calibration,specifications:tool.specifications||{},home_storage_location:tool.homeStorageLocation,storage_conditions:tool.storageConditions,maintenance_requirements:tool.maintenanceRequirements,pre_use_check_required:tool.preUseCheckRequired,weekly_inspection_required:tool.weeklyInspectionRequired,monthly_inspection_required:tool.monthlyInspectionRequired,quarterly_inspection_required:tool.quarterlyInspectionRequired,calibration_required:tool.calibrationRequired,calibration_frequency_days:tool.calibrationFrequencyDays,replacement_value:tool.replacementValue,criticality:tool.criticality,cctv_required:tool.cctvRequired,gps_required:tool.gpsRequired,required_ppe:tool.requiredPpe||[],ownership_type:tool.ownershipType||'company',contractor_name:tool.contractorName,oem_manual_ref:tool.oemManualRef,purchase_date:tool.purchaseDate||undefined,procurement_cost:tool.procurementCost,insured:tool.insured,last_verified:tool.lastVerified||undefined,working_status:tool.workingStatus};
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
  // Archives each ticked item in turn (the route toggles, so only active, un-issued items are sent); one failure does not stop the rest.
  async function archiveTools(list:Tool[]) {
    if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setModal({kind:'auth'}); toast.error('An administrator or Issuer account is required to archive equipment.'); return; }
    const failed:string[]=[]; let done=0;
    for (const tool of list.filter(item=>item.backendId&&!item.archived&&!item.holder)) {
      try { await toolsApi.post(`/tools/${tool.backendId}/archive`,requireToken()); done+=1; } catch { failed.push(tool.id); }
    }
    await reloadWorkspace();
    if (failed.length) toast.error(`${done} archived. ${failed.length} could not be archived: ${failed.slice(0,4).join(', ')}${failed.length>4?'…':''}. Try those again.`);
    else toast.success(`${done} ${done===1?'item':'items'} archived`);
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
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:ApprovalRole[];signing_pin_configured?:boolean}}>('/auth/register',{name:account.name,username:account.username,password:account.password}); const saved:WorkspaceAccount={...account,id:data.account.id,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,approvalRoles:data.account.approval_roles||[],signingPinConfigured:data.account.signing_pin_configured,token:data.token}; saveToolsSession(window.localStorage,saved); setCurrentAccount(saved); setModal(null); toast.success(`Welcome, ${saved.name}`); }
    catch(error) { toast.error(error instanceof Error?error.message:'The account could not be created.'); }
  }
  async function login(username:string,password:string):Promise<true|string> {
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:ApprovalRole[];signing_pin_configured?:boolean}}>('/auth/login',{username,password}); const account:WorkspaceAccount={id:data.account.id,name:data.account.name,username:data.account.username,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,approvalRoles:data.account.approval_roles||[],signingPinConfigured:data.account.signing_pin_configured,token:data.token}; saveToolsSession(window.localStorage,account); setCurrentAccount(account); setModal(null); toast.success(`Signed in as ${account.name}`); return true; }
    catch(error) { return toolsLoginErrorMessage(error); }
  }
  function signOut(showToast=true) { loadAbortRef.current?.abort();loadRequestId.current+=1;clearToolsSession(window.localStorage);setCurrentAccount(null);setSourceState(emptySourceState());setEmployees([]);setSourceRegisters([]);setUsage([]);setClientErrors([]);setFeedbackRecords([]);setNotificationAlerts([]);setComplianceData({competencies:[],inspections:[],incidents:[],gate_passes:[]});dispatch({type:'reset',snapshot:{tools:SEED_TOOLS,activity:SEED_ACTIVITY}});setModal({kind:'auth'});if(showToast)toast.success('Signed out'); }
  function track(name:string,detail?:string) { const event={id:crypto.randomUUID(),name,detail,at:new Date().toISOString()}; setUsage(current=>[event,...current]); if(currentAccount?.token)void toolsApi.post('/analytics/usage',currentAccount.token,{event:name,detail}).catch(()=>{}); }
  async function updateAccountRole(accountId:string,role:WorkspaceAccount['role'],assignedDepartment?:string,approvalRoles:ApprovalRole[]=[] ) {
    try { await toolsApi.patch(`/accounts/${accountId}`,requireToken(),{role,department:assignedDepartment,approval_roles:approvalRoles}); await reloadWorkspace(); toast.success(role==='issuer'?`Issuer access granted for ${assignedDepartment}`:'Account access updated'); }
    catch(error) { toast.error(error instanceof Error?error.message:'The account role could not be updated.'); }
  }
  // Deactivates each ticked person in turn; one refusal (for example someone who still holds equipment) does not stop the rest.
  async function deactivateEmployees(list:Employee[]) {
    const failed:string[]=[]; let done=0;
    for (const employee of list.filter(item=>item.backendId&&item.active)) {
      try { await toolsApi.patch(`/employees/${employee.backendId}`,requireToken(),{active:false}); done+=1; } catch { failed.push(employee.name); }
    }
    await reloadWorkspace();
    if (failed.length) toast.error(`${done} deactivated. ${failed.length} could not be deactivated: ${failed.slice(0,4).join(', ')}${failed.length>4?'…':''}. Try those again.`);
    else toast.success(`${done} ${done===1?'person':'people'} deactivated`);
  }
  async function setEmployeeActive(employee:Employee,active:boolean) {
    if (!employee.backendId) return;
    try { await toolsApi.patch(`/employees/${employee.backendId}`,requireToken(),{active});await reloadWorkspace();toast.success(active?`${employee.name} is active again`:`${employee.name} is deactivated`); }
    catch(error){toast.error(error instanceof Error?error.message:'The employee could not be changed.');}
  }
  async function saveCompetency(value:{employee_id:string;tool_id:string;trained:boolean;qualified:boolean;authorized:boolean;authorized_by?:string;training_certificate_ref?:string;training_expires_at?:string;qualification_ref?:string;qualification_expires_at?:string;authorization_expires_at?:string;notes?:string}) {
    try { await toolsApi.post('/competencies',requireToken(),value);await reloadWorkspace();toast.success('Competency record saved'); }
    catch(error){toast.error(error instanceof Error?error.message:'The competency record could not be saved.');}
  }
  async function recordInspection(toolId:string,value:{inspection_type:InspectionType;outcome:'passed'|'conditional'|'failed';next_due_at?:string;condition?:string;defects?:string;notes?:string;repair_quote?:number;new_equipment_price?:number}) {
    try { await toolsApi.post(`/tools/${toolId}/inspections`,requireToken(),value);await reloadWorkspace();toast.success(value.outcome==='failed'?'Inspection recorded and equipment held':'Inspection recorded'); }
    catch(error){toast.error(error instanceof Error?error.message:'The inspection could not be saved.');}
  }
  async function reportIncident(toolId:string,value:{incident_type:'lost'|'damaged'|'stolen'|'missing_components'|'late_return';occurred_at:string;employee_id?:string;explanation:string}) {
    try { await toolsApi.post(`/tools/${toolId}/incidents`,requireToken(),value);await reloadWorkspace();toast.success('Incident reported and investigation opened'); }
    catch(error){toast.error(error instanceof Error?error.message:'The incident could not be reported.');}
  }
  async function closeIncident(incidentId:string,value:{investigation_outcome:string;negligence_confirmed:boolean;replacement_cost?:number;recovery_months?:number}) {
    try { await toolsApi.post(`/incidents/${incidentId}/close`,requireToken(),value);await reloadWorkspace();toast.success('Investigation closed'); }
    catch(error){toast.error(error instanceof Error?error.message:'The investigation could not be closed.');}
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
    if(target.type==='modal'){setSearch('');if(target.modal==='source-register')openSourceRegister();else setModal({kind:target.modal});}
  }
  async function submitFeedback(text:string,audio?:Blob) {
    try { const body=new FormData(); body.append('text',text); if(audio){const extension=audio.type==='audio/mp4'?'m4a':audio.type==='audio/ogg'?'ogg':audio.type==='audio/mpeg'?'mp3':audio.type.includes('wav')?'wav':'webm';body.append('audio',audio,`feedback.${extension}`);} await toolsApi.post('/feedback',requireToken(),body); await reloadWorkspace(); setModal(null); toast.success('Thank you — feedback saved.'); }
    catch(error) { toast.error(error instanceof Error?error.message:'Feedback could not be saved.'); }
  }
  async function applyImport(target:'equipment'|'employees',nextTools:Tool[],nextEmployees:Employee[]) {
    try { const rows=target==='equipment'?nextTools.map(item=>({register_number:item.id,name:item.name,make_model:item.make,serial_number:item.serial,category:item.category,equipment_kind:item.kind,storage_location:item.location,department:departmentOf(item),section:item.section,condition:item.condition,notes:item.notes})):nextEmployees.map(item=>({employee_number:item.employeeNumber,name:item.name,department:item.department,job_title:item.jobTitle,supervisor_name:item.supervisorName})); const result=await toolsApi.post<{accepted_count:number;rejected_count:number}>('/imports/commit',requireToken(),{target,rows}); await reloadWorkspace(); setModal(null); setTab(target==='equipment'?'register':'employees'); toast.success(`${result.accepted_count} ${result.accepted_count===1?'record':'records'} imported`,result.rejected_count?{description:`${result.rejected_count} rows need correction.`}:undefined); }
    catch(error) { toast.error(error instanceof Error?error.message:'The import could not be saved.'); }
  }
  const exportData:ExportTable = tab==='employees'?{title:'Tools employee register',headers:['Employee number','Name','Department','Job title'],rows:employees.map(item=>[item.employeeNumber,item.name,item.department,item.jobTitle||''])}:tab==='activity'?{title:'Tools issue and return history',headers:['Equipment','Event','Details','Recorded by','Date'],rows:visibleActivity.map(item=>[item.toolId,item.title,item.detail,item.recordedBy||'',item.time])}:tab==='analytics'?{title:'Tools usage analytics',headers:['Event','Details','Date'],rows:usage.map(item=>[item.name,item.detail||'',new Date(item.at).toLocaleString()])}:{title:'Tools and equipment register',subtitle:`${department==='all'?'All departments':department} · ${visibleTools.length} ${visibleTools.length===1?'item':'items'}${status==='archived'?' · archived':''}${category!=='all'?` · ${category}`:''}`,headers:['Register number','Name','Category','Department','Status','Condition','Working status','Date of purchase','Procurement cost (USD)','Insured','Last verified','Held by','Location','Expected return'],rows:visibleTools.map(item=>[item.id,item.name,item.category,departmentOf(item),item.archived?'Archived':STATUS[item.status],item.condition||'',item.workingStatus==='working'?'Working':item.workingStatus==='not_working'?'Not working':'',item.purchaseDate||'',item.procurementCost!=null?item.procurementCost.toFixed(2):'',item.insured==null?'':item.insured?'Yes':'No',item.lastVerified||'',item.holder||'',item.location,item.due||''])};
  async function markNotificationsViewed() {
    const keys=scopedNotifications.filter(alert=>!alert.read).map(alert=>alert.key);
    if (!keys.length||!currentAccount?.token) return;
    setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:true}:alert));
    try { await toolsApi.post('/notifications/read',currentAccount.token,{keys}); }
    catch(error) { setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:false}:alert)); toast.error(error instanceof Error?error.message:'Notifications could not be marked as viewed.'); }
  }

  const homeIncidents=complianceData.incidents.filter(incident=>incident.status!=='closed');
  // Checks that are overdue are things that need attention too (the Compliance tab counts the same), so the overview must not call itself clear while they exist.
  const overdueCheckTools=activeTools.filter(tool=>tool.inspectionDue?.length);
  const homeAttention=[...(overdueCheckTools.length?[{id:'overdue-checks',title:`${overdueCheckTools.length} ${overdueCheckTools.length===1?'item has':'items have'} a check overdue`,detail:'Scheduled inspections have not been recorded. Open Compliance to record them.',tone:'amber' as const,tab:'compliance' as const}]:[]),...homeIncidents.slice(0,5).map(incident=>{const tool=tools.find(candidate=>candidate.backendId===incident.tool_id);return{id:`incident-${incident.id}`,title:`${INCIDENT_LABELS[incident.incident_type]} · ${tool?.name??'Unassigned tool'}`,detail:`${incident.status[0].toUpperCase()}${incident.status.slice(1)} · reported ${incident.reported_at.slice(0,10)}`,tone:(['lost','stolen','damaged'].includes(incident.incident_type)?'red':'amber') as 'red'|'amber',tab:'compliance' as const};})].slice(0,5);
  const homeStats=[{key:'equipment',label:'Equipment',value:activeTools.length,icon:'box' as const,tab:'register' as const,filter:'all' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'available',label:'Available now',value:counts.available,icon:'check' as const,tab:'register' as const,filter:'available' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'out',label:'With employees',value:counts.issued,icon:'user' as const,tab:'loans' as const,filter:'all' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'attention',label:'Needs attention',value:homeIncidents.length+(overdueCheckTools.length?1:0),icon:'clock' as const,tab:'compliance' as const,filter:'all' as const,tone:'amber' as const,...(sourceState.compliance.error?{unavailable:true}:{}),...(!sourceState.compliance.loaded&&!sourceState.compliance.error?{loading:true}:{})}];
  // The overview opens as soon as the equipment (the figures) has answered; the movements and needs-attention panels show their own loading until theirs do.
  const homePending=!sourceState.tools.loaded&&!sourceState.tools.error;
  const panelLoading=(key:'history'|'compliance')=>!sourceState[key].loaded&&!sourceState[key].error;
  const homepage=<ToolsHomepage stats={homeStats} attention={homeAttention} movements={activity.slice(0,5).map(event=>({id:event.id,title:event.title,detail:event.detail,time:event.time}))} historyFailed={!!sourceState.history.error} historyLoading={panelLoading('history')} attentionLoading={panelLoading('compliance')} sections={visibleTabs.filter(item=>item.value!=='homepage')} scopeLabel={`Showing ${departmentOptions.find(option=>option.value===department)?.label??'All departments'}`} attentionFailed={!!sourceState.compliance.error} onNavigate={(next,filter)=>filterTo(filter,next)} onRetry={retryWorkspace}/>;
  const registerPanelContent=tab==='homepage'?homepage:tab === 'accounts'?<ToolsAccountAccess accounts={accounts} departments={departments} onUpdateRole={updateAccountRole}/>:tab==='compliance'?<ToolsCompliance tools={tools} employees={employees} competencies={complianceData.competencies} inspections={complianceData.inspections} incidents={complianceData.incidents} canManage={!!currentAccount&&['admin','issuer'].includes(currentAccount.role)} onSaveCompetency={saveCompetency} onRecordInspection={recordInspection} onReportIncident={reportIncident} onCloseIncident={closeIncident} onOpenEmployees={()=>setTab('employees')}/>:tab==='sources'?<ToolsSourceRegisters items={sourceRegisters} search={search} onUpload={openSourceRegister}/>:tab === 'analytics'?<ToolsAnalytics usage={usage} errors={clientErrors} feedback={feedbackRecords}/>:tab==='feedback'?<ToolsFeedbackInbox items={feedbackRecords} onAdd={()=>setModal({kind:'feedback'})}/>:tab==='employees'?<ToolsPeople onDeactivateMany={options.showRemoval?deactivateEmployees:undefined} allowDeactivate={options.showRemoval} employees={employees} tools={tools} competencies={complianceData.competencies} approvals={{state:sourceState.compliance.loaded?'ready':sourceState.compliance.error?'failed':'loading',message:sourceState.compliance.error||undefined,onRetry:()=>{void reloadWorkspace();}}} search={search} canManage={!!currentAccount&&['admin','issuer'].includes(currentAccount.role)} onAdd={()=>openManageModal({kind:'employee'})} onIssue={employee=>openAction('issue',undefined,employee)} onSaveCompetency={saveCompetency} onSetActive={setEmployeeActive}/>:tab === 'activity' ? <div className={s.journal}>{visibleActivity.map((a,i)=><motion.button key={a.id} className={s.journalRow} onClick={()=>setSelectedId(a.toolId)} {...tileEmergeProps(i, reduced)}><span className={s.eventIcon}><Icon name="history" /></span><span><strong>{a.title}</strong><small>{a.detail}{a.recordedBy?` · Recorded by ${a.recordedBy}`:''}</small></span><time>{a.time}</time><Icon name="chevron" size={16} /></motion.button>)}{!visibleActivity.length && <div className={s.empty}><Icon name="history" size={30}/><h2>No history yet</h2><p>Issue and return records will appear here with the employee, recorder and dates.</p></div>}</div>
    : !visibleTools.length ? <div className={s.empty}><Icon name={activeTools.length ? 'search' : 'box'} size={32}/><h2>{activeTools.length ? 'No matching equipment' : 'Start your equipment register'}</h2><p>{activeTools.length ? 'Try fewer filters or a different search.' : `Add the first tool or equipment item for ${department === 'all' ? 'your operation' : department}.`}</p><Button variant="primary" size="lg" className={`${s.sharedButton}`} onClick={activeTools.length ? clearFilters : ()=>openManageModal({kind:'new'})}>{activeTools.length ? 'Clear search & filters' : 'Add the first item'}</Button></div>
    : <AnimatePresence initial={false} mode="wait"><motion.div key={view} initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration}}><ToolsRegister tools={visibleTools} view={view} onSelect={setSelectedId} onAction={openAction} onArchiveMany={options.showRemoval&&tab==='register'&&currentAccount&&['admin','issuer'].includes(currentAccount.role)?archiveTools:undefined}/></motion.div></AnimatePresence>;
  const registerPanel=sessionChecking?<ToolsDataState title="Tools workspace" state={{loaded:false,loading:true}} onRetry={retryWorkspace}/>:currentAccount&&tab!=='homepage'&&!activeSourceState.loaded?<ToolsDataState title={activeSourceTitle} state={activeSourceState} onRetry={retryWorkspace}/>:currentAccount&&tab==='homepage'&&homePending?<ToolsDataState title="Overview" state={{loaded:false,loading:true}} onRetry={retryWorkspace}/>:<>{tab!=='homepage'&&<ToolsDataState title={activeSourceTitle} state={activeSourceState} onRetry={retryWorkspace} compact/>}{registerPanelContent}</>;
  const register = <div className={s.registerBlock}>
    <div className={s.navigation}><div className={s.tabs} role="tablist" aria-label="Tools sections">{visibleTabs.map((item,index) => <button key={item.value} role="tab" id={`tools-tab-${item.value}`} tabIndex={tab === item.value ? 0 : -1} aria-selected={tab === item.value} aria-controls="tools-panel" onClick={() => { setTab(item.value); setStatus('all'); setFiltersOpen(false); track(`opened ${item.label.toLowerCase()}`); }} onKeyDown={event => { if (['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length-1 : (index + (event.key === 'ArrowRight' ? 1 : visibleTabs.length-1)) % visibleTabs.length; setTab(visibleTabs[next].value); setStatus('all'); document.getElementById(`tools-tab-${visibleTabs[next].value}`)?.focus(); } }}><Icon name={item.icon} size={18} />{item.label}{item.value === 'loans' && counts.issued>0 && <span className={s.tabCount}>{counts.issued}</span>}{tab === item.value && <motion.span layoutId="tools-tab-indicator" transition={{ duration }} className={s.tabLine} />}</button>)}</div><Help label="Workspace sections">Equipment is the register, Compliance controls competency and scheduled checks, and History is the permanent audit trail.</Help></div>
    <div className={s.toolbar}><ToolsWorkspaceSearch value={search} onChange={setSearch} results={workspaceSearchResults} onChoose={chooseSearchResult} inputRef={searchRef}/>{['register','loans'].includes(tab) && <><div className={s.filterCluster}><Button variant="secondary" size="lg" className={`${s.sharedButton}`} aria-label="Open filter and sort controls" aria-expanded={filtersOpen} aria-controls="tools-filters" onClick={() => { const next = !filtersOpen; if (next) { announceToolsPopover('filters'); setActionsOpen(false); setNotificationsOpen(false); } setFiltersOpen(next); }}><Icon name="filter" />Filter &amp; sort{activeRefinements > 0 && <span className={s.filterCount}>{activeRefinements}</span>}<motion.span animate={{rotate:filtersOpen?180:0}} transition={{duration}}><Icon name="down" size={13}/></motion.span></Button><Help label="Filters and sorting">Select Filter &amp; sort to narrow the register by status, category or location, or to change its order.</Help></div><Button variant="secondary" size="lg" className={`${s.sharedButton}`} aria-label="Download this register" title="Download as Excel, Word or PDF" onClick={()=>{setActionsOpen(false);setModal({kind:'export'});}}><Icon name="download"/>Download</Button><div className={s.viewToggle} aria-label="View options"><button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={18} /></button><button aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18} /></button></div></>}</div>
    <AnimatePresence initial={false}>{filtersOpen && ['register','loans'].includes(tab) && <motion.div id="tools-filters" className={s.filterReveal} initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }} transition={{ duration }}><div className={s.filters}>
      <div><span>Status</span><AnimatedSelect ariaLabel="Status" value={status} onChange={value=>setStatus(value as typeof status)} options={[{value:'all',label:'All active tools'},...Object.entries(STATUS).map(([value,label])=>({value,label})),...(tab!=='loans'?[{value:'archived',label:'Archived'}]:[])]}/></div>
      <div><span>Category</span><AnimatedSelect ariaLabel="Category filter" value={category} onChange={setCategory} options={[{value:'all',label:'All categories'},...[...new Set([...CATEGORIES,...tools.map(tool=>tool.category)])].map(value=>({value,label:value}))]}/></div>
      <label>Location<input aria-label="Filter by location" value={location==='all'?'':location} onChange={event=>setLocation(event.target.value||'all')} placeholder="Type any location…"/></label>
      <div><span>Sort</span><AnimatedSelect ariaLabel="Sort tools" value={sort} onChange={setSort} options={[{value:'register',label:'Register order'},{value:'name',label:'Name A–Z'},{value:'status',label:'Status'}]}/></div><Button variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={resetRefinements}><Icon name="reset" size={15} />Reset</Button>
    </div></motion.div>}</AnimatePresence>
    {!['homepage','sources','accounts','analytics','feedback','compliance'].includes(tab)&&(!currentAccount||activeSourceState.loaded)&&<div className={s.resultsHeader}><div className={s.resultLabel}><strong><AnimatedText value={`${tab}-${status}`}>{tab === 'activity' ? 'Issue and return history' : tab === 'employees' ? 'Employee register' : tab === 'loans' ? 'Equipment with employees' : status === 'archived' ? 'Archived equipment' : status !== 'all' ? STATUS[status] : 'Equipment register'}</AnimatedText></strong><span role="status" aria-live="polite"><AnimatedText value={tab === 'activity' ? `events-${visibleActivity.length}` : tab==='employees'?`employees-${employees.length}`:`tools-${visibleTools.length}`}>{tab === 'activity' ? `${visibleActivity.length} history records` : tab==='employees'?`${employees.length} ${employees.length===1?'employee':'employees'}`:`${visibleTools.length} ${visibleTools.length === 1 ? 'item' : 'items'}`}</AnimatedText></span>{(activeRefinements > 0 || search) && <Button variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={resetRefinements}>Clear search &amp; refinements</Button>}</div>
      <div className={s.actionCluster} ref={actionsRef}><AnimatePresence initial={false}>{actionsOpen && <motion.div id="tools-actions" className={s.actionReveal} initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .3 }}><div className={s.secondaryActions}>{tab==='employees'?<button onClick={()=>{setActionsOpen(false);openManageModal({kind:'employee'});}}><Icon name="plus" size={16}/>Add employee</button>:tab!=='activity'?<><button onClick={() => {setActionsOpen(false);openAction('return');}} disabled={!counts.issued}><Icon name="back" size={16} />Record return</button><button onClick={() => {setActionsOpen(false);openManageModal({kind:'new'});}}><Icon name="plus" size={16} />Add equipment</button></>:null}<button onClick={()=>{setActionsOpen(false);openManageModal({kind:'import'});}}><Icon name="upload" size={16}/>Import</button><button onClick={()=>{setActionsOpen(false);setModal({kind:'export'});}}><Icon name="download" size={16}/>Download</button></div></motion.div>}</AnimatePresence><button className={s.actionsAnchor} aria-label="Actions" aria-controls="tools-actions" aria-expanded={actionsOpen} onClick={() => { const next = !actionsOpen; if (next) { announceToolsPopover('actions'); setFiltersOpen(false); setNotificationsOpen(false); } setActionsOpen(next); }}><Icon name="more" />Actions<motion.span animate={{ rotate: actionsOpen ? 180 : 0 }} transition={{ duration }}><Icon name="down" size={13} /></motion.span></button><Help label="Actions">Actions change with the section you are viewing and fold away when you do not need them.</Help></div>
    </div>}
    <div id="tools-panel" role="tabpanel" aria-labelledby={`tools-tab-${tab}`}>
      {registerPanel}
    </div>
  </div>;
  const blocks: Record<SectionName,ReactNode> = { register };
  return <ToolsPreferences.Provider value={{font:options.font,fontSize:options.fontSize,guidance:options.guidance}}><main className={`${s.surface} ${s.standalone}`} data-tools-workspace="" data-font={options.font} data-sidebar={sidebarCollapsed?'collapsed':'open'} style={{'--font-scale':options.fontSize/100} as CSSProperties}><aside className={s.moduleSidebar} aria-label="Tools navigation"><div className={s.sidebarBrand}><button className={s.spotlightTab} aria-current="page" aria-label={(tabs.find(item=>item.value===tab)??tabs[0]).label} onClick={()=>{setSearch('');setSidebarNav(state=>({...state,recent:recordTabUse(state.recent,tab)}));track('opened section',(tabs.find(item=>item.value===tab)??tabs[0]).label);}}><span className={s.navIcon}><SidebarIcon pack={sidebarNav.iconPack} name={(tabs.find(item=>item.value===tab)??tabs[0]).icon} size={18} active/></span>{!sidebarCollapsed&&<strong>{(tabs.find(item=>item.value===tab)??tabs[0]).label}</strong>}</button><button className={s.navCollapse} aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setSidebarCollapsed(value=>!value)}><motion.span animate={{rotate:sidebarCollapsed?0:180}}><Icon name="chevron" size={15}/></motion.span></button></div><nav aria-label="Sections">{sidebarNav.iconsOpen&&rankTabs(visibleTabs,tab,sidebarNav.recent).map(item=><button key={item.value} className={s.navItem} data-label={item.label} onClick={()=>{setTab(item.value);setSearch('');setSidebarNav(state=>({...state,recent:recordTabUse(state.recent,item.value)}));track('opened section',item.label);}}><span className={s.navIcon}><SidebarIcon pack={sidebarNav.iconPack} name={item.icon} size={18}/></span>{!sidebarCollapsed&&<span className={s.navLabel}>{item.label}</span>}</button>)}<button className={s.iconsToggle} aria-expanded={sidebarNav.iconsOpen} aria-label={sidebarNav.iconsOpen?'Hide section icons':'Show section icons'} onClick={()=>setSidebarNav(state=>({...state,iconsOpen:!state.iconsOpen}))}><Icon name={sidebarNav.iconsOpen?'up':'down'} size={14}/>{!sidebarCollapsed&&<span className={s.navLabel}>{sidebarNav.iconsOpen?'Hide':'Show'}</span>}</button></nav></aside><section className={s.workspace} aria-label="Tools and Equipment workspace">
    <div className={s.topline}><div className={s.workspaceIdentity}><h1 className={s.wordmark}>Equipment E-System</h1></div><div className={s.previewControls}><div className={s.departmentSelect}><ActionHint label="Department scope — filters every section, counts and notifications."><AnimatedSelect ariaLabel="Department" value={departmentOptions.some(option=>option.value===department)?department:departmentOptions[0]?.value||'all'} onOpenChange={open=>{if(open){setFiltersOpen(false);setActionsOpen(false);setNotificationsOpen(false);setAccountOpen(false);setFeedbackOpen(false);}}} onChange={value=>{setDepartment(value);clearFilters();}} options={departmentOptions} shortLabels={Object.fromEntries(departmentOptions.map(option=>[option.value,abbreviateDepartment(option.label)]))}/></ActionHint></div><span className={s.headerDivider} aria-hidden="true" /><ToolsNotifications counts={counts} unread={unreadNotifications} open={notificationsOpen} unavailable={sourceState.notifications.error} loading={sourceState.notifications.loading} onRetry={retryWorkspace} onOpenChange={setNotificationsOpen} onViewed={markNotificationsViewed} duration={duration} onShowOverdue={()=>{filterTo('overdue','loans');setNotificationsOpen(false);}} onShowInspection={()=>{setTab('compliance');setNotificationsOpen(false);}}/><ActionHint label="Adjust the layout, text size, typeface, and helpful hints."><button className={s.customizeButton} aria-label="Open settings" onClick={()=>setModal({kind:'customize'})}><Icon name="settings" size={17}/></button></ActionHint><ToolsProfileMenu account={currentAccount} open={accountOpen} onOpenChange={next=>{if(next){announceToolsPopover('account');setFiltersOpen(false);setActionsOpen(false);setNotificationsOpen(false);setFeedbackOpen(false);}setAccountOpen(next);}} onSignIn={()=>setModal({kind:'auth'})} onSignOut={()=>signOut()} duration={duration}/></div></div>
    <div className={s.liveFeedback} role="status" aria-live="polite"><AnimatedText value={feedback}>{feedback}</AnimatedText></div>
    <div className={s.workspaceSections}><AnimatePresence initial={false}>{options.order.filter(section=>!options.hidden.includes(section)).map(section=><motion.section key={section} aria-label={`${section} section`} layout={!reduced} initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={{duration}}>{blocks[section]}</motion.section>)}</AnimatePresence></div>

  <div className={s.feedbackFab} ref={feedbackFabRef}><AnimatePresence initial={false}>{feedbackOpen && <motion.div role="dialog" aria-label="Give feedback" className={s.feedbackPanel} initial={{opacity:0,y:reduced?0:10,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:10,scale:.98}} transition={{duration:reduced?0:.18}}><div className={s.feedbackPanelHeader}><strong>Feedback &amp; suggestions</strong><button aria-label="Close feedback" onClick={()=>setFeedbackOpen(false)}><Icon name="close" size={15}/></button></div><ToolsFeedback onSubmit={(text,audio)=>{submitFeedback(text,audio);setFeedbackOpen(false);}} onCancel={()=>setFeedbackOpen(false)}/></motion.div>}</AnimatePresence><button aria-label="Give feedback" aria-expanded={feedbackOpen} onClick={()=>{const next=!feedbackOpen;if(next)announceToolsPopover('feedback');setFeedbackOpen(next);track('opened feedback');}}><Icon name={feedbackOpen?'close':'chat'} size={20}/></button></div></section></main>

  <ToolsDialog open={!!selected} onClose={()=>setSelectedId(null)} title={selected?.name || 'Tool details'} description={selected ? `${selected.id} · ${selected.make}` : ''} wide>
    {selected && <><div className={s.detailLead}><ToolSymbol kind={selected.kind} imageUrl={primaryToolImage(selected)} name={selected.name}/><div><StatusLabel status={selected.status} archived={selected.archived}/><p>{selected.category} · {departmentOf(selected)}{selected.section ? ` / ${selected.section}` : ''}</p></div><Help label="Tool details">Current custody, condition and supporting records. Edit details without changing the tool ID. Use a handover to change custody.</Help></div>
      <EligibleEmployeesList people={selected.eligibleEmployees} onIssue={selected.status==='available'&&!selected.archived&&currentAccount?.role==='issuer'?person=>openAction('issue',selected,employees.find(item=>item.backendId===person.id||item.employeeNumber===person.employeeNumber)):undefined}/><div><div className={s.fieldHeading}><h3>Full specifications</h3><span className={s.detailRecordNote}>Complete saved record</span></div><dl className={s.facts}>{selectedFacts.map(([label,value],index)=><div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {selected.status==='overdue' && <div className={s.notice}><Icon name="clock"/><div><strong>Return overdue</strong><p>Receive this tool or record an approved extension.</p></div></div>}{selected.status==='attention' && <div className={s.notice}><Icon name="alert"/><div><strong>Held for attention</strong><p>{selected.notes || 'Check the condition and supporting records before making this tool available.'}</p></div></div>}{!!selected.inspectionDue?.length&&<div className={s.notice}><Icon name="alert"/><div><strong>Scheduled checks overdue</strong><p>{selected.inspectionDue.map(item=>item.replaceAll('_',' ')).join(', ')}. Issue and transfer are blocked.</p></div></div>}{!selected.eligibleEmployees?.length&&<div className={s.notice}><Icon name="user"/><div><strong>No eligible employee recorded</strong><p>Add training, qualification and authorization in Compliance before issue.</p></div></div>}{selected.notes && selected.status!=='attention' && <p className={s.detailNote}>{selected.notes}</p>}</div>
      <details key={selected.id} className={s.detailActivity}><summary><Icon name="chevron" size={15}/><span>Recent activity</span><small>{activity.filter(a=>a.toolId===selected.id).length}</small></summary><div className={s.detailHistory}>{activity.filter(a=>a.toolId===selected.id).slice(0,4).map(a=><div key={a.id}><span/><p><strong>{a.title}</strong><small>{a.detail}</small><time>{a.time}</time></p></div>)}{!activity.some(a=>a.toolId===selected.id) && <p className={s.formHint}>No movements in this preview yet.</p>}<div className={s.detailActivityFooter}><Button variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={()=>{setSelectedId(null);setTab('activity');setSearch(selected.id);track('opened section','History');}}>View in History<Icon name="out" size={14}/></Button><Help label="Movement history">Preview records show who holds the tool, the change and when it was recorded. Production audit records will be stored by the backend.</Help></div></div></details>
      <div className={s.detailEvidence}><div className={s.fieldHeading}><strong>Condition evidence <small>{selected.evidence?.length || 0}</small></strong><Button variant="ghost" size="sm" className={`${s.sharedButton}`} onClick={()=>openManageModal({kind:'attachments',tool:selected})}><Icon name="attachment" size={15}/>Add / manage files</Button></div>{selected.evidence?.length ? <EvidenceGallery files={selected.evidence}/> : <p className={s.formHint}>Optional photos or PDF records of the tool’s condition.</p>}</div>
      <div className={s.detailActions}>{!selected.archived && (selected.status==='available' ? <Button variant="primary" size="lg" className={`${s.sharedButton}`} disabled={!selected.eligibleEmployees?.length} title={selected.inspectionDue?.length?'A check is overdue: you can still issue it by recording a reason.':!selected.eligibleEmployees?.length?'Authorize at least one employee first.':undefined} onClick={()=>openAction('issue',selected)}>Issue tool<Icon name="out"/></Button> : selected.status==='attention' ? <Button variant="primary" size="lg" className={`${s.sharedButton}`} onClick={()=>openManageModal({kind:'ready',tool:selected})}><Icon name="check"/>Mark ready for use</Button> : <><Button variant="primary" size="lg" className={`${s.sharedButton}`} onClick={()=>openAction('return',selected)}>Receive return<Icon name="back"/></Button><Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={()=>openAction('transfer',selected)}><Icon name="swap"/>Transfer</Button><Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={()=>openAction('extend',selected)}><Icon name="clock"/>Extend</Button></>)}<Button variant="secondary" size="lg" className={`${s.sharedButton}`} onClick={()=>openManageModal({kind:'edit',tool:selected})}><Icon name="edit"/>Edit details</Button>{(options.showRemoval||selected.archived)&&<Button variant="ghost" size="sm" className={`${s.sharedButton}`} disabled={!!selected.holder} title={selected.holder?'Receive this tool before archiving it.':'History is retained and the item can be restored.'} onClick={()=>archiveTool(selected)}><Icon name={selected.archived?'reset':'archive'} size={17}/>{selected.archived?'Restore tool':'Archive'}</Button>}</div>
    </>}
  </ToolsDialog>
  <ToolsDialog open={!!modal} dismissible={!authenticationRequired||modal?.kind!=='auth'} onClose={()=>{if(!authenticationRequired)setModal(null);}} wide={['customize','feedback','import','export'].includes(modal?.kind||'')} title={modal?.kind==='customize'?'Settings':modal?.kind==='new'?'Add equipment':modal?.kind==='employee'?'Add an employee':modal?.kind==='auth'?(currentAccount?'Your profile':'Sign in or sign up'):modal?.kind==='feedback'?'Feedback & suggestions':modal?.kind==='import'?'Import a register':modal?.kind==='source-register'?'Upload a source register':modal?.kind==='export'?'Download this view':modal?.kind==='edit'?'Edit equipment details':modal?.kind==='attachments'?'Condition evidence':modal?.kind==='ready'?'Return to ready for use':modal?TITLES[modal.kind]:''} description={modal?.kind==='customize'?'Display and workspace preferences.':modal?.kind==='attachments'?'Keep photos and supporting documents with the item.':modal?.kind==='employee'?'Add a person to this workspace’s independent register.':modal?.kind==='auth'?(currentAccount?'Your identity and access for this workspace.':'Use your workspace account or create one to continue.'):modal?.kind==='feedback'?'Tell us what would make the product clearer, faster or more useful.':modal?.kind==='import'?'Preview and validate Excel, CSV or Word records before adding them.':modal?.kind==='source-register'?'Permanently preserve the original file before updating the live database.':modal?.kind==='ready'?'Record what was repaired or checked before releasing the tool.':modal?.kind==='export'?'A clean copy of the current section and filters.':'Just the details needed for a clear record.'}>
    {modal?.kind==='customize'?<ToolsCustomize options={options} setOptions={setOptions} iconPack={sidebarNav.iconPack} onIconPack={iconPack=>setSidebarNav(state=>({...state,iconPack}))}/>:modal?.kind==='auth'?<ToolsAuth accounts={accounts} currentAccount={currentAccount} onCreate={createAccount} onLogin={login} onLogout={signOut} onCancel={()=>{if(!authenticationRequired)setModal(null);}} allowCancel={!authenticationRequired}/>:modal?.kind==='feedback'?<ToolsFeedback onSubmit={submitFeedback} onCancel={()=>setModal(null)}/>:modal?.kind==='import'?<ToolsImport onApply={applyImport} onCancel={()=>setModal(null)}/>:modal?.kind==='source-register'?<SourceRegisterForm departments={departments} onSave={saveSourceRegister} onCancel={()=>setModal(null)}/>:modal?.kind==='export'?<ToolsExport data={exportData} onDone={()=>{setModal(null);track('downloaded report',tab);}}/>:modal?.kind==='employee'?<EmployeeForm onSave={saveEmployee} onCancel={()=>setModal(null)}/>:modal?.kind==='new'||modal?.kind==='edit'?<ToolForm key={modal.kind==='edit'?modal.tool.id:'new'} initialTool={modal.kind==='edit'?modal.tool:undefined} defaultDepartment={department==='all'?'Engineering':department} addFiles={addFiles} onSave={saveTool} onCancel={()=>setModal(null)}/>:modal?.kind==='attachments'?<AttachmentForm key={modal.tool.id} tool={modal.tool} addFiles={addFiles} onSave={files=>void saveAttachments(modal.tool,files)}/>:modal?.kind==='ready'?<MarkReadyForm tool={modal.tool} onSave={note=>void markToolReady(modal.tool,note)} onCancel={()=>setModal(null)}/>:modal&&'tool' in modal?<MovementForm key={`${modal.kind}-${modal.tool?.id || 'select'}-${('employee' in modal?modal.employee?.id:'')||''}`} kind={modal.kind} initialTool={modal.tool} initialEmployee={'employee' in modal?modal.employee:undefined} tools={scope} employees={employees} locationSuggestions={locationSuggestions} equipmentSuggestions={equipmentSuggestions} issuerDepartment={currentAccount?.department} addFiles={addFiles} onSave={saveMovement} onCancel={()=>setModal(null)}/>:null}
  </ToolsDialog>
  </ToolsPreferences.Provider>;
}

