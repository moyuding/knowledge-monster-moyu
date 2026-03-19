<template>
  <div id="app">
    <!-- 全局加载状态 -->
    <div v-if="globalLoading" class="global-loading">
      <div class="loading-content">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <p class="loading-text">加载中...</p>
      </div>
    </div>

    <!-- 全局错误提示 -->
    <el-alert
      v-if="globalError"
      :title="globalError.title"
      :type="globalError.type"
      :description="globalError.message"
      show-icon
      closable
      @close="clearGlobalError"
      class="global-error"
    />

    <!-- 全局通知 -->
    <div class="global-notifications">
      <el-notification
        v-for="notification in notifications"
        :key="notification.id"
        :title="notification.title"
        :message="notification.message"
        :type="notification.type"
        :duration="notification.duration || 3000"
        @close="removeNotification(notification.id)"
      />
    </div>

    <!-- 主路由视图 -->
    <router-view v-slot="{ Component, route }">
      <transition
        :name="route.meta.transition || 'fade'"
        mode="out-in"
        @before-enter="onPageTransitionStart"
        @after-enter="onPageTransitionEnd"
      >
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>

    <!-- 全局底部导航（移动端） -->
    <nav v-if="showBottomNav" class="bottom-nav">
      <router-link
        v-for="item in bottomNavItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <div class="nav-icon">{{ item.icon }}</div>
        <div class="nav-label">{{ item.label }}</div>
      </router-link>
    </nav>

    <!-- 全局悬浮按钮 -->
    <div v-if="showFloatingButton" class="floating-button" @click="onFloatingButtonClick">
      <span class="floating-icon">+</span>
    </div>

    <!-- 全局水印 -->
    <div v-if="showWatermark" class="watermark">
      知识怪 · 奶茶店创业计算训练
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { ElNotification } from 'element-plus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// 全局状态
const globalLoading = ref(false)
const globalError = ref<{
  title: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
} | null>(null)

// 计算属性
const showBottomNav = computed(() => {
  const hideRoutes = ['/login', '/register', '/teacher']
  return !hideRoutes.some(path => route.path.startsWith(path)) && authStore.isAuthenticated
})

const showFloatingButton = computed(() => {
  return route.path.startsWith('/student') && authStore.isAuthenticated
})

const showWatermark = computed(() => {
  return authStore.isAuthenticated && authStore.user?.role === 'student'
})

const bottomNavItems = computed(() => {
  const baseItems = [
    { path: '/student/dashboard', icon: '🏠', label: '首页' },
    { path: '/student/training', icon: '📝', label: '训练' },
    { path: '/student/progress', icon: '📊', label: '进度' },
    { path: '/student/errors', icon: '📚', label: '错题' },
    { path: '/student/profile', icon: '👤', label: '我的' }
  ]
  
  // 如果是教师，显示不同的导航
  if (authStore.user?.role === 'teacher') {
    return [
      { path: '/teacher/dashboard', icon: '📊', label: '仪表板' },
      { path: '/teacher/classes', icon: '👨‍🎓', label: '班级' },
      { path: '/teacher/reports', icon: '📄', label: '报告' },
      { path: '/teacher/analytics', icon: '📈', label: '分析' },
      { path: '/teacher/settings', icon: '⚙️', label: '设置' }
    ]
  }
  
  return baseItems
})

const notifications = computed(() => notificationStore.notifications)

// 方法
const clearGlobalError = () => {
  globalError.value = null
}

const removeNotification = (id: string) => {
  notificationStore.removeNotification(id)
}

const onPageTransitionStart = () => {
  // 页面切换开始时的处理
  globalLoading.value = true
}

const onPageTransitionEnd = () => {
  // 页面切换结束时的处理
  globalLoading.value = false
}

const onFloatingButtonClick = () => {
  if (route.path === '/student/training') {
    // 如果是训练页面，滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    // 否则跳转到训练页面
    router.push('/student/training')
  }
}

// 全局错误处理
const handleGlobalError = (error: any) => {
  console.error('全局错误:', error)
  
  let errorTitle = '系统错误'
  let errorMessage = '发生未知错误，请稍后重试'
  let errorType: 'error' | 'warning' | 'info' | 'success' = 'error'
  
  if (error.response) {
    // HTTP错误
    const { status, data } = error.response
    switch (status) {
      case 401:
        errorTitle = '认证失败'
        errorMessage = '请重新登录'
        errorType = 'warning'
        // 跳转到登录页
        router.push('/login')
        break
      case 403:
        errorTitle = '权限不足'
        errorMessage = '您没有权限访问此页面'
        errorType = 'warning'
        break
      case 404:
        errorTitle = '资源不存在'
        errorMessage = '请求的资源不存在'
        errorType = 'warning'
        break
      case 500:
        errorTitle = '服务器错误'
        errorMessage = '服务器内部错误，请稍后重试'
        break
      default:
        errorMessage = data?.message || `服务器错误 (${status})`
    }
  } else if (error.request) {
    // 网络错误
    errorTitle = '网络错误'
    errorMessage = '网络连接失败，请检查网络设置'
  } else if (error.message) {
    // 其他错误
    errorMessage = error.message
  }
  
  globalError.value = {
    title: errorTitle,
    message: errorMessage,
    type: errorType
  }
  
  // 同时显示通知
  notificationStore.addNotification({
    title: errorTitle,
    message: errorMessage,
    type: errorType
  })
}

