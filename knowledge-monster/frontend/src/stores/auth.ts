import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api'
import { routerUtils } from '@/router'
import { useNotificationStore } from './notification'

interface User {
  id: string
  email: string
  fullName: string
  role: 'student' | 'teacher'
  avatarUrl?: string
  classId?: string
  settings: Record<string, any>
  gameData?: {
    shopName: string
    funds: number
    shopLevel: number
    experience: number
    dailyStreak: number
  }
}

interface LoginCredentials {
  email: string
  password: string
  role: 'student' | 'teacher'
}

interface RegisterData extends LoginCredentials {
  fullName: string
  classCode?: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isStudent = computed(() => user.value?.role === 'student')
  const isTeacher = computed(() => user.value?.role === 'teacher')
  const userRole = computed(() => user.value?.role)
  const userId = computed(() => user.value?.id)
  const userName = computed(() => user.value?.fullName || user.value?.email)
  const userAvatar = computed(() => user.value?.avatarUrl)
  const userClassId = computed(() => user.value?.classId)
  const gameData = computed(() => user.value?.gameData)

  // 方法
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const clearToken = () => {
    token.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  const setUser = (userData: User) => {
    user.value = userData
  }

  const clearUser = () => {
    user.value = null
  }

  // 登录
  const login = async (credentials: LoginCredentials) => {
    const notificationStore = useNotificationStore()
    
    try {
      isLoading.value = true
      
      const response = await api.post('/auth/login', credentials)
      
      if (response.data.success) {
        const { token: newToken, user: userData } = response.data
        
        setToken(newToken)
        setUser(userData)
        
        notificationStore.addNotification({
          title: '登录成功',
          message: `欢迎回来，${userData.fullName || userData.email}`,
          type: 'success'
        })
        
        // 根据角色跳转到对应首页
        if (userData.role === 'student') {
          routerUtils.goToTraining()
        } else {
          routerUtils.goToHome()
        }
        
        return { success: true, user: userData }
      } else {
        throw new Error(response.data.message || '登录失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '登录失败'
      
      notificationStore.addNotification({
        title: '登录失败',
        message: errorMessage,
        type: 'error'
      })
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const register = async (data: RegisterData) => {
    const notificationStore = useNotificationStore()
    
    try {
      isLoading.value = true
      
      const response = await api.post('/auth/register', data)
      
      if (response.data.success) {
        const { token: newToken, user: userData } = response.data
        
        setToken(newToken)
        setUser(userData)
        
        notificationStore.addNotification({
          title: '注册成功',
          message: `欢迎加入知识怪，${userData.fullName}`,
          type: 'success'
        })
        
        // 根据角色跳转到对应首页
        if (userData.role === 'student') {
          routerUtils.goToTraining()
        } else {
          routerUtils.goToHome()
        }
        
        return { success: true, user: userData }
      } else {
        throw new Error(response.data.message || '注册失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '注册失败'
      
      notificationStore.addNotification({
        title: '注册失败',
        message: errorMessage,
        type: 'error'
      })
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      isRefreshing.value = true
      
      const response = await api.get('/auth/profile')
      
      if (response.data.success) {
        setUser(response.data.user)
        return { success: true, user: response.data.user }
      } else {
        throw new Error('获取用户信息失败')
      }
    } catch (error: any) {
      // 如果token无效，清除本地存储
      if (error.response?.status === 401) {
        logout()
      }
      return { success: false, error: error.message }
    } finally {
      isRefreshing.value = false
    }
  }

  // 更新用户信息
  const updateProfile = async (data: Partial<User>) => {
    const notificationStore = useNotificationStore()
    
    try {
      isLoading.value = true
      
      const response = await api.put('/auth/profile', data)
      
      if (response.data.success) {
        setUser(response.data.user)
        
        notificationStore.addNotification({
          title: '更新成功',
          message: '个人信息已更新',
          type: 'success'
        })
        
        return { success: true, user: response.data.user }
      } else {
        throw new Error(response.data.message || '更新失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '更新失败'
      
      notificationStore.addNotification({
        title: '更新失败',
        message: errorMessage,
        type: 'error'
      })
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 更新头像
  const updateAvatar = async (avatarFile: File) => {
    const notificationStore = useNotificationStore()
    
    try {
      isLoading.value = true
      
      const formData = new FormData()
      formData.append('avatar', avatarFile)
      
      const response = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.success) {
        setUser(response.data.user)
        
        notificationStore.addNotification({
          title: '头像更新成功',
          message: '头像已更新',
          type: 'success'
        })
        
        return { success: true, user: response.data.user }
      } else {
        throw new Error(response.data.message || '头像更新失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '头像更新失败'
      
      notificationStore.addNotification({
        title: '头像更新失败',
        message: errorMessage,
        type: 'error'
      })
      
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = () => {
    const notificationStore = useNotificationStore()
    
    clearToken()
    clearUser()
    
    notificationStore.addNotification({
      title: '已登出',
      message: '您已成功登出',
      type: 'info'
    })
    
    routerUtils.goToLogin()
  }

  // 刷新token
  const refreshToken = async () => {
    try {
      isRefreshing.value = true
      
      const response = await api.post('/auth/refresh')
      
      if (response.data.success) {
        setToken(response.data.token)
        return { success: true, token: response.data.token }
      } else {
        throw new Error('刷新令牌失败')
      }
    } catch (error: any) {
      // 刷新失败，需要重新登录
      if (error.response?.status === 401) {
        logout()
      }
      return { success: false, error: error.message }
    } finally {
      isRefreshing.value = false
    }
  }

  // 初始化
  const initialize = async () => {
    if (token.value && !user.value) {
      await fetchUserInfo()
    }
  }

  // 更新游戏数据
  const updateGameData = (data: Partial<User['gameData']>) => {
    if (user.value?.gameData) {
      user.value.gameData = { ...user.value.gameData, ...data }
    }
  }

  // 导出
  return {
    // 状态
    token,
    user,
    isLoading,
    isRefreshing,
    
    // 计算属性
    isAuthenticated,
    isStudent,
    isTeacher,
    userRole,
    userId,
    userName,
    userAvatar,
    userClassId,
    gameData,
    
    // 方法
    setToken,
    clearToken,
    setUser,
    clearUser,
    login,
    register,
    fetchUserInfo,
    updateProfile,
    updateAvatar,
    logout,
    refreshToken,
    initialize,
    updateGameData
  }
})