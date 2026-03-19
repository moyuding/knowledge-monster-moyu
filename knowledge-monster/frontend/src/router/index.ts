import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'

// 路由组件（懒加载）
const Login = () => import('@/views/Login.vue')
const Register = () => import('@/views/Register.vue')
const StudentDashboard = () => import('@/views/student/Dashboard.vue')
const StudentTraining = () => import('@/views/student/Training.vue')
const StudentProgress = () => import('@/views/student/Progress.vue')
const StudentErrors = () => import('@/views/student/Errors.vue')
const StudentProfile = () => import('@/views/student/Profile.vue')
const TeacherDashboard = () => import('@/views/teacher/Dashboard.vue')
const TeacherClasses = () => import('@/views/teacher/Classes.vue')
const TeacherReports = () => import('@/views/teacher/Reports.vue')
const TeacherAnalytics = () => import('@/views/teacher/Analytics.vue')
const TeacherSettings = () => import('@/views/teacher/Settings.vue')
const NotFound = () => import('@/views/NotFound.vue')

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录 - 知识怪',
      requiresAuth: false,
      transition: 'fade'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      title: '注册 - 知识怪',
      requiresAuth: false,
      transition: 'fade'
    }
  },
  // 学生路由
  {
    path: '/student',
    name: 'Student',
    redirect: '/student/dashboard',
    meta: {
      requiresAuth: true,
      role: 'student'
    },
    children: [
      {
        path: 'dashboard',
        name: 'StudentDashboard',
        component: StudentDashboard,
        meta: {
          title: '学生首页 - 知识怪',
          transition: 'slide-left'
        }
      },
      {
        path: 'training',
        name: 'StudentTraining',
        component: StudentTraining,
        meta: {
          title: '每日训练 - 知识怪',
          transition: 'slide-left'
        }
      },
      {
        path: 'training/:day',
        name: 'StudentTrainingDay',
        component: StudentTraining,
        meta: {
          title: '每日训练 - 知识怪',
          transition: 'slide-left'
        }
      },
      {
        path: 'progress',
        name: 'StudentProgress',
        component: StudentProgress,
        meta: {
          title: '学习进度 - 知识怪',
          transition: 'slide-left'
        }
      },
      {
        path: 'errors',
        name: 'StudentErrors',
        component: StudentErrors,
        meta: {
          title: '错题本 - 知识怪',
          transition: 'slide-left'
        }
      },
      {
        path: 'profile',
        name: 'StudentProfile',
        component: StudentProfile,
        meta: {
          title: '个人中心 - 知识怪',
          transition: 'slide-left'
        }
      }
    ]
  },
  // 教师路由
  {
    path: '/teacher',
    name: 'Teacher',
    redirect: '/teacher/dashboard',
    meta: {
      requiresAuth: true,
      role: 'teacher'
    },
    children: [
      {
        path: 'dashboard',
        name: 'TeacherDashboard',
        component: TeacherDashboard,
        meta: {
          title: '教师仪表板 - 知识怪',
          transition: 'slide-right'
        }
      },
      {
        path: 'classes',
        name: 'TeacherClasses',
        component: TeacherClasses,
        meta: {
          title: '班级管理 - 知识怪',
          transition: 'slide-right'
        }
      },
      {
        path: 'classes/:id',
        name: 'TeacherClassDetail',
        component: TeacherClasses,
        meta: {
          title: '班级详情 - 知识怪',
          transition: 'slide-right'
        }
      },
      {
        path: 'reports',
        name: 'TeacherReports',
        component: TeacherReports,
        meta: {
          title: '报告生成 - 知识怪',
          transition: 'slide-right'
        }
      },
      {
        path: 'analytics',
        name: 'TeacherAnalytics',
        component: TeacherAnalytics,
        meta: {
          title: '数据分析 - 知识怪',
          transition: 'slide-right'
        }
      },
      {
        path: 'settings',
        name: 'TeacherSettings',
        component: TeacherSettings,
        meta: {
          title: '系统设置 - 知识怪',
          transition: 'slide-right'
        }
      }
    ]
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '页面未找到 - 知识怪',
      requiresAuth: false
    }
  }
]

// 创建路由器
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()
  
  // 设置页面标题
  const title = to.meta.title as string || '知识怪 - 奶茶店创业计算训练'
  document.title = title
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // 未登录，重定向到登录页
      notificationStore.addNotification({
        title: '需要登录',
        message: '请先登录以访问此页面',
        type: 'warning'
      })
      return next('/login')
    }
    
    // 检查角色权限
    if (to.meta.role && authStore.user?.role !== to.meta.role) {
      notificationStore.addNotification({
        title: '权限不足',
        message: '您没有权限访问此页面',
        type: 'error'
      })
      
      // 根据用户角色重定向到对应首页
      if (authStore.user?.role === 'student') {
        return next('/student/dashboard')
      } else if (authStore.user?.role === 'teacher') {
        return next('/teacher/dashboard')
      } else {
        return next('/login')
      }
    }
  }
  
  // 如果已登录，访问登录/注册页时重定向到首页
  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    if (authStore.user?.role === 'student') {
      return next('/student/dashboard')
    } else if (authStore.user?.role === 'teacher') {
      return next('/teacher/dashboard')
    }
  }
  
  next()
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 记录页面访问
  if (import.meta.env.DEV) {
    console.log(`📊 页面访问: ${from.path} -> ${to.path}`)
  }
  
  // 发送页面访问统计（生产环境）
  if (import.meta.env.PROD) {
    // 这里可以集成Google Analytics等
  }
})

// 错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  
  const notificationStore = useNotificationStore()
  notificationStore.addNotification({
    title: '页面加载失败',
    message: '页面加载失败，请刷新重试',
    type: 'error'
  })
  
  // 如果是Chunk加载错误，可能是网络问题，尝试重试
  if (/loading chunk/.test(error.message)) {
    window.location.reload()
  }
})

// 路由工具函数
export const routerUtils = {
  // 跳转到登录页
  goToLogin() {
    router.push('/login')
  },
  
  // 跳转到首页（根据角色）
  goToHome() {
    const authStore = useAuthStore()
    if (authStore.user?.role === 'student') {
      router.push('/student/dashboard')
    } else if (authStore.user?.role === 'teacher') {
      router.push('/teacher/dashboard')
    } else {
      router.push('/login')
    }
  },
  
  // 跳转到训练页面
  goToTraining(day?: number) {
    if (day) {
      router.push(`/student/training/${day}`)
    } else {
      router.push('/student/training')
    }
  },
  
  // 返回上一页
  goBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      routerUtils.goToHome()
    }
  },
  
  // 刷新当前页
  refresh() {
    router.go(0)
  },
  
  // 检查当前路由
  isCurrentRoute(routeName: string): boolean {
    return router.currentRoute.value.name === routeName
  },
  
  // 获取当前路由参数
  getRouteParam(param: string): string | null {
    return router.currentRoute.value.params[param] as string || null
  },
  
  // 获取当前查询参数
  getQueryParam(param: string): string | null {
    return router.currentRoute.value.query[param] as string || null
  }
}

export default router