// 全局成功提示
const showSuccess = (title: string, message: string) => {
  notificationStore.addNotification({
    title,
    message,
    type: 'success'
  })
}

// 全局警告提示
const showWarning = (title: string, message: string) => {
  notificationStore.addNotification({
    title,
    message,
    type: 'warning'
  })
}

// 全局信息提示
const showInfo = (title: string, message: string) => {
  notificationStore.addNotification({
    title,
    message,
    type: 'info'
  })
}

// 生命周期
onMounted(() => {
  // 设置全局错误处理器
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason)
  })
  
  // 检查认证状态
  if (!authStore.isAuthenticated) {
    const token = localStorage.getItem('token')
    if (token) {
      authStore.setToken(token)
      // 尝试获取用户信息
      authStore.fetchUserInfo().catch(() => {
        localStorage.removeItem('token')
        router.push('/login')
      })
    }
  }
  
  // 监听网络状态
  window.addEventListener('online', () => {
    showInfo('网络恢复', '网络连接已恢复')
  })
  
  window.addEventListener('offline', () => {
    showWarning('网络断开', '网络连接已断开，部分功能可能不可用')
  })
  
  // 初始通知
  if (import.meta.env.DEV) {
    showInfo('开发模式', '当前运行在开发环境')
  }
})

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('unhandledrejection', handleGlobalError)
  window.removeEventListener('online', () => {})
  window.removeEventListener('offline', () => {})
})

// 暴露方法给全局使用
const appInstance = {
  showSuccess,
  showWarning,
  showInfo,
  handleGlobalError
}

// 全局挂载（用于调试）
if (import.meta.env.DEV) {
  ;(window as any).$app = appInstance
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, $background-secondary 0%, $background-color 100%);
  position: relative;
}

// 全局加载样式
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-index-modal;
  backdrop-filter: blur(4px);
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  margin-bottom: $spacing-4;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid $border-color;
  border-top-color: $primary-color;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: $text-secondary;
  font-size: $font-size-base;
}

// 全局错误样式
.global-error {
  position: fixed;
  top: $spacing-4;
  left: 50%;
  transform: translateX(-50%);
  max-width: 600px;
  width: 90%;
  z-index: $z-index-tooltip;
  box-shadow: $shadow-lg;
}

// 全局通知容器
.global-notifications {
  position: fixed;
  top: $spacing-4;
  right: $spacing-4;
  z-index: $z-index-tooltip;
  max-width: 400px;
}

// 底部导航
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $background-color;
  border-top: 1px solid $border-color;
  display: flex;
  justify-content: space-around;
  padding: $spacing-2 $spacing-4;
  z-index: $z-index-fixed;
  box-shadow: $shadow-md;
  
  @media (min-width: $breakpoint-md) {
    display: none;
  }
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: $text-secondary;
  padding: $spacing-2;
  border-radius: $border-radius-base;
  transition: all $transition-fast;
  
  &:hover {
    background: $background-secondary;
  }
  
  &.active {
    color: $primary-color;
    background: rgba($primary-color, 0.1);
  }
}

.nav-icon {
  font-size: $font-size-xl;
  margin-bottom: $spacing-1;
}

.nav-label {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

// 悬浮按钮
.floating-button {
  position: fixed;
  bottom: $spacing-12;
  right: $spacing-4;
  width: 56px;
  height: 56px;
  background: $primary-color;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: $shadow-lg;
  z-index: $z-index-fixed;
  transition: all $transition-base;
  
  &:hover {
    background: $primary-dark;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (min-width: $breakpoint-md) {
    bottom: $spacing-8;
    right: $spacing-8;
  }
}

.floating-icon {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
}

// 水印
.watermark {
  position: fixed;
  bottom: $spacing-4;
  left: 50%;
  transform: translateX(-50%);
  color: rgba($text-secondary, 0.3);
  font-size: $font-size-xs;
  z-index: $z-index-dropdown;
  pointer-events: none;
  
  @media (max-width: $breakpoint-sm) {
    display: none;
  }
}

// 页面过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-base;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all $transition-base;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

// 响应式调整
@media (max-width: $breakpoint-sm) {
  .global-error {
    top: $spacing-2;
    width: 95%;
  }
  
  .global-notifications {
    top: $spacing-2;
    right: $spacing-2;
    max-width: 100%;
  }
}
</style>