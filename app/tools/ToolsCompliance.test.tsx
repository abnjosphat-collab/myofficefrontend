import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolsCompliance } from './ToolsCompliance';
import type { CompetencyRecord, IncidentRecord, InspectionRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';

vi.mock('./ToolsIcon',()=>({ToolsIcon:()=> <span aria-hidden="true"/>}));

const tool:Tool={id:'PP-UG-ENG-AG-01',backendId:'tool-1',name:'Angle grinder',make:'Bosch',serial:'AG-1',category:'Power tools',kind:'angle-grinder',status:'available',location:'Tool room',condition:'Good',maintenanceRequirements:'Inspect guard and cable',inspectionDue:[],latestInspections:{}};
const employee:Employee={id:'E-1',backendId:'employee-1',employeeNumber:'E-1',name:'Tariro Moyo',department:'Engineering',active:true};
const baseProps={tools:[tool],employees:[employee],competencies:[],inspections:[],incidents:[],canManage:true,onSaveCompetency:vi.fn(),onRecordInspection:vi.fn(),onReportIncident:vi.fn(),onCloseIncident:vi.fn()};

describe('ToolsCompliance',()=>{
  it('submits the repair-versus-replacement evidence and shows the 60% decision',async()=>{
    const user=userEvent.setup();
    const onRecordInspection=vi.fn().mockResolvedValue(undefined);
    render(<ToolsCompliance {...baseProps} onRecordInspection={onRecordInspection}/>);
    await user.click(screen.getByRole('button',{name:'Record'}));
    await user.click(screen.getByText('Record inspection or maintenance'));
    await user.click(screen.getByRole('button',{name:'Inspection type'}));
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
    await user.click(screen.getByRole('button',{name:'Record'}));
    await user.click(screen.getByText('Report loss, damage or theft'));
    fireEvent.change(screen.getByLabelText('Occurred at'),{target:{value:'2030-02-01T10:30'}});
    await user.click(screen.getByRole('button',{name:'Employee involved'}));
    await user.click(await screen.findByRole('option',{name:'Tariro Moyo · E-1'}));
    fireEvent.change(screen.getByLabelText('Immediate report'),{target:{value:'Guard damaged during use and equipment isolated.'}});
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
    await user.click(screen.getByRole('button',{name:/Incidents/}));
    const table=screen.getByRole('table',{name:'Open incidents'});
    expect(within(table).getByText('Guard cracked')).toBeVisible();
    await user.click(within(table).getByRole('button',{name:/Close the investigation/}));
    expect(screen.getByRole('button',{name:'Open incident'})).toBeVisible();
  });

  it('says plainly when there are no open incidents',async()=>{
    const user=userEvent.setup();
    render(<ToolsCompliance {...baseProps}/>);
    await user.click(screen.getByRole('button',{name:'Incidents'}));
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
    await user.click(screen.getByRole('button',{name:'Approvals'}));
    const expiring=screen.getByRole('table',{name:'Approvals expiring soon'});
    expect(within(expiring).getByText('Tariro Moyo')).toBeVisible();
    const cover=screen.getByRole('table',{name:'Eligible people by equipment'});
    expect(within(cover).getByText('Megger')).toBeVisible();
    expect(within(cover).queryByText('Torque wrench')).not.toBeInTheDocument();
    expect(within(cover).getByText(/Nobody eligible, cannot be issued/)).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Manage who can use what'}));
    expect(onOpenEmployees).toHaveBeenCalled();
  });

  it('keeps the Record section and its buttons to managers',()=>{
    render(<ToolsCompliance {...baseProps} canManage={false}/>);
    expect(screen.queryByRole('button',{name:'Record'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Record a check for/})).not.toBeInTheDocument();
  });
});
