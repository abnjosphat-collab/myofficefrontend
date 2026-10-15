import type { Metadata } from 'next';
import { LoginPreview } from './LoginPreview';

export const metadata: Metadata = {
  title: 'Login preview',
  description: 'Prototype: the sign-in screen over an Icelandic landscape with slow, drifting clouds.',
};

export default function LoginPreviewPage() {
  return <LoginPreview />;
}
