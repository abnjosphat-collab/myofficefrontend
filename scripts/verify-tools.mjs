import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

let ownsBrowser=false;
let browser;
try{browser=await chromium.connectOverCDP(process.env.TOOLS_CDP_URL||'http://127.0.0.1:9223',{timeout:10_000});}
catch{browser=await chromium.launch({headless:true});ownsBrowser=true;}
const context=browser.contexts()[0]||await browser.newContext();
const baseUrl=process.env.TOOLS_BASE_URL||'http://localhost:3000';
let page=context.pages().find(candidate=>candidate.url().startsWith(baseUrl));
if(!page) page=await context.newPage();

const blockedWrites=[];
const responses=[];
const consoleErrors=[];
let failHistory=false;
let slowHistory=false;
let failTools=false;
let failNotifications=false;
let failAnalytics=false;
let wakeTools=false;
const preferencesKey='myoffice.tools.preferences.v1';
const sessionKey='myoffice.tools.session.v1';
let originalPreferences=null;
let originalSession=null;
let fixtureMode=false;
const fixtureUsage=Array.from({length:36},(_,index)=>({
  id:`usage-${index+1}`,
  event:['opened equipment','searched register','opened compliance','created gate pass','viewed employee'][index%5],
  detail:index%7===0?(index%14===0?'Dark':'Light'):undefined,
  created_at:new Date(Date.UTC(2026,8,29-(index%14),6+(index*3)%18,0,0)).toISOString(),
  account_name:index%4===0?'Audit Issuer':'Audit Admin',
}));
fixtureUsage.push({id:'theme-dark',event:'theme changed',detail:'Dark',created_at:'2026-09-28T18:00:00Z',account_name:'Audit Admin'},{id:'theme-light',event:'theme changed',detail:'Light',created_at:'2026-09-27T08:00:00Z',account_name:'Audit Issuer'});
const fixtureResponses=new Map([
  ['/api/tools-workspace/auth/me',{id:'audit-admin',name:'Audit Admin',username:'audit-admin',role:'admin',department:null,can_issue:false}],
  ['/api/tools-workspace/employees',[{id:'employee-1',employee_number:'E-001',name:'Tariro Moyo',department:'Engineering',job_title:'Fitter',active:true}]],
  ['/api/tools-workspace/tools',[{id:'tool-1',register_number:'PP-UG-ENG-TW-01',name:'Torque wrench',make_model:'Gedore 40-200 Nm',serial_number:'TW-001',category:'Hand tools',equipment_kind:'torque-wrench',storage_location:'Main workshop',home_storage_location:'Locked torque-tool rack',storage_conditions:'Dry and secured',maintenance_requirements:'Inspect and calibrate annually',department:'Engineering',status:'available',condition:'Good',specifications:{Range:'40-200 Nm'},required_ppe:['Safety glasses'],ownership_type:'company',eligible_employees:[{id:'employee-1',employee_number:'E-001',name:'Tariro Moyo',department:'Engineering',job_title:'Fitter'}],inspection_due:[],latest_inspections:{quarterly:{outcome:'passed',inspected_at:'2026-07-01T08:00:00Z',next_due_at:'2026-10-01T08:00:00Z',colour_code:'Yellow'}},archived:false,custody:null,evidence:[]},{id:'tool-2',register_number:'PP-UG-ENG-CM-01',name:'Clamp meter',make_model:'Fluke 376',serial_number:'CM-002',category:'Measurement',equipment_kind:'clamp-meter',storage_location:'Plant 4',home_storage_location:'Electrical instrument cabinet',storage_conditions:'Dry and secured',maintenance_requirements:'Calibrate annually',department:'Engineering',status:'issued',condition:'Good',ownership_type:'company',eligible_employees:[],inspection_due:[],latest_inspections:{},archived:false,custody:{employee_name:'Tariro Moyo',expected_return_at:'2026-09-20T08:00:00Z',original_due_at:'2026-09-20T08:00:00Z',job_reference:'WO-100'},evidence:[]}]],
  ['/api/tools-workspace/history',[{id:'history-1',tool_id:'tool-2',tool_name:'Clamp meter',action:'issue',detail:'Issued for WO-100',actor_name:'Audit Issuer',employee_name:'Tariro Moyo',event_at:'2026-09-20T07:00:00Z'}]],
  ['/api/tools-workspace/source-registers',[{id:'source-1',department:'Engineering',original_name:'engineering-tools.xlsx',content_type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size_bytes:2048,uploaded_by:'Audit Admin',uploaded_at:'2026-09-19T10:00:00Z'}]],
  ['/api/tools-workspace/notifications',{alerts:[{key:'overdue:tool-2:audit',kind:'overdue',tool_id:'tool-2',tool_name:'Clamp meter',department:'Engineering',read:false}],unread_count:1}],
  ['/api/tools-workspace/compliance',{competencies:[{id:'competency-1',employee_id:'employee-1',tool_id:'tool-1',trained:true,qualified:true,authorized:true,authorized_by:'Audit Admin',updated_at:'2026-09-20T08:00:00Z'}],inspections:[{id:'inspection-1',tool_id:'tool-1',inspection_type:'quarterly',outcome:'passed',inspected_at:'2026-07-01T08:00:00Z',inspector_name:'Audit Admin',colour_code:'Yellow'}],incidents:[],gate_passes:[]}],
  ['/api/tools-workspace/analytics',{usage:fixtureUsage,errors:[],feedback:[]}],
  ['/api/tools-workspace/accounts',[{id:'audit-admin',name:'Audit Admin',username:'audit-admin',role:'admin',can_issue:false}]],
]);

