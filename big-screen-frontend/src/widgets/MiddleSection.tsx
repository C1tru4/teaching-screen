// 功能：中部区域布局（热力图与可视化图表）。
import React from 'react';
import Heatmap from './Heatmap';
import Chart from './Chart';
import type { HeatmapData, VisualizationConfig } from '../lib/types';
import type { Scope } from '../lib/api';

// 根据图表类型取出对应数据。参数: chartType 类型, chartData 原始数据。
function getChartDataByType(chartType: string, chartData: any) {
  if (!chartData) {
    // chartData 为空时返回空结构，避免渲染异常。
      switch (chartType) {
        case 'pie':
        case 'donut':
          return [];
      case 'line':
      case 'majorTrend':
        return { categories: [], values: [] };
      case 'bar':
        return { categories: [], values: [] };
      case 'stackedBar':
      case 'majorStackedBar':
        return { categories: [], series: [] };
      case 'ranking':
        return { categories: [], values: [] };
      case 'gauge':
        return { value: 0 };
      case 'teacher':
        return { categories: [], values: [] };
      case 'courseCoverage':
        return [];
      default:
        return null;
    }
  }
  
  switch (chartType) {
    case 'pie':
      return chartData.projectStatusPie || []; // 项目状态饼图
    case 'donut':
      return chartData.courseMajorDistribution || []; // 课程专业占比（环形图）
    case 'line':
      return chartData.weeklyTrend?.[0] || { categories: [], values: [] };
    case 'bar':
      return chartData.labUtilization || { categories: [], values: [] }; // 实验室使用率柱状图
    case 'stackedBar':
      return chartData.courseMajorStacked || { categories: [], series: [] }; // 课程-专业堆叠图
    case 'majorStackedBar':
      return chartData.majorCourseStacked || { categories: [], series: [] }; // 专业-课程堆叠图
    case 'majorTrend':
      return chartData.majorTrend || { categories: [], series: [] }; // 专业活跃度趋势
    case 'ranking':
      return chartData.topProjects?.[0] || { categories: [], values: [] };
    case 'gauge':
      return chartData.gaugeData || { value: 0 };
    case 'teacher':
      return chartData.teacherWorkload?.[0] || { categories: [], values: [] }; // 教师工作量分析
    case 'courseCoverage':
      return chartData.courseCoverage || []; // 课程覆盖度分析
    default:
      return null;
  }
}

interface MiddleSectionProps {
  heatmap: HeatmapData;
  selectedLab: 'all' | number;
  labIdToName: Record<number, string>;
  onChangeLab: (v: string) => void;
  scope: Scope;
  onChangeScope: (s: Scope) => void;
  loading?: boolean;
  config?: VisualizationConfig['middleSection'];
  chartData?: any; // 后端返回的图表数据
}

export default function MiddleSection({
  heatmap,
  selectedLab,
  labIdToName,
  onChangeLab,
  scope,
  onChangeScope,
  loading = false,
  config,
  chartData
}: MiddleSectionProps) {
  if (!config) {
    // 无配置时默认显示热力图。
    return (
      <Heatmap
        matrix={heatmap.matrix}
        labs={heatmap.labs}
        selectedLab={selectedLab}
        labIdToName={labIdToName}
        onChangeLab={onChangeLab}
        scope={scope}
        onChangeScope={onChangeScope}
        loading={loading}
      />
    );
  }

  if (config.mode === 'large') {
    // 大图表模式。
    return (
      <div className="h-full flex flex-col">
        {/* 大图表区域 */}
        <div className="flex-1 rounded-2xl bg-slate-900/70 border border-white/10 p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          {config.largeChart.type === 'heatmap' ? (
            <Heatmap
              matrix={heatmap.matrix}
              labs={heatmap.labs}
              selectedLab={selectedLab}
              labIdToName={labIdToName}
              onChangeLab={onChangeLab}
              scope={scope}
              onChangeScope={onChangeScope}
              loading={loading}
            />
          ) : (
            <Chart
              type={config.largeChart.type as any}
              title="数据可视化"
              height="100%"
              data={getChartDataByType(config.largeChart.type, chartData)}
              chartData={chartData}
              config={config.largeChart.config || {}}
            />
          )}
        </div>
      </div>
    );
  }

  if (config.mode === 'four-small') {
    // 四小图表模式（2x2 网格）。
    return (
      <div className="h-full flex flex-col">
        {/* 四小图表网格 */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3">
          {config.smallCharts.charts.map((chart, index) => (
            <div 
              key={index} 
              className="rounded-2xl bg-slate-900/70 border border-white/10 p-2 flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group"
            >
              <div className="flex-1 min-h-0">
                <Chart
                  type={chart.type as any}
                  title={chart.title || ""}
                  height="100%"
                  data={getChartDataByType(chart.type, chartData)}
                  chartData={chartData}
                  config={chart.config || {}}
                  showInternalTitle={true}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 兜底返回热力图。
  return (
    <Heatmap
      matrix={heatmap.matrix}
      labs={heatmap.labs}
      selectedLab={selectedLab}
      labIdToName={labIdToName}
      onChangeLab={onChangeLab}
      scope={scope}
      onChangeScope={onChangeScope}
      loading={loading}
    />
  );
}
