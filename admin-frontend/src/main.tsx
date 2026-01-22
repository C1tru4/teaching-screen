// 功能：管理端应用入口与全局配置。
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { router } from './router'
import 'antd/dist/reset.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorBgBase: '#ffffff', colorText: '#000000', colorBorder: 'rgba(0,0,0,0.2)', colorPrimary: '#1677ff' } }}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
)