import { Typography, Space } from 'antd'
const { Title } = Typography

export default function PageHeader({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div style={{ 
      marginBottom: 12, 
      padding: '20px 32px',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      border: '1px solid #f0f0f0'
    }}>
      <Title 
        level={5} 
        className="page-header-title"
        style={{ margin: 0, fontSize: '28px', fontWeight: 700, lineHeight: '1.5' }}
      >
        {title}
      </Title>
      <Space>{extra}</Space>
    </div>
  )
}