import { toolsApi, ToolsApiError } from './toolsApi';
import type { WorkspaceAccount } from './prototype';
import type { ClientError, FeedbackRecord, UsageEvent } from './ToolsAnalytics';
import type { SourceRegisterRecord } from './ToolsSourceRegisters';

export type ServerTool = { id:string; register_number:string; name:string; make_model?:string; serial_number?:string; category?:string; equipment_kind?:'hand-tool'|'power-tool'|'measurement'|'lifting'|'safety'|'other-equipment'; storage_location:string; department:string; section?:string; status:'available'|'issued'|'overdue'|'attention'; condition?:string; notes?:string; approval_ref?:string; calibration?:string; specifications?:Record<string,string>; archived?:boolean; custody?:{employee_name?:string;expected_return_at?:string;original_due_at?:string;job_reference?:string;assigned_equipment?:string[]}; evidence?:Array<{id:string;original_name:string;content_type:string;size_bytes:number;url?:string}> };
export type ServerEmployee = {id:string;employee_number:string;name:string;department:string;job_title?:string;supervisor_name?:string;active:boolean};
export type ServerHistory = {id:string;tool_id:string;tool_name:string;action:string;detail?:string;actor_name?:string;employee_name?:string;event_at:string};
export type ToolNotification = { key:string; kind:'overdue'|'attention'; tool_id:string; tool_name:string; department:string; read:boolean };
export type ServerAnalytics = {
  usage:Array<{id:string;event:string;detail?:string;created_at:string;account_name?:string}>;
  errors:Array<{id:string;message:string;created_at:string}>;
  feedback:Array<{id:string;text?:string;audio_filename?:string;audio_url?:string;created_at:string;account_name?:string}>;
};
export type ServerAccount = {id:string;name:string;username:string;role:WorkspaceAccount['role'];department?:string;can_issue:boolean};

export type WorkspaceSource = 'employees'|'tools'|'history'|'sources'|'notifications'|'analytics'|'accounts';
export type WorkspaceLoadValues = {
  employees: ServerEmployee[];
  tools: ServerTool[];
  history: ServerHistory[];
  sources: SourceRegisterRecord[];
  notifications: {alerts:ToolNotification[];unread_count:number};
  analytics: ServerAnalytics;
  accounts: ServerAccount[];
};
export type WorkspaceLoadResult = {
  values: Partial<WorkspaceLoadValues>;
  errors: Partial<Record<WorkspaceSource,string>>;
  requested: WorkspaceSource[];
};

type ToolsGet = <T>(path:string,token:string)=>Promise<T>;

const sourceRequests = (role:WorkspaceAccount['role']):Array<[WorkspaceSource,string]> => [
  ['employees','/employees'],
  ['tools','/tools'],
  ['history','/history'],
  ['sources','/source-registers'],
  ['notifications','/notifications'],
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
  if(!value||typeof value!=='object'||!Array.isArray((value as {usage?:unknown}).usage)||!Array.isArray((value as {errors?:unknown}).errors)||!Array.isArray((value as {feedback?:unknown}).feedback)) throw new Error('analytics returned an unexpected response.');
  return value;
}

export async function loadToolsWorkspace(token:string,role:WorkspaceAccount['role'],get:ToolsGet=toolsApi.get):Promise<WorkspaceLoadResult> {
  const requests=sourceRequests(role);
  const results=await Promise.allSettled(requests.map(([source,path])=>get<unknown>(path,token).then(value=>validateSource(source,value))));
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
