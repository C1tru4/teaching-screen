import type { RenderResponse, VisualizationConfig } from './types';

const isProduction = import.meta.env.PROD;
export const API_BASE = import.meta.env.VITE_API_BASE ?? (isProduction ? '/api' : 'http://localhost:3000/api');

export type Scope = 'week' | 'semester';

export async function fetchRender(params: {
  date?: string;
  lab: 'all' | number;
  scope: Scope;
  dataAnalysisConfig?: any;
}) {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  qs.set('lab', String(params.lab));
  qs.set('scope', params.scope);
  if (params.dataAnalysisConfig) {
    qs.set('dataAnalysisConfig', JSON.stringify(params.dataAnalysisConfig));
  }

  const res = await fetch(`${API_BASE}/render?${qs.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as RenderResponse;
  return data;
}

// 获取大屏显示配置
export async function fetchScreenConfig() {
  const res = await fetch(`${API_BASE}/config/screen/display-mode`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

// 获取大屏固定模式配置
export async function fetchScreenFixedConfig() {
  const res = await fetch(`${API_BASE}/config/screen/fixed-config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

// 获取可视化配置
export async function fetchVisualizationConfig(): Promise<VisualizationConfig> {
  const res = await fetch(`${API_BASE}/config/visualization`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

// 获取大屏版本号
export async function fetchScreenVersion() {
  const res = await fetch(`${API_BASE}/config/version`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data as { value: number };
}

// 获取所有配置（合并接口）
export async function fetchAllConfig() {
  const res = await fetch(`${API_BASE}/config/all-config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}