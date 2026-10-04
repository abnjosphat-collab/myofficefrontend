import { redirect } from 'next/navigation';

/** Retired demo prototype (sample data, no backend); the real leave page is /leaves. Kept for old bookmarks. */
export default function LeaveManagementRedirect() {
  redirect('/leaves');
}
