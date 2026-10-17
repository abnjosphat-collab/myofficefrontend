import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MovementForm, ToolForm, MarkReadyForm, EmployeeForm, EmployeeNumberForm } from './ToolsForms';
import { ToolsCompliance } from './ToolsCompliance';
import { EvidenceGallery, EvidencePicker, ToolsDialog } from './ToolsUI';
import { PEOPLE, LOCATIONS, JOBS } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';

function DialogHarness() {
  const [open,setOpen] = useState(false);
  return <><button onClick={()=>setOpen(true)}>Open tool</button><ToolsDialog open={open} onClose={()=>setOpen(false)} title="Tool details" description="Current condition"><button>Sample action</button></ToolsDialog></>;
}
function RequiredAuthDialogHarness({onClose}:{onClose:()=>void}) {
  return <ToolsDialog open dismissible={false} onClose={onClose} title="Sign in or sign up" description="Use your workspace account or create one to continue."><button>Sign in</button></ToolsDialog>;
}
const placeholderPeople=PEOPLE.map((label,index)=>({id:String(index),employeeNumber:label.split(' · ')[1],name:label.split(' · ')[0],department:'Engineering',active:true}));
// G2: location/job fields are the shared Combobox with free text — open, type, then take the matching
// option, or the "Use …" row when the text is new.
async function fillSuggestField(user:ReturnType<typeof userEvent.setup>,label:string,text:string) {
  await user.click(screen.getByRole('combobox',{name:label}));
  await user.type(screen.getByPlaceholderText(`Search ${label.toLowerCase()}…`),text);
  const useRow=screen.queryByRole('option',{name:`Use “${text}”`});
  if (useRow) await user.click(useRow);
  else await user.click(await screen.findByRole('option',{name:text}));
}
describe('Tools interaction controls', () => {
  it('reads the chosen native return date when issuing a tool', async () => {
    const onSave=vi.fn(); const user=userEvent.setup(); render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    fireEvent.change(screen.getByRole('combobox',{name:'Employee'}),{target:{value:PEOPLE[0]}});
    await fillSuggestField(user,'Current work location',LOCATIONS[1]);
    await fillSuggestField(user,'Work order / job',JOBS[0]);
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2050-09-25T16:00'}});
    fireEvent.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({toolId:SEED_TOOLS[0].id,person:PEOPLE[0],dueISO:new Date('2050-09-25T16:00').toISOString()});
  });
  it('issues a tool with no work location and still requires a return location', async () => {
    window.localStorage.removeItem('myoffice.tools.last-location');
    const onSave = vi.fn();
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-09-25T16:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ toolId: SEED_TOOLS[0].id, location: '' });
  });
  it('names the person when they are not eligible for the picked tool', () => {
    window.localStorage.removeItem('myoffice.tools.last-location');
    const onSave = vi.fn();
    const restricted = { ...SEED_TOOLS[0], eligibleEmployees: [{ id: 'x', employeeNumber: 'E-999', name: 'Z. Zed', department: 'Engineering' }] };
    render(<MovementForm kind="issue" initialTool={restricted} tools={[restricted, ...SEED_TOOLS.slice(1)]} employees={placeholderPeople} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Alex Morgan is not currently trained, qualified and authorized for Cordless drill');
  });
  it('shows the Issue button saving while the movement is stored', async () => {
    window.localStorage.removeItem('myoffice.tools.last-location');
    let release!: () => void;
    const onSave = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-09-25T16:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await act(async () => { release(); });
    expect(screen.getByRole('button', { name: 'Issue tool' })).toBeEnabled();
  });
  it('refuses a return with no return location', () => {
    window.localStorage.removeItem('myoffice.tools.last-location');
    const onReturn = vi.fn();
    const out = { ...SEED_TOOLS[0], status: 'issued' as const, holder: PEOPLE[0] };
    render(<MovementForm kind="return" initialTool={out} tools={[out, ...SEED_TOOLS.slice(1)]} employees={placeholderPeople} addFiles={() => []} onSave={onReturn} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record a return' }));
    expect(onReturn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Add the return location.');
  });
  it('does not let signed-out visitors dismiss the required authentication dialog', async () => {
    const user=userEvent.setup();
    const onClose=vi.fn();
    render(<RequiredAuthDialogHarness onClose={onClose}/>);
    expect(screen.queryByRole('button',{name:'Close dialog'})).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog',{name:'Sign in or sign up'})).toBeVisible();
  });
  it('explains when safety eligibility removes every employee option', async () => {
    const user=userEvent.setup();
    const employees=[{id:'employee-1',backendId:'employee-1',employeeNumber:'C1042',name:'Mina Dube',department:'Engineering',active:true}];
    const ineligibleTool={...SEED_TOOLS[0],eligibleEmployees:[]};
    render(<MovementForm kind="issue" initialTool={ineligibleTool} tools={[ineligibleTool,...SEED_TOOLS.slice(1)]} employees={employees} issuerDepartment="Engineering" locationSuggestions={LOCATIONS} addFiles={()=>[]} onSave={()=>{}} onCancel={()=>{}}/>);
    expect(screen.getByRole('status')).toHaveTextContent('No eligible employee for this equipment');
    await user.click(screen.getByRole('combobox',{name:'Employee'}));
    expect(screen.getByRole('listbox',{name:'Employee suggestions'})).toHaveTextContent('No employee is currently trained, qualified and authorized');
  });
  it('shows only approved equipment when issue starts from an employee', async () => {
    const user=userEvent.setup();
    const employee={id:'employee-1',backendId:'employee-1',employeeNumber:'C1042',name:'Mina Dube',department:'Engineering',active:true};
    const approved={...SEED_TOOLS[0],id:'APPROVED',backendId:'approved',eligibleEmployees:[{id:'employee-1',employeeNumber:'C1042',name:'Mina Dube',department:'Engineering'}]};
    const restricted={...SEED_TOOLS[1],id:'RESTRICTED',backendId:'restricted',status:'available' as const,eligibleEmployees:[]};
    render(<MovementForm kind="issue" initialEmployee={employee} tools={[approved,restricted]} employees={[employee]} issuerDepartment="Engineering" addFiles={()=>[]} onSave={()=>{}} onCancel={()=>{}}/>);
    await user.click(screen.getByRole('combobox',{name:'Tool'}));
    const options=(await screen.findAllByRole('option')).map(option=>option.textContent).join(' | ');
    expect(options).toContain('APPROVED');
    expect(options).not.toContain('RESTRICTED');
  });
  it('autofills saved employee details when an employee is selected', async () => {
    const user=userEvent.setup();
    const onSave=vi.fn();
    const employees=[{id:'employee-1',employeeNumber:'C1042',name:'Mina Dube',department:'Mining',jobTitle:'Electrician',supervisorName:'T. Moyo',active:true}];
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={employees} locationSuggestions={LOCATIONS} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    const employee=screen.getByRole('combobox',{name:'Employee'});
    await user.type(employee,'Mina');
    await user.keyboard('{Enter}');
    expect(employee).toHaveValue('Mina Dube · C1042');
    expect(screen.getByLabelText('Selected employee details')).toHaveTextContent('Electrician · Mining · Supervisor: T. Moyo');
    await fillSuggestField(user,'Current work location',LOCATIONS[0]);
    await fillSuggestField(user,'Work order / job',JOBS[0]);
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2050-09-25T16:00'}});
    await user.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave.mock.calls[0][0]).toMatchObject({person:'Mina Dube · C1042',department:'Mining'});
  });
  it('lets an overdue check be overridden, but only with the box ticked and a reason, which is sent on', async () => {
    const user=userEvent.setup();
    const onSave=vi.fn();
    const employees=[{id:'employee-1',employeeNumber:'C1042',name:'Mina Dube',department:'Mining',active:true}];
    const due={...SEED_TOOLS[0],inspectionDue:['monthly','quarterly']};
    render(<MovementForm kind="issue" initialTool={due} tools={[due]} employees={employees} locationSuggestions={LOCATIONS} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    const statements = screen.getAllByText('Monthly, quarterly check overdue');
    expect(statements).toHaveLength(2);
    statements.forEach(statement => expect(statement).toBeVisible());
    await user.type(screen.getByRole('combobox',{name:'Employee'}),'Mina'); await user.keyboard('{Enter}');
    await fillSuggestField(user,'Current work location',LOCATIONS[0]);
    await fillSuggestField(user,'Work order / job',JOBS[0]);
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2050-09-25T16:00'}});
    await user.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/check is overdue\. Complete it, or tick "Go ahead anyway"/)).toBeVisible();
    await user.click(screen.getByRole('checkbox',{name:/Go ahead anyway/}));
    const reason=screen.getByRole('textbox',{name:'Reason for going ahead'});
    fireEvent.change(reason,{target:{value:'ok'}});
    await user.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Give a short reason/)).toBeVisible();
    fireEvent.change(reason,{target:{value:'Breakdown repair, inspection booked'}});
    await user.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave.mock.calls[0][0]).toMatchObject({overrideDueChecks:true,overrideReason:'Breakdown repair, inspection booked'});
  });
  it('shows no override when nothing is overdue', () => {
    render(<MovementForm kind="issue" initialTool={{...SEED_TOOLS[0],inspectionDue:[]}} tools={SEED_TOOLS} employees={placeholderPeople} addFiles={()=>[]} onSave={()=>{}} onCancel={()=>{}}/>);
    expect(screen.queryByRole('checkbox',{name:/Go ahead anyway/})).not.toBeInTheDocument();
  });
  it('rejects an old return date without discarding form values', async () => {
    const onSave=vi.fn(); const user=userEvent.setup(); render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    fireEvent.change(screen.getByRole('combobox',{name:'Employee'}),{target:{value:PEOPLE[0]}});
    await fillSuggestField(user,'Current work location',LOCATIONS[1]);
    await fillSuggestField(user,'Work order / job',JOBS[0]);
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2000-01-01T16:00'}});
    fireEvent.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('future');
    expect(screen.getByRole('combobox',{name:'Employee'})).toHaveValue(PEOPLE[0]);
  });
  it('validates an attachment before creating a local preview URL', () => {
    const addFiles=vi.fn(); render(<EvidencePicker value={[]} onChange={()=>{}} addFiles={addFiles}/>);
    fireEvent.change(screen.getByLabelText('Attach photos or PDF'),{target:{files:[new File(['<svg/>'],'unsafe.svg',{type:'image/svg+xml'})]}});
    expect(addFiles).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPG');
  });
  it('opens photographs in an in-page zoom viewer', async () => {
    const user=userEvent.setup();
    render(<EvidenceGallery files={[{id:'photo',name:'clamp-meter.jpg',type:'image/jpeg',size:1024,url:'blob:clamp'}]}/>);
    await user.click(screen.getByRole('button',{name:'View image clamp-meter.jpg'}));
    expect(screen.getByRole('dialog',{name:'clamp-meter.jpg'})).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Zoom in'}));
    expect(screen.getByRole('button',{name:'Reset image zoom'})).toHaveTextContent('125%');
    await user.click(screen.getByRole('button',{name:'Close dialog'}));
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'clamp-meter.jpg'})).not.toBeInTheDocument());
  });
  it('keeps the equipment type compatible with its category', async () => {
    const user=userEvent.setup();
    render(<ToolForm defaultDepartment="Engineering" addFiles={()=>[]} onSave={()=>{}} onCancel={()=>{}}/>);
    const category=screen.getByRole('combobox',{name:'Category'});
    const equipmentType=screen.getByRole('combobox',{name:'Equipment type'});
    expect(equipmentType).toHaveTextContent('Cordless drill / driver');
    await user.click(category); await user.click(await screen.findByRole('option',{name:'Welding'}));
    expect(equipmentType).toHaveTextContent('Inverter welder');
    await user.click(equipmentType);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByRole('option',{name:'Cordless drill / driver'})).not.toBeInTheDocument();
  });
  it('lets simple items opt out of training and the pre-use check', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ToolForm defaultDepartment="Engineering" addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /Training, qualification and authorization required/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Pre-use check/ })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /Training, qualification and authorization required/ }));
    await user.click(screen.getByRole('checkbox', { name: /Pre-use check/ }));
    fireEvent.change(screen.getByLabelText('Tool name'), { target: { value: 'Tape measure' } });
    fireEvent.change(screen.getByLabelText('Make and model'), { target: { value: 'Stanley' } });
    fireEvent.change(screen.getByLabelText('Storage location'), { target: { value: 'Main workshop' } });
    fireEvent.change(screen.getByLabelText('Designated storage place'), { target: { value: 'Tool crib' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ competencyRequired: false, preUseCheckRequired: false });
  });
  it('requires a repair or inspection note before returning equipment to service', () => {
    const onSave=vi.fn();
    render(<MarkReadyForm tool={{...SEED_TOOLS[0],status:'attention'}} onSave={onSave} onCancel={()=>{}}/>);
    const submit=screen.getByRole('button',{name:'Mark ready for use'});
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Repair or inspection completed'),{target:{value:'Trigger replaced and function tested'}});
    expect(submit).toBeEnabled(); fireEvent.click(submit);
    expect(onSave).toHaveBeenCalledWith('Trigger replaced and function tested');
  });
  it('focuses the dialog heading and restores the invoking button on Escape', async () => {
    const user=userEvent.setup(); render(<DialogHarness/>);
    const trigger=screen.getByRole('button',{name:'Open tool'}); await user.click(trigger);
    await waitFor(()=>expect(screen.getByRole('heading',{name:'Tool details'})).toHaveFocus());
    expect(screen.getByRole('button',{name:'Close dialog'})).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
describe('Tools form validation messages', () => {
  // The forms are noValidate and check themselves: a quiet message under the field, never the browser's bubble.
  it('checks the movement form itself and puts an empty issue under the Tool field', () => {
    const onSave = vi.fn();
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    const { container } = render(<MovementForm kind="issue" tools={SEED_TOOLS} employees={placeholderPeople} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    fireEvent.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a tool from the suggestions.')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Tool' })).toHaveAttribute('aria-invalid', 'true');
    expect(scrollSpy).toHaveBeenCalled();
  });
  it('blocks an empty employee with messages under both fields', () => {
    const onSave = vi.fn();
    render(<EmployeeForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the full name.')).toBeVisible();
    expect(screen.getByText('Enter the employee ID or number.')).toBeVisible();
  });
  it('records an employee with no mine number yet instead of a made-up one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EmployeeForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'N. One' } });
    await user.click(screen.getByRole('checkbox', { name: /No mine number yet/ }));
    expect(screen.getByLabelText('Employee ID or number')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'N. One', employeeNumber: null });
  });
  it('issues to a numberless employee picked by name, shown as not recorded', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const employees = [{ id: 'e9', backendId: 'b9', employeeNumber: null, name: 'N. One', department: 'Engineering', active: true }];
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={employees} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: 'N. One · Not recorded' } });
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-09-25T16:00' } });
    await user.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ person: 'N. One · Not recorded' });
    expect(screen.getByLabelText('Selected employee details')).toHaveTextContent('N. One · Not recorded');
  });
  it('adds the mine number later, or keeps it unknown', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const person = { id: 'e9', backendId: 'b9', employeeNumber: null, name: 'N. One', department: 'Engineering', active: true };
    render(<EmployeeNumberForm employee={person} onSave={onSave} onCancel={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /No mine number yet/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save number' }));
    expect(onSave).toHaveBeenCalledWith(null);
    await user.click(screen.getByRole('checkbox', { name: /No mine number yet/ }));
    fireEvent.change(screen.getByLabelText('Employee ID or number'), { target: { value: 'E-900' } });
    await user.click(screen.getByRole('button', { name: 'Save number' }));
    expect(onSave).toHaveBeenCalledWith('E-900');
  });
  it('blocks an empty tool with messages under the missing fields', () => {
    const onSave = vi.fn();
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    render(<ToolForm defaultDepartment="" addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
    expect(screen.getByText('Enter the tool name.')).toBeVisible();
    expect(screen.getByText('Enter the make and model.')).toBeVisible();
    expect(screen.getByText('Choose the department that owns this record.')).toBeVisible();
    expect(screen.getByText('Enter the storage location.')).toBeVisible();
    expect(screen.getByText('Enter the designated storage place.')).toBeVisible();
  });
  it('asks for a longer note before returning equipment to service', () => {
    const onSave = vi.fn();
    render(<MarkReadyForm tool={{ ...SEED_TOOLS[0], status: 'attention' }} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Repair or inspection completed'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for use' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 2 characters.')).toBeVisible();
  });
  it('says when an incident happened instead of failing silently', async () => {
    const user = userEvent.setup();
    const onReportIncident = vi.fn();
    const tools = [{ ...SEED_TOOLS[0], backendId: 'tool-1', archived: false }];
    render(<ToolsCompliance tools={tools} employees={[]} competencies={[]} inspections={[]} incidents={[]} canManage onSaveCompetency={async () => {}} onRecordInspection={async () => {}} onReportIncident={onReportIncident} onCloseIncident={async () => {}} />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    // The button is normally disabled until the form is valid; drive the submit directly to prove the guard explains itself.
    fireEvent.submit(screen.getByRole('button', { name: 'Report incident', hidden: true }).closest('form')!);
    expect(onReportIncident).not.toHaveBeenCalled();
    expect(screen.getByText('Enter when it happened.')).toBeInTheDocument();
  });
  it('asks for defects when a check fails', async () => {
    const user = userEvent.setup();
    const onRecordInspection = vi.fn();
    const tools = [{ ...SEED_TOOLS[0], backendId: 'tool-1', archived: false }];
    render(<ToolsCompliance tools={tools} employees={[]} competencies={[]} inspections={[]} incidents={[]} canManage onSaveCompetency={async () => {}} onRecordInspection={onRecordInspection} onReportIncident={async () => {}} onCloseIncident={async () => {}} />);
    await user.click(screen.getByRole('button', { name: 'Record' }));
    await user.click(screen.getByRole('combobox', { name: 'Outcome', hidden: true }));
    await user.click(await screen.findByRole('option', { name: /Failed/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Record check', hidden: true }));
    expect(onRecordInspection).not.toHaveBeenCalled();
    expect(screen.getByText('Describe the defects.')).toBeInTheDocument();
  });
  it('names a greyed-out tool to preview it with its resolving actions', async () => {
    const user = userEvent.setup();
    const onResolveAction = vi.fn();
    render(<MovementForm kind="issue" tools={SEED_TOOLS} employees={placeholderPeople} addFiles={() => []} onSave={() => {}} onCancel={() => {}} onResolveAction={onResolveAction} />);
    await user.click(screen.getByRole('combobox', { name: 'Tool' }));
    await user.type(screen.getByPlaceholderText('Search by tool name or ID…'), 'grinder');
    expect(screen.getByRole('region', { name: 'Conditions for Angle grinder' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    expect(onResolveAction).toHaveBeenCalledWith('receive', expect.objectContaining({ id: 'ENG-AG-02' }));
    await user.click(screen.getByRole('button', { name: 'Transfer' }));
    expect(onResolveAction).toHaveBeenCalledWith('transfer', expect.objectContaining({ id: 'ENG-AG-02' }));
  });
  it('previews nothing when the search matches several blocked tools', async () => {
    const user = userEvent.setup();
    render(<MovementForm kind="issue" tools={SEED_TOOLS} employees={placeholderPeople} addFiles={() => []} onSave={() => {}} onCancel={() => {}} onResolveAction={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Tool' }));
    await user.type(screen.getByPlaceholderText('Search by tool name or ID…'), 'ENG-');
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument();
  });
  it('refuses a not-working tool with the resolving actions, not a dead end', async () => {
    const user = userEvent.setup();
    const broken = { ...SEED_TOOLS[0], workingStatus: 'not_working' as const };
    render(<MovementForm kind="issue" initialTool={broken} tools={[broken]} employees={placeholderPeople} addFiles={() => []} onSave={() => {}} onCancel={() => {}} onResolveAction={() => {}} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-09-25T16:00' } });
    await user.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(screen.getByRole('alert')).toHaveTextContent('not ready to issue');
    expect(screen.getByRole('button', { name: 'Record repair' })).toBeInTheDocument();
  });
  it('commits the lone equipment suggestion on Tab and sends it with the issue', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} equipmentSuggestions={['Conveyor CV-01', 'Pump P-12']} addFiles={() => []} onSave={onSave} onCancel={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Equipment being worked on' }));
    await user.type(screen.getByPlaceholderText('Search add equipment being worked on…'), 'Convey');
    await user.tab();
    expect(screen.getByText('Conveyor CV-01')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-09-25T16:00' } });
    await user.click(screen.getByRole('button', { name: 'Issue tool' }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ assignedEquipment: ['Conveyor CV-01'] });
  });
  it('commits typed-new equipment on Tab and a highlighted suggestion on Enter', async () => {
    const user = userEvent.setup();
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} equipmentSuggestions={['Conveyor CV-01', 'Pump P-12']} addFiles={() => []} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Equipment being worked on' }));
    await user.type(screen.getByPlaceholderText('Search add equipment being worked on…'), 'New crusher CR-9');
    await user.tab();
    expect(screen.getByText('New crusher CR-9')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Equipment being worked on' }));
    await user.type(screen.getByPlaceholderText('Search add equipment being worked on…'), 'Pump');
    await user.keyboard('{Enter}');
    expect(screen.getByText('Pump P-12')).toBeInTheDocument();
  });
  it('never commits the first equipment row on an empty Tab', async () => {
    const user = userEvent.setup();
    render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} employees={placeholderPeople} equipmentSuggestions={['Conveyor CV-01', 'Pump P-12']} addFiles={() => []} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByRole('combobox', { name: 'Equipment being worked on' }));
    await user.tab();
    expect(screen.queryByRole('button', { name: 'Remove Conveyor CV-01' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Pump P-12' })).not.toBeInTheDocument();
  });
});
