import type { Scope } from '../lib/api'
import React from 'react'

const days = ['周一','周二','周三','周四','周五','周六','周日']
const periods = ['第1节','第2节','第3节','第4节','第5节','第6节','第7节','第8节']

export default function Heatmap({
  matrix, labs, selectedLab, labIdToName, onChangeLab, scope, onChangeScope, loading
}: {
  matrix: number[][];               // 后端原始 matrix
  labs: string[];
  selectedLab: 'all' | number | string;
  labIdToName: Record<number, string>;
  onChangeLab: (v: string) => void;
  scope: Scope;
  onChangeScope: (s: Scope) => void;
  loading?: boolean;
}) {
  // 1) 归一化：始终得到 8 x 7 的二维数组（不足补 0，多余截断）
  const m: number[][] = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => Number(matrix?.[r]?.[c] ?? 0))
  );

  // 颜色比例（防止全 0 导致 NaN）
  const max = Math.max(1, ...m.flat());
  
  // 改进的渐变计算 - 使用更明显的颜色区分
  const getColor = (value: number) => {
    if (value <= 0) return 'rgba(56,189,248, 0.1)' // 稍微明显一点的背景
    if (value === max) return 'rgba(56,189,248, 1)' // 最大值完全不透明
    const intensity = 0.2 + (value / max) * 0.8 // 从0.2到1.0的渐变
    return `rgba(56,189,248, ${intensity})`
  }

  return (
    <div className="rounded-2xl p-4 bg-slate-900/70 border border-white/10 h-full flex flex-col">
      <div className="flex items-center gap-3 text-sm">
        <div className="text-xl font-bold">实验室使用热力图</div>
        <select
          className="bg-slate-800/70 rounded px-2 py-1 outline-none border border-white/10"
          value={scope}
          onChange={e => onChangeScope(e.target.value as Scope)}
          aria-label="选择时间范围"
        >
          <option value="week">本周</option>
          <option value="semester">本学期</option>
        </select>
        <select
          className="bg-slate-800/70 rounded px-2 py-1 outline-none border border-white/10"
          value={selectedLab === 'all' ? '全部' : labIdToName[selectedLab as number] || '全部'}
          onChange={e => onChangeLab(e.target.value)}
          aria-label="选择实验室"
        >
          {labs.map(x => <option key={x}>{x}</option>)}
        </select>
      </div>

      {/* 2) 明确网格：第一行=列头(7)，第一列=行头(8)，中间= 8x7 数据 */}
      <div
        className="mt-3 grid flex-1"
        style={{
          gridTemplateColumns: 'auto repeat(7, minmax(0,1fr))',
          gridTemplateRows: 'auto repeat(8, 1fr)',
          gridAutoFlow: 'row',          // 强制按行排布，避免压成两行
          gap: 4
        }}
      >
        {/* 左上角空白 */}
        <div />

        {/* 列头：周一~周日 */}
        {days.map(d => (
          <div key={d} className="text-center text-xs opacity-70">{d}</div>
        ))}

        {/* 行：第1~第8节 + 7 列数据 */}
        {m.map((row, rIdx) => (
          <React.Fragment key={`row-${rIdx}`}>
            <div className="text-right pr-2 text-xs opacity-70 flex items-center">{periods[rIdx]}</div>
            {row.map((v, cIdx) => (
              <div
                key={`cell-${rIdx}-${cIdx}`}
                className="rounded"
                style={{ backgroundColor: getColor(v) }}
                title={`${periods[rIdx]} ${days[cIdx]}: ${v} 个课程`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {loading && <div className="mt-2 text-xs opacity-60">加载中…</div>}
    </div>
  )
}
