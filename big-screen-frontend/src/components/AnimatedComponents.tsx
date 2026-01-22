// 功能：通用数字与淡入动画组件。
import React, { useEffect, useState } from 'react';

// 数字滚动动画组件。参数: value 目标值, duration 动画时长等。
export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0 
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true);
      
      const startValue = displayValue;
      const endValue = value;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数。
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, duration, displayValue]);

  return (
    <span className={`${className} ${isAnimating ? 'animate-data-pulse' : ''}`}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// 数据变化指示器组件。参数: currentValue 当前值, previousValue 上次值。
export function DataChangeIndicator({ 
  currentValue, 
  previousValue, 
  className = '' 
}: {
  currentValue: number;
  previousValue: number;
  className?: string;
}) {
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  
  const getChangeClass = () => {
    if (change > 0) return 'data-change-positive';
    if (change < 0) return 'data-change-negative';
    return 'data-change-neutral';
  };
  
  const getChangeIcon = () => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${getChangeClass()} ${className}`}>
      <span>{getChangeIcon()}</span>
      <span>{Math.abs(changePercent).toFixed(1)}%</span>
    </div>
  );
}

// 加载骨架屏组件。
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-white/10 ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-slate-600/50 rounded loading-shimmer"></div>
        <div className="h-6 bg-slate-600/50 rounded w-3/4 loading-shimmer"></div>
        <div className="h-3 bg-slate-600/50 rounded w-1/2 loading-shimmer"></div>
      </div>
    </div>
  );
}

// 进度条组件。参数: value 当前值, max 最大值等。
export function ProgressBar({ 
  value, 
  max = 100, 
  className = '',
  showLabel = true,
  color = 'blue'
}: {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const getColorClass = () => {
    switch (color) {
      case 'emerald': return 'bg-emerald-500';
      case 'amber': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${getColorClass()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
