import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUsageTrend, summarizeUsageTrend, type UsageEvent } from './ToolsAnalytics';

const event=(id:string,date:Date):UsageEvent=>({id,name:'opened equipment',at:date.toISOString(),by:'Test user'});

describe('Tools analytics trend ranges',()=>{
  afterEach(()=>vi.useRealTimers());

  it('groups the same activity into daily, weekly and monthly operational views',()=>{
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026,8,24,12));
    const usage=[
      event('today',new Date(2026,8,24,9)),
      event('same-week',new Date(2026,8,21,14)),
      event('previous-month',new Date(2026,7,12,11)),
    ];

    const daily=buildUsageTrend(usage,'daily');
    const weekly=buildUsageTrend(usage,'weekly');
    const monthly=buildUsageTrend(usage,'monthly');

    expect(daily.at(-1)?.count).toBe(1);
    expect(weekly.at(-1)?.count).toBe(2);
    expect(monthly.at(-1)?.count).toBe(2);
    expect(monthly.at(-2)?.count).toBe(1);
  });

  it('summarizes direction, percentage change and the peak period',()=>{
    const summary=summarizeUsageTrend([
      {key:'1',label:'Week 1',count:1},
      {key:'2',label:'Week 2',count:1},
      {key:'3',label:'Week 3',count:3},
      {key:'4',label:'Week 4',count:5},
    ]);

    expect(summary).toEqual({direction:'increasing',deltaPercent:300,total:10,peak:{key:'4',label:'Week 4',count:5}});
  });

  it('treats small half-to-half movement as stable',()=>{
    expect(summarizeUsageTrend([
      {key:'1',label:'Week 1',count:10},
      {key:'2',label:'Week 2',count:10},
      {key:'3',label:'Week 3',count:10},
      {key:'4',label:'Week 4',count:11},
    ]).direction).toBe('stable');
  });
});
