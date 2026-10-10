import type { ReactNode } from 'react';
import { Button, IconButton } from '../primitives/Button';

/**
 * The footer of a record's detail dialog, in one order everywhere: Delete apart on the left, so it is never one slip
 * away from Edit; then Close; then the main action rightmost and filled. The main action is Edit, unless the dialog
 * passes its own actions (`children`, for example Approve, Download or Mark complete), which then own the primary
 * slot and Edit steps back to a plain button beside them. `primary="edit"` keeps Edit as the main action and places
 * the extra actions before it (for example Spares' "Add to requisition").
 */
export function DetailActions({ onDelete, deleteLabel = 'Delete', onClose, onEdit, editLabel = 'Edit', primary, children }: {
  onDelete?: () => void;
  deleteLabel?: string;
  onClose?: () => void;
  onEdit?: () => void;
  editLabel?: string;
  /** Which action is the main one. By default the extra actions are, when there are any; otherwise Edit. */
  primary?: 'edit' | 'actions';
  /** Further actions. When they are the main ones, the last of them should be the primary button. */
  children?: ReactNode;
}) {
  const extra = children !== undefined && children !== null && children !== false;
  const editLeads = primary ? primary === 'edit' : !extra;
  const edit = onEdit && <Button variant={editLeads ? 'primary' : 'secondary'} icon="edit" onClick={onEdit}>{editLabel}</Button>;
  return (
    <>
      {onDelete && <Button variant="danger" icon="delete" className="mr-auto" onClick={onDelete}>{deleteLabel}</Button>}
      {onClose && <Button onClick={onClose}>Close</Button>}
      {editLeads ? <>{children}{edit}</> : <>{edit}{children}</>}
    </>
  );
}

/**
 * The edit and delete buttons at the end of a table row or card. `subject` names the record in each button's
 * accessible name ("Edit requisition RQ-12", "Delete requisition RQ-12"), so a screen reader can tell rows apart.
 */
export function RowActions({ subject, onEdit, onDelete, deleteVerb = 'Delete' }: {
  subject: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** "Remove" where the record is taken off a list rather than destroyed. */
  deleteVerb?: string;
}) {
  return (
    <span className="inline-flex gap-1">
      {onEdit && <IconButton icon="edit" size="sm" label={`Edit ${subject}`} onClick={onEdit} />}
      {onDelete && <IconButton icon="delete" variant="danger" size="sm" label={`${deleteVerb} ${subject}`} onClick={onDelete} />}
    </span>
  );
}
