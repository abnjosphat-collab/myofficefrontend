// app/tools/ToolsModals.tsx — the one dialog that carries every Tools form: sign in, add or edit equipment, add an employee,
// record a movement, mark ready, attachments, import, export, source register, feedback and settings.
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui-system';
import { EmployeeForm, MarkReadyForm, MovementForm, ToolForm, TITLES } from './ToolsForms';
import { BulkIssueForm } from './BulkIssueForm';
import { ToolsDialog, EvidencePicker, type AddEvidence } from './ToolsUI';
import { ToolsCustomize } from './ToolsCustomize';
import { ToolsAuth } from './ToolsAuth';
import { ToolsFeedback } from './ToolsFeedback';
import { ToolsImport } from './ToolsImport';
import { ToolsExport } from './ToolsExport';
import { SourceRegisterForm } from './ToolsSourceRegisters';
import type { Evidence, Tool } from './prototype';
import type { ToolsWorkspace } from './useToolsWorkspace';

function AttachmentForm({ tool, addFiles, onSave }: { tool: Tool; addFiles: AddEvidence; onSave: (files: Evidence[]) => void }) {
  const [files, setFiles] = useState(tool.evidence || []);
  return (
    <div className="flex flex-col gap-4">
      <EvidencePicker value={files} onChange={setFiles} addFiles={addFiles} />
      <div className="flex justify-end"><Button variant="primary" icon="success" onClick={() => onSave(files)}>Save attachments</Button></div>
    </div>
  );
}

function titleOf(w: ToolsWorkspace): string {
  const kind = w.modal?.kind;
  if (!kind) return '';
  const names: Record<string, string> = {
    customize: 'Settings', new: 'Add equipment', employee: 'Add an employee', feedback: 'Feedback & suggestions', import: 'Import a register',
    'source-register': 'Upload a source register', export: 'Download this view', edit: 'Edit equipment details', attachments: 'Condition evidence', ready: 'Return to ready for use', 'bulk-issue': 'Issue tools',
  };
  if (kind === 'auth') return w.currentAccount ? 'Your profile' : 'Sign in or sign up';
  return names[kind] ?? TITLES[kind as keyof typeof TITLES] ?? '';
}

function descriptionOf(w: ToolsWorkspace): string {
  const descriptions: Record<string, string> = {
    customize: 'Display and workspace preferences.', attachments: 'Keep photos and supporting documents with the item.',
    employee: 'Add a person to this workspace’s independent register.', feedback: 'Tell us what would make the product clearer, faster or more useful.',
    import: 'Preview and validate Excel, CSV or Word records before adding them.', 'source-register': 'Permanently preserve the original file before updating the live database.',
    ready: 'Record what was repaired or checked before releasing the tool.', export: 'A clean copy of the current section and filters.', 'bulk-issue': 'Pick the tools, check the conditions, one borrower for all.',
  };
  const kind = w.modal?.kind;
  if (kind === 'auth') return w.currentAccount ? 'Your identity and access for this workspace.' : 'Use your workspace account or create one to continue.';
  return (kind && descriptions[kind]) || 'Just the details needed for a clear record.';
}

export function ToolsModals({ w }: { w: ToolsWorkspace }) {
  const { modal } = w;
  const close = () => w.setModal(null);
  const body = (() => {
    if (!modal) return null;
    if (modal.kind === 'customize') return <ToolsCustomize options={w.options} setOptions={w.setOptions} iconPack={w.sidebarNav.iconPack} onIconPack={iconPack => w.setSidebarNav(state => ({ ...state, iconPack }))} />;
    if (modal.kind === 'auth') return <ToolsAuth accounts={w.accounts} currentAccount={w.currentAccount} onCreate={w.createAccount} onLogin={w.login} onLogout={w.signOut} onCancel={() => { if (!w.authenticationRequired) close(); }} allowCancel={!w.authenticationRequired} />;
    if (modal.kind === 'feedback') return <ToolsFeedback onSubmit={w.submitFeedback} onCancel={close} />;
    if (modal.kind === 'import') return <ToolsImport onApply={w.applyImport} onCancel={close} />;
    if (modal.kind === 'source-register') return <SourceRegisterForm departments={w.departments} onSave={w.saveSourceRegister} onCancel={close} />;
    if (modal.kind === 'export') return <ToolsExport data={w.exportData} onDone={() => { close(); w.track('downloaded report', w.tab); }} />;
    if (modal.kind === 'employee') return <EmployeeForm onSave={w.saveEmployee} onCancel={close} />;
    if (modal.kind === 'new' || modal.kind === 'edit') {
      return <ToolForm key={modal.kind === 'edit' ? modal.tool.id : 'new'} initialTool={modal.kind === 'edit' ? modal.tool : undefined} defaultDepartment={w.department === 'all' ? 'Engineering' : w.department} addFiles={w.addFiles} onSave={w.saveTool} onCancel={close} />;
    }
    if (modal.kind === 'attachments') return <AttachmentForm key={modal.tool.id} tool={modal.tool} addFiles={w.addFiles} onSave={files => void w.saveAttachments(modal.tool, files)} />;
    if (modal.kind === 'ready') return <MarkReadyForm tool={modal.tool} onSave={note => void w.markToolReady(modal.tool, note)} onCancel={close} />;
    if (modal.kind === 'bulk-issue') return <BulkIssueForm tools={w.scope} employees={w.employees} issuerDepartment={w.currentAccount?.department ?? ''} locationSuggestions={w.locationSuggestions} onSave={input => void w.saveBulkIssue(input)} />;
    if ('tool' in modal) {
      return (
        <MovementForm key={`${modal.kind}-${modal.tool?.id || 'select'}-${('employee' in modal ? modal.employee?.id : '') || ''}`} kind={modal.kind}
          initialTool={modal.tool} initialEmployee={'employee' in modal ? modal.employee : undefined} tools={w.scope} employees={w.employees}
          locationSuggestions={w.locationSuggestions} equipmentSuggestions={w.equipmentSuggestions} issuerDepartment={w.currentAccount?.department}
          addFiles={w.addFiles} onSave={w.saveMovement} onCancel={close} />
      );
    }
    return null;
  })();
  return (
    <ToolsDialog open={!!modal} dismissible={!w.authenticationRequired || modal?.kind !== 'auth'} onClose={() => { if (!w.authenticationRequired) close(); }}
      wide={['customize', 'feedback', 'import', 'export', 'bulk-issue'].includes(modal?.kind || '')} title={titleOf(w)} description={descriptionOf(w)}>
      {body}
    </ToolsDialog>
  );
}
