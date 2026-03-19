import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'animate.css'

import App from './App.vue'
import router from './router'
import './styles/main.scss'

// 创建应用实例
const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 全局配置
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue错误:', err, info)
  // 这里可以集成错误上报服务
}

app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue警告:', msg, trace)
}

// 全局属性
app.config.globalProperties.$filters = {
  formatCurrency(value: number): string {
    return `¥${value.toLocaleString('zh-CN')}`
  },
  formatDate(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  },
  formatTime(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  },
  formatPercentage(value: number): string {
    return `${Math.round(value)}%`
  },
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }
}

// 全局组件
// 这里可以注册全局组件
// app.component('LoadingSpinner', LoadingSpinner)

// 挂载应用
app.mount('#app')

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('🚀 知识怪前端启动成功！')
  console.log('📡 环境:', import.meta.env.MODE)
  console.log('⏰ 时间:', new Date().toISOString())
  
  // 打印路由配置
  console.log('🗺️ 路由:', router.getRoutes())
}