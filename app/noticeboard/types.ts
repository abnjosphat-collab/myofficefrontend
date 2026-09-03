// app/noticeboard/types.ts — the noticeboard's data model: the notice record shape and
// its form/filter/stats mirrors. Split out of page.tsx as part of the standing
// "decompose on touch" convention. Component *prop* interfaces stay in page.tsx — they're
// coupled to one component, not the page's data contract. CATEGORIES/PRIORITIES/
// STATUSES/DEPARTMENTS/TARGET_AUDIENCE/NOTIFICATION_TYPES/PRIORITY_HEX/STATUS_HEX also
// stay in page.tsx (business vocabulary, same as every other page's config constants).

export interface Attachment { name: string; url: string; size: string; }

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  priority: string;
  status: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  author?: string | null;
  department?: string | null;
  expires_at?: string | null;
  target_audience?: string | null;
  notification_type?: string | null;
  attachments?: Attachment[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NoticeFormData {
  title: string; content: string; date: string; category: string; priority: string; status: string;
  is_pinned: boolean; requires_acknowledgment: boolean; author: string; department: string; expires_at: string;
  target_audience: string; notification_type: string; attachments: Attachment[];
}

export interface NoticeFilters {
  category: string; priority: string; status: string; department: string; is_pinned: boolean | null;
}

export interface CalculatedStats {
  total_notices: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  pinned_count: number;
  expired_count: number;
  expiring_soon_count: number;
}
