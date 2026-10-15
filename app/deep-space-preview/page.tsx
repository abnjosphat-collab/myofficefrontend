import type { Metadata } from 'next';
import { DeepSpacePreview } from './DeepSpacePreview';

export const metadata: Metadata = {
  title: 'Deep space preview',
  description: 'Prototype: a glassmorphic floating card over an animated deep-space 3D particle background.',
};

export default function DeepSpacePreviewPage() {
  return <DeepSpacePreview />;
}
