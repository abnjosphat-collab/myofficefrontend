import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolsCompliance } from './ToolsCompliance';
import type { CompetencyRecord, IncidentRecord, InspectionRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';


const tool:Tool={id:'PP-UG-ENG-AG-01',backendId:'tool-1',name:'Angle grinder',make:'Bosch',serial:'AG-1',category:'Power tools',kind:'angle-grinder',status:'available',location:'Tool room',condition:'Good',maintenanceRequirements:'Inspect guard and cable',inspectionDue:[],latestInspections:{}};
const employee:Employee={id:'E-1',backendId:'employee-1',employeeNumber:'E-1',name:'Tariro Moyo',department:'Engineering',active:true};
const baseProps={tools:[tool],employees:[employee],competencies:[],inspections:[],incidents:[],plan:[],canManage:true,onSaveCompetency:vi.fn(),onRecordInspection:vi.fn(),onReportIncident:vi.fn(),onCloseIncident:vi.fn()};

describe('ToolsCompliance',()=>{
  it('submits the repair-versus-replacement evidence and shows the 60% decision',async()=>{
    const user=userEvent.setup();
    const onRecordInspection=vi.fn().mockResolvedValue(undefined);
    render(<ToolsCompliance {...baseProps} onRecordInspection={onRecordInspection}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Record inspection or maintenance'));
    await user.click(screen.getByRole('combobox',{name:'Check type'}));
    await user.click(await screen.findByRole('option',{name:'Repair verification'}));
    fireEvent.change(screen.getByLabelText('Repair quotation'),{target:{value:'600'}});
    fireEvent.change(screen.getByLabelText('New equipment price'),{target:{value:'1000'}});
    expect(screen.getByText('Repair is within the 60% limit')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Record check'}));
    await waitFor(()=>expect(onRecordInspection).toHaveBeenCalledWith('tool-1',expect.objectContaining({inspection_type:'repair',repair_quote:600,new_equipment_price:1000})));
  });

  it('reports an equipment incident with its occurrence time and employee',async()=>{
    const user=userEvent.setup();
    const onReportIncident=vi.fn().mockResolvedValue(undefined);
    render(<ToolsCompliance {...baseProps} onReportIncident={onReportIncident}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Report loss, damage or theft'));
    fireEvent.change(screen.getByLabelText(/Occurred at/),{target:{value:'2030-02-01T10:30'}});
    await user.click(screen.getByRole('combobox',{name:/Employee involved/}));
    await user.click(await screen.findByRole('option',{name:'Tariro Moyo · E-1'}));
    fireEvent.change(screen.getByLabelText(/Immediate report/),{target:{value:'Guard damaged during use and equipment isolated.'}});
    await user.click(screen.getByRole('button',{name:'Report incident'}));
    await waitFor(()=>expect(onReportIncident).toHaveBeenCalledWith('tool-1',expect.objectContaining({incident_type:'damaged',employee_id:'employee-1',explanation:'Guard damaged during use and equipment isolated.'})));
  });

  it('uses singular summary labels when exactly one item is counted',()=>{
    const dueTool:Tool={...tool,inspectionDue:['monthly']};
    const inspections:InspectionRecord[]=[{id:'i-1',tool_id:'tool-1',inspection_type:'monthly',outcome:'passed',inspected_at:'2026-09-01T08:00:00Z',inspector_name:'Audit Admin'}];
    const competencies:CompetencyRecord[]=[{id:'c-1',employee_id:'employee-1',tool_id:'tool-1',trained:true,qualified:true,authorized:true,updated_at:'2026-09-01T08:00:00Z'}];
    const incidents:IncidentRecord[]=[{id:'n-1',tool_id:'tool-1',incident_type:'damaged',occurred_at:'2026-09-01T08:00:00Z',reported_at:'2026-09-01T09:00:00Z',reported_by:'Audit Admin',explanation:'Guard cracked',investigation_due_at:'2026-09-02T09:00:00Z',status:'open'}];
    render(<ToolsCompliance {...baseProps} tools={[dueTool]} inspections={inspections} competencies={competencies} incidents={incidents}/>);
    const label=(text:string)=>screen.getByText(text,{selector:'dt'});
    expect(label('Check overdue')).toBeInTheDocument();
    expect(label('Inspection record')).toBeInTheDocument();
    expect(label('Approval')).toBeInTheDocument();
    expect(label('Open incident')).toBeInTheDocument();
    expect(screen.queryByText('Checks overdue',{selector:'dt'})).not.toBeInTheDocument();
    expect(screen.queryByText('Inspection records',{selector:'dt'})).not.toBeInTheDocument();
    expect(screen.queryByText('Approvals',{selector:'dt'})).not.toBeInTheDocument();
    expect(screen.queryByText('Open incidents')).not.toBeInTheDocument();
  });

  it('uses plural summary labels for zero and multiple counts',()=>{
    render(<ToolsCompliance {...baseProps}/>);
    for(const text of ['Checks overdue','Inspection records','Approvals','Open incidents']) expect(screen.getByText(text,{selector:'dt'})).toBeInTheDocument();
  });

  const rowTool=(over:Partial<Tool>):Tool=>({...tool,...over});
  it('opens on the equipment with overdue checks and lists the rest on request',async()=>{
    const user=userEvent.setup();
    const tools=[rowTool({id:'T-OK',backendId:'t-ok',name:'Torque wrench',inspectionDue:[]}),rowTool({id:'T-DUE',backendId:'t-due',name:'Megger',inspectionDue:['monthly','quarterly']})];
    render(<ToolsCompliance {...baseProps} tools={tools}/>);
    const table=screen.getByRole('table',{name:'Inspections by equipment'});
    expect(within(table).getByText('Megger')).toBeVisible();
    expect(within(table).getByText('monthly overdue')).toBeVisible();
    expect(within(table).queryByText('Torque wrench')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:/All equipment/}));
    const rows=within(screen.getByRole('table',{name:'Inspections by equipment'})).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Megger');
    expect(rows[2]).toHaveTextContent('Torque wrench');
  });

  it('opens the inspection form for the chosen equipment from its Record check button',async()=>{
    const user=userEvent.setup();
    const onRecordInspection=vi.fn().mockResolvedValue(undefined);
    const tools=[rowTool({id:'T-1',backendId:'t-1',name:'Torque wrench',inspectionDue:['weekly']}),rowTool({id:'T-2',backendId:'t-2',name:'Megger',inspectionDue:['monthly']})];
    render(<ToolsCompliance {...baseProps} tools={tools} onRecordInspection={onRecordInspection}/>);
    await user.click(screen.getByRole('button',{name:'Record a check for Megger'}));
    await user.click(screen.getByRole('button',{name:'Record check'}));
    await waitFor(()=>expect(onRecordInspection).toHaveBeenCalledWith('t-2',expect.objectContaining({inspection_type:'monthly'})));
  });

  it('shows open incidents with a Close investigation button that opens the form',async()=>{
    const user=userEvent.setup();
    const incident={id:'n-9',tool_id:'tool-1',incident_type:'damaged',occurred_at:'2026-09-01T08:00:00Z',reported_at:'2026-09-01T09:00:00Z',reported_by:'Audit Admin',explanation:'Guard cracked',investigation_due_at:'2026-09-02T09:00:00Z',status:'open'} as IncidentRecord;
    render(<ToolsCompliance {...baseProps} incidents={[incident]}/>);
    await user.click(screen.getByRole('tab',{name:/Incidents/}));
    const table=screen.getByRole('table',{name:'Open incidents'});
    expect(within(table).getByText('Guard cracked')).toBeVisible();
    await user.click(within(table).getByRole('button',{name:/Close the investigation/}));
    expect(screen.getByRole('combobox',{name:'Open incident'})).toBeVisible();
  });

  it('says plainly when there are no open incidents',async()=>{
    const user=userEvent.setup();
    render(<ToolsCompliance {...baseProps}/>);
    await user.click(screen.getByRole('tab',{name:'Incidents'}));
    expect(screen.getByText(/No open incidents/)).toBeVisible();
  });

  it('shows where cover has gaps: equipment nobody is eligible for, and approvals about to expire',async()=>{
    const user=userEvent.setup();
    const onOpenEmployees=vi.fn();
    const covered=rowTool({id:'T-1',backendId:'t-1',name:'Torque wrench',eligibleEmployees:[{id:'employee-1',employeeNumber:'E-1',name:'Tariro Moyo',department:'Engineering'}]});
    const bare=rowTool({id:'T-2',backendId:'t-2',name:'Megger',eligibleEmployees:[]});
    const soon=new Date(Date.now()+5*24*3600*1000).toISOString();
    const competencies:CompetencyRecord[]=[{id:'c-1',employee_id:'employee-1',tool_id:'t-1',trained:true,qualified:true,authorized:true,authorization_expires_at:soon,updated_at:'2026-09-01T08:00:00Z'}];
    render(<ToolsCompliance {...baseProps} tools={[covered,bare]} competencies={competencies} onOpenEmployees={onOpenEmployees}/>);
    await user.click(screen.getByRole('tab',{name:'Approvals'}));
    const expiring=screen.getByRole('table',{name:'Approvals expiring soon'});
    expect(within(expiring).getByText('Tariro Moyo')).toBeVisible();
    const cover=screen.getByRole('table',{name:'Eligible people by equipment'});
    expect(within(cover).getByText('Megger')).toBeVisible();
    expect(within(cover).queryByText('Torque wrench')).not.toBeInTheDocument();
    expect(within(cover).getByText(/Nobody eligible, cannot be issued/)).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Manage who can use what'}));
    expect(onOpenEmployees).toHaveBeenCalled();
  });

  it('incident submit with 3 chars shows field errors and focuses one',async()=>{
    const user=userEvent.setup();
    const onReportIncident=vi.fn();
    render(<ToolsCompliance {...baseProps} onReportIncident={onReportIncident}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Report loss, damage or theft'));
    fireEvent.change(screen.getByLabelText(/Occurred at/),{target:{value:'2030-02-01T10:30'}});
    fireEvent.change(screen.getByLabelText(/Immediate report/),{target:{value:'abc'}});
    await user.click(screen.getByRole('button',{name:'Report incident'}));
    expect(onReportIncident).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 5 characters.')).toBeInTheDocument();
    await waitFor(()=>expect(screen.getByLabelText(/Immediate report/)).toHaveFocus());
  });

  it('inspection refusal focuses the defects field',async()=>{
    const user=userEvent.setup();
    const onRecordInspection=vi.fn();
    render(<ToolsCompliance {...baseProps} onRecordInspection={onRecordInspection}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Record inspection or maintenance'));
    await user.click(screen.getByRole('combobox',{name:'Outcome'}));
    await user.click(await screen.findByRole('option',{name:/Failed/}));
    await user.click(screen.getByRole('button',{name:'Record check'}));
    expect(onRecordInspection).not.toHaveBeenCalled();
    expect(screen.getByText('Describe the defects.')).toBeInTheDocument();
    await waitFor(()=>expect(screen.getByLabelText('Defects')).toHaveFocus());
  });

  it('close refusal focuses the investigation outcome',async()=>{
    const user=userEvent.setup();
    const onCloseIncident=vi.fn();
    const incident={id:'n-9',tool_id:'tool-1',incident_type:'damaged',occurred_at:'2026-09-01T08:00:00Z',reported_at:'2026-09-01T09:00:00Z',reported_by:'Audit Admin',explanation:'Guard cracked',investigation_due_at:'2026-09-02T09:00:00Z',status:'open'} as IncidentRecord;
    render(<ToolsCompliance {...baseProps} incidents={[incident]} onCloseIncident={onCloseIncident}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Close investigation',{selector:'strong'}));
    fireEvent.change(screen.getByLabelText(/Investigation outcome/),{target:{value:'abc'}});
    await user.click(screen.getByRole('button',{name:'Close investigation'}));
    expect(onCloseIncident).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 5 characters.')).toBeInTheDocument();
    await waitFor(()=>expect(screen.getByLabelText(/Investigation outcome/)).toHaveFocus());
  });

  it('certificate and qualification read as optional',async()=>{
    const user=userEvent.setup();
    render(<ToolsCompliance {...baseProps}/>);
    await user.click(screen.getByRole('tab',{name:'Record'}));
    await user.click(screen.getByText('Training and authorization'));
    expect(screen.getByLabelText(/Training certificate/)).not.toHaveAttribute('aria-required');
    expect(screen.getByLabelText(/Qualification reference/)).not.toHaveAttribute('aria-required');
  });

  it('keeps the Record section and its buttons to managers',()=>{
    render(<ToolsCompliance {...baseProps} canManage={false}/>);
    expect(screen.queryByRole('button',{name:'Record'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Record a check for/})).not.toBeInTheDocument();
  });

  it("shows this quarter's plan by day with done and pending tools",()=>{
    const second:Tool={...tool,id:'PP-UG-ENG-CD-01',backendId:'tool-2',name:'Cordless drill'};
    const plan=[
      {id:'p1',tool_id:'tool-1',quarter:'2026-Q4',planned_date:'2026-10-06',completed_inspection_id:null},
      {id:'p2',tool_id:'tool-2',quarter:'2026-Q4',planned_date:'2026-10-07',completed_inspection_id:'i9'},
    ];
    render(<ToolsCompliance {...baseProps} tools={[tool,second]} plan={plan}/>);
    const section=screen.getByRole('region',{name:"This quarter's plan"});
    expect(within(section).getByText('Q4 2026',{exact:false})).toBeInTheDocument();
    expect(within(section).getAllByRole('table',{name:/Quarterly plan/})).toHaveLength(2);
    expect(within(section).getByText('Angle grinder')).toBeInTheDocument();
    expect(within(section).getByText('Pending',{exact:true})).toBeInTheDocument();
    expect(within(section).getByText('Cordless drill')).toBeInTheDocument();
    expect(within(section).getByText('Done',{exact:true})).toBeInTheDocument();
  });

  it('counts a passed quarterly check done even before its plan row links it, and offers recording on pending rows',async()=>{
    const user=userEvent.setup();
    const plan=[{id:'p1',tool_id:'tool-1',quarter:'2026-Q4',planned_date:'2026-10-06',completed_inspection_id:null}];
    const inspections:InspectionRecord[]=[{id:'i-1',tool_id:'tool-1',inspection_type:'quarterly',outcome:'passed',inspected_at:'2026-10-05T08:00:00Z',inspector_name:'Audit Admin'}];
    const {rerender}=render(<ToolsCompliance {...baseProps} plan={plan} inspections={inspections}/>);
    expect(within(screen.getByRole('region',{name:"This quarter's plan"})).getByText('Done',{exact:true})).toBeInTheDocument();
    rerender(<ToolsCompliance {...baseProps} plan={plan} inspections={[]}/>);
    const section=screen.getByRole('region',{name:"This quarter's plan"});
    expect(within(section).getByText('Pending',{exact:true})).toBeInTheDocument();
    await user.click(within(section).getByRole('button',{name:'Record a check for Angle grinder'}));
    expect(screen.getByText('Record inspection or maintenance')).toBeVisible();
  });

  it('shows no plan section while nothing is planned',()=>{
    render(<ToolsCompliance {...baseProps} plan={[]}/>);
    expect(screen.queryByRole('region',{name:"This quarter's plan"})).not.toBeInTheDocument();
  });
});
