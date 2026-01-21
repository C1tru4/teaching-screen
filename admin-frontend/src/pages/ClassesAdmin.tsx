import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Table, message, Space, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import BatchUploader from '../components/BatchUploader'
import { fetchClasses, createClass, updateClass, deleteClass, batchCreateClasses } from '../api/admin'
import type { Class } from '../api/admin'

// 从班级名称中提取专业和班号
function parseClassName(name: string): { major: string; classNum: number } {
  // 尝试匹配"专业名+数字+班"的格式，如"计算机1班"、"计算机科学与技术2班"
  const match = name.match(/^(.+?)(\d+)班$/)
  if (match) {
    return {
      major: match[1],
      classNum: parseInt(match[2], 10)
    }
  }
  // 如果无法解析，返回默认值
  return {
    major: '',
    classNum: 0
  }
}

export default function ClassesAdmin() {
  const [list, setList] = useState<Class[]>([])
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [form] = Form.useForm<Class>()
  const [currentPage, setCurrentPage] = useState(1)
  const [uploadErrors, setUploadErrors] = useState<Array<{ index: number; field?: string; message: string }>>([])

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await fetchClasses()
      setList(res)
    } catch (error) {
      message.error('加载班级列表失败：' + (error as Error).message)
    }
  }

  // 排序：先按专业，再按班号
  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => {
      // 优先使用数据库中的专业字段，如果没有则从班级名称中提取
      const majorA = a.major || parseClassName(a.name).major
      const majorB = b.major || parseClassName(b.name).major
      
      // 先按专业排序
      if (majorA !== majorB) {
        return majorA.localeCompare(majorB, 'zh-CN')
      }
      
      // 同专业内按班号排序
      const numA = parseClassName(a.name).classNum
      const numB = parseClassName(b.name).classNum
      return numA - numB
    })
  }, [list])

  const openEdit = (c?: Class) => {
    const init: Class = c ?? {
      id: 0,
      name: '',
      major: null,
      student_count: 0
    }
    form.setFieldsValue(init)
    setOpen(true)
  }

  const save = async (v: Class) => {
    try {
      if (v.id && v.id !== 0) {
        const { id, ...payload } = v
        // 将 null 转换为 undefined，以匹配 API 类型
        const updatePayload = {
          ...payload,
          major: payload.major ?? undefined
        }
        const upd = await updateClass(id, updatePayload)
        setList(prev => prev.map(x => x.id === upd.id ? upd : x))
        message.success('已保存')
      } else {
        const { id, ...payload } = v
        // 将 null 转换为 undefined，以匹配 API 类型
        const createPayload = {
          ...payload,
          major: payload.major ?? undefined
        }
        const created = await createClass(createPayload)
        setList(prev => [created, ...prev])
        message.success('已创建')
      }
      setOpen(false)
      await loadClasses()
    } catch (error) {
      message.error('保存失败：' + (error as Error).message)
    }
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个班级吗？',
      onOk: async () => {
        try {
          await deleteClass(id)
          setList(prev => prev.filter(x => x.id !== id))
          message.success('已删除')
        } catch (error) {
          message.error('删除失败：' + (error as Error).message)
        }
      }
    })
  }

  const handleBatchUpload = async (data: any[]) => {
    const classes = data.map(row => ({
      name: row.name || row['班级名称'] || row['班级'],
      major: row.major || row['专业'] || undefined,
      student_count: Number(row.student_count || row['人数'] || row['学生人数'] || 0)
    }))

    const result = await batchCreateClasses(classes)
    
    // 保存错误信息到状态，用于在下方显示
    if (result.failed > 0 && result.errors && result.errors.length > 0) {
      // 将字符串数组转换为统一格式
      const formattedErrors = result.errors.map((error: string, idx: number) => {
        // 尝试解析错误信息，提取行号和错误内容
        const match = error.match(/^(.+?):\s*(.+)$/)
        if (match) {
          const className = match[1]
          const message = match[2]
          // 尝试从原始数据中找到对应的行号
          const rowIndex = data.findIndex(row => {
            const name = row.name || row['班级名称'] || row['班级']
            return name === className
          })
          return {
            index: rowIndex >= 0 ? rowIndex + 1 : idx + 1,
            field: '班级名称',
            message: `${className}: ${message}`
          }
        }
        return {
          index: idx + 1,
          message: error
        }
      })
      setUploadErrors(formattedErrors)
      message.warning(`上传完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
    } else {
      setUploadErrors([])
      message.success(`成功上传 ${result.success} 条数据`)
    }
    
    await loadClasses()
    return result
  }

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => {
        // 计算全局序号：当前页数 * 每页条数 + 当前索引 + 1
        const pageSize = 15
        return (currentPage - 1) * pageSize + index + 1
      },
    },
    {
      title: '班级名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      render: (text: string | null) => text || '-'
    },
    {
      title: '人数',
      dataIndex: 'student_count',
      key: 'student_count',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Class) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="班级管理" />

      <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '班级列表',
            },
            {
              key: 'upload',
              label: '批量上传',
            },
          ]}
        />

        {activeTab === 'list' && (
        <div>
          <Table
            dataSource={sortedList}
            columns={columns}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize: 15,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              onChange: (page) => setCurrentPage(page)
            }}
            footer={() => (
              <div style={{ textAlign: 'left', padding: '16px 0' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
                  新建班级
                </Button>
              </div>
            )}
          />
        </div>
      )}

      {activeTab === 'upload' && (
        <div>
          <BatchUploader
            title="批量上传班级"
            accept=".xlsx,.xls,.csv"
            onUpload={handleBatchUpload}
            columns={[
              { title: '班级名称*', dataIndex: '班级名称', key: '班级名称' },
              { title: '专业*', dataIndex: '专业', key: '专业' },
              { title: '人数*', dataIndex: '人数', key: '人数' },
            ]}
            dataKey="classes"
            notice="请上传包含班级名称、专业、人数的Excel文件。所有字段均为必填项。支持格式：班级名称 | 专业 | 人数"
          />
          {uploadErrors.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              background: '#fff1f0', 
              border: '1px solid #ffccc7', 
              borderRadius: 4,
              maxHeight: '60vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#cf1322', fontSize: 16 }}>
                上传错误详情（共 {uploadErrors.length} 条）：
              </div>
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
                minHeight: 0
              }}>
                {uploadErrors.map((error, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: 8, 
                    padding: 10, 
                    background: '#fff', 
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.5
                  }}>
                    <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 14 }}>
                      第{error.index}行
                    </span>
                    {error.field && (
                      <span style={{ color: '#595959', marginLeft: 10, fontSize: 13 }}>
                        [{error.field}]
                      </span>
                    )}
                    <span style={{ color: '#262626', marginLeft: 10, fontSize: 13 }}>
                      {error.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      <Modal
        title={form.getFieldValue('id') ? '编辑班级' : '新建班级'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={save}
        >
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="name"
            label="班级名称"
            rules={[{ required: true, message: '请输入班级名称' }]}
          >
            <Input placeholder="例如：计算机1班" />
          </Form.Item>
          <Form.Item
            name="major"
            label="专业"
            rules={[{ required: true, message: '请输入专业' }]}
          >
            <Input placeholder="例如：计算机科学与技术" />
          </Form.Item>
          <Form.Item
            name="student_count"
            label="人数"
            rules={[
              { required: true, message: '请输入人数' },
              { type: 'number', min: 1, message: '人数必须大于0' }
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="班级学生人数" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
