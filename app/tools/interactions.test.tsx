import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestField, MovementForm, ToolForm, MarkReadyForm } from './ToolsForms';
import { ToolsCustomize, DEFAULT_OPTIONS } from './ToolsCustomize';
import { AnimatedSelect } from './AnimatedSelect';
import { EvidenceGallery, EvidencePicker, ToolsDialog } from './ToolsUI';
import { ToolsDateInput } from './ToolsDateInput';
import { PEOPLE, LOCATIONS, JOBS } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';
vi.mock('./ToolsIcon', () => ({ ToolsIcon: () => <span aria-hidden="true" /> }));

function SearchHarness() {
  const [value,setValue] = useState('');
  return <SuggestField label="Employee" options={PEOPLE} value={value} onChange={setValue} />;
}
function SearchDialogHarness() {
  const [value,setValue] = useState('');
  return <ToolsDialog open onClose={()=>{}} title="Issue tool" description="Select an employee"><SuggestField label="Employee" options={PEOPLE} value={value} onChange={setValue} /></ToolsDialog>;
}
function DialogHarness() {
  const [open,setOpen] = useState(false);
  return <><button onClick={()=>setOpen(true)}>Open tool</button><ToolsDialog open={open} onClose={()=>setOpen(false)} title="Tool details" description="Current condition"><button>Sample action</button></ToolsDialog></>;
}
function RequiredAuthDialogHarness({onClose}:{onClose:()=>void}) {
  return <ToolsDialog open dismissible={false} onClose={onClose} title="Sign in or sign up" description="Use your workspace account or create one to continue."><button>Sign in</button></ToolsDialog>;
}
function SelectHarness() {
  const [status,setStatus]=useState('all');
  const [sort,setSort]=useState('register');
  return <><AnimatedSelect ariaLabel="Status" value={status} onChange={setStatus} options={[{value:'all',label:'All tools'},{value:'ready',label:'Ready'}]}/><AnimatedSelect ariaLabel="Sort" value={sort} onChange={setSort} options={[{value:'register',label:'Register order'},{value:'name',label:'Name'}]}/></>;
}
function CustomizeHarness() {
  const [options,setOptions]=useState(DEFAULT_OPTIONS);
  return <ToolsCustomize options={options} setOptions={setOptions}/>;
}
describe('Tools interaction controls', () => {
  it('keeps only one animated dropdown open and supports keyboard selection', async () => {
    const user=userEvent.setup(); render(<SelectHarness/>);
    const status=screen.getByRole('button',{name:'Status'});
    const sort=screen.getByRole('button',{name:'Sort'});
    await user.click(status);
    await waitFor(()=>expect(screen.getByRole('listbox',{name:'Status options'})).toBeVisible());
    expect(screen.getByRole('listbox',{name:'Status options'}).parentElement).toBe(document.body);
    await user.click(sort);
    await waitFor(()=>expect(screen.queryByRole('listbox',{name:'Status options'})).not.toBeInTheDocument());
    await waitFor(()=>expect(screen.getByRole('listbox',{name:'Sort options'})).toBeVisible());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(sort).toHaveTextContent('Name');
    await waitFor(()=>expect(screen.queryByRole('listbox',{name:'Sort options'})).not.toBeInTheDocument());
  });
  it('selects a suggestion using the keyboard and closes the list', async () => {
    const user=userEvent.setup(); render(<SearchHarness/>);
    const input=screen.getByRole('combobox',{name:'Employee'});
    await user.type(input,'Sam'); await user.keyboard('{Enter}');
    expect(input).toHaveValue(PEOPLE[2]); expect(input).toHaveAttribute('aria-expanded','false');
  });
  it('accepts the highlighted suggestion with Tab', async () => {
    const user=userEvent.setup(); render(<SearchHarness/>);
    const input=screen.getByRole('combobox',{name:'Employee'});
    await user.type(input,'Sam'); await user.keyboard('{Tab}');
    expect(input).toHaveValue(PEOPLE[2]); expect(input).toHaveAttribute('aria-expanded','false');
  });
  it('commits a clicked suggestion inside the modal portal', async () => {
    const user=userEvent.setup(); render(<SearchDialogHarness/>);
    const input=screen.getByRole('combobox',{name:'Employee'});
    await user.type(input,'Sam');
    await user.click(screen.getByRole('option',{name:PEOPLE[2]}));
    expect(input).toHaveValue(PEOPLE[2]);
    await waitFor(()=>expect(screen.queryByRole('listbox',{name:'Employee suggestions'})).not.toBeInTheDocument());
  });
  it('renders autocomplete suggestions outside clipping form containers', async () => {
    const user=userEvent.setup(); render(<SearchHarness/>);
    const input=screen.getByRole('combobox',{name:'Employee'});
    await user.click(input);
    const list=await screen.findByRole('listbox',{name:'Employee suggestions'});
    expect(list.parentElement).toBe(document.body);
  });
  it('keeps typed text when Escape closes suggestions', async () => {
    const user=userEvent.setup(); render(<SearchHarness/>);
    const input=screen.getByRole('combobox',{name:'Employee'});
    await user.type(input,'Alex'); await user.keyboard('{Escape}');
    expect(input).toHaveValue('Alex'); await waitFor(()=>expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
  it('reads the chosen native return date when issuing a tool', async () => {
    const onSave=vi.fn(); render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    fireEvent.change(screen.getByRole('combobox',{name:'Employee'}),{target:{value:PEOPLE[0]}});
    fireEvent.change(screen.getByRole('combobox',{name:'Current work location'}),{target:{value:LOCATIONS[1]}});
    fireEvent.change(screen.getByRole('combobox',{name:'Work order / job'}),{target:{value:JOBS[0]}});
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2050-09-25T16:00'}});
    fireEvent.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({toolId:SEED_TOOLS[0].id,person:PEOPLE[0],dueISO:new Date('2050-09-25T16:00').toISOString()});
  });
  it('opens the native picker when any date field area is clicked', async () => {
    const user=userEvent.setup(); render(<ToolsDateInput aria-label="Inspection date"/>);
    const input=screen.getByLabelText('Inspection date') as HTMLInputElement;
    const showPicker=vi.fn();
    Object.defineProperty(input,'showPicker',{value:showPicker});
    await user.click(input);
    expect(showPicker).toHaveBeenCalledOnce();
  });
  it('changes the equipment icon family with a mouse click', async () => {
    const user=userEvent.setup(); render(<CustomizeHarness/>);
    await user.click(screen.getByRole('radio',{name:/Tabler Outline/i}));
    expect(screen.getByRole('radio',{name:/Tabler Outline/i})).toHaveAttribute('aria-checked','true');
    expect(screen.getByRole('radio',{name:/Precision Line/i})).toHaveAttribute('aria-checked','false');
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
    const suggestions=screen.getByRole('listbox',{name:'Tool suggestions'});
    expect(suggestions).toHaveTextContent('APPROVED');
    expect(suggestions).not.toHaveTextContent('RESTRICTED');
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
    fireEvent.change(screen.getByRole('combobox',{name:'Current work location'}),{target:{value:LOCATIONS[0]}});
    fireEvent.change(screen.getByRole('combobox',{name:'Work order / job'}),{target:{value:JOBS[0]}});
    fireEvent.change(screen.getByLabelText('Expected return'),{target:{value:'2050-09-25T16:00'}});
    await user.click(screen.getByRole('button',{name:'Issue tool'}));
    expect(onSave.mock.calls[0][0]).toMatchObject({person:'Mina Dube · C1042',department:'Mining'});
  });
  it('rejects an old return date without discarding form values', () => {
    const onSave=vi.fn(); render(<MovementForm kind="issue" initialTool={SEED_TOOLS[0]} tools={SEED_TOOLS} addFiles={()=>[]} onSave={onSave} onCancel={()=>{}}/>);
    fireEvent.change(screen.getByRole('combobox',{name:'Employee'}),{target:{value:PEOPLE[0]}});
    fireEvent.change(screen.getByRole('combobox',{name:'Current work location'}),{target:{value:LOCATIONS[1]}});
    fireEvent.change(screen.getByRole('combobox',{name:'Work order / job'}),{target:{value:JOBS[0]}});
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
    await user.click(screen.getByRole('button',{name:'Close image viewer'}));
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'clamp-meter.jpg'})).not.toBeInTheDocument());
  });
  it('keeps the equipment pictogram type compatible with its category', () => {
    render(<ToolForm defaultDepartment="Engineering" addFiles={()=>[]} onSave={()=>{}} onCancel={()=>{}}/>);
    const category=screen.getByRole('button',{name:'Category'});
    const equipmentType=screen.getByRole('button',{name:'Equipment type'});
    expect(equipmentType).toHaveTextContent('Cordless drill / driver');
    fireEvent.click(category); fireEvent.click(screen.getByRole('option',{name:'Welding'}));
    expect(equipmentType).toHaveTextContent('Inverter welder');
    fireEvent.click(equipmentType);
    expect(screen.queryByRole('option',{name:'Cordless drill / driver'})).not.toBeInTheDocument();
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
