// 功能：可展开的图例组件。
import React, { useState } from 'react';

interface LegendItem {
  name: string;
  color: string;
  selected: boolean;
}

interface ExpandableLegendProps {
  items: LegendItem[];
  onToggle: (name: string) => void;
  maxVisible?: number; // 默认显示的最大数量
}

export default function ExpandableLegend({ items, onToggle, maxVisible = 3 }: ExpandableLegendProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (items.length === 0) return null;
  
  // maxVisible 为 Infinity 时直接展示全部图例。
  const showAllDirectly = maxVisible === Infinity;
  const visibleItems = showAllDirectly ? items : (expanded ? items : items.slice(0, maxVisible));
  const hasMore = !showAllDirectly && items.length > maxVisible;
  
  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      {/* 主要图例区域 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {visibleItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onToggle(item.name)}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span
              className="text-xs text-slate-300"
              style={{
                textDecoration: item.selected ? 'none' : 'line-through',
                opacity: item.selected ? 1 : 0.5
              }}
            >
              {item.name}
            </span>
          </div>
        ))}
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors px-2 py-1 rounded border border-sky-400/50 hover:border-sky-300/50"
          >
            更多
          </button>
        )}
      </div>
      
      {/* 展开后的完整图例区域 */}
      {expanded && hasMore && (
        <div className="w-full mt-2 p-2 rounded-lg bg-slate-800/50 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">全部图例</span>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              收起
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onToggle(item.name)}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className="text-xs text-slate-300"
                  style={{
                    textDecoration: item.selected ? 'none' : 'line-through',
                    opacity: item.selected ? 1 : 0.5
                  }}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

