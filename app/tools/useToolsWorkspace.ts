// app/tools/useToolsWorkspace.ts — the Tools workspace's state, data loading and every action (issue, return, save, archive,
// sign in, compliance…), separate from how it is drawn, so the screens can be rebuilt without touching the rules.
'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { notify } from '@/lib/notify';
import { API_BASE } from '@/lib/config';
import { formatDateTime } from '@/lib/format';
import { type AddEvidence } from './ToolsUI';
import { type BulkIssueInput } from './BulkIssueForm';
import { DEFAULT_OPTIONS } from './ToolsCustomize';
import { type ClientError, type FeedbackRecord, type UsageEvent } from './ToolsAnalytics';
import { type SourceRegisterRecord } from './ToolsSourceRegisters';
import { INCIDENT_LABELS } from './ToolsCompliance';
import { ApprovalRole, ComplianceData, InspectionType } from './complianceTypes';
import { clearToolsSession, readToolsSession, saveToolsSession } from './toolsSession';
import { ExportTable } from './toolsExports';
import { historyReducer } from './history';
import { ToolsApiError, toolsApi, toolsLoginErrorMessage } from './toolsApi';
import { countTools, selectVisibleActivity, selectVisibleTools, type ToolsTab } from './toolSelectors';
import { buildWorkspaceSearchIndex, searchWorkspace, type WorkspaceSearchResult } from './toolsSearch';
import { parseToolsPreferences, saveToolsPreferences, TOOLS_PREFERENCES_KEY } from './toolsPreferences';
import { loadSidebarNav, saveSidebarNav, type SidebarNavState } from './sidebarNav';
import { SEED_TOOLS, SEED_ACTIVITY, DEPARTMENTS, STATUS, departmentOf, employeeLabel, type Status, type Tool, type Movement, type ActionKind, type Employee, type Evidence, type WorkspaceAccount } from './prototype';
import { toolFromServer } from './toolFromServer';
import { loadToolsWorkspace, mapAnalytics, type ServerTool, type ToolNotification, type WorkspaceSource, type WorkspaceSourceResult } from './workspaceLoad';

export type Modal = { kind: ActionKind; tool?: Tool; employee?: Employee } | { kind: 'new'|'employee'|'auth'|'feedback'|'customize'|'import'|'export'|'source-register'|'bulk-issue' } | { kind: 'edit'|'attachments'|'ready'; tool: Tool } | { kind: 'edit-employee-number'; employee: Employee } | null;
export const tabs = [{ value: 'homepage', label: 'Overview', icon: 'home' }, { value: 'register', label: 'Equipment', icon: 'box' }, { value: 'loans', label: 'In use', icon: 'out' }, { value: 'employees', label: 'Employees', icon: 'user' }, { value: 'compliance', label: 'Compliance', icon: 'check', signedInOnly:true }, { value: 'activity', label: 'History', icon: 'history' }, { value: 'sources', label: 'Source registers', icon: 'upload', signedInOnly: true }, { value: 'accounts', label: 'Account access', icon: 'accounts', adminOnly: true }, { value: 'analytics', label: 'Analytics', icon: 'analytics', adminOnly: true }, { value: 'feedback', label: 'Feedback', icon: 'edit', adminOnly: true }] as const;
export type SourceState={loaded:boolean;loading:boolean;error?:string};
export const emptySourceState=():Record<WorkspaceSource,SourceState>=>({employees:{loaded:false,loading:false},tools:{loaded:false,loading:false},history:{loaded:false,loading:false},sources:{loaded:false,loading:false},notifications:{loaded:false,loading:false},compliance:{loaded:false,loading:false},analytics:{loaded:false,loading:false},accounts:{loaded:false,loading:false}});