await page.route('**/api/**',async route=>{
  const request=route.request();
  const pathname=new URL(request.url()).pathname;
  if(request.method()!=='GET'){
    blockedWrites.push({method:request.method(),pathname});
    await route.abort('blockedbyclient');
    return;
  }
  const simulated=(failHistory&&pathname==='/api/tools-workspace/history')||(failTools&&pathname==='/api/tools-workspace/tools')||(failNotifications&&pathname==='/api/tools-workspace/notifications')||(failAnalytics&&pathname==='/api/tools-workspace/analytics');
  if(slowHistory&&pathname==='/api/tools-workspace/history') await new Promise(resolve=>setTimeout(resolve,6000));
  if(wakeTools&&pathname==='/api/tools-workspace/tools'){
    await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service unavailable while Supabase wakes up'})});
    return;
  }
  if(simulated){
    await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({detail:'Simulated permanent read failure'})});
    return;
  }
  if(fixtureMode&&fixtureResponses.has(pathname)){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtureResponses.get(pathname))});
    return;
  }
  await route.continue();
});

page.on('response',response=>{
  const pathname=new URL(response.url()).pathname;
  if(pathname.startsWith('/api/tools-workspace/')) responses.push({pathname,status:response.status()});
});
page.on('console',message=>{if(message.type()==='error') consoleErrors.push(message.text());});

const phase=message=>fs.writeSync(2,`[tools] ${message}\n`);
const check=(condition,message)=>{if(!condition) throw new Error(message);};
const bodyText=()=>page.locator('body').innerText();
const waitForSettled=()=>page.waitForFunction(()=>!document.body.innerText.includes('Loading tools workspace')&&!document.body.innerText.includes('Loading equipment register'),undefined,{timeout:360_000});
const waitForText=text=>page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout:360_000});
const overflow=locator=>locator.evaluate(element=>element.scrollWidth-element.clientWidth);
const retry=async()=>{
  const button=page.getByRole('button',{name:'Retry',exact:true}).first();
  await button.waitFor({state:'visible',timeout:60_000});
  await button.click();
  await waitForSettled();
};

