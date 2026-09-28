import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolsCompliance } from './ToolsCompliance';
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
    fireEvent.change(screen.getByLabelText('Occurred at'),{target:{value:'2030-02-01T10:30'}});
    await user.click(screen.getByRole('button',{name:'Employee involved'}));
    await user.click(await screen.findByRole('option',{name:'Tariro Moyo · E-1'}));
    fireEvent.change(screen.getByLabelText('Immediate report'),{target:{value:'Guard damaged during use and equipment isolated.'}});
    await user.click(screen.getByRole('button',{name:'Report incident'}));
    await waitFor(()=>expect(onReportIncident).toHaveBeenCalledWith('tool-1',expect.objectContaining({incident_type:'damaged',employee_id:'employee-1',explanation:'Guard damaged during use and equipment isolated.'})));
  });
});
