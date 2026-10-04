// app/ppe/allocate/page.tsx — retired. This page used to collect an "allocation" and write it to two
// localStorage keys that nothing else read (its PPE-item list was never populated and nothing linked to
// it), so it looked like it saved but recorded nothing. PPE is issued from /ppe through /api/ppe.
import { redirect } from 'next/navigation';

export default function PpeAllocateRedirect() {
  redirect('/ppe');
}
