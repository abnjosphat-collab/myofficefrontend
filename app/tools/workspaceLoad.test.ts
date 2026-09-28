import { describe, expect, it, vi } from 'vitest';
import { toolsApi, ToolsApiError } from './toolsApi';
import { loadToolsWorkspace } from './workspaceLoad';

describe('loadToolsWorkspace',()=>{
  it('keeps successful sources when another source is unavailable',async()=>{
    const get=async<T>(path:string)=>{
      if(path==='/history') throw new ToolsApiError('History is waking up.',503);
      return [] as T;
    };
    const result=await loadToolsWorkspace('token','viewer',get);
    expect(result.values.tools).toEqual([]);
    expect(result.values.employees).toEqual([]);
    expect(result.errors.history).toBe('History is waking up.');
    expect(result.errors.tools).toBeUndefined();
  });

  it('loads administrator-only sources only for administrators',async()=>{
    const paths:string[]=[];
    const get=async<T>(path:string)=>{paths.push(path);return (path==='/analytics'?{usage:[],errors:[],feedback:[]}:[]) as T;};
    await loadToolsWorkspace('token','issuer',get);
    expect(paths).not.toContain('/analytics');
    paths.length=0;
    await loadToolsWorkspace('token','admin',get);
    expect(paths).toEqual(expect.arrayContaining(['/analytics','/accounts']));
  });

  it('propagates an expired session instead of presenting partial data',async()=>{
    const get=async<T>(path:string)=>{
      if(path==='/tools') throw new ToolsApiError('Session expired.',401);
      return [] as T;
    };
    await expect(loadToolsWorkspace('token','viewer',get)).rejects.toMatchObject({status:401});
  });

  it('treats malformed successful responses as unavailable data',async()=>{
    const get=async<T>(path:string)=>path==='/tools'?({items:[]} as T):([] as T);
    const result=await loadToolsWorkspace('token','viewer',get);
    expect(result.values.tools).toBeUndefined();
    expect(result.errors.tools).toBe('tools returned an unexpected response.');
  });

  it('keeps retrying transient wake failures beyond the former two-minute limit',async()=>{
    vi.useFakeTimers();
    let toolAttempts=0;
    const get=vi.spyOn(toolsApi,'get').mockImplementation(async <T>(path:string)=>{
      if(path==='/tools'&&++toolAttempts<10) throw new TypeError('Failed to fetch');
      if(path==='/notifications') return {alerts:[],unread_count:0} as T;
      if(path==='/compliance') return {competencies:[],inspections:[],incidents:[],gate_passes:[]} as T;
      return [] as T;
    });
    try {
      const loading=loadToolsWorkspace('token','viewer');
      await vi.advanceTimersByTimeAsync(147_000);
      const result=await loading;
      expect(toolAttempts).toBe(10);
      expect(result.values.tools).toEqual([]);
      expect(result.errors.tools).toBeUndefined();
    } finally {
      get.mockRestore();
      vi.useRealTimers();
    }
  });
});
