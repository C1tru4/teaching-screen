// 功能：大屏图表渲染与图例/筛选交互。
import React, { useState, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { ChartType } from '../lib/types';
import ExpandableLegend from './ExpandableLegend';
import LegendPopup from './LegendPopup';
import ItemSelector from './ItemSelector';

interface ChartProps {
  type: ChartType;
  title: string;
  data?: any;
  config?: any;
  height?: string | number;
  width?: string | number;
  chartData?: any; // 后端返回的完整图表数据
  showInternalTitle?: boolean; // 是否在图表内部显示标题，默认 true
}

// KPI 指标标签映射。
const KPI_LABELS: Record<string, string> = {
  courseTotals: '课程总数',
  attendance: '出勤人数',
  utilization: '使用率',
  projectCount: '项目总数',
  participantCount: '参与人数',
  labCount: '实验室数量',
  activeLabs: '活跃实验室',
  completionRate: '完成率'
};

// 生成图表配置。参数: type 类型, data 图表数据, config 配置, chartData 原始数据。
function generateChartOption(type: ChartType, data: any, config: any = {}, chartData: any = null, showInternalTitle: boolean = true, hideLegend: boolean = false, selectedLegends?: Set<string>, selectedItems?: Set<string>) {
  const baseOption = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#d1d5db'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    // 重置可选元素，避免残留。
    graphic: undefined,
    series: [],
    xAxis: undefined,
    yAxis: undefined,
    legend: undefined,
    tooltip: undefined
  };



  // data 是已处理后的图表数据；chartData 仅用于提取图例/筛选信息。
  const finalData = data;
  
  // 检查数据是否有效（非空数组/对象，且包含关键字段）。
  const hasValidData = finalData && (
    Array.isArray(finalData) ? finalData.length > 0 :
    typeof finalData === 'object' ? (
      // 对象类型需包含 categories/series/values 或 value 等字段。
      (finalData.categories && Array.isArray(finalData.categories) && finalData.categories.length > 0) ||
      (finalData.series && Array.isArray(finalData.series) && finalData.series.length > 0) ||
      (finalData.values && Array.isArray(finalData.values) && finalData.values.length > 0) ||
      (typeof finalData.value === 'number') ||
      Object.keys(finalData).length > 0
    ) :
    finalData !== null && finalData !== undefined
  );
  
  // 饼图/环形图允许空数据渲染占位，不展示“暂无数据”文字。
  if (!hasValidData && type !== 'pie' && type !== 'donut') {
    return {
      ...baseOption,
      title: showInternalTitle ? {
        text: config.title || '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#6b7280', fontSize: 18 }
      } : undefined,
      graphic: {
        type: 'text',
        left: 'center',
        top: '60%',
        style: {
          text: '暂无数据可显示',
          fontSize: 14,
          fill: '#6b7280'
        }
      }
    };
  }

  switch (type) {
    case 'pie':
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '项目状态分布',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}个 ({d}%)'
        },
        legend: {
          orient: 'horizontal',
          bottom: 5,
          left: 'center',
          textStyle: { color: '#d1d5db', fontSize: 14 },
          itemWidth: 12,
          itemHeight: 8
        },
        series: [{
          name: '项目状态',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '45%'],
          data: finalData || [], // 确保即使没有数据也显示空饼图
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: false // 在小图模式下隐藏标签，避免拥挤
          },
          labelLine: {
            show: false
          }
        }]
      };

    case 'donut':
      // 环形图（课程专业占比）
      // 根据selectedItems过滤数据
      let donutData = finalData as Array<{ name: string; value: number }> || [];
      let courseName = '';
      
      // 如果提供了selectedItems，使用选中的课程
      if (selectedItems && selectedItems.size > 0) {
        const selectedCourse = Array.from(selectedItems)[0]; // 单选，取第一个
        courseName = selectedCourse;
        
        // 从chartData中获取该课程的数据
        if (chartData && chartData.courseMajorDistributionMap && chartData.courseMajorDistributionMap[selectedCourse]) {
          donutData = chartData.courseMajorDistributionMap[selectedCourse];
        }
      } else if (config?.courseName) {
        // 兼容旧配置
        courseName = config.courseName;
      }
      
      const donutTitle = courseName ? `${courseName}专业占比` : '课程专业占比';
      const majorCount = donutData.length;
      
      // 当专业数>4时（不包含4），只显示占比最大的4个
      let displayData = donutData;
      if (majorCount > 4) {
        // 按value降序排序，取前4个
        displayData = [...donutData]
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 4);
      }
      
      // 4个及以下专业显示标记文字
      const showLabel = displayData.length <= 4;
      
      return {
        ...baseOption,
        // 移除内部标题，由外部容器预留空间
        title: undefined,
        // 添加grid限制内容区域，防止标签超出
        grid: {
          left: '5%',
          right: '5%',
          top: '5%',
          bottom: '5%',
          containLabel: false // 不包含标签，让标签在grid内
        },
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}人 ({d}%)'
        },
        legend: hideLegend ? { show: false } : undefined, // 隐藏图例，使用选择器
        series: [{
          name: '专业占比',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'], // 恢复居中
          data: displayData, // 使用处理后的数据
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: showLabel,
            formatter: '{b}\n{d}%',
            fontSize: 14,
            color: '#d1d5db',
            position: 'outside',
            margin: 8, // 标签距离饼图的距离
            // 限制标签位置，优先左右方向
            alignTo: 'edge',
            minAngle: 15, // 最小角度，避免标签重叠
            // 使用自定义布局，让标签更多向左右分布，避免超出高度
            labelLayout: (params: any) => {
              // 判断标签应该在左侧还是右侧
              const isLeft = params.labelRect.x < params.pieData.cx;
              const cx = params.pieData.cx;
              const cy = params.pieData.cy;
              
              // 计算标签相对于圆心的位置
              const dx = params.labelRect.x - cx;
              const dy = params.labelRect.y - cy;
              
              // 如果标签在上下方向（dy的绝对值大于dx），强制移动到左右
              if (Math.abs(dy) > Math.abs(dx)) {
                // 标签在上下方向，调整到左右，保持在同一水平线上
                return {
                  x: isLeft ? cx - 80 : cx + 80, // 左右偏移，固定距离
                  y: cy, // 水平对齐到圆心高度
                  verticalAlign: 'middle',
                  align: isLeft ? 'right' : 'left'
                };
              }
              
              // 如果已经在左右方向，保持原位置但确保不超出容器
              return {
                x: params.labelRect.x,
                y: params.labelRect.y,
                verticalAlign: 'middle',
                align: isLeft ? 'right' : 'left'
              };
            }
          },
          labelLine: {
            show: showLabel,
            length: 15, // 第一段引线长度（径向，缩短以减少上下方向）
            length2: 25, // 第二段引线长度（水平方向，增加以更多向左右）
            smooth: 0.3, // 平滑曲线
            lineStyle: {
              color: '#6b7280',
              width: 1
            }
          }
        }]
      };

    case 'bar':
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '实验室使用率对比',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: '{b}: {c}%'
        },
        xAxis: {
          type: 'category',
          data: finalData?.categories || [],
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            formatter: '{value}%' // 显示百分比
          },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } },
          minInterval: 1 // 设置最小刻度间隔为1
        },
        series: [{
          data: finalData?.values || [],
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#1e40af' }
            ])
          },
          barWidth: '50%'
        }]
      };

    case 'line':
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '实验人次趋势',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c}人次'
        },
        xAxis: {
          type: 'category',
          data: finalData?.categories || [],
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
          data: finalData?.values || [],
          type: 'line',
          smooth: true,
          lineStyle: { 
            color: '#38bdf8',
            width: 2
          },
          itemStyle: { 
            color: '#38bdf8',
            borderWidth: 1,
            borderColor: '#ffffff'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.3)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.05)' }
            ])
          }
        }]
      };

    case 'gauge':
      return {
        ...baseOption,
        title: {
          text: config.title || '课容量利用率',
          left: 'center',
          top: 10,
          textStyle: { color: '#d1d5db', fontSize: 18 }
        },
        series: [{
          name: '使用率',
          type: 'gauge',
          center: ['50%', '65%'],
          radius: '75%',
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 8,
              color: [
                [0.3, '#ef4444'],
                [0.6, '#f59e0b'],
                [1, '#10b981']
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: '#ffffff'
            },
            width: 4
          },
          axisTick: {
            distance: -25,
            splitNumber: 5,
            lineStyle: {
              width: 2,
              color: '#6b7280'
            }
          },
          splitLine: {
            distance: -30,
            length: 25,
            lineStyle: {
              width: 3,
              color: '#6b7280'
            }
          },
          axisLabel: {
            color: '#d1d5db',
            distance: 35,
            fontSize: 16
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: '#d1d5db',
            fontSize: 28,
            fontWeight: 'bold'
          },
          data: [{
            value: finalData?.value || 0,
            name: '利用率'
          }]
        }]
      };

    case 'ranking':
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '热门项目排行',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: '{b}: {c}人参与'
        },
        xAxis: {
          type: 'value',
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
          type: 'category',
          data: finalData?.categories || [],
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
          data: finalData?.values || [],
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' }
            ])
          },
          barWidth: '50%'
        }]
      };

    case 'teacher' as any:
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '教师工作量分析',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: '{b}: {c}课时'
        },
        xAxis: {
          type: 'category',
          data: finalData?.categories || [],
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            rotate: 45 // 旋转标签以避免重叠
          },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            formatter: '{value}'
          },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } },
          minInterval: 1
        },
        series: [{
          data: finalData?.values || [],
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' }
            ])
          },
          barWidth: '60%'
        }]
      };

    case 'stackedBar':
      // 课程-专业堆叠图
      let stackedData = finalData as { categories: string[]; series: Array<{ name: string; data: number[] }> } | null;
      
      // 根据selectedItems过滤课程
      if (selectedItems && selectedItems.size > 0 && stackedData && chartData) {
        const selectedCourses = Array.from(selectedItems);
        // 从chartData中获取所有课程的数据，然后过滤
        if (chartData.courseMajorStackedAll && chartData.courseMajorStackedAll.categories) {
          const allCategories = chartData.courseMajorStackedAll.categories;
          const allSeries = chartData.courseMajorStackedAll.series || [];
          
          // 过滤出选中的课程
          const filteredCategories = allCategories.filter((cat: string) => selectedCourses.includes(cat));
          const filteredSeries = allSeries.map((s: any) => ({
            ...s,
            // 从原始数据中提取选中课程对应的值
            data: filteredCategories.map((cat: string) => {
              const originalIdx = allCategories.indexOf(cat);
              return originalIdx >= 0 ? (s.data[originalIdx] || 0) : 0;
            })
          }));
          
          stackedData = {
            categories: filteredCategories,
            series: filteredSeries
          };
        }
      }
      
      if (!stackedData || !Array.isArray(stackedData.categories) || stackedData.categories.length === 0 || !Array.isArray(stackedData.series) || stackedData.series.length === 0) {
        return {
          ...baseOption,
          title: showInternalTitle ? {
            text: config.title || '课程-各专业上课人数',
            left: 'center',
            top: 5,
            textStyle: { color: '#d1d5db', fontSize: 16 }
          } : undefined,
          graphic: {
            type: 'text',
            left: 'center',
            top: '60%',
            style: {
              text: '暂无数据可显示',
              fontSize: 18,
              fill: '#6b7280'
            }
          }
        };
      }
      // 显示所有专业系列（包括数据为0的），以便用户可以看到所有可用的专业
      // 不再过滤掉数据为0的专业，这样所有后端返回的专业都会显示在图例中
      let filteredStackedSeries = Array.isArray(stackedData.series) ? stackedData.series.filter((s: any) => {
        // 只过滤掉无效的系列（没有data或data不是数组），但保留数据为0的系列
        if (!s.data || !Array.isArray(s.data)) return false;
        return true; // 显示所有专业，即使数据为0
      }) : [];
      
      // 如果提供了selectedLegends，只显示选中的系列（避免空白）
      if (selectedLegends && selectedLegends.size > 0) {
        filteredStackedSeries = filteredStackedSeries.filter(s => selectedLegends.has(s.name));
      }
      
      // 生成可区分的颜色（深蓝、浅蓝、深绿、浅绿、深橙、浅橙、深红、浅红等）
      const stackedColors = [
        '#1e40af', '#3b82f6', // 深蓝、浅蓝
        '#065f46', '#10b981', // 深绿、浅绿
        '#92400e', '#f59e0b', // 深橙、浅橙
        '#991b1b', '#ef4444', // 深红、浅红
        '#581c87', '#a855f7', // 深紫、浅紫
        '#78350f', '#f97316', // 深棕、浅棕
        '#0c4a6e', '#0ea5e9', // 深青、浅青
        '#7c2d12', '#fb923c'  // 深褐、浅褐
      ];
      
      return {
        ...baseOption,
          title: showInternalTitle ? {
            text: config.title || '课程-各专业上课人数',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          confine: true, // 限制tooltip在图表区域内，避免闪烁
          enterable: true, // 允许鼠标进入tooltip，实现悬停显示
          formatter: (params: any) => {
            // 获取完整的类别名称（用于X轴标签tooltip）
            let fullCategoryName = '';
            if (Array.isArray(params) && params.length > 0) {
              const dataIndex = params[0].dataIndex;
              if (Array.isArray(stackedData.categories) && dataIndex >= 0 && dataIndex < stackedData.categories.length) {
                fullCategoryName = stackedData.categories[dataIndex];
              }
            }
            
            // 只显示过滤后的系列（非0值）
            if (Array.isArray(params)) {
              const filteredParams = params.filter((p: any) => {
                const value = p.value;
                const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
                return numVal > 0;
              });
              if (filteredParams.length === 0) return '';
              // 如果完整名称和显示名称不同，显示完整名称
              const displayName = filteredParams[0].axisValue;
              const title = fullCategoryName && fullCategoryName !== displayName ? fullCategoryName : displayName;
              let result = `${title}<br/>`;
              filteredParams.forEach((p: any) => {
                result += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
              });
              return result;
            }
            return '';
          }
        },
        legend: hideLegend ? { show: false } : undefined, // 隐藏图例，使用选择器
        grid: {
          left: '8%', // 增加左边距，为y轴名称留出空间
          right: '4%',
          bottom: '8%', // 减少底部空白，为按钮留出空间
          top: '20%', // 增加顶部间距，避免和标题太挤，减少重叠
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: Array.isArray(stackedData.categories) ? stackedData.categories : [],
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            interval: 0, // 强制显示所有标签
            rotate: 0, // 不旋转，水平显示
            formatter: (value: string) => {
              if (!value) return '';
              // 一行最多5个字，最多两行（10个字）
              if (value.length <= 5) {
                return value;
              } else if (value.length <= 10) {
                // 分成两行，每行最多5个字
                return value.slice(0, 5) + '\n' + value.slice(5);
              } else {
                // 超过10个字，只显示前10个字，后面加省略号
                return value.slice(0, 5) + '\n' + value.slice(5, 10) + '...';
              }
            },
            rich: {
              a: {
                lineHeight: 16
              }
            }
          },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: (() => {
          // 计算每个类别的堆叠总和，找到最大值（基于实际显示的系列）
          if (!Array.isArray(stackedData.categories)) {
            return {
              type: 'value',
              name: '人\n数', // y轴名称竖着写，每个字符一行
              nameLocation: 'middle',
              nameGap: 50,
              nameRotate: 0, // 不旋转，保持垂直排列
              nameTextStyle: { 
                color: '#d1d5db', 
                fontSize: 14,
                align: 'center',
                lineHeight: 16 // 设置行高，确保字符垂直排列
              },
              max: 100,
              axisLabel: { color: '#d1d5db', fontSize: 14 },
              axisLine: { lineStyle: { color: '#374151' } },
              splitLine: { lineStyle: { color: '#374151' } }
            };
          }
          const categorySums = stackedData.categories.map((_, catIdx) => {
            return filteredStackedSeries.reduce((sum: number, series: any) => {
              const val = series.data[catIdx] || 0;
              const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
              return sum + numVal;
            }, 0);
          });
          const maxSum = categorySums.length > 0 ? Math.max(...categorySums, 0) : 0;
          
          // 计算Y轴最大值：向上取整到合适的刻度
          const calculateYAxisMax = (max: number) => {
            if (max <= 0) return 100;
            // 向上取整到最近的"合适"刻度（10, 20, 50, 100, 200, 500, 1000等）
            const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
            const normalized = max / magnitude;
            let rounded;
            if (normalized <= 1) rounded = 1;
            else if (normalized <= 2) rounded = 2;
            else if (normalized <= 5) rounded = 5;
            else rounded = 10;
            return rounded * magnitude;
          };
          
          const yAxisMax = calculateYAxisMax(maxSum);
          
          return {
            type: 'value',
            name: '人\n数', // y轴名称竖着写，每个字符一行
            nameLocation: 'middle',
            nameGap: 50,
            nameRotate: 0, // 不旋转，保持垂直排列
            nameTextStyle: { 
              color: '#d1d5db', 
              fontSize: 14,
              align: 'center',
              lineHeight: 16 // 设置行高，确保字符垂直排列
            },
            max: yAxisMax,
            axisLabel: { 
              color: '#d1d5db', 
              fontSize: 14,
              formatter: (value: number) => {
                // 如果值很大，使用K/M等单位
                if (value >= 1000) {
                  return (value / 1000).toFixed(1) + 'K';
                }
                return value.toString();
              }
            },
            axisLine: { lineStyle: { color: '#374151' } },
            splitLine: { lineStyle: { color: '#374151' } }
          };
        })(),
        series: Array.isArray(filteredStackedSeries) ? filteredStackedSeries.map((s, idx) => ({
          name: s.name,
          type: 'bar',
          stack: 'total',
          data: Array.isArray(s.data) ? s.data : [],
          itemStyle: {
            color: stackedColors[idx % stackedColors.length]
          }
        })) : []
      };

    case 'majorStackedBar':
      // 专业-课程堆叠图
      let majorStackedData = finalData as { categories: string[]; series: Array<{ name: string; data: number[] }> } | null;
      
      // 根据selectedItems过滤专业
      if (selectedItems && selectedItems.size > 0 && majorStackedData && chartData) {
        const selectedMajors = Array.from(selectedItems);
        // 从chartData中获取所有专业的数据，然后过滤
        if (chartData.majorCourseStackedAll && chartData.majorCourseStackedAll.categories) {
          const allCategories = chartData.majorCourseStackedAll.categories;
          const allSeries = chartData.majorCourseStackedAll.series || [];
          
          // 过滤出选中的专业
          const filteredCategories = allCategories.filter((cat: string) => selectedMajors.includes(cat));
          const filteredSeries = allSeries.map((s: any) => ({
            ...s,
            data: allCategories.map((cat: string, idx: number) => {
              if (selectedMajors.includes(cat)) {
                return s.data[idx] || 0;
              }
              return 0;
            }).filter((_: any, idx: number) => selectedMajors.includes(allCategories[idx]))
          }));
          
          majorStackedData = {
            categories: filteredCategories,
            series: filteredSeries
          };
        }
      }
      
      if (!majorStackedData || !Array.isArray(majorStackedData.categories) || majorStackedData.categories.length === 0 || !Array.isArray(majorStackedData.series) || majorStackedData.series.length === 0) {
        return {
          ...baseOption,
          title: showInternalTitle ? {
            text: config.title || '专业-课程堆叠图',
            left: 'center',
            top: 5,
            textStyle: { color: '#d1d5db', fontSize: 16 }
          } : undefined,
          graphic: {
            type: 'text',
            left: 'center',
            top: '60%',
            style: {
              text: '暂无数据可显示',
              fontSize: 18,
              fill: '#6b7280'
            }
          }
        };
      }
      // 过滤掉数量为0的系列，并生成可区分的颜色
      let filteredMajorStackedSeries = Array.isArray(majorStackedData.series) ? majorStackedData.series.filter((s: any) => {
        // 检查该系列在所有类别中是否有非0值
        if (!s.data || !Array.isArray(s.data)) return false;
        return s.data.some((val: any) => {
          const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
          return numVal > 0;
        });
      }) : [];
      
      // 如果提供了selectedLegends，只显示选中的系列（避免空白）
      if (selectedLegends && selectedLegends.size > 0) {
        filteredMajorStackedSeries = filteredMajorStackedSeries.filter(s => selectedLegends.has(s.name));
      }
      
      // 生成可区分的颜色（深蓝、浅蓝、深绿、浅绿、深橙、浅橙、深红、浅红等）
      const majorStackedColors = [
        '#1e40af', '#3b82f6', // 深蓝、浅蓝
        '#065f46', '#10b981', // 深绿、浅绿
        '#92400e', '#f59e0b', // 深橙、浅橙
        '#991b1b', '#ef4444', // 深红、浅红
        '#581c87', '#a855f7', // 深紫、浅紫
        '#78350f', '#f97316', // 深棕、浅棕
        '#0c4a6e', '#0ea5e9', // 深青、浅青
        '#7c2d12', '#fb923c'  // 深褐、浅褐
      ];
      
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '专业-课程堆叠图',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          confine: true, // 限制tooltip在图表区域内，避免闪烁
          enterable: true, // 允许鼠标进入tooltip，实现悬停显示
          formatter: (params: any) => {
            // 获取完整的类别名称（用于X轴标签tooltip）
            let fullCategoryName = '';
            if (Array.isArray(params) && params.length > 0) {
              const dataIndex = params[0].dataIndex;
              if (Array.isArray(majorStackedData.categories) && dataIndex >= 0 && dataIndex < majorStackedData.categories.length) {
                fullCategoryName = majorStackedData.categories[dataIndex];
              }
            }
            
            // 只显示过滤后的系列（非0值）
            if (Array.isArray(params)) {
              const filteredParams = params.filter((p: any) => {
                const value = p.value;
                const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
                return numVal > 0;
              });
              if (filteredParams.length === 0) return '';
              // 如果完整名称和显示名称不同，显示完整名称
              const displayName = filteredParams[0].axisValue;
              const title = fullCategoryName && fullCategoryName !== displayName ? fullCategoryName : displayName;
              let result = `${title}<br/>`;
              filteredParams.forEach((p: any) => {
                result += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
              });
              return result;
            }
            return '';
          }
        },
        legend: hideLegend ? { show: false } : undefined, // 隐藏图例，使用选择器
        grid: {
          left: '8%', // 增加左边距，为y轴名称留出空间
          right: '4%',
          bottom: '8%', // 减少底部空白，为按钮留出空间
          top: '20%', // 增加顶部间距，避免和标题太挤，减少重叠
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: Array.isArray(majorStackedData.categories) ? majorStackedData.categories : [],
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            interval: 0, // 强制显示所有标签
            rotate: 0, // 不旋转，水平显示
            formatter: (value: string) => {
              if (!value) return '';
              // 一行最多5个字，最多两行（10个字）
              if (value.length <= 5) {
                return value;
              } else if (value.length <= 10) {
                // 分成两行，每行最多5个字
                return value.slice(0, 5) + '\n' + value.slice(5);
              } else {
                // 超过10个字，只显示前10个字，后面加省略号
                return value.slice(0, 5) + '\n' + value.slice(5, 10) + '...';
              }
            },
            rich: {
              a: {
                lineHeight: 16
              }
            }
          },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: (() => {
          // 计算每个类别的堆叠总和，找到最大值（基于实际显示的系列）
          if (!Array.isArray(majorStackedData.categories)) {
            return {
              type: 'value',
              name: '人\n数', // y轴名称竖着写，每个字符一行
              nameLocation: 'middle',
              nameGap: 50,
              nameRotate: 0, // 不旋转，保持垂直排列
              nameTextStyle: { 
                color: '#d1d5db', 
                fontSize: 14,
                align: 'center',
                lineHeight: 16 // 设置行高，确保字符垂直排列
              },
              max: 100,
              axisLabel: { color: '#d1d5db', fontSize: 14 },
              axisLine: { lineStyle: { color: '#374151' } },
              splitLine: { lineStyle: { color: '#374151' } }
            };
          }
          const categorySums = majorStackedData.categories.map((_, catIdx) => {
            return filteredMajorStackedSeries.reduce((sum: number, series: any) => {
              const val = series.data[catIdx] || 0;
              const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
              return sum + numVal;
            }, 0);
          });
          const maxSum = categorySums.length > 0 ? Math.max(...categorySums, 0) : 0;
          
          // 计算Y轴最大值：向上取整到合适的刻度
          const calculateYAxisMax = (max: number) => {
            if (max <= 0) return 100;
            // 向上取整到最近的"合适"刻度（10, 20, 50, 100, 200, 500, 1000等）
            const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
            const normalized = max / magnitude;
            let rounded;
            if (normalized <= 1) rounded = 1;
            else if (normalized <= 2) rounded = 2;
            else if (normalized <= 5) rounded = 5;
            else rounded = 10;
            return rounded * magnitude;
          };
          
          const yAxisMax = calculateYAxisMax(maxSum);
          
          return {
            type: 'value',
            name: '人\n数', // y轴名称竖着写，每个字符一行
            nameLocation: 'middle',
            nameGap: 50,
            nameRotate: 0, // 不旋转，保持垂直排列
            nameTextStyle: { 
              color: '#d1d5db', 
              fontSize: 14,
              align: 'center',
              lineHeight: 16 // 设置行高，确保字符垂直排列
            },
            max: yAxisMax,
            axisLabel: { 
              color: '#d1d5db', 
              fontSize: 14,
              formatter: (value: number) => {
                // 如果值很大，使用K/M等单位
                if (value >= 1000) {
                  return (value / 1000).toFixed(1) + 'K';
                }
                return value.toString();
              }
            },
            axisLine: { lineStyle: { color: '#374151' } },
            splitLine: { lineStyle: { color: '#374151' } }
          };
        })(),
        series: Array.isArray(filteredMajorStackedSeries) ? filteredMajorStackedSeries.map((s, idx) => ({
          name: s.name,
          type: 'bar',
          stack: 'total',
          data: Array.isArray(s.data) ? s.data : [],
          itemStyle: {
            color: majorStackedColors[idx % majorStackedColors.length]
          }
        })) : []
      };

    case 'majorTrend':
      // 专业活跃度趋势（折线图）
      let trendData = finalData as { categories: string[]; series: Array<{ name: string; data: number[] }> } | null;
      
      // 根据selectedItems过滤专业
      if (selectedItems && selectedItems.size > 0 && trendData && chartData) {
        const selectedMajors = Array.from(selectedItems);
        // 从chartData中获取所有专业的数据，然后过滤
        if (chartData.majorTrendAll && chartData.majorTrendAll.series) {
          const allSeries = chartData.majorTrendAll.series || [];
          const filteredSeries = allSeries.filter((s: any) => selectedMajors.includes(s.name));
          
          trendData = {
            categories: trendData.categories || chartData.majorTrendAll.categories || [],
            series: filteredSeries
          };
        }
      }
      
      if (!trendData || !trendData.categories || trendData.categories.length === 0 || !trendData.series || trendData.series.length === 0) {
        return {
          ...baseOption,
          title: showInternalTitle ? {
            text: config.title || '专业活跃度趋势',
            left: 'center',
            top: 5,
            textStyle: { color: '#d1d5db', fontSize: 16 }
          } : undefined,
          graphic: {
            type: 'text',
            left: 'center',
            top: '60%',
            style: {
              text: '暂无数据可显示',
              fontSize: 18,
              fill: '#6b7280'
            }
          }
        };
      }
      const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ef4444'];
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '专业活跃度趋势',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'axis'
        },
        legend: hideLegend ? { show: false } : undefined, // 隐藏图例，使用选择器
        grid: {
          left: '8%', // 增加左边距，为y轴名称留出空间
          right: '4%',
          bottom: '8%', // 减少底部空白，为按钮留出空间
          top: '20%', // 增加顶部间距，避免和标题太挤，减少重叠
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: trendData.categories,
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } }
        },
        yAxis: {
          type: 'value',
          name: '人\n数', // y轴名称竖着写，每个字符一行
          nameLocation: 'middle',
          nameGap: 50,
          nameRotate: 0, // 不旋转，保持垂直排列
          nameTextStyle: { 
            color: '#d1d5db', 
            fontSize: 14,
            align: 'center',
            lineHeight: 16 // 设置行高，确保字符垂直排列
          },
          axisLabel: { color: '#d1d5db', fontSize: 14 },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } }
        },
        series: Array.isArray(trendData.series) ? trendData.series.map((s: any, idx: number) => ({
          name: s.name,
          type: 'line',
          data: Array.isArray(s.data) ? s.data : [],
          smooth: true,
          lineStyle: { color: colors[idx % 4], width: 2 },
          itemStyle: { color: colors[idx % 4] },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${colors[idx % 4]}80` },
              { offset: 1, color: `${colors[idx % 4]}10` }
            ])
          }
        })) : []
      };

    case 'courseCoverage':
      // 课程覆盖度分析（气泡图）
      let coverageData = finalData as Array<{ name: string; majors: number; classes: number; students: number }> | null;
      
      // 根据selectedItems过滤课程（最多8个）
      if (selectedItems && selectedItems.size > 0 && coverageData && chartData) {
        const selectedCourses = Array.from(selectedItems);
        if (chartData.courseCoverageAll && Array.isArray(chartData.courseCoverageAll)) {
          coverageData = chartData.courseCoverageAll.filter((c: any) => selectedCourses.includes(c.name));
        } else {
          coverageData = coverageData.filter(c => selectedCourses.includes(c.name));
        }
      }
      
      if (!coverageData || coverageData.length === 0) {
        return {
          ...baseOption,
          title: showInternalTitle ? {
            text: config.title || '课程覆盖度分析',
            left: 'center',
            top: 5,
            textStyle: { color: '#d1d5db', fontSize: 16 }
          } : undefined,
          graphic: {
            type: 'text',
            left: 'center',
            top: '60%',
            style: {
              text: '暂无数据可显示',
              fontSize: 18,
              fill: '#6b7280'
            }
          }
        };
      }
      // 计算气泡大小范围
      const maxStudents = Array.isArray(coverageData) && coverageData.length > 0 ? Math.max(...coverageData.map(d => d.students || 0), 1) : 1;
      const maxMajors = Array.isArray(coverageData) && coverageData.length > 0 ? Math.max(...coverageData.map(d => d.majors || 0), 1) : 1;
      const maxClasses = Array.isArray(coverageData) && coverageData.length > 0 ? Math.max(...coverageData.map(d => d.classes || 0), 1) : 1;
      
      // 计算轴的最大值，向上取整并留出适当边距，避免浮点数精度问题
      const calculateAxisMax = (maxValue: number) => {
        // 如果最大值小于等于1，直接返回2
        if (maxValue <= 1) return 2;
        // 向上取整到最近的整数，然后加1作为边距
        return Math.ceil(maxValue) + 1;
      };
      
      const xAxisMax = calculateAxisMax(maxMajors);
      const yAxisMax = calculateAxisMax(maxClasses);
      
      return {
        ...baseOption,
        title: showInternalTitle ? {
          text: config.title || '课程覆盖度分析',
          left: 'center',
          top: 5,
          textStyle: { color: '#d1d5db', fontSize: 16 }
        } : undefined,
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const data = params.data;
            return `${data[2]}<br/>专业数: ${data[0]}<br/>班级数: ${data[1]}<br/>学生数: ${data[3]}`;
          }
        },
        grid: {
          left: '15%', // 增加左边距，确保"专业数"标签和y轴名称完整显示
          right: '8%',
          bottom: '8%',
          top: '25%', // 增加顶部间距，避免和标题太挤，减少文字重叠
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: '专业数',
          nameTextStyle: { color: '#d1d5db', fontSize: 14 },
          nameLocation: 'middle', // 标签居中
          nameGap: 30, // 标签距离轴的距离
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            formatter: (value: number) => {
              // 确保显示为整数，避免浮点数精度问题
              return Math.round(value).toString();
            }
          },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } },
          max: xAxisMax
        },
        yAxis: {
          type: 'value',
          name: '班\n级\n数', // y轴名称竖着写，每个字符一行
          nameLocation: 'middle', // 标签居中
          nameGap: 50, // 标签距离轴的距离
          nameRotate: 0, // 不旋转，保持垂直排列
          nameTextStyle: { 
            color: '#d1d5db', 
            fontSize: 14,
            align: 'center',
            lineHeight: 16 // 设置行高，确保字符垂直排列
          },
          axisLabel: { 
            color: '#d1d5db', 
            fontSize: 14,
            formatter: (value: number) => {
              // 确保显示为整数，避免浮点数精度问题
              return Math.round(value).toString();
            }
          },
          axisLine: { lineStyle: { color: '#374151' } },
          splitLine: { lineStyle: { color: '#374151' } },
          max: yAxisMax
        },
        series: [{
          type: 'scatter',
          data: Array.isArray(coverageData) ? coverageData.map((d: any, idx: number) => {
            // 添加轻微jitter避免重叠（基于索引的确定性偏移）
            const jitterX = ((idx % 3) - 1) * 0.05; // -0.05, 0, 0.05循环
            const jitterY = ((Math.floor(idx / 3) % 3) - 1) * 0.05; // -0.05, 0, 0.05循环
            return [
              (d.majors || 0) + jitterX, 
              (d.classes || 0) + jitterY, 
              d.name || '', 
              d.students || 0
            ];
          }) : [],
          symbolSize: (data: any) => {
            return Math.max(20, (data[3] / maxStudents) * 80);
          },
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#1e40af' }
            ]),
            opacity: 0.6, // 半透明
            borderColor: '#60a5fa', // 描边颜色
            borderWidth: 2 // 描边宽度
          },
          emphasis: {
            itemStyle: {
              opacity: 1, // 悬停时完全不透明
              borderColor: '#93c5fd', // 悬停时描边更亮
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(96, 165, 250, 0.5)'
          },
          label: {
            show: true,
              fontSize: 13,
              fontWeight: 'bold'
            }
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const data = params.data;
              return data[2] || '';
            },
            position: 'top', // 标签在气泡上方
            color: '#d1d5db',
            fontSize: 11,
            offset: [0, -18] // 向上偏移，让标签在气泡外，为拉线留出空间
          }
        }]
      };

    default:
      return baseOption;
  }
}

export default function Chart({ type, title, data, config, height = '100%', width = '100%', chartData, showInternalTitle = true }: ChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [legendItems, setLegendItems] = useState<Array<{ name: string; color: string; selected: boolean }>>([]);
  const [selectedLegends, setSelectedLegends] = useState<Set<string>>(new Set());
  const [isLegendOpen, setIsLegendOpen] = useState(false); // 图例是否打开
  
  // 需要自定义图例的图表类型（堆叠图需要，但majorTrend有选择器就不需要图例了）
  const needsCustomLegend = ['stackedBar', 'majorStackedBar'].includes(type);
  
  // 需要选择器的图表类型（课程/专业选择）
  const needsItemSelector = ['donut', 'stackedBar', 'majorStackedBar', 'majorTrend', 'courseCoverage'].includes(type);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [availableItems, setAvailableItems] = useState<Array<{ name: string; selected: boolean }>>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  
  // 调试：打印数据信息
  useEffect(() => {
    if (type === 'donut' || type === 'stackedBar' || type === 'majorStackedBar' || type === 'majorTrend' || type === 'courseCoverage') {
      console.log(`[Chart ${type}] data:`, data);
      console.log(`[Chart ${type}] chartData:`, chartData);
    }
  }, [type, data, chartData]);
  
  // 提取可用的课程/专业列表
  useEffect(() => {
    if (!needsItemSelector || !chartData) return;
    
    let items: string[] = [];
    
    if (type === 'donut') {
      // 从chartData中提取所有可用的课程
      if (chartData.allCourses && Array.isArray(chartData.allCourses)) {
        items = chartData.allCourses;
      } else if (chartData.courseMajorDistributionMap && typeof chartData.courseMajorDistributionMap === 'object') {
        items = Object.keys(chartData.courseMajorDistributionMap);
      }
    } else if (type === 'stackedBar') {
      // 从chartData中提取所有可用的课程
      if (chartData.allCourses && Array.isArray(chartData.allCourses)) {
        items = chartData.allCourses;
      } else if (chartData.courseMajorStackedAll && chartData.courseMajorStackedAll.categories) {
        items = chartData.courseMajorStackedAll.categories;
      } else if (chartData.courseMajorStacked && chartData.courseMajorStacked.categories) {
        items = chartData.courseMajorStacked.categories;
      }
    } else if (type === 'majorStackedBar') {
      // 从chartData中提取所有可用的专业
      if (chartData.allMajors && Array.isArray(chartData.allMajors)) {
        items = chartData.allMajors;
      } else if (chartData.majorCourseStackedAll && chartData.majorCourseStackedAll.categories) {
        items = chartData.majorCourseStackedAll.categories;
      } else if (chartData.majorCourseStacked && chartData.majorCourseStacked.categories) {
        items = chartData.majorCourseStacked.categories;
      }
    } else if (type === 'majorTrend') {
      // 从chartData中提取所有可用的专业
      if (chartData.allMajors && Array.isArray(chartData.allMajors)) {
        items = chartData.allMajors;
      } else if (chartData.majorTrendAll && chartData.majorTrendAll.series) {
        items = chartData.majorTrendAll.series.map((s: any) => s.name);
      } else if (chartData.majorTrend && chartData.majorTrend.series) {
        items = chartData.majorTrend.series.map((s: any) => s.name);
      }
    } else if (type === 'courseCoverage') {
      // 从chartData中提取所有可用的课程
      if (chartData.allCourses && Array.isArray(chartData.allCourses)) {
        items = chartData.allCourses;
      } else if (chartData.courseCoverageAll && Array.isArray(chartData.courseCoverageAll)) {
        items = chartData.courseCoverageAll.map((c: any) => c.name);
      } else if (chartData.courseCoverage && Array.isArray(chartData.courseCoverage)) {
        items = chartData.courseCoverage.map((c: any) => c.name);
      }
    }
    
    if (items.length > 0) {
      // 初始化时，如果没有选择任何项，选择第一个（或根据图表类型选择多个）
      if (selectedItems.size === 0 && items.length > 0) {
        if (type === 'donut') {
          // 单选：选择第一个
          setSelectedItems(new Set([items[0]]));
          return; // 等待selectedItems更新后再继续
        } else if (type === 'stackedBar' || type === 'majorStackedBar') {
          // 多选：选择前5个
          setSelectedItems(new Set(items.slice(0, 5)));
        } else if (type === 'majorTrend') {
          // 多选：选择前4个
          setSelectedItems(new Set(items.slice(0, 4)));
          return; // 等待selectedItems更新后再继续
        } else if (type === 'courseCoverage') {
          // 多选：选择前8个
          setSelectedItems(new Set(items.slice(0, 8)));
          return; // 等待selectedItems更新后再继续
        }
      }
      
      const itemsWithSelection = items.map(name => ({
        name,
        selected: selectedItems.has(name)
      }));
      setAvailableItems(itemsWithSelection);
    } else {
      setAvailableItems([]);
    }
  }, [type, chartData, needsItemSelector, selectedItems]);
  
  // 如果使用自定义图例，隐藏ECharts的默认图例（传递true）
  // 传递selectedLegends以便动态过滤series和计算Y轴
  // 传递selectedItems以便过滤课程/专业
  // 当图例打开时，禁用 tooltip 以避免闪烁
  const baseOption = generateChartOption(type, data, { ...config, title }, chartData, showInternalTitle, needsCustomLegend, selectedLegends, selectedItems);
  const option = (isLegendOpen && needsCustomLegend) || (isSelectorOpen && needsItemSelector) ? {
    ...baseOption,
    tooltip: {
      ...baseOption.tooltip,
      show: false // 图例或选择器打开时禁用 tooltip
    }
  } : baseOption;
  
  // 从option中提取图例信息（基于原始数据，不受selectedLegends影响）
  useEffect(() => {
    if (needsCustomLegend) {
      // 对于堆叠图，需要从原始数据中提取所有系列（包括未选中的）
      let allSeries: any[] = [];
      let rawDataForLegend: any = null; // 保存原始数据，用于图例
      
      if (['stackedBar', 'majorStackedBar'].includes(type) && chartData) {
        // 从chartData中获取原始series数据，优先使用包含所有数据的版本
        if (type === 'stackedBar') {
          // 优先使用courseMajorStackedAll（包含所有课程和专业的数据）
          rawDataForLegend = chartData.courseMajorStackedAll || chartData.courseMajorStacked || { categories: [], series: [] };
        } else {
          // 优先使用majorCourseStackedAll（包含所有专业和课程的数据）
          rawDataForLegend = chartData.majorCourseStackedAll || chartData.majorCourseStacked || { categories: [], series: [] };
        }
        
        if (rawDataForLegend.series && Array.isArray(rawDataForLegend.series)) {
          // 不再过滤掉数量为0的系列，显示所有专业（包括数据为0的）
          allSeries = rawDataForLegend.series.filter((s: any) => {
            // 只过滤掉无效的系列（没有data或data不是数组），但保留数据为0的系列
            if (!s.data || !Array.isArray(s.data)) return false;
            return true; // 显示所有专业，即使数据为0
          });
        }
      } else {
        // 对于非堆叠图，尝试从option中获取series
        try {
          const opt = option as any;
          if (opt && opt.series && Array.isArray(opt.series)) {
            allSeries = opt.series;
          }
        } catch (error) {
          console.warn('Error accessing option.series:', error);
        }
      }
      
      if (allSeries.length > 0) {
        // 定义默认颜色数组（堆叠图和折线图使用不同的颜色）
        const stackedColors = [
          '#1e40af', '#3b82f6', // 深蓝、浅蓝
          '#065f46', '#10b981', // 深绿、浅绿
          '#92400e', '#f59e0b', // 深橙、浅橙
          '#991b1b', '#ef4444', // 深红、浅红
          '#581c87', '#a855f7', // 深紫、浅紫
          '#78350f', '#f97316', // 深棕、浅棕
          '#0c4a6e', '#0ea5e9', // 深青、浅青
          '#7c2d12', '#fb923c'  // 深褐、浅褐
        ];
        const lineColors = ['#38bdf8', '#10b981', '#f59e0b', '#ef4444'];
        
        const isStacked = ['stackedBar', 'majorStackedBar'].includes(type);
        const defaultColors = isStacked ? stackedColors : lineColors;
        
        const items = allSeries.map((s: any, idx: number) => {
          // 对于堆叠图，需要从option中获取实际使用的颜色
          let color: string;
          
          if (['stackedBar', 'majorStackedBar'].includes(type)) {
            // 堆叠图：从option.series中获取对应series的颜色
            // 注意：option.series的顺序和allSeries的顺序可能不同，需要通过name匹配
            try {
              const opt = option as any;
              if (opt && opt.series && Array.isArray(opt.series)) {
                // 通过name查找对应的series，确保颜色匹配
                const seriesInOption = opt.series.find((ser: any) => ser.name === s.name);
                if (seriesInOption && seriesInOption.itemStyle && seriesInOption.itemStyle.color) {
                  color = seriesInOption.itemStyle.color;
                } else {
                  // 如果找不到，根据allSeries中的索引使用默认颜色数组
                  // 注意：这里需要使用allSeries的索引，而不是option.series的索引
                  const stackedColors = [
                    '#1e40af', '#3b82f6', // 深蓝、浅蓝
                    '#065f46', '#10b981', // 深绿、浅绿
                    '#92400e', '#f59e0b', // 深橙、浅橙
                    '#991b1b', '#ef4444', // 深红、浅红
                    '#581c87', '#a855f7', // 深紫、浅紫
                    '#78350f', '#f97316', // 深棕、浅棕
                    '#0c4a6e', '#0ea5e9', // 深青、浅青
                    '#7c2d12', '#fb923c'  // 深褐、浅褐
                  ];
                  // 使用allSeries中的索引，确保颜色和图表中使用的颜色一致
                  color = stackedColors[idx % stackedColors.length];
                }
              } else {
                // 如果option中没有series，使用默认颜色数组
                const stackedColors = [
                  '#1e40af', '#3b82f6', // 深蓝、浅蓝
                  '#065f46', '#10b981', // 深绿、浅绿
                  '#92400e', '#f59e0b', // 深橙、浅橙
                  '#991b1b', '#ef4444', // 深红、浅红
                  '#581c87', '#a855f7', // 深紫、浅紫
                  '#78350f', '#f97316', // 深棕、浅棕
                  '#0c4a6e', '#0ea5e9', // 深青、浅青
                  '#7c2d12', '#fb923c'  // 深褐、浅褐
                ];
                color = stackedColors[idx % stackedColors.length];
              }
            } catch (error) {
              // 出错时使用默认颜色
              const stackedColors = [
                '#1e40af', '#3b82f6', // 深蓝、浅蓝
                '#065f46', '#10b981', // 深绿、浅绿
                '#92400e', '#f59e0b', // 深橙、浅橙
                '#991b1b', '#ef4444', // 深红、浅红
                '#581c87', '#a855f7', // 深紫、浅紫
                '#78350f', '#f97316', // 深棕、浅棕
                '#0c4a6e', '#0ea5e9', // 深青、浅青
                '#7c2d12', '#fb923c'  // 深褐、浅褐
              ];
              color = stackedColors[idx % stackedColors.length];
            }
          } else {
            // 非堆叠图：尝试从series中提取颜色
            let extractedColor = s.lineStyle?.color || s.itemStyle?.color;
            
            // 如果颜色是对象（如LinearGradient），使用默认颜色
            if (typeof extractedColor !== 'string') {
              extractedColor = defaultColors[idx % defaultColors.length];
            }
            
            // 如果还是没有颜色，使用默认颜色
            if (!extractedColor) {
              extractedColor = defaultColors[idx % defaultColors.length];
            }
            
            color = extractedColor;
          }
          
          return {
            name: s.name || `系列${idx + 1}`,
            color: color,
            selected: selectedLegends.has(s.name) || selectedLegends.size === 0
          };
        });
        
        if (items.length > 0) {
          setLegendItems(items);
          // 初始化时所有图例都选中
          if (selectedLegends.size === 0) {
            setSelectedLegends(new Set(items.map(i => i.name)));
          }
        } else {
          setLegendItems([]);
        }
      } else {
        setLegendItems([]);
      }
    }
  }, [chartData, needsCustomLegend, selectedLegends.size, type]);
  
  // 处理图例点击事件
  const handleLegendToggle = (name: string) => {
    const newSelected = new Set(selectedLegends);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedLegends(newSelected);
    // 注意：不需要dispatchAction，因为option会根据selectedLegends重新生成，key变化会触发重新渲染
  };
  
  // 处理课程/专业选择器切换事件
  const handleItemToggle = (name: string) => {
    const newSelected = new Set(selectedItems);
    
    if (type === 'donut') {
      // 单选模式：选择新的会替换旧的
      if (newSelected.has(name)) {
        // 如果已选中，取消选择（但至少保留一个）
        if (newSelected.size > 1) {
          newSelected.delete(name);
        }
      } else {
        // 选择新的，替换旧的
        newSelected.clear();
        newSelected.add(name);
      }
    } else {
      // 多选模式
      const maxSelect = type === 'courseCoverage' ? 8 : type === 'stackedBar' || type === 'majorStackedBar' ? 5 : 4;
      
      if (newSelected.has(name)) {
        // 取消选择
        if (newSelected.size > 1) {
          newSelected.delete(name);
        }
      } else {
        // 添加选择
        if (newSelected.size < maxSelect) {
          newSelected.add(name);
        }
        // 如果达到上限，不添加（ItemSelector会显示提示）
      }
    }
    
    setSelectedItems(newSelected);
  };
  
  // 注意：不再需要dispatchAction，因为series已经根据selectedLegends动态过滤了

  return (
    <div style={{ height, width }} className="animate-chart-slidein flex flex-col">
      <div 
        className="flex-1 min-h-0 relative"
        style={{ 
          pointerEvents: (isLegendOpen && needsCustomLegend) || (isSelectorOpen && needsItemSelector) ? 'none' : 'auto' // 图例或选择器打开时禁用图表鼠标事件
        }}
      >
        <ReactECharts 
          ref={chartRef}
          key={`${type}-${Array.from(selectedLegends).sort().join(',')}-${Array.from(selectedItems).sort().join(',')}`}
          option={option} 
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true} // 不合并配置，完全重新渲染
          lazyUpdate={false} // 立即更新
        />
      </div>
      {(needsCustomLegend && legendItems.length > 0) || (needsItemSelector && availableItems.length > 0) ? (
        <div className="flex items-center justify-center gap-3 mt-0.5">
          {needsCustomLegend && legendItems.length > 0 && !needsItemSelector && (
            <div className="mt-0">
          {['stackedBar', 'majorStackedBar'].includes(type) ? (
            <LegendPopup
              items={legendItems.map(item => ({
                ...item,
                selected: selectedLegends.has(item.name) || selectedLegends.size === 0
              }))}
              onToggle={handleLegendToggle}
              defaultOpen={false} // 图例默认不展开，只是默认显示所有图例项
              onOpenChange={setIsLegendOpen} // 监听图例打开/关闭状态
            />
          ) : (
            <ExpandableLegend
              items={legendItems.map(item => ({
                ...item,
                selected: selectedLegends.has(item.name) || selectedLegends.size === 0
              }))}
              onToggle={handleLegendToggle}
              maxVisible={3}
            />
          )}
            </div>
      )}
          {/* 对于有选择器的图表，只显示选择器，不显示图例 */}
          {needsCustomLegend && legendItems.length > 0 && needsItemSelector && ['stackedBar', 'majorStackedBar'].includes(type) && (
            <div className="mt-0">
              <LegendPopup
                items={legendItems.map(item => ({
                  ...item,
                  selected: selectedLegends.has(item.name) || selectedLegends.size === 0
                }))}
                onToggle={handleLegendToggle}
                defaultOpen={false}
                onOpenChange={setIsLegendOpen}
              />
            </div>
          )}
          {needsItemSelector && availableItems.length > 0 && (
            <div className="mt-0">
              <ItemSelector
                items={availableItems.map(item => ({
                  ...item,
                  selected: selectedItems.has(item.name)
                }))}
              onToggle={handleItemToggle}
              label={type === 'majorStackedBar' ? '专业' : '课程'}
              maxSelect={type === 'courseCoverage' ? 8 : type === 'stackedBar' || type === 'majorStackedBar' ? 5 : type === 'donut' ? undefined : 4}
                singleSelect={type === 'donut'}
                defaultOpen={false}
                onOpenChange={setIsSelectorOpen}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
