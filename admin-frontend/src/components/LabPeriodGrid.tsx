// 功能：课表网格展示（支持多课时续接显示与点击定位）。
import { Table, Tag, Tooltip } from 'antd'
import type { TimetableCell } from '../types'

const WEEKDAYS = ['周一','周二','周三','周四','周五','周六','周日']
const PERIODS = [1,2,3,4,5,6,7,8]

export default function LabPeriodGrid({
  data,
  onCellClick,
}: {
  data: Record<string, TimetableCell | null> // key: `${weekday}-${p}`
  onCellClick: (weekday: number, p: number) => void
}) {
  const rows = PERIODS.map(p => {
    const row: any = { key: p, period: `第${p}节` }
    for (let w = 1; w <= 7; w++) {
      row[`d${w}`] = data[`${w}-${p}`] ?? null
    }
    return row
  })

  const columns = [
    {
      title: '课时',
      dataIndex: 'period',
      width: 88,
      fixed: 'left' as const,
      render: (_: any, row: { key: number }) => `第${row.key}节`,
      onCell: () => ({ className: 'timetable-axis-cell' }),
    },
    ...Array.from({ length: 7 }, (_, i) => {
      const w = i + 1
      return {
        title: WEEKDAYS[i],
        dataIndex: `d${w}`,
        render: (cell: TimetableCell | null, row: { key: number }) => {
          const p = row.key
          
          // 判断当前格是否为多课时课程的续接。
          let actualCell = cell
          let isContinuation = false
          
          if (!cell) {
            // 向前查找是否有跨课时课程覆盖到当前格。
            for (let checkP = 1; checkP < p; checkP++) {
              const prevCell = data[`${w}-${checkP}`]
              if (prevCell && prevCell.duration && prevCell.duration > 1) {
                const startPeriod = checkP
                const endPeriod = checkP + prevCell.duration - 1
                if (p >= startPeriod && p <= endPeriod) {
                  actualCell = prevCell
                  isContinuation = true
                  console.log(`🔍 检测到延续课时: 第${p}节是第${checkP}节的延续 (${prevCell.duration}课时)`)
                  break
                }
              }
            }
          }
          
          const cellContent = (
            <div
              onClick={() => {
                console.log(`🖱️ 点击课时: 周${w} 第${p}节`)
                
                // 续接格点击时定位到主课时。
                if (isContinuation && actualCell) {
                  // 查找主课时位置。
                  for (let checkP = 1; checkP < p; checkP++) {
                    const prevCell = data[`${w}-${checkP}`]
                    if (prevCell && prevCell.duration && prevCell.duration > 1) {
                      const startPeriod = checkP
                      const endPeriod = checkP + prevCell.duration - 1
                      if (p >= startPeriod && p <= endPeriod) {
                        console.log(`✅ 传递主课程信息: 调用onCellClick(${w}, ${checkP})`)
                        onCellClick(w, checkP)
                        return
                      }
                    }
                  }
                }
                console.log(`📝 普通点击: 调用onCellClick(${w}, ${p})`)
                onCellClick(w, p)
              }}
              className={`timetable-cell ${!actualCell ? 'empty' : ''} ${isContinuation ? 'continuation' : ''}`}
            >
              {actualCell ? (
                <div className="timetable-cell-content">
                  {!isContinuation && (
                    <>
                      <div className="timetable-header-row">
                        <div className="timetable-course-title">{actualCell.course}</div>
                        <div className="timetable-right-info">
                          {actualCell.allow_makeup && (
                            <div className="timetable-makeup-tag">可补课</div>
                          )}
                          <div className="timetable-enrollment">
                            <span className="enrollment-number">{actualCell.enrolled}</span>
                            <span className="enrollment-separator">/</span>
                            <span className="enrollment-capacity">{actualCell.capacity || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="timetable-main-info">
                        <div className="timetable-teacher">{actualCell.teacher}</div>
                        {actualCell.content && <div className="timetable-content">{actualCell.content}</div>}
                      </div>
                    </>
                  )}
                  {isContinuation && (
                    <div className="timetable-continuation">
                      <div className="timetable-header-row">
                        <div className="timetable-course-title">{actualCell.course}</div>
                        <div className="timetable-right-info">
                          {actualCell.allow_makeup && (
                            <div className="timetable-makeup-tag">可补课</div>
                          )}
                          <div className="timetable-enrollment">
                            <span className="enrollment-number">{actualCell.enrolled}</span>
                            <span className="enrollment-separator">/</span>
                            <span className="enrollment-capacity">{actualCell.capacity || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="timetable-main-info">
                        <div className="timetable-teacher">{actualCell.teacher}</div>
                        {actualCell.content && <div className="timetable-content">{actualCell.content}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="timetable-empty-cell">（空）</div>
              )}
            </div>
          )

          if (!actualCell) {
            return (
              <Tooltip title="点击添加课程">
                {cellContent}
              </Tooltip>
            )
          }

          const tooltipContent = (
            <div>
              <div><strong>课程：</strong>{actualCell.course}</div>
              <div><strong>教师：</strong>{actualCell.teacher}</div>
              {actualCell.content && <div><strong>内容：</strong>{actualCell.content}</div>}
              <div><strong>报课：</strong>{actualCell.enrolled}/{actualCell.capacity || '—'}</div>
              {actualCell.duration && actualCell.duration > 1 && (
                <div><strong>课时：</strong>{actualCell.duration}课时</div>
              )}
              <div><strong>可补课：</strong>{actualCell.allow_makeup ? '是' : '否'}</div>
              <div className="tooltip-hint">点击编辑</div>
            </div>
          )

          return (
            <Tooltip title={tooltipContent} placement="top">
              {cellContent}
            </Tooltip>
          )
        }
      }
    })
  ]

  return (
    <div className="timetable-table">
      <Table
        bordered
        size="middle"
        pagination={false}
        scroll={{ x: 960 }}
        dataSource={rows}
        columns={columns}
        rowKey="key"
      />
    </div>
  )
}