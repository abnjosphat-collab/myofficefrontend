import { STATUS, departmentOf, matchesTool, type Activity, type Status, type Tool } from './prototype';

export type ToolsTab = 'register' | 'loans' | 'employees' | 'activity' | 'analytics' | 'feedback';
export type ToolFilterState = { department: string; status: Status | 'all' | 'archived'; search: string; category: string; location: string; tab: ToolsTab; sort: string };

export function countTools(tools: Tool[]) {
  const active = tools.filter(tool => !tool.archived);
  return {
    total: active.length,
    available: active.filter(tool => tool.status === 'available').length,
    issued: active.filter(tool => ['issued','overdue'].includes(tool.status)).length,
    overdue: active.filter(tool => tool.status === 'overdue').length,
    attention: active.filter(tool => tool.status === 'attention').length,
  };
}

export function selectVisibleTools(tools: Tool[], filters: ToolFilterState) {
  const result = tools.filter(tool =>
    (filters.department === 'all' || departmentOf(tool) === filters.department) &&
    (filters.status === 'archived' ? tool.archived : !tool.archived) &&
    matchesTool(tool, filters.search) &&
    (['all','archived'].includes(filters.status) || tool.status === filters.status) &&
    (filters.category === 'all' || tool.category === filters.category) &&
    (filters.location === 'all' || tool.location.toLowerCase().includes(filters.location.toLowerCase())) &&
    (filters.tab !== 'loans' || ['issued','overdue'].includes(tool.status))
  );
  if (filters.sort === 'name') return [...result].sort((a,b)=>a.name.localeCompare(b.name));
  if (filters.sort === 'status') return [...result].sort((a,b)=>STATUS[a.status].localeCompare(STATUS[b.status]));
  return result;
}

export function selectVisibleActivity(activity: Activity[], scopedTools: Tool[], search: string) {
  const toolIds = new Set(scopedTools.map(tool=>tool.id));
  const query = search.trim().toLowerCase();
  return activity.filter(event=>toolIds.has(event.toolId)&&`${event.title} ${event.toolId} ${event.detail}`.toLowerCase().includes(query));
}
