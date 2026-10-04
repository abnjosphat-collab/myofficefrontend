import { toolsApi, ToolsApiError } from './toolsApi';
import type { WorkspaceAccount } from './prototype';
import type { ClientError, FeedbackRecord, UsageEvent } from './ToolsAnalytics';
import type { SourceRegisterRecord } from './ToolsSourceRegisters';
import type { ComplianceData } from './complianceTypes';

export type ServerTool = { id:string; register_number:string; name:string; make_model?:string; serial_number?:string; category?:string; equipment_kind?:'hand-tool'|'power-tool'|'measurement'|'lifting'|'safety'|'other-equipment'; storage_location:string; department:string; section?:string; status:'available'|'issued'|'overdue'|'attention'; condition?:string; notes?:string; approval_ref?:string; calibration?:string; specifications?:Record<string,string>; archived?:boolean; custody?:{employee_name?:string;expected_return_at?:string;original_due_at?:string;job_reference?:string;assigned_equipment?:string[]}; evidence?:Array<{id:string;original_name:string;content_type:string;size_bytes:number;url?:string}>; home_storage_location?:string;storage_conditions?:string;maintenance_requirements?:string;pre_use_check_required?:boolean;weekly_inspection_required?:boolean;monthly_inspection_required?:boolean;quarterly_inspection_required?:boolean;calibration_required?:boolean;calibration_frequency_days?:number;replacement_value?:number;criticality?:'standard'|'high'|'safety_critical';cctv_required?:boolean;gps_required?:boolean;required_ppe?:string[];ownership_type?:'company'|'contractor';contractor_name?:string;oem_manual_ref?:string;eligible_employees?:Array<{id:string;employee_number:string;name:string;department:string;job_title?:string}>;inspection_due?:string[];latest_inspections?:Record<string,{outcome:string;inspected_at:string;next_due_at?:string;colour_code?:string}> };
export type ServerEmployee = {id:string;employee_number:string;name:string;department:string;job_title?:string;supervisor_name?:string;active:boolean};
export type ServerHistory = {id:string;tool_id:string;tool_name:string;action:string;detail?:string;actor_name?:string;employee_name?:string;event_at:string};
export type ToolNotification = { key:string; kind:'overdue'|'overdue_6h'|'attention'|'inspection_due'|'investigation_overdue'; inspection_type?:string; tool_id:string; tool_name:string; department:string; read:boolean };
export type ServerAnalytics = {
  usage:Array<{id:string;event:string;detail?:string;created_at:string;account_name?:string}>;
  errors:Array<{id:string;message:string;created_at:string}>;
  feedback:Array<{id:string;text?:string;audio_filename?:string;audio_url?:string;created_at:string;account_name?:string}>;
};
export type ServerAccount = {id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean;approval_roles?:WorkspaceAccount['approvalRoles'];signing_pin_configured?:boolean};

export type WorkspaceSource = 'employees'|'tools'|'history'|'sources'|'notifications'|'compliance'|'analytics'|'accounts';
export type WorkspaceLoadValues = {
  employees: ServerEmployee[];
  tools: ServerTool[];
  history: ServerHistory[];
  sources: SourceRegisterRecord[];
  notifications: {alerts:ToolNotification[];unread_count:number};
  compliance: ComplianceData;
  analytics: ServerAnalytics;
  accounts: ServerAccount[];
};
export type WorkspaceLoadResult = {
  values: Partial<WorkspaceLoadValues>;
  errors: Partial<Record<WorkspaceSource,string>>;
  requested: WorkspaceSource[];
};
export type WorkspaceSourceResult = {
  [Source in WorkspaceSource]: {source:Source;value?:WorkspaceLoadValues[Source];error?:string}
}[WorkspaceSource];

type ToolsGet = <T>(path:string,token:string,signal?:AbortSignal)=>Promise<T>;
const WAKE_RETRY_DELAYS_MS=[2000,4000,8000,12000,15000,20000,25000,30000];

const wait=(milliseconds:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('The request was cancelled.','AbortError'));return;}
  const timeout=window.setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},milliseconds);
  const cancel=()=>{window.clearTimeout(timeout);reject(new DOMException('The request was cancelled.','AbortError'));};
  signal?.addEventListener('abort',cancel,{once:true});
});

