import { fuzzyScore } from './fuzzySearch';
import { departmentOf, type Activity, type Employee, type Tool } from './prototype';
import type { IconName } from './ToolsIcon';
import type { ToolsTab } from './toolSelectors';
import type { SourceRegisterRecord } from './ToolsSourceRegisters';

export type SearchTarget =
  | { type: 'tab'; tab: ToolsTab; query?: string }
  | { type: 'tool'; toolId: string }
  | { type: 'modal'; modal: 'new' | 'employee' | 'customize' | 'import' | 'export' | 'feedback' | 'source-register' }
  | { type: 'appearance'; appearance: 'light' | 'dark' };

export type WorkspaceSearchResult = {
  id: string;
  kind: 'Page' | 'Equipment' | 'Employee' | 'Document' | 'History' | 'Setting' | 'Action';
  title: string;
  subtitle: string;
  keywords: string;
  icon: IconName;
  target: SearchTarget;
};

const fixedResults: WorkspaceSearchResult[] = [
  { id: 'page-equipment', kind: 'Page', title: 'Equipment register', subtitle: 'Browse every active and archived item', keywords: 'tools assets register inventory equipment', icon: 'box', target: { type: 'tab', tab: 'register' } },
  { id: 'page-loans', kind: 'Page', title: 'Equipment in use', subtitle: 'See current custody and overdue returns', keywords: 'issued borrowed loan handover custody overdue', icon: 'out', target: { type: 'tab', tab: 'loans' } },
  { id: 'page-employees', kind: 'Page', title: 'Employee register', subtitle: 'Find people who can receive equipment', keywords: 'staff personnel workers people employees', icon: 'user', target: { type: 'tab', tab: 'employees' } },
  { id: 'page-history', kind: 'Page', title: 'Movement history', subtitle: 'Review the issue and return audit trail', keywords: 'activity movements audit trail issue return transfer', icon: 'history', target: { type: 'tab', tab: 'activity' } },
  { id: 'page-sources', kind: 'Page', title: 'Source registers', subtitle: 'Original PDF, Excel, Word and scanned registers', keywords: 'documents source files pdf spreadsheet excel word scan register', icon: 'upload', target: { type: 'tab', tab: 'sources' } },
  { id: 'page-accounts', kind: 'Page', title: 'Account access', subtitle: 'Grant or revoke roles and departmental access', keywords: 'admin users accounts roles permissions grant revoke issuer viewer', icon: 'accounts', target: { type: 'tab', tab: 'accounts' } },
  { id: 'page-analytics', kind: 'Page', title: 'Analytics', subtitle: 'Usage, errors, appearance and feedback', keywords: 'charts metrics insights errors usage reports', icon: 'analytics', target: { type: 'tab', tab: 'analytics' } },
  { id: 'page-feedback', kind: 'Page', title: 'Feedback inbox', subtitle: 'Read saved text and audio feedback', keywords: 'suggestions recordings voice comments', icon: 'edit', target: { type: 'tab', tab: 'feedback' } },
  { id: 'action-add-tool', kind: 'Action', title: 'Add equipment', subtitle: 'Create a new register record', keywords: 'new tool asset create register', icon: 'plus', target: { type: 'modal', modal: 'new' } },
  { id: 'action-add-employee', kind: 'Action', title: 'Add employee', subtitle: 'Add a person to the employee register', keywords: 'new worker person personnel staff create', icon: 'user', target: { type: 'modal', modal: 'employee' } },
  { id: 'action-import', kind: 'Action', title: 'Import a register', subtitle: 'Upload Excel, CSV or Word data', keywords: 'upload spreadsheet xlsx excel csv docx word', icon: 'upload', target: { type: 'modal', modal: 'import' } },
  { id: 'action-source-register', kind: 'Action', title: 'Upload a source register', subtitle: 'Keep an original PDF, spreadsheet, document or scan', keywords: 'source permanent original pdf excel word scan document upload', icon: 'upload', target: { type: 'modal', modal: 'source-register' } },
  { id: 'action-export', kind: 'Action', title: 'Download or export', subtitle: 'Create PDF, Word or Excel output', keywords: 'report pdf docx word xlsx excel export', icon: 'download', target: { type: 'modal', modal: 'export' } },
  { id: 'action-feedback', kind: 'Action', title: 'Send feedback', subtitle: 'Write or record a suggestion', keywords: 'suggestion audio voice comment help', icon: 'edit', target: { type: 'modal', modal: 'feedback' } },
  { id: 'setting-customize', kind: 'Setting', title: 'Settings', subtitle: 'Layout, type, icon style and guidance', keywords: 'customize preferences rearrange hide restore font icons help hints', icon: 'settings', target: { type: 'modal', modal: 'customize' } },
  { id: 'setting-font', kind: 'Setting', title: 'Typography and text size', subtitle: 'Choose a font and adjust readability', keywords: 'font text size inter manrope jakarta accessibility larger smaller', icon: 'font', target: { type: 'modal', modal: 'customize' } },
  { id: 'setting-icons', kind: 'Setting', title: 'Equipment icon family', subtitle: 'Choose Tabler, Iconoir or another outline set', keywords: 'icons symbols tabler iconoir technical myoffice', icon: 'box', target: { type: 'modal', modal: 'customize' } },
  { id: 'setting-dark', kind: 'Setting', title: 'Use dark appearance', subtitle: 'Black surfaces with light text', keywords: 'theme mode black night appearance', icon: 'appearance', target: { type: 'appearance', appearance: 'dark' } },
  { id: 'setting-light', kind: 'Setting', title: 'Use light appearance', subtitle: 'White surfaces with dark text', keywords: 'theme mode white day appearance', icon: 'appearance', target: { type: 'appearance', appearance: 'light' } },
];