export function useToolsWorkspace() {
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

  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [preferencesReady,setPreferencesReady]=useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [feedback, setFeedback] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [sidebarNav,setSidebarNav]=useState<SidebarNavState>({iconsOpen:true});
  const reloadRef = useRef<(account?:WorkspaceAccount|null)=>Promise<void>>(async()=>{});
  const loadRequestId = useRef(0);
  const loadAbortRef = useRef<AbortController|null>(null);
  const objectUrls = useRef<string[]>([]);
  useEffect(() => () => { loadAbortRef.current?.abort();objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const saved = parseToolsPreferences(window.localStorage.getItem(TOOLS_PREFERENCES_KEY));
    setOptions(saved ? saved.options : { ...DEFAULT_OPTIONS });
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
    saveSidebarNav(window.localStorage, sidebarNav);
  }, [options, view, viewChosen, sidebarCollapsed, sidebarNav, preferencesReady]);
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
          if(error instanceof ToolsApiError&&error.status===401) notify.error('Your saved Tools session expired. Please sign in again.');
          else notify.error('Your saved Tools session could not be checked.',{description:error instanceof Error?error.message:undefined});
        }
      }
      else clearToolsSession(window.localStorage);
    } catch { clearToolsSession(window.localStorage); }
    finally { setSessionChecking(false); }})();
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
        if(source==='employees') setEmployees(value.map(row=>({id:row.employee_number??row.id,backendId:row.id,employeeNumber:row.employee_number,name:row.name,department:row.department,jobTitle:row.job_title,supervisorName:row.supervisor_name,active:row.active})));
        else if(source==='tools') dispatch({type:'replace-tools',tools:value.map(toolFromServer)});
        else if(source==='history') dispatch({type:'replace-activity',activity:value.map(row=>({id:row.id,toolId:row.tool_id,title:`${row.tool_name} · ${row.action}`,detail:row.detail||row.employee_name||'',time:formatDateTime(row.event_at),recordedBy:row.actor_name}))});
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
  useEffect(()=>{ if (!currentAccount?.token) return; void reloadRef.current(currentAccount).catch(error=>{if(error instanceof ToolsApiError&&error.status===401){signOut(false);notify.error('Your saved session expired. Please sign in again.');return;}notify.error(error instanceof Error?error.message:'Could not load Tools & Equipment.');}); },[currentAccount]);
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
  const scopedNotifications=notificationAlerts.filter(alert=>department==='all'||alert.department===department||alert.kind==='password_request');
  const counts={...countTools(scope),inspectionDue:scopedNotifications.filter(alert=>alert.kind==='inspection_due').length,investigationsOverdue:scopedNotifications.filter(alert=>alert.kind==='investigation_overdue').length,overdueEscalations:scopedNotifications.filter(alert=>alert.kind==='overdue_6h').length,passwordRequests:scopedNotifications.filter(alert=>alert.kind==='password_request').length};
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
    ...(selected.holder?[['Expected return',selected.due||'Not recorded'],...(selected.originalDue&&selected.originalDue!==selected.due?[['Original deadline',selected.originalDue] as [string,string]]:[]),['Work order',selected.job||'Not recorded'],['Used for',selected.assignedEquipment?.join(', ')||'Not recorded'],['Pre-use check',selected.preUsePending?'Still due':'Recorded']] as Array<[string,string]>:[]),
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
  const openManageModal = (next: Exclude<Modal,null>) => { if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setModal({kind:'auth'}); notify.error('Sign in with an administrator or Issuer account to manage records.'); return; } setSelectedId(null); setModal(next); };
  const openSourceRegister = () => { if (!currentAccount) { setModal({kind:'auth'}); notify.error('Sign in to preserve a source register.'); return; } setModal({kind:'source-register'}); };
  const openAction = (kind: ActionKind, tool?: Tool, employee?:Employee) => {
    if (currentAccount?.role!=='issuer') { setSelectedId(null); setModal({kind:'auth'}); notify.error('Only an Issuer account can record equipment movements.'); return; }
    const targetDepartment=tool?departmentOf(tool):employee?.department;
    if (targetDepartment&&targetDepartment!==currentAccount.department) { notify.error(`This Issuer can work only with ${currentAccount.department} records.`); return; }
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
      const employee=employees.find(item=>item.id===input.person||item.name===input.person||employeeLabel(item)===input.person);
      await toolsApi.post(`/tools/${current.backendId}/commands`,requireToken(),{kind:input.kind,employee_id:employee?.backendId||employee?.employeeNumber,employee_name:employee?.name,department:input.department,location:input.location,expected_return_at:input.dueISO||input.due,job_reference:input.job,assigned_equipment:input.assignedEquipment||[],condition:input.condition,notes:input.notes,approval_ref:input.approvalRef,calibration:input.calibration,override_due_checks:input.overrideDueChecks||undefined,override_reason:input.overrideReason||undefined,idempotency_key:crypto.randomUUID()});
      await reloadWorkspace(); setModal(null); setFeedback('Change saved.'); notify.success('Change saved');
    } catch(error) { notify.error(error instanceof Error?error.message:'The movement could not be saved.'); }
  }
  // Issues each picked tool with its own idempotent command; one refusal does not stop the rest, and the
  // summary names what failed so it can be retried.
  async function saveBulkIssue(input: BulkIssueInput) {
    if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setModal({kind:'auth'}); notify.error('Only an Issuer or administrator account can issue equipment.'); return; }
    const employee=employees.find(item=>item.id===input.person||item.name===input.person||employeeLabel(item)===input.person);
    const failed:string[]=[]; let done=0;
    for (const toolId of input.toolIds) {
      const current=tools.find(item=>item.id===toolId);
      try {
        if (!current?.backendId) throw new Error('This equipment record has not been saved yet.');
        await toolsApi.post(`/tools/${current.backendId}/commands`,requireToken(),{kind:'issue',employee_id:employee?.backendId||employee?.employeeNumber,employee_name:employee?.name,department:input.department,location:input.location,expected_return_at:input.dueISO||input.due,job_reference:input.job||undefined,condition:input.condition,notes:input.notes||undefined,override_due_checks:input.overrideDueChecks||undefined,override_reason:input.overrideReason||undefined,idempotency_key:crypto.randomUUID()});
        done+=1;
      } catch { failed.push(toolId); }
    }
    await reloadWorkspace();
    if (failed.length) { setModal(null); notify.error(`${done} issued. ${failed.length} could not be issued: ${failed.slice(0,4).join(', ')}${failed.length>4?'…':''}. Try those again.`); }
    else { setModal(null); setFeedback(`Issued ${done} ${done===1?'tool':'tools'}.`); notify.success(`Issued ${done} ${done===1?'tool':'tools'}`); }
  }
  async function uploadNewEvidence(tool:Tool,files:Evidence[]) {
    const fresh=files.filter(file=>file.url.startsWith('blob:'));
    if (!fresh.length || !tool.backendId) return;
    const body=new FormData();
    for (const item of fresh) { const blob=await fetch(item.url).then(response=>response.blob()); body.append('files',new File([blob],item.name,{type:item.type})); }
    await toolsApi.post(`/tools/${tool.backendId}/evidence`,requireToken(),body);
  }
  async function saveAttachments(tool:Tool,files:Evidence[]) {
    try { await uploadNewEvidence(tool,files); await reloadWorkspace(); setModal(null); notify.success('Attachments saved'); }
    catch(error) { notify.error(error instanceof Error?error.message:'Attachments could not be saved.'); }
  }
  async function saveTool(tool: Tool) {
    try {
      const editing=modal?.kind==='edit';
      const payload={register_number:tool.id||undefined,name:tool.name,make_model:tool.make,serial_number:tool.serial,category:tool.category,equipment_kind:tool.kind,storage_location:tool.location,department:departmentOf(tool),section:tool.section,condition:tool.condition,notes:tool.notes,approval_ref:tool.approvalRef,calibration:tool.calibration,specifications:tool.specifications||{},home_storage_location:tool.homeStorageLocation,storage_conditions:tool.storageConditions,maintenance_requirements:tool.maintenanceRequirements,pre_use_check_required:tool.preUseCheckRequired,competency_required:tool.competencyRequired,weekly_inspection_required:tool.weeklyInspectionRequired,monthly_inspection_required:tool.monthlyInspectionRequired,quarterly_inspection_required:tool.quarterlyInspectionRequired,calibration_required:tool.calibrationRequired,calibration_frequency_days:tool.calibrationFrequencyDays,replacement_value:tool.replacementValue,criticality:tool.criticality,cctv_required:tool.cctvRequired,gps_required:tool.gpsRequired,required_ppe:tool.requiredPpe||[],ownership_type:tool.ownershipType||'company',contractor_name:tool.contractorName,oem_manual_ref:tool.oemManualRef,purchase_date:tool.purchaseDate||undefined,procurement_cost:tool.procurementCost,insured:tool.insured,last_verified:tool.lastVerified||undefined,working_status:tool.workingStatus};
      let saved:ServerTool;
      if (editing) { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); saved=await toolsApi.patch(`/tools/${tool.backendId}`,requireToken(),payload); }
      else saved=await toolsApi.post('/tools',requireToken(),payload);
      const mapped=toolFromServer(saved); await uploadNewEvidence(mapped,tool.evidence||[]);
      await reloadWorkspace(); setModal(null); clearFilters(); setTab('register'); setDepartment(departmentOf(tool)); notify.success(editing?'Equipment updated':'Equipment added');
    } catch(error) { notify.error(error instanceof Error?error.message:'The equipment could not be saved.'); }
  }
  async function archiveTool(tool:Tool) {
    if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setSelectedId(null); setModal({kind:'auth'}); notify.error('An administrator or Issuer account is required to archive equipment.'); return; }
    try { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); await toolsApi.post(`/tools/${tool.backendId}/archive`,requireToken()); await reloadWorkspace(); setSelectedId(null); notify.success(tool.archived?'Equipment restored':'Equipment archived'); }
    catch(error) { notify.error(error instanceof Error?error.message:'The equipment could not be archived.'); }
  }
  // Archives each ticked item in turn (the route toggles, so only active, un-issued items are sent); one failure does not stop the rest.
  async function archiveTools(list:Tool[]) {
    if (!currentAccount||!['admin','issuer'].includes(currentAccount.role)) { setModal({kind:'auth'}); notify.error('An administrator or Issuer account is required to archive equipment.'); return; }
    const failed:string[]=[]; let done=0;
    for (const tool of list.filter(item=>item.backendId&&!item.archived&&!item.holder)) {
      try { await toolsApi.post(`/tools/${tool.backendId}/archive`,requireToken()); done+=1; } catch { failed.push(tool.id); }
    }
    await reloadWorkspace();
    if (failed.length) notify.error(`${done} archived. ${failed.length} could not be archived: ${failed.slice(0,4).join(', ')}${failed.length>4?'…':''}. Try those again.`);
    else notify.success(`${done} ${done===1?'item':'items'} archived`);
  }
  async function markToolReady(tool:Tool,resolutionNote:string,stayOpen=false) {
    try { if (!tool.backendId) throw new Error('This equipment record has not been saved yet.'); await toolsApi.post(`/tools/${tool.backendId}/mark-ready`,requireToken(),{resolution_note:resolutionNote}); await reloadWorkspace(); if (!stayOpen) { setModal(null); setSelectedId(tool.id); } setFeedback('Tool marked ready for use.'); notify.success('Tool is ready for use'); }
    catch(error) { notify.error(error instanceof Error?error.message:'The tool could not be marked ready.'); }
  }
  async function saveSourceRegister(file:File,sourceDepartment:string,notes:string) {
    try { const body=new FormData(); body.append('department',sourceDepartment); body.append('notes',notes); body.append('file',file); await toolsApi.post('/source-registers',requireToken(),body); await reloadWorkspace(); setModal(null); setTab('sources'); setSearch(''); notify.success('Source register stored permanently'); }
    catch(error) { notify.error(error instanceof Error?error.message:'The source register could not be uploaded.'); }
  }
  async function saveEmployee(employee:Employee) {
    try { await toolsApi.post('/employees',requireToken(),{employee_number:employee.employeeNumber,name:employee.name,department:employee.department,job_title:employee.jobTitle,supervisor_name:employee.supervisorName}); await reloadWorkspace(); setModal(null); setTab('employees'); notify.success(`${employee.name} added`); }
    catch(error) { notify.error(error instanceof Error?error.message:'The employee could not be saved.'); }
  }
  async function saveEmployeeNumber(employee:Employee,employeeNumber:string|null) {
    if (!employee.backendId) return;
    try { await toolsApi.patch(`/employees/${employee.backendId}`,requireToken(),{employee_number:employeeNumber}); await reloadWorkspace(); setModal(null); notify.success(employeeNumber?`Mine number saved for ${employee.name}`:`${employee.name} is recorded without a mine number`); }
    catch(error) { notify.error(error instanceof Error?error.message:'The mine number could not be saved.'); }
  }
  async function createAccount(account:WorkspaceAccount) {
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:ApprovalRole[];signing_pin_configured?:boolean}}>('/auth/register',{name:account.name,username:account.username,password:account.password}); const saved:WorkspaceAccount={...account,id:data.account.id,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,approvalRoles:data.account.approval_roles||[],signingPinConfigured:data.account.signing_pin_configured,token:data.token}; saveToolsSession(window.localStorage,saved); setCurrentAccount(saved); setModal(null); notify.success(`Welcome, ${saved.name}`); }
    catch(error) { notify.error(error instanceof Error?error.message:'The account could not be created.'); }
  }
  async function login(username:string,password:string):Promise<true|string> {
    try { const data=await toolsApi.anonymousPost<{token:string;account:{id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:ApprovalRole[];signing_pin_configured?:boolean}}>('/auth/login',{username,password}); const account:WorkspaceAccount={id:data.account.id,name:data.account.name,username:data.account.username,password:'',role:data.account.role,department:data.account.department,canIssue:data.account.can_issue,approvalRoles:data.account.approval_roles||[],signingPinConfigured:data.account.signing_pin_configured,token:data.token}; saveToolsSession(window.localStorage,account); setCurrentAccount(account); setModal(null); notify.success(`Signed in as ${account.name}`); return true; }
    catch(error) { return toolsLoginErrorMessage(error); }
  }
  function signOut(showToast=true) { loadAbortRef.current?.abort();loadRequestId.current+=1;clearToolsSession(window.localStorage);setCurrentAccount(null);setSourceState(emptySourceState());setEmployees([]);setSourceRegisters([]);setUsage([]);setClientErrors([]);setFeedbackRecords([]);setNotificationAlerts([]);setComplianceData({competencies:[],inspections:[],incidents:[],gate_passes:[]});dispatch({type:'reset',snapshot:{tools:SEED_TOOLS,activity:SEED_ACTIVITY}});setModal({kind:'auth'});if(showToast)notify.success('Signed out'); }
  function track(name:string,detail?:string) { const event={id:crypto.randomUUID(),name,detail,at:new Date().toISOString()}; setUsage(current=>[event,...current]); if(currentAccount?.token)void toolsApi.post('/analytics/usage',currentAccount.token,{event:name,detail}).catch(()=>{}); }
  async function updateAccountRole(accountId:string,role:WorkspaceAccount['role'],assignedDepartment?:string,approvalRoles:ApprovalRole[]=[] ) {
    try { await toolsApi.patch(`/accounts/${accountId}`,requireToken(),{role,department:assignedDepartment,approval_roles:approvalRoles}); await reloadWorkspace(); notify.success(role==='issuer'?`Issuer access granted for ${assignedDepartment}`:'Account access updated'); }
    catch(error) { notify.error(error instanceof Error?error.message:'The account role could not be updated.'); }
  }
  async function setAccountPassword(accountId:string,password:string):Promise<boolean> {
    try { await toolsApi.post(`/accounts/${accountId}/reset-password`,requireToken(),{password}); notify.success('The new password was set. Share it with the account holder directly.'); return true; }
    catch(error) { notify.error(error instanceof Error?error.message:'The password could not be set.'); return false; }
  }
  async function requestPasswordReset(username:string):Promise<boolean> {
    try { await toolsApi.anonymousPost('/auth/request-password-reset',{username}); return true; }
    catch(error) { notify.error(error instanceof Error?error.message:'The request could not be sent.'); return false; }
  }
  async function changePassword(currentPassword:string,newPassword:string):Promise<true|string> {
    try { await toolsApi.put('/auth/password',requireToken(),{current_password:currentPassword,new_password:newPassword}); notify.success('Your password was changed.'); return true; }
    catch(error) { return error instanceof Error?error.message:'The password could not be changed.'; }
  }
  // Deactivates each ticked person in turn; one refusal (for example someone who still holds equipment) does not stop the rest.
  async function deactivateEmployees(list:Employee[]) {
    const failed:string[]=[]; let done=0;
    for (const employee of list.filter(item=>item.backendId&&item.active)) {
      try { await toolsApi.patch(`/employees/${employee.backendId}`,requireToken(),{active:false}); done+=1; } catch { failed.push(employee.name); }
    }
    await reloadWorkspace();
    if (failed.length) notify.error(`${done} deactivated. ${failed.length} could not be deactivated: ${failed.slice(0,4).join(', ')}${failed.length>4?'…':''}. Try those again.`);
    else notify.success(`${done} ${done===1?'person':'people'} deactivated`);
  }
  async function setEmployeeActive(employee:Employee,active:boolean) {
    if (!employee.backendId) return;
    try { await toolsApi.patch(`/employees/${employee.backendId}`,requireToken(),{active});await reloadWorkspace();notify.success(active?`${employee.name} is active again`:`${employee.name} is deactivated`); }
    catch(error){notify.error(error instanceof Error?error.message:'The employee could not be changed.');}
  }
  async function saveCompetency(value:{employee_id:string;tool_id:string;trained:boolean;qualified:boolean;authorized:boolean;authorized_by?:string;training_certificate_ref?:string;training_expires_at?:string;qualification_ref?:string;qualification_expires_at?:string;authorization_expires_at?:string;notes?:string}) {
    try { await toolsApi.post('/competencies',requireToken(),value);await reloadWorkspace();notify.success('Competency record saved'); }
    catch(error){notify.error(error instanceof Error?error.message:'The competency record could not be saved.');}
  }
  async function recordInspection(toolId:string,value:{inspection_type:InspectionType;outcome:'passed'|'conditional'|'failed';next_due_at?:string;condition?:string;defects?:string;notes?:string;repair_quote?:number;new_equipment_price?:number}) {
    try { await toolsApi.post(`/tools/${toolId}/inspections`,requireToken(),value);await reloadWorkspace();notify.success(value.outcome==='failed'?'Inspection recorded and equipment held':'Inspection recorded'); }
    catch(error){notify.error(error instanceof Error?error.message:'The inspection could not be saved.');}
  }
  async function reportIncident(toolId:string,value:{incident_type:'lost'|'damaged'|'stolen'|'missing_components'|'late_return';occurred_at:string;employee_id?:string;explanation:string}) {
    try { await toolsApi.post(`/tools/${toolId}/incidents`,requireToken(),value);await reloadWorkspace();notify.success('Incident reported and investigation opened'); }
    catch(error){notify.error(error instanceof Error?error.message:'The incident could not be reported.');}
  }
  async function closeIncident(incidentId:string,value:{investigation_outcome:string;negligence_confirmed:boolean;replacement_cost?:number;recovery_months?:number}) {
    try { await toolsApi.post(`/incidents/${incidentId}/close`,requireToken(),value);await reloadWorkspace();notify.success('Investigation closed'); }
    catch(error){notify.error(error instanceof Error?error.message:'The investigation could not be closed.');}
  }
  function chooseSearchResult(result:WorkspaceSearchResult) {
    track('used workspace search',result.kind);
    const target=result.target;
    if(target.type==='tool'){setTab('register');setSearch('');setSelectedId(target.toolId);return;}
    if(target.type==='tab'){
      if(['accounts','analytics','feedback'].includes(target.tab)&&currentAccount?.role!=='admin'){
        notify.error('This area is available to administrators.');
        return;
      }
      setTab(target.tab);setStatus('all');setSearch(target.query||'');return;
    }
    if(target.type==='modal'){setSearch('');if(target.modal==='source-register')openSourceRegister();else setModal({kind:target.modal});}
  }
  async function submitFeedback(text:string,audio?:Blob) {
    try { const body=new FormData(); body.append('text',text); if(audio){const extension=audio.type==='audio/mp4'?'m4a':audio.type==='audio/ogg'?'ogg':audio.type==='audio/mpeg'?'mp3':audio.type.includes('wav')?'wav':'webm';body.append('audio',audio,`feedback.${extension}`);} await toolsApi.post('/feedback',requireToken(),body); await reloadWorkspace(); setModal(null); notify.success('Thank you — feedback saved.'); }
    catch(error) { notify.error(error instanceof Error?error.message:'Feedback could not be saved.'); }
  }
  async function applyImport(target:'equipment'|'employees',nextTools:Tool[],nextEmployees:Employee[]) {
    try { const rows=target==='equipment'?nextTools.map(item=>({register_number:item.id,name:item.name,make_model:item.make,serial_number:item.serial,category:item.category,equipment_kind:item.kind,storage_location:item.location,department:departmentOf(item),section:item.section,condition:item.condition,notes:item.notes})):nextEmployees.map(item=>({employee_number:item.employeeNumber,name:item.name,department:item.department,job_title:item.jobTitle,supervisor_name:item.supervisorName})); const result=await toolsApi.post<{accepted_count:number;rejected_count:number}>('/imports/commit',requireToken(),{target,rows}); await reloadWorkspace(); setModal(null); setTab(target==='equipment'?'register':'employees'); notify.success(`${result.accepted_count} ${result.accepted_count===1?'record':'records'} imported`,result.rejected_count?{description:`${result.rejected_count} rows need correction.`}:undefined); }
    catch(error) { notify.error(error instanceof Error?error.message:'The import could not be saved.'); }
  }
  const exportData:ExportTable = tab==='employees'?{title:'Tools employee register',headers:['Employee number','Name','Department','Job title'],rows:employees.map(item=>[item.employeeNumber??'Not recorded',item.name,item.department,item.jobTitle||''])}:tab==='activity'?{title:'Tools issue and return history',headers:['Equipment','Event','Details','Recorded by','Date'],rows:visibleActivity.map(item=>[item.toolId,item.title,item.detail,item.recordedBy||'',item.time])}:tab==='analytics'?{title:'Tools usage analytics',headers:['Event','Details','Date'],rows:usage.map(item=>[item.name,item.detail||'',formatDateTime(item.at)])}:{title:'Tools and equipment register',subtitle:`${department==='all'?'All departments':department} · ${visibleTools.length} ${visibleTools.length===1?'item':'items'}${status==='archived'?' · archived':''}${category!=='all'?` · ${category}`:''}`,headers:['Register number','Name','Category','Department','Status','Condition','Working status','Date of purchase','Procurement cost (USD)','Insured','Last verified','Held by','Location','Expected return'],rows:visibleTools.map(item=>[item.id,item.name,item.category,departmentOf(item),item.archived?'Archived':STATUS[item.status],item.condition||'',item.workingStatus==='working'?'Working':item.workingStatus==='not_working'?'Not working':'',item.purchaseDate||'',item.procurementCost!=null?item.procurementCost.toFixed(2):'',item.insured==null?'':item.insured?'Yes':'No',item.lastVerified||'',item.holder||'',item.location,item.due||''])};
  async function markNotificationsViewed() {
    const keys=scopedNotifications.filter(alert=>!alert.read).map(alert=>alert.key);
    if (!keys.length||!currentAccount?.token) return;
    setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:true}:alert));
    try { await toolsApi.post('/notifications/read',currentAccount.token,{keys}); }
    catch(error) { setNotificationAlerts(current=>current.map(alert=>keys.includes(alert.key)?{...alert,read:false}:alert)); notify.error(error instanceof Error?error.message:'Notifications could not be marked as viewed.'); }
  }

  const homeIncidents=complianceData.incidents.filter(incident=>incident.status!=='closed');
  // Checks that are overdue are things that need attention too (the Compliance tab counts the same), so the overview must not call itself clear while they exist.
  const overdueCheckTools=activeTools.filter(tool=>tool.inspectionDue?.length);
  const homeAttention=[...(overdueCheckTools.length?[{id:'overdue-checks',title:`${overdueCheckTools.length} ${overdueCheckTools.length===1?'item has':'items have'} a check overdue`,detail:'Scheduled inspections have not been recorded. Open Compliance to record them.',tone:'amber' as const,tab:'compliance' as const}]:[]),...homeIncidents.slice(0,5).map(incident=>{const tool=tools.find(candidate=>candidate.backendId===incident.tool_id);return{id:`incident-${incident.id}`,title:`${INCIDENT_LABELS[incident.incident_type]} · ${tool?.name??'Unassigned tool'}`,detail:`${incident.status[0].toUpperCase()}${incident.status.slice(1)} · reported ${incident.reported_at.slice(0,10)}`,tone:(['lost','stolen','damaged'].includes(incident.incident_type)?'red':'amber') as 'red'|'amber',tab:'compliance' as const};})].slice(0,5);
  const homeStats=[{key:'equipment',label:'Equipment',value:activeTools.length,icon:'box' as const,tab:'register' as const,filter:'all' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'available',label:'Available now',value:counts.available,icon:'check' as const,tab:'register' as const,filter:'available' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'out',label:'With employees',value:counts.issued,icon:'user' as const,tab:'loans' as const,filter:'all' as const,...(sourceState.tools.error?{unavailable:true}:{})},{key:'attention',label:'Needs attention',value:homeIncidents.length+(overdueCheckTools.length?1:0),icon:'clock' as const,tab:'compliance' as const,filter:'all' as const,tone:'amber' as const,...(sourceState.compliance.error?{unavailable:true}:{}),...(!sourceState.compliance.loaded&&!sourceState.compliance.error?{loading:true}:{})}];
  // The overview opens as soon as the equipment (the figures) has answered; the movements and needs-attention panels show their own loading until theirs do.
  const homePending=!sourceState.tools.loaded&&!sourceState.tools.error;
  const panelLoading=(key:'history'|'compliance')=>!sourceState[key].loaded&&!sourceState[key].error;
  return { reloadWorkspace, saveMovement, saveBulkIssue, uploadNewEvidence, saveAttachments, saveTool, archiveTool, archiveTools, markToolReady, saveSourceRegister, saveEmployee, saveEmployeeNumber, createAccount, login, signOut, track, updateAccountRole, setAccountPassword, requestPasswordReset, changePassword, deactivateEmployees, setEmployeeActive, saveCompetency, recordInspection, reportIncident, closeIncident, chooseSearchResult, submitFeedback, applyImport, markNotificationsViewed, options, setOptions, history, dispatch, employees, setEmployees, accounts, setAccounts, sourceRegisters, setSourceRegisters, currentAccount, setCurrentAccount, usage, setUsage, clientErrors, setClientErrors, feedbackRecords, setFeedbackRecords, notificationAlerts, setNotificationAlerts, complianceData, setComplianceData, sourceState, setSourceState, sessionChecking, setSessionChecking, tab, setTab, view, setViewState, viewChosen, setViewChosen, department, setDepartment, search, setSearch, status, setStatus, category, setCategory, location, setLocation, sort, setSort, sidebarCollapsed, setSidebarCollapsed, preferencesReady, setPreferencesReady, selectedId, setSelectedId, modal, setModal, feedback, setFeedback, sidebarNav, setSidebarNav, setView, searchRef, reloadRef, loadRequestId, loadAbortRef, objectUrls, departments, accountDepartments, canSeeAllDepartments, departmentOptions, visibleTabs, scope, activeTools, scopedNotifications, counts, unreadNotifications, visibleTools, visibleActivity, activeSource, activeSourceState, activeSourceTitle, authenticationRequired, retryWorkspace, selected, selectedFacts, workspaceSearchIndex, workspaceSearchResults, locationSuggestions, equipmentSuggestions, activeFilters, activeRefinements, clearFilters, resetRefinements, openManageModal, openSourceRegister, openAction, filterTo, addFiles, requireToken, exportData, homeIncidents, overdueCheckTools, homeAttention, homeStats, homePending, panelLoading, tools, activity };
}

export type ToolsWorkspace = ReturnType<typeof useToolsWorkspace>;