/** One request that gives up after REQUEST_TIMEOUT_MS (a hung connection is retried, not waited on forever) and still honours the caller's cancel. */
const REQUEST_TIMEOUT_MS=45_000;
async function getWithTimeout<T>(path:string,token:string,get:ToolsGet,signal?:AbortSignal):Promise<T> {
  const attempt=new AbortController();
  const cancel=()=>attempt.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=window.setTimeout(cancel,REQUEST_TIMEOUT_MS);
  try{return await get<T>(path,token,attempt.signal);}
  finally{window.clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

async function getAfterWake<T>(path:string,token:string,get:ToolsGet,retry:boolean,signal?:AbortSignal):Promise<T> {
  for(let attempt=0;;attempt+=1){
    try{return await (retry?getWithTimeout<T>(path,token,get,signal):get<T>(path,token,signal));}catch(error){
      if(signal?.aborted) throw error;
      const retryable=!error || !(error instanceof ToolsApiError) || [502,503,504].includes(error.status);
      if(!retry||!retryable) throw error;
      await wait(WAKE_RETRY_DELAYS_MS[Math.min(attempt,WAKE_RETRY_DELAYS_MS.length-1)],signal);
    }
  }
}

const sourceRequests = (role:WorkspaceAccount['role']):Array<[WorkspaceSource,string]> => [
  ['employees','/employees'],
  ['tools','/tools'],
  ['history','/history'],
  ['sources','/source-registers'],
  ['notifications','/notifications'],
  ['compliance','/compliance'],
  ...(role==='admin' ? [['analytics','/analytics'],['accounts','/accounts']] as Array<[WorkspaceSource,string]> : []),
];

function validateSource(source:WorkspaceSource,value:unknown):unknown {
  if(['employees','tools','history','sources','accounts'].includes(source)) {
    if(!Array.isArray(value)) throw new Error(`${source} returned an unexpected response.`);
    return value;
  }
  if(source==='notifications') {
    if(!value||typeof value!=='object'||!Array.isArray((value as {alerts?:unknown}).alerts)) throw new Error('notifications returned an unexpected response.');
    return value;
  }
  if(source==='compliance') {
    if(!value||typeof value!=='object'||!Array.isArray((value as ComplianceData).competencies)||!Array.isArray((value as ComplianceData).inspections)||!Array.isArray((value as ComplianceData).incidents)||!Array.isArray((value as ComplianceData).gate_passes)) throw new Error('compliance returned an unexpected response.');
    return value;
  }
  if(!value||typeof value!=='object'||!Array.isArray((value as {usage?:unknown}).usage)||!Array.isArray((value as {errors?:unknown}).errors)||!Array.isArray((value as {feedback?:unknown}).feedback)) throw new Error('analytics returned an unexpected response.');
  return value;
}

export async function loadToolsWorkspace(token:string,role:WorkspaceAccount['role'],get:ToolsGet=toolsApi.get,signal?:AbortSignal,onSourceSettled?:(result:WorkspaceSourceResult)=>void):Promise<WorkspaceLoadResult> {
  const requests=sourceRequests(role);
  const retryTransient=get===toolsApi.get;
  const results=await Promise.allSettled(requests.map(async([source,path])=>{
    try {
      const value=validateSource(source,await getAfterWake<unknown>(path,token,get,retryTransient,signal)) as WorkspaceLoadValues[WorkspaceSource];
      onSourceSettled?.({source,value} as WorkspaceSourceResult);
      return value;
    } catch(error) {
      if(signal?.aborted) throw error;
      onSourceSettled?.({source,error:error instanceof Error?error.message:'This information is temporarily unavailable.'} as WorkspaceSourceResult);
      throw error;
    }
  }));
  if(signal?.aborted) throw new DOMException('The request was cancelled.','AbortError');
  const values:Partial<WorkspaceLoadValues>={};
  const errors:Partial<Record<WorkspaceSource,string>>={};
  let authError:ToolsApiError|undefined;
  results.forEach((result,index)=>{
    const source=requests[index][0];
    if(result.status==='fulfilled') (values as Record<string,unknown>)[source]=result.value;
    else {
      if(result.reason instanceof ToolsApiError&&result.reason.status===401) authError=result.reason;
      errors[source]=result.reason instanceof Error?result.reason.message:'This information is temporarily unavailable.';
    }
  });
  if(authError) throw authError;
  return {values,errors,requested:requests.map(([source])=>source)};
}

export function mapAnalytics(data:ServerAnalytics):{usage:UsageEvent[];errors:ClientError[];feedback:FeedbackRecord[]} {
  return {
    usage:data.usage.map(row=>({id:row.id,name:row.event,detail:row.detail,at:row.created_at,by:row.account_name})),
    errors:data.errors.map(row=>({id:row.id,message:row.message,at:row.created_at})),
    feedback:data.feedback.map(row=>({id:row.id,text:row.text,audioName:row.audio_filename,audioUrl:row.audio_url,at:row.created_at,by:row.account_name||'Workspace user'})),
  };
}
