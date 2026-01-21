import { Layout, Menu, Button, message } from 'antd'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { SyncOutlined } from '@ant-design/icons'
import { triggerScreenRefresh } from './api/admin'
import { useState } from 'react'

const { Header, Content } = Layout

export default function App() {
  const { pathname } = useLocation()
  const selected = pathname === '/' ? ['/'] : [pathname]
  
  const handleRefreshScreen = async () => {
    try {
      await triggerScreenRefresh()
      message.success('已广播刷新，大屏将很快更新数据')
    } catch (error) {
      message.error('刷新失败：' + (error as Error).message)
    }
  }
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: 'transparent', display:'flex', alignItems:'center', gap: 16 }}>
        <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '18px' }}>控制台</div>
        <Menu
          mode="horizontal"
          selectedKeys={selected}
          items={[
            { key: '/', label: <Link to="/">课表管理</Link> },
            { key: '/projects', label: <Link to="/projects">训练营项目</Link> },
            { key: '/classes', label: <Link to="/classes">班级管理</Link> },
            { key: '/global', label: <Link to="/global">全局设置</Link> },
            { key: '/visualization', label: <Link to="/visualization">可视化控制</Link> },
            { key: '/guide', label: <Link to="/guide">用户指南</Link> },
          ]}
          style={{ flex: 1, background: 'transparent' }}
        />
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={handleRefreshScreen}
          size="small"
        >
          刷新大屏
        </Button>
      </Header>
      <Content style={{ padding: pathname === '/guide' ? 0 : 16 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}