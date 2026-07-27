// app/compressors/types.ts — the compressor tracker's data model: the compressor
// record, its daily-reading working state, and the several analytics/management
// response shapes the page's four tabs each render. Split out of page.tsx as part of
// the standing "decompose on touch" convention. Component *prop* interfaces stay in
// page.tsx — they're coupled to one component, not the page's data contract.

export interface Compressor {
  id: number; name: string; model: string; capacity: string;
  location: string; status: string;
  total_running_hours: number; total_loaded_hours: number;
  color?: string; initial_total_running?: number; initial_total_loaded?: number;
}
export interface CompressorInput { totalRunning: number; totalLoaded: number; pressure: number | string; temperature: number | string; notes: string; }
export interface PreviousReading { total_running_hours: number; total_loaded_hours: number; date: string; }
export interface IsSaving { type?: string; id?: number | string; }
export interface UpcomingService {
  compressor_id: number; compressor_name: string; service_interval: number;
  current_hours: number; next_service_hours: number; hours_remaining: number;
  days_remaining: number; urgency: string;
}
export interface PerformanceMetric {
  compressor_id: number; compressor_name: string; avg_efficiency: number;
  avg_daily_running_hours: number; avg_daily_loaded_hours: number;
  total_running_hours: number; total_loaded_hours: number;
  downtime_percentage: number; service_count: number;
}
export interface TrendDataItem { compressor_name: string; efficiency_trend: string; avg_efficiency: number; total_running_hours?: number; total_loaded_hours?: number; }
export interface TrendsResult { success: boolean; data: TrendDataItem[]; message: string; has_data: boolean; }
export interface ComparisonItem { compressor_id: number; compressor_name: string; location: string; value: number; rating: string; }
export interface ComparisonResult { success: boolean; data: ComparisonItem[]; message: string; count: number; }
export interface AnalyticsData { performanceMetrics: PerformanceMetric[]; trends: TrendsResult; comparison: ComparisonResult; }
export interface CompressorStats { total_compressors: number; total_running_hours?: number; avg_efficiency: number; upcoming_services: number; urgent_alerts: number; active_compressors: number; }
export interface RecentAlert { id: number; title: string; message: string; severity: string; is_read: boolean; created_at: string; }
export interface RecentService { id: number; service_type: string; description: string; service_date: string; running_hours_at_service: number; }
export interface AgeDistribution { less_than_year?: number; "1_3_years"?: number; "3_5_years"?: number; more_than_5?: number; }
export interface ManagementSummary { status_distribution: Record<string, number>; location_distribution: Record<string, number>; age_distribution: AgeDistribution; total_compressors: number; unread_alerts?: number; recent_alerts?: RecentAlert[]; recent_services?: RecentService[]; }
export interface ManagementData { summary: ManagementSummary | null; alerts: RecentAlert[]; services: RecentService[]; }
export interface Filters { location: string; status: string; search: string; showMaintenance: boolean; }
export interface StatusDialogState { open: boolean; compressorId: number | null; currentStatus: string; }
export interface AddCompressorFormData { name: string; model: string; capacity: string; location: string; status: string; total_running_hours: number; total_loaded_hours: number; color: string; }
