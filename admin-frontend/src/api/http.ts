// 功能：创建 Axios 实例并根据环境选择 API_BASE。
import axios, { AxiosResponse } from 'axios'

// 优先级：Electron 注入 > VITE_API_BASE > 默认开发/生产地址。
const injected = (globalThis as any)?.electron?.API_BASE
const isProduction = import.meta.env.PROD
export const API_BASE = injected ?? (import.meta.env.VITE_API_BASE ?? (isProduction ? '/api' : 'http://localhost:3000/api'))

export const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15000,
})

http.interceptors.response.use(
  (resp: AxiosResponse) => resp,
  (err: any) => Promise.reject(err)
)
