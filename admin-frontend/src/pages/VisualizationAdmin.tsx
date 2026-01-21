import { useEffect, useState } from 'react'
import { Button, Card, Form, message, Radio, Select, Space, Switch, Typography, Divider, Row, Col, Input } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import { fetchVisualizationConfig, updateVisualizationConfig, triggerScreenRefresh } from '../api/admin'
import type { VisualizationConfig, KPIMetric, ChartType } from '../types'

const { Title, Text } = Typography

// KPI指标配置
const KPI_OPTIONS: Array<{ value: KPIMetric; label: string; description: string }> = [
  { value: 'courseTotals', label: '课程总数', description: '当前学期的课程总数' },
  { value: 'currentClassHours', label: '已上课时数', description: '截止目前已上的课时数' },
  { value: 'attendance', label: '出勤人数', description: '当前出勤人数' },
  { value: 'utilization', label: '使用率', description: '实验室使用率百分比' },
  { value: 'projectCount', label: '项目总数', description: '训练营项目总数' },
  { value: 'participantCount', label: '参与人数', description: '项目参与人数' },
  { value: 'labCount', label: '实验室数量', description: '可用实验室总数' },
  { value: 'activeLabs', label: '活跃实验室', description: '当前活跃的实验室数量' },
  { value: 'completionRate', label: '完成率', description: '项目完成率百分比' },
  { value: 'totalPlannedAttendance', label: '学期总预计出勤', description: '本学期总的预计出勤人数' },
  { value: 'totalClassHours', label: '学期总课时数', description: '本学期总课时数' },
  { value: 'totalCourses', label: '学期总课程数', description: '本学期总课程数' },
  { value: 'involvedMajors', label: '本学期总专业数', description: '参与课程的专业总数' },
  { value: 'involvedClasses', label: '本学期总班级数', description: '参与课程的班级总数' },
  { value: 'avgStudentsPerCourse', label: '平均每课程参与人次', description: '总参与人数除以课程总数' }
]

// 图表类型配置
const CHART_OPTIONS: Array<{ value: ChartType; label: string; description: string; defaultTitle: string }> = [
  { value: 'heatmap', label: '实验室使用热力图', description: '按星期和时段展示实验室使用密度分布', defaultTitle: '实验室使用热力图' },
  { value: 'pie', label: '项目状态分布 (饼图)', description: '各项目状态占比分布情况', defaultTitle: '项目状态分布' },
  { value: 'bar', label: '实验室使用率对比 (柱状图)', description: '各实验室使用率对比分析', defaultTitle: '实验室使用率对比' },
  { value: 'line', label: '时间趋势 (折线图)', description: '最近6周实验人次变化趋势', defaultTitle: '时间趋势' },
  { value: 'ranking', label: '热门项目 (排行榜)', description: '按参与人数排序的项目排行', defaultTitle: '热门项目' },
  { value: 'gauge', label: '课容量利用率 (仪表盘)', description: '总报课人数与总可容纳人数比率', defaultTitle: '课容量利用率' },
  { value: 'teacher', label: '教师工作量分析 (柱状图)', description: '各教师授课课时统计分析', defaultTitle: '教师工作量分析' },
  { value: 'donut', label: '课程专业占比 (环形图)', description: '单个课程的各专业人数占比', defaultTitle: '课程专业占比' },
  { value: 'stackedBar', label: '课程-专业堆叠图', description: '4个课程按专业堆叠的人数统计', defaultTitle: '课程-专业堆叠图' },
  { value: 'majorStackedBar', label: '专业-课程堆叠图', description: '4个专业按课程堆叠的人数统计', defaultTitle: '专业-课程堆叠图' },
  { value: 'majorTrend', label: '专业活跃度趋势', description: '各专业参与人数随时间变化趋势', defaultTitle: '专业活跃度趋势' },
  { value: 'courseCoverage', label: '课程覆盖度分析', description: '课程覆盖的专业数、班级数、人数分析', defaultTitle: '课程覆盖度分析' }
]