export function buildWorkspaceSearchIndex(tools: Tool[], employees: Employee[], activity: Activity[], sourceRegisters:SourceRegisterRecord[] = []) {
  const dynamic: WorkspaceSearchResult[] = [];
  for (const tool of tools) {
    dynamic.push({
      id: `tool-${tool.id}`, kind: 'Equipment', title: tool.name,
      subtitle: `${tool.id} · ${departmentOf(tool)} · ${tool.location}`,
      keywords: `${tool.id} ${tool.name} ${tool.make} ${tool.serial} ${tool.category} ${tool.condition} ${tool.holder ?? ''} ${tool.job ?? ''} ${tool.notes ?? ''} ${departmentOf(tool)} ${tool.section ?? ''}`,
      icon: 'box', target: { type: 'tool', toolId: tool.id },
    });
    for (const file of tool.evidence ?? []) dynamic.push({
      id: `document-${tool.id}-${file.id}`, kind: 'Document', title: file.name,
      subtitle: `Attached to ${tool.name} · ${tool.id}`,
      keywords: `${file.name} ${file.type} attachment document photo pdf ${tool.name} ${tool.id}`,
      icon: file.type === 'application/pdf' ? 'pdf' : 'image', target: { type: 'tool', toolId: tool.id },
    });
  }
  for (const employee of employees) dynamic.push({
    id: `employee-${employee.id}`, kind: 'Employee', title: employee.name,
    subtitle: `${employee.employeeNumber} · ${employee.department}${employee.jobTitle ? ` · ${employee.jobTitle}` : ''}`,
    keywords: `${employee.name} ${employee.employeeNumber} ${employee.department} ${employee.jobTitle ?? ''} staff worker personnel`,
    icon: 'user', target: { type: 'tab', tab: 'employees', query: employee.name },
  });
  for (const event of activity) dynamic.push({
    id: `history-${event.id}`, kind: 'History', title: event.title,
    subtitle: `${event.toolId} · ${event.detail}`,
    keywords: `${event.title} ${event.toolId} ${event.detail} ${event.recordedBy ?? ''} ${event.time}`,
    icon: 'history', target: { type: 'tab', tab: 'activity', query: event.toolId },
  });
  for (const document of sourceRegisters) dynamic.push({
    id:`source-register-${document.id}`,kind:'Document',title:document.original_name,
    subtitle:`${document.department} · Uploaded by ${document.uploaded_by}`,
    keywords:`${document.original_name} ${document.department} ${document.notes||''} ${document.content_type} ${document.uploaded_by} source register document pdf excel word`,
    icon:document.content_type==='application/pdf'?'pdf':'attachment',target:{type:'tab',tab:'sources',query:document.original_name},
  });
  return [...fixedResults, ...dynamic];
}

export function searchWorkspace(index: WorkspaceSearchResult[], query: string, limit = 9) {
  if (!query.trim()) return [];
  return index
    .map(result => ({ result, score: fuzzyScore(query, `${result.title} ${result.subtitle} ${result.keywords} ${result.kind}`) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.result.title.localeCompare(right.result.title))
    .slice(0, limit)
    .map(item => item.result);
}
