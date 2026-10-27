'use client';

import { Dialog, type DialogProps } from './Dialog';

/** Side panel for detail views and secondary forms. Same foundations as Dialog, anchored right, with drag-to-dismiss on phones. */
export function Drawer(props: Omit<DialogProps, 'placement' | 'size' | 'dragDismiss'>) {
  return <Dialog {...props} placement="right" dragDismiss="x" />;
}
