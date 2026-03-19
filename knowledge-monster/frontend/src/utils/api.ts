import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { routerUtils } from '@/router'

// API配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const API_TIMEOUT = 30000 // 30秒超时

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const authStore = useAuthStore()
    
    // 添加认证token
    if (authStore.token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    
    // 添加请求ID（用于追踪）
    config.headers['X-Request-ID'] = generateRequestId()
    
    // 记录请求日志（开发环境）
    if (import.meta.env.DEV) {
      console.log(`📤 请求: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      })
    }
    
    return config
  },
  (error: AxiosError) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 记录响应日志（开发环境）
    if (import.meta.env.DEV) {
      console.log(`📥 响应: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      })
    }
    
    return response
  },
  async (error: AxiosError) => {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()
    
    // 记录错误日志
    console.error('API错误:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    // 处理401错误（未授权）
    if (error.response?.status === 401) {
      // 尝试刷新token
      if (!error.config?.url?.includes('/auth/refresh')) {
        try {
          const refreshResult = await authStore.refreshToken()
          if (refreshResult.success) {
            // 重试原始请求
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${authStore.token}`
              return api.request(error.config)
            }
          }
        } catch (refreshError) {
          // 刷新失败，需要重新登录
          authStore.logout()
          notificationStore.addNotification({
            title: '会话过期',
            message: '请重新登录',
            type: 'warning'
          })
        }
      } else {
        // 刷新token也失败，需要重新登录
        authStore.logout()
        notificationStore.addNotification({
          title: '会话过期',
          message: '请重新登录',
          type: 'warning'
        })
      }
    }
    
    // 处理403错误（禁止访问）
    if (error.response?.status === 403) {
      notificationStore.addNotification({
        title: '权限不足',
        message: '您没有权限执行此操作',
        type: 'error'
      })
    }
    
    // 处理404错误（资源不存在）
    if (error.response?.status === 404) {
      notificationStore.addNotification({
        title: '资源不存在',
        message: '请求的资源不存在',
        type: 'warning'
      })
    }
    
    // 处理500错误（服务器错误）
    if (error.response?.status === 500) {
      notificationStore.addNotification({
        title: '服务器错误',
        message: '服务器内部错误，请稍后重试',
        type: 'error'
      })
    }
    
    // 处理网络错误
    if (!error.response) {
      notificationStore.addNotification({
        title: '网络错误',
        message: '网络连接失败，请检查网络设置',
        type: 'error'
      })
    }
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      notificationStore.addNotification({
        title: '请求超时',
        message: '请求超时，请检查网络连接或稍后重试',
        type: 'warning'
      })
    }
    
    return Promise.reject(error)
  }
)

// 生成请求ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// API工具函数
export const apiUtils = {
  // 通用GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get<T>(url, config)
    return response.data
  },
  
  // 通用POST请求
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post<T>(url, data, config)
    return response.data
  },
  
  // 通用PUT请求
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put<T>(url, data, config)
    return response.data
  },
  
  // 通用DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete<T>(url, config)
    return response.data
  },
  
  // 通用PATCH请求
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.patch<T>(url, data, config)
    return response.data
  },
  
  // 文件上传
  async uploadFile<T>(url: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData()
    formData.append(fieldName, file)
    
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    return response.data
  },
  
  // 批量请求
  async batch<T>(requests: Array<() => Promise<T>>, maxConcurrent = 5): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent)
      const batchResults = await Promise.all(batch.map(req => req()))
      results.push(...batchResults)
      
      // 避免速率限制
      if (i + maxConcurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  },
  
  // 重试请求
  async retry<T>(
    request: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: any
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await request()
      } catch (error: any) {
        lastError = error
        
        // 如果是4xx错误（客户端错误），不重试
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break
        }
        
        // 等待一段时间后重试
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
      }
    }
    
    throw lastError
  },
  
  // 取消请求
  createCancelToken() {
    return axios.CancelToken.source()
  },
  
  // 检查网络状态
  async checkNetwork(): Promise<boolean> {
    try {
      await axios.get('https://www.google.com/generate_204', { timeout: 3000 })
      return true
    } catch {
      return false
    }
  },
  
  // 获取API状态
  async getApiStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    timestamp: string
  }> {
    const startTime = Date.now()
    
    try {
      const response = await api.get('/health')
      const responseTime = Date.now() - startTime
      
      return {
        status: response.data.status === 'healthy' ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date().toISOString()
      }
    } catch {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// 导出
export { api }
export default api