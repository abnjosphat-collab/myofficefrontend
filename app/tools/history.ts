import type { Tool, Activity } from './prototype';
export type Snapshot = { tools: Tool[]; activity: Activity[] };
type Revision = { snapshot: Snapshot; label: string };
export type History = { past: Revision[]; present: Snapshot; future: Revision[] };
export type HistoryAction = { type: 'save'; snapshot: Snapshot; label: string } | { type: 'reset'; snapshot: Snapshot } | { type: 'replace-tools'; tools: Tool[] } | { type: 'replace-activity'; activity: Activity[] } | { type: 'undo' } | { type: 'redo' };
/** Local preview history only. Real transactions need server-side corrective events. */
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'reset') return { past: [], present: action.snapshot, future: [] };
  if (action.type === 'replace-tools') {
    const ids=new Map(action.tools.map(item=>[item.backendId,item.id]));
    return {past:[],present:{tools:action.tools,activity:state.present.activity.map(item=>({...item,toolId:ids.get(item.toolId)||item.toolId}))},future:[]};
  }
  if (action.type === 'replace-activity') {
    const ids=new Map(state.present.tools.map(item=>[item.backendId,item.id]));
    return {past:[],present:{tools:state.present.tools,activity:action.activity.map(item=>({...item,toolId:ids.get(item.toolId)||item.toolId}))},future:[]};
  }
  if (action.type === 'save') return { past: [...state.past.slice(-29), { snapshot: state.present, label: action.label }], present: action.snapshot, future: [] };
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    return previous ? { past: state.past.slice(0, -1), present: previous.snapshot, future: [{ snapshot: state.present, label: previous.label }, ...state.future] } : state;
  }
  const next = state.future[0];
  return next ? { past: [...state.past, { snapshot: state.present, label: next.label }], present: next.snapshot, future: state.future.slice(1) } : state;
}
