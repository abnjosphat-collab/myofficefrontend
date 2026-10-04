import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('Item due')).toBeInTheDocument();
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('Competency')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '1Open incident' && !!element.querySelector('strong'))).toBeInTheDocument();
    expect(screen.queryByText('Items due')).not.toBeInTheDocument();
    expect(screen.queryByText('Records')).not.toBeInTheDocument();
    expect(screen.queryByText('Competencies')).not.toBeInTheDocument();
    expect(screen.queryByText('Open incidents')).not.toBeInTheDocument();
  });

  it('uses plural summary labels for zero and multiple counts',()=>{
    render(<ToolsCompliance {...baseProps}/>);
    expect(screen.getByText('Items due')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Competencies')).toBeInTheDocument();
    expect(screen.getByText('Open incidents')).toBeInTheDocument();
  });
});
