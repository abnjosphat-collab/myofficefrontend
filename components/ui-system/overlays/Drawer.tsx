'use client';

import { Dialog, type DialogProps } from './Dialog';

/** Side panel for detail views and secondary forms. Same foundations as Dialog, anchored right. */
export function Drawer(props: Omit<DialogProps, 'placement' | 'size'>) {
  return <Dialog {...props} placement="right" />;
}
