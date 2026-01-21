import axios, { AxiosResponse } from 'axios'

// Web部署方案：根据环境自动选择API地址
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