try{
  phase('opening signed-in workspace');
  await page.setViewportSize({width:1440,height:1000});
  if(!page.url().startsWith(baseUrl)) await page.goto(`${baseUrl}/tools`,{waitUntil:'domcontentloaded',timeout:120_000});
  originalPreferences=await page.evaluate(key=>localStorage.getItem(key),preferencesKey);
  originalSession=await page.evaluate(key=>localStorage.getItem(key),sessionKey);
  if(!originalSession){
    fixtureMode=true;
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({id:'audit-admin',name:'Audit Admin',username:'audit-admin',password:'',role:'admin',canIssue:false,token:'audit-read-only-token'})),sessionKey);
  }
  await page.goto(`${baseUrl}/tools`,{waitUntil:'domcontentloaded',timeout:120_000});
  const session=await page.evaluate(()=>{
    const raw=localStorage.getItem('myoffice.tools.session.v1');
    if(!raw)return null;
    const value=JSON.parse(raw);
    return {name:value.name,role:value.role,department:value.department,hasToken:Boolean(value.token)};
  });
  check(session?.hasToken,'The isolated browser profile could not establish a read-only Tools session.');
  await waitForSettled();
  const liveText=await bodyText();
  check(!liveText.includes('Equipment register unavailable'),'The live equipment register did not load.');
  const live={session,items:Number((liveText.match(/(\d+) items?/)||[])[1]||0),employees:Number((liveText.match(/(\d+) employees?/)||[])[1]||0)};

  phase('checking progressive equipment delivery');
  slowHistory=true;
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await page.getByRole('button',{name:'View Torque wrench',exact:true}).first().waitFor({state:'visible',timeout:4000});
  await page.getByRole('button',{name:'History',exact:true}).first().click();
  const progressiveDelivery={equipmentVisible:true,historyStillLoading:(await bodyText()).includes('Loading issue and return history')};
  slowHistory=false;
  await waitForSettled();
  await page.getByRole('button',{name:'Equipment',exact:true}).first().click();

  phase('checking independent initial history failure');
  failHistory=true;
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await waitForSettled();
  await page.getByRole('button',{name:'History',exact:true}).first().click();
  await waitForText('Issue and return history unavailable');
  const initialFailure={
    errorVisible:await page.getByText('Issue and return history unavailable',{exact:true}).isVisible(),
    falseEmpty:(await bodyText()).includes('No history yet'),
  };

  phase('checking quiet equipment failure with preserved data');
  failHistory=false;
  failTools=true;
  failNotifications=true;
  if(session.role==='admin') failAnalytics=true;
  await retry();
  await page.getByRole('button',{name:'Equipment',exact:true}).first().click();
  await waitForText('Equipment register may be out of date');
  const quietText=await bodyText();
  const quietFailure={
    staleWarning:quietText.includes('Equipment register may be out of date'),
    falseEmpty:quietText.includes('Start your equipment register'),
    itemsPreserved:await page.getByRole('button',{name:'View Torque wrench',exact:true}).first().isVisible(),
  };
  await page.getByLabel('Tool notifications unavailable').click();
  const notificationFailure=await page.getByText('Notifications unavailable',{exact:true}).isVisible();
  await page.getByLabel('Close notifications').click();

  if(session.role==='admin'){
    await page.getByRole('button',{name:'Analytics',exact:true}).first().click();
    await waitForText('Analytics may be out of date');
  }
  const adminFailure=session.role==='admin'?await page.getByText('Analytics may be out of date',{exact:true}).isVisible():null;

  phase('checking transient Supabase wake recovery');
  failTools=false;failNotifications=false;failAnalytics=false;wakeTools=true;
  const wakingReload=page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await wakingReload;
  await waitForText('Loading equipment register');
  const wakingText=await bodyText();
  const wakeStayedLoading=!wakingText.includes('Equipment register unavailable');
  const vendorLoadingCopyAbsent=!wakingText.includes('Supabase may');
  const equipmentLoaderCount=await page.getByText('Loading equipment register',{exact:true}).count();
  wakeTools=false;
  await waitForSettled();

  phase('checking recovery and read-only interactions');
  await page.getByRole('button',{name:'Equipment',exact:true}).first().click();
  await page.getByRole('button',{name:'List view'}).click();
  await page.getByRole('button',{name:'Grid view'}).click();
  const search=page.getByRole('textbox',{name:/Search tools/i});
  if(await search.count()){
    await search.fill('zzzz-no-live-match');
    await waitForText('No matching equipment');
    await search.fill('');
  }
  const firstTool=page.getByRole('button',{name:'View Torque wrench',exact:true}).first();
  let detailOpened=false;
  if(await firstTool.count()&&await firstTool.isVisible().catch(()=>false)){
    await firstTool.click();
    detailOpened=await page.getByRole('dialog').isVisible().catch(()=>false);
    if(detailOpened) await page.getByRole('dialog').getByRole('button',{name:/Close/i}).first().click();
  }
  await page.getByRole('button',{name:'Compliance',exact:true}).click();
  await waitForText('Inspection and maintenance control');
  const complianceVisible=await page.getByText('Current competency register',{exact:true}).isVisible();
  await page.getByRole('button',{name:'Gate passes',exact:true}).click();
  await waitForText('Gate pass control');
  const gatePassesVisible=await page.getByText('Gate pass control',{exact:true}).isVisible();
  let analyticsVisualsVisible=null;
  if(session.role==='admin'){
    await page.getByRole('button',{name:'Analytics',exact:true}).first().click();
    await waitForText('Usage trend');
    analyticsVisualsVisible=await page.getByRole('img',{name:'daily Tools usage trend'}).isVisible()&&await page.getByRole('img',{name:'Most frequently used Tools features'}).isVisible();
    await page.screenshot({path:path.join(os.tmpdir(),'myoffice-tools-analytics-light.png'),fullPage:true});
  } else await page.getByRole('button',{name:'Equipment',exact:true}).first().click();

  phase('checking dark mobile layout');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/Switch to dark theme/i}).click();
  await page.waitForTimeout(400);
  const mobile={documentOverflow:await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),mainOverflow:await overflow(page.locator('main'))};
  await page.getByText('Failed to fetch',{exact:true}).waitFor({state:'hidden',timeout:10_000}).catch(()=>{});
  await page.screenshot({path:path.join(os.tmpdir(),'myoffice-tools-dark-mobile.png'),fullPage:true});

  await page.evaluate(({preferencesKey,preferences,sessionKey,session})=>{if(preferences===null)localStorage.removeItem(preferencesKey);else localStorage.setItem(preferencesKey,preferences);if(session===null)localStorage.removeItem(sessionKey);else localStorage.setItem(sessionKey,session);},{preferencesKey,preferences:originalPreferences,sessionKey,session:originalSession});
  await page.setViewportSize({width:1440,height:1000});
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await waitForSettled();
  await page.evaluate(({preferencesKey,preferences,sessionKey,session})=>{if(preferences===null)localStorage.removeItem(preferencesKey);else localStorage.setItem(preferencesKey,preferences);if(session===null)localStorage.removeItem(sessionKey);else localStorage.setItem(sessionKey,session);},{preferencesKey,preferences:originalPreferences,sessionKey,session:originalSession});

  const evidence={fixtureMode,live,progressiveDelivery,initialFailure,quietFailure,notificationFailure,adminFailure,wakeStayedLoading,vendorLoadingCopyAbsent,equipmentLoaderCount,complianceVisible,gatePassesVisible,analyticsVisualsVisible,detailOpened,mobile,blockedWrites,consoleErrors,responses:{total:responses.length,successful:responses.filter(item=>item.status===200).length,simulatedFailures:responses.filter(item=>item.status>=500).length,paths:[...new Set(responses.map(item=>item.pathname))]},restoredPreferences:await page.evaluate(key=>localStorage.getItem(key),preferencesKey),restoredSession:await page.evaluate(key=>localStorage.getItem(key),sessionKey)};
  fs.writeSync(1,`${JSON.stringify(evidence,null,2)}\n`);
  check(initialFailure.errorVisible&&!initialFailure.falseEmpty,'History failure looked like a genuine empty history.');
  check(progressiveDelivery.equipmentVisible&&progressiveDelivery.historyStillLoading,'Equipment waited for the delayed history source.');
  check(quietFailure.staleWarning&&!quietFailure.falseEmpty&&quietFailure.itemsPreserved,'Quiet equipment failure discarded or misrepresented loaded data.');
  check(notificationFailure,'Notification failure was not visible.');
  check(adminFailure!==false,'Administrator analytics failure was not visible.');
  check(wakeStayedLoading,'Transient Supabase wake-up rendered an unavailable state.');
  check(vendorLoadingCopyAbsent,'The loading state exposed the removed Supabase wake-up message.');
  check(equipmentLoaderCount===1,'The equipment loading state was rendered more than once.');
  check(complianceVisible&&gatePassesVisible,'Compliance or Gate passes did not render.');
  check(analyticsVisualsVisible!==false,'The polished Analytics visualizations did not render.');
  check(mobile.documentOverflow===0&&mobile.mainOverflow===0,'The Tools workspace overflowed at 390px.');
  check(evidence.restoredPreferences===originalPreferences,'Tools appearance preferences were not restored.');
  check(evidence.restoredSession===originalSession,'Tools session storage was not restored.');
  if(ownsBrowser) await browser.close();
}catch(error){
  if(page) await page.evaluate(({preferencesKey,preferences,sessionKey,session})=>{if(preferences===null)localStorage.removeItem(preferencesKey);else localStorage.setItem(preferencesKey,preferences);if(session===null)localStorage.removeItem(sessionKey);else localStorage.setItem(sessionKey,session);},{preferencesKey,preferences:originalPreferences,sessionKey,session:originalSession}).catch(()=>{});
  fs.writeSync(2,`${error instanceof Error?error.stack||error.message:String(error)}\n`);
  if(ownsBrowser) await browser.close().catch(()=>{});
  process.exit(1);
}
process.exit(0);
