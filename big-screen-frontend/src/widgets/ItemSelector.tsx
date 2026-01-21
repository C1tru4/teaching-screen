import React, { useState, useRef, useEffect } from 'react';

interface Item {
  name: string;
  selected: boolean;
}

interface ItemSelectorProps {
  items: Item[];
  onToggle: (name: string) => void;
  label: string; // "课程" 或 "专业"
  maxSelect?: number; // 最大选择数量
  singleSelect?: boolean; // 是否单选（单选时，选择新的会替换旧的）
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function ItemSelector({ 
  items, 
  onToggle, 
  label, 
  maxSelect,
  singleSelect = false,
  defaultOpen = false, 
  onOpenChange 
}: ItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  if (items.length === 0) return null;
  
  useEffect(() => {
    if (defaultOpen && items.length > 0) {
      setIsOpen(true);
    }
  }, [defaultOpen, items.length]);
  
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedCount = items.filter(item => item.selected).length;
  const canSelectMore = maxSelect ? selectedCount < maxSelect : true;

  const handleItemClick = (name: string, isSelected: boolean) => {
    if (singleSelect) {
      // 单选模式：如果点击已选中的，取消选择；如果点击未选中的，先取消所有，再选择新的
      if (isSelected) {
        onToggle(name);
      } else {
        // 先取消所有已选中的
        items.filter(item => item.selected).forEach(item => {
          if (item.name !== name) {
            onToggle(item.name);
          }
        });
        // 再选择新的
        onToggle(name);
      }
    } else {
      // 多选模式：检查是否超过限制
      if (!isSelected && maxSelect && selectedCount >= maxSelect) {
        // 可以在这里显示提示，但为了不打断用户操作，暂时不处理
        return;
      }
      onToggle(name);
    }
  };
  
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
        {label}
      </button>
      
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 rounded-lg bg-slate-800/95 border border-white/20 shadow-2xl z-[10000] min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto"
          style={{ 
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
            <span className="text-sm text-slate-300 font-medium">{label}</span>
            {maxSelect && (
              <span className="text-xs text-slate-400">
                {selectedCount}/{maxSelect}
              </span>
            )}
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
            {items.map((item) => {
              const isDisabled = !item.selected && maxSelect && selectedCount >= maxSelect;
              return (
                <div
                  key={item.name}
                  className={`flex items-center gap-2 cursor-pointer transition-opacity px-2 py-1 rounded ${
                    item.selected 
                      ? 'bg-sky-500/20 border border-sky-400/50' 
                      : isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-slate-700/50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      handleItemClick(item.name, item.selected);
                    }
                  }}
                  title={isDisabled ? `最多只能选择${maxSelect}个${label}` : undefined}
                >
                  <div
                    className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                      item.selected ? 'bg-sky-400' : 'bg-slate-500 border border-slate-400'
                    }`}
                  />
                  <span
                    className="text-xs text-slate-300 whitespace-nowrap"
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