export default function VisualizationAdmin() {
  const [config, setConfig] = useState<VisualizationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await fetchVisualizationConfig()
      setConfig(data)
      form.setFieldsValue(data)
    } catch (error) {
      message.error('加载配置失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      await updateVisualizationConfig(values)
      setConfig(values)
      message.success('配置保存成功')
      
      // 自动刷新大屏
      try {
        await triggerScreenRefresh()
        message.success('大屏数据已更新')
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    } catch (error) {
      message.error('保存失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshScreen = async () => {
    try {
      await triggerScreenRefresh()
      message.success('已广播刷新，大屏将很快更新数据')
    } catch (error) {
      message.error('刷新失败：' + (error as Error).message)
    }
  }

  if (!config) {
    return <div>加载中...</div>
  }

  return (
    <div>
      <PageHeader 
        title="可视化控制" 
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
              重新加载
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
              保存配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefreshScreen}>
              刷新大屏
            </Button>
          </Space>
        }
      />

      <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left' }}>
      <Form form={form} layout="vertical" initialValues={config}>
        {/* 主要配置区域 - 左右并排 */}
        <Row gutter={24} style={{ marginBottom: 16 }}>
          {/* 左侧：KPI 配置 */}
          <Col span={12}>
            <Card title="KPI 指标配置" style={{ height: '100%' }}>
              <Form.Item
                label="选择显示的KPI指标（选择3个）"
                name={['kpi', 'selected']}
                rules={[
                  { required: true, message: '请选择KPI指标' },
                  { validator: (_, value) => value?.length === 3 ? Promise.resolve() : Promise.reject(new Error('必须选择3个指标')) }
                ]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择3个KPI指标"
                  maxTagCount={3}
                  style={{ width: '100%' }}
                  options={KPI_OPTIONS.map(option => ({
                    value: option.value,
                    label: (
                      <div>
                        <div>{option.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{option.description}</Text>
                      </div>
                    )
                  }))}
                />
              </Form.Item>
              
              <Text type="secondary">
                当前可用的KPI指标：{config.kpi.available?.join('、') || '加载中...'}
              </Text>
            </Card>
          </Col>

          {/* 右侧：中间部分配置 */}
          <Col span={12}>
            <Card title="中间部分展示配置" style={{ height: '100%' }}>
              <Form.Item
                label="显示模式"
                name={['middleSection', 'mode']}
                rules={[{ required: true, message: '请选择显示模式' }]}
              >
                <Radio.Group>
                  <Radio value="large">大图表模式</Radio>
                  <Radio value="four-small">四小图表模式</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => 
                prevValues.middleSection?.mode !== currentValues.middleSection?.mode
              }>
                {({ getFieldValue }) => {
                  const mode = getFieldValue(['middleSection', 'mode'])
                  
                  if (mode === 'large') {
                    return (
                      <Card size="small" title="大图表配置" style={{ marginTop: 16 }}>
                        <Form.Item
                          label="图表类型"
                          name={['middleSection', 'largeChart', 'type']}
                          rules={[{ required: true, message: '请选择图表类型' }]}
                        >
                          <Select
                            placeholder="选择图表类型"
                            style={{ width: '100%' }}
                            options={CHART_OPTIONS.map(option => ({
                              value: option.value,
                              label: (
                                <div>
                                  <div>{option.label}</div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>{option.description}</Text>
                                </div>
                              )
                            }))}
                          />
                        </Form.Item>
                      </Card>
                    )
                  }
                  
                  if (mode === 'four-small') {
                    return (
                      <Card size="small" title="四小图表配置" style={{ marginTop: 16 }}>
                        <Row gutter={[8, 8]}>
                          {[0, 1, 2, 3].map(index => (
                            <Col span={12} key={index}>
                              <Card size="small" title={`图表 ${index + 1}`}>
                                <Form.Item
                                  label="图表类型"
                                  name={['middleSection', 'smallCharts', 'charts', index, 'type']}
                                  rules={[{ required: true, message: '请选择图表类型' }]}
                                >
                                  <Select
                                    placeholder="选择图表类型"
                                    style={{ width: '100%' }}
                                    onChange={(value) => {
                                      // 当选择图表类型时，自动填充默认标题
                                      const selectedOption = CHART_OPTIONS.find(option => option.value === value);
                                      if (selectedOption) {
                                        form.setFieldValue(['middleSection', 'smallCharts', 'charts', index, 'title'], selectedOption.defaultTitle);
                                      }
                                    }}
                                    options={CHART_OPTIONS.map(option => ({
                                      value: option.value,
                                      label: (
                                        <div>
                                          <div>{option.label}</div>
                                          <Text type="secondary" style={{ fontSize: '12px' }}>{option.description}</Text>
                                        </div>
                                      )
                                    }))}
                                  />
                                </Form.Item>
                                <Form.Item
                                  label="图表标题"
                                  name={['middleSection', 'smallCharts', 'charts', index, 'title']}
                                  rules={[{ required: true, message: '请输入图表标题' }]}
                                >
                                  <Input placeholder="输入图表标题" />
                                </Form.Item>
                                {/* 不再需要选择课程/专业，后端会生成所有数据，前端自己选择 */}
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    )
                  }
                  
                  return null
                }}
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* 预览说明 */}
        <Card title="配置说明">
          <div style={{ lineHeight: '1.6' }}>
            <p><strong>KPI 指标：</strong>从可用指标中选择3个在大屏顶部显示</p>
            <p><strong>大图表模式：</strong>中间部分显示一个大的可视化图表，适合展示复杂数据关系</p>
            <p><strong>四小图表模式：</strong>中间部分显示四个小图表，可以同时展示多个维度的数据</p>
            <p><strong>注意：</strong>保存配置后，点击"刷新大屏"按钮即可在大屏上看到效果</p>
          </div>
        </Card>
      </Form>
      </div>
    </div>
  )
}
