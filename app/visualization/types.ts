// app/visualization/types.ts — data-model interfaces for the visualization
// page's (currently mock) analytics data. Split out of page.tsx as part of
// the standing "decompose on touch" convention. Component prop interfaces
// (none needed here — the page has no cross-file sub-components) would stay
// in page.tsx; this file is the data contract only.
import type { ReactNode } from 'react';

export interface PageOption {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  category: 'operations' | 'personnel' | 'safety' | 'analytics';
  link: string;
}

// Simplified and flexible types for Plotly data.
export type PlotData = Record<string, any>;
export type PlotLayout = Record<string, any>;

export interface Visualization {
  data: PlotData[];
  layout: PlotLayout;
}

export interface PageData {
  page_info: PageConfig;
  data_summary: {
    total_records: number;
    columns: string[];
    sample_data: any[];
  };
  visualizations: Record<string, Visualization>;
  generated_at: string;
}

/** Return shape of getPageConfig() — the resolved display/config record for one page option. */
export interface PageConfig {
  id: string;
  name: string;
  description: string;
  color_scheme: string;
  primary_metrics: string[];
  recommended_charts: string[];
  ai_analysis_type: string;
  data_source: string;
}

export interface AIAnalysis {
  page_info: any;
  analysis_type: string;
  timestamp: string;
  insights: Array<{
    metric: string;
    average: number;
    median: number;
    std: number;
    min: number;
    max: number;
    trend: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  anomalies: Array<{
    metric: string;
    count: number;
    description: string;
  }>;
  predictions: Array<{
    metric: string;
    forecast: number[];
    trend: string;
    confidence: number;
  }>;
}
