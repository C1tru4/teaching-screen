import React, { useState, useRef, useEffect } from 'react';

interface LegendItem {
  name: string;
  color: string;
  selected: boolean;
}

interface LegendPopupProps {
  items: LegendItem[];
  onToggle: (name: string) => void;
  defaultOpen?: boolean; // 是否默认打开
  onOpenChange?: (isOpen: boolean) => void; // 图例打开/关闭状态变化回调
}

export default function LegendPopup({ items, onToggle, defaultOpen = false, onOpenChange }: LegendPopupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  if (items.length === 0) return null;
  
  // 如果defaultOpen为true，在items变化时保持打开状态
  useEffect(() => {
    if (defaultOpen && items.length > 0) {
      setIsOpen(true);
    }
  }, [defaultOpen, items.length]);
  
  // 通知父组件图例状态变化
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);
  
  // 点击外部关闭弹窗（但不包括图表区域，因为图例直接覆盖图表）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // 只有当点击的不是图表区域时才关闭（图表区域会被图例覆盖，所以不需要关闭）
        // 这里只处理点击按钮外部但不在图例弹窗内的情况
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      // 延迟添加事件监听，避免立即触发
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);
  
  return (
    <div className="relative flex items-center justify-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-xs text-sky-400 hover:text-sky-300 transition-colors px-3 py-1.5 rounded border border-sky-400/50 hover:border-sky-300/50 bg-slate-800/50"
      >
        图例
      </button>
      
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 rounded-lg bg-slate-800/95 border border-white/20 shadow-2xl z-[10000] min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto"
          style={{ 
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto' // 确保图例捕获所有鼠标事件
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseMove={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
          }}
        >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="text-sm text-slate-300 font-medium">图例</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded hover:bg-slate-700/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(item.name);
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className="text-xs text-slate-300 whitespace-nowrap"
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
