<template>
  <div class="training-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📝</span>
          每日计算训练
        </h1>
        <p class="page-subtitle">奶茶店创业模拟 · 第{{ currentDay }}天</p>
      </div>
      
      <div class="header-actions">
        <el-button type="primary" @click="showTodayTraining" :loading="isLoading">
          <el-icon><Refresh /></el-icon>
          刷新今日训练
        </el-button>
        
        <el-button @click="showProgress">
          <el-icon><DataLine /></el-icon>
          查看进度
        </el-button>
      </div>
    </div>

    <!-- 游戏化信息卡片 -->
    <div class="game-info-cards">
      <el-card class="game-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon">💰</div>
          <div class="card-info">
            <div class="card-label">创业资金</div>
            <div class="card-value">¥{{ gameData?.funds.toLocaleString() || 1000 }}</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="game-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon">🏪</div>
          <div class="card-info">
            <div class="card-label">店铺等级</div>
            <div class="card-value">Lv.{{ gameData?.shopLevel || 1 }}</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="game-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon">🔥</div>
          <div class="card-info">
            <div class="card-label">连续打卡</div>
            <div class="card-value">{{ gameData?.dailyStreak || 0 }}天</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="game-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon">📊</div>
          <div class="card-info">
            <div class="card-label">正确率</div>
            <div class="card-value">{{ overallAccuracy }}%</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 训练内容区域 -->
    <div class="training-content">
      <!-- 左侧：题目列表 -->
      <div class="questions-section">
        <el-card class="questions-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><List /></el-icon>
                今日题目列表
              </h3>
              <div class="card-subtitle">
                共{{ questions.length }}题 · 预计{{ estimatedTime }}分钟
              </div>
            </div>
          </template>
          
          <div class="questions-list">
            <div
              v-for="(question, index) in questions"
              :key="question.id"
              class="question-item"
              :class="{
                'current': currentQuestionIndex === index,
                'answered': userAnswers[index] !== undefined,
                'correct': questionResults[index]?.isCorrect
              }"
              @click="selectQuestion(index)"
            >
              <div class="question-number">
                <span class="number">{{ index + 1 }}</span>
                <span class="status-icon" v-if="userAnswers[index] !== undefined">
                  {{ questionResults[index]?.isCorrect ? '✓' : '✗' }}
                </span>
              </div>
              <div class="question-info">
                <div class="question-text" v-html="formatQuestionText(question.text)"></div>
                <div class="question-meta">
                  <span class="difficulty" :class="question.difficulty">
                    {{ getDifficultyText(question.difficulty) }}
                  </span>
                  <span class="points">+{{ question.points }}资金</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：答题区域 -->
      <div class="answer-section">
        <el-card class="answer-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Edit /></el-icon>
                答题
                <span class="question-position">第{{ currentQuestionIndex + 1 }}题</span>
              </h3>
              <div class="card-subtitle">
                {{ currentQuestion.knowledgePoint }}
              </div>
            </div>
          </template>
          
          <div class="question-content">
            <div class="question-text" v-html="formatQuestionText(currentQuestion.text)"></div>
            
            <div class="question-options" v-if="currentQuestion.type === 'choice'">
              <el-radio-group v-model="userAnswers[currentQuestionIndex]">
                <el-radio
                  v-for="(option, optionIndex) in currentQuestion.options"
                  :key="optionIndex"
                  :label="option"
                  class="option-item"
                >
                  <span class="option-label">{{ String.fromCharCode(65 + optionIndex) }}.</span>
                  <span class="option-text" v-html="option"></span>
                </el-radio>
              </el-radio-group>
            </div>
            
            <div class="question-input" v-else-if="currentQuestion.type === 'fill'">
              <el-input
                v-model="userAnswers[currentQuestionIndex]"
                type="text"
                placeholder="请输入答案"
                :maxlength="50"
                @keyup.enter="submitAnswer"
              />
              <div class="input-hint">
                提示：{{ currentQuestion.hint || '请仔细计算' }}
              </div>
            </div>
            
            <div class="question-calc" v-else-if="currentQuestion.type === 'calculation'">
              <div class="calc-steps">
                <div class="calc-step" v-for="(step, stepIndex) in calculationSteps" :key="stepIndex">
                  <el-input
                    v-model="step.value"
                    :placeholder="`步骤${stepIndex + 1}`"
                    @keyup.enter="addCalculationStep"
                  />
                  <el-button
                    v-if="stepIndex > 0"
                    type="danger"
                    text
                    @click="removeCalculationStep(stepIndex)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <el-button @click="addCalculationStep" type="text">
                <el-icon><Plus /></el-icon>
                添加计算步骤
              </el-button>
            </div>
          </div>
          
          <div class="answer-actions">
            <el-button
              type="primary"
              :loading="isSubmitting"
              @click="submitAnswer"
              :disabled="!canSubmitAnswer"
            >
              <el-icon><Check /></el-icon>
              提交答案
            </el-button>
            
            <el-button @click="showHint" :disabled="hintUsed">
              <el-icon><Lightbulb /></el-icon>
              {{ hintUsed ? '提示已使用' : '获取提示' }}
            </el-button>
            
            <el-button @click="skipQuestion" v-if="canSkip">
              跳过此题
            </el-button>
          </div>
        </el-card>

        <!-- 答题结果 -->
        <el-card
          v-if="currentQuestionResult"
          class="result-card"
          :class="currentQuestionResult.isCorrect ? 'correct' : 'incorrect'"
          shadow="never"
        >
          <template #header>
            <div class="result-header">
              <div class="result-title">
                <el-icon :color="currentQuestionResult.isCorrect ? 'green' : 'red'">
                  {{ currentQuestionResult.isCorrect ? <Check /> : <Close /> }}
                </el-icon>
                {{ currentQuestionResult.isCorrect ? '回答正确！' : '回答错误' }}
              </div>
              <div class="result-points">
                {{ currentQuestionResult.isCorrect ? '+' : '-' }}{{ currentQuestion.points }}资金
              </div>
            </div>
          </template>
          
          <div class="result-content">
            <div v-if="!currentQuestionResult.isCorrect" class="correct-answer">
              <div class="correct-label">正确答案：</div>
              <div class="correct-value">{{ currentQuestion.correctAnswer }}</div>
            </div>
            
            <div class="ai-feedback" v-if="currentQuestionResult.aiFeedback">
              <div class="feedback-label">AI分析：</div>
              <div class="feedback-content">{{ currentQuestionResult.aiFeedback }}</div>
            </div>
            
            <div class="suggestion" v-if="currentQuestionResult.suggestion">
              <div class="suggestion-label">学习建议：</div>
              <div class="suggestion-content">{{ currentQuestionResult.suggestion }}</div>
            </div>
          </div>
        </el-card>

        <!-- 导航按钮 -->
        <div class="navigation-buttons">
          <el-button
            @click="prevQuestion"
            :disabled="currentQuestionIndex === 0"
          >
            <el-icon><ArrowLeft /></el-icon>
            上一题
          </el-button>
          
          <el-button
            type="primary"
            @click="nextQuestion"
            :disabled="currentQuestionIndex === questions.length - 1"
          >
            下一题
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          
          <el-button
            type="success"
            @click="submitAllAnswers"
            :loading="isSubmittingAll"
            :disabled="!canSubmitAll"
          >
            <el-icon><Paperclip /></el-icon>
            提交全部答案
          </el-button>
        </div>
      </div>
    </div>

    <!-- 训练完成弹窗 -->
    <el-dialog
      v-model="showCompletionDialog"
      title="🎉 今日训练完成！"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="completion-dialog">
        <div class="completion-stats">
          <div class="stat-item">
            <div class="stat-value">{{ correctCount }}</div>
            <div class="stat-label">正确题数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ accuracy }}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">+{{ earnedFunds }}</div>
            <div class="stat-label">获得资金</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ timeSpent }}分钟</div>
            <div class="stat-label">用时</div>
          </div>
        </div>
        
        <div class="completion-rewards">
          <h4>🎁 获得奖励</h4>
          <ul class="rewards-list">
            <li v-for="reward in rewards" :key="reward.id">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-text">{{ reward.text }}</span>
            </li>
          </ul>
        </div>
        
        <div class="completion-actions">
          <el-button type="primary" @click="goToProgress">
            查看详细报告
          </el-button>
          <el-button @click="goToNextDay">
            明天继续
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { api } from '@/utils/api'
import {
  Refresh,
  DataLine,
  List,
  Edit,
  Delete,
  Plus,
  Check,
  Close,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Paperclip
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// 状态
const isLoading = ref(false)
const isSubmitting = ref(false)
const isSubmittingAll = ref(false)
const currentDay = ref(1)
const currentQuestionIndex = ref(0)
const userAnswers = ref<(string | number)[]>([])
const questionResults = ref<Array<{
  isCorrect: boolean
  aiFeedback?: string
  suggestion?: string
}>>([])
const calculationSteps = ref<Array<{ value: string }>>([{ value: '' }])
const hintUsed = ref(false)
const showCompletionDialog = ref(false)
const timeSpent = ref(0)

// 数据
const questions = ref<any[]>([])
const gameData = computed(() => authStore.gameData)

// 计算属性
const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value] || {}
})

const currentQuestionResult = computed(() => {
  return questionResults.value[currentQuestionIndex.value]
})

const canSubmitAnswer = computed(() => {
  const answer = userAnswers.value[currentQuestionIndex.value]
  return answer !== undefined && answer !== ''
})

const canSubmitAll = computed(() => {
  return userAnswers.value.length === questions.value.length &&
    userAnswers.value.every(answer => answer !== undefined && answer !== '')
})

const correctCount = computed(() => {
  return questionResults.value.filter(result => result?.isCorrect).length
})

const accuracy = computed(() => {
  if (questionResults.value.length === 0) return 0
  return Math.round((correctCount.value / questionResults.value.length) * 100)
})

const overallAccuracy = computed(() => {
  // 这里应该从API获取历史正确率
  return 85 // 临时值
})

const estimatedTime = computed(() => {
  return Math.ceil(questions.value.length * 2.5)
})

const earnedFunds = computed(() => {
  return correctCount.value * 100 // 每正确一题获得100资金
})

const canSkip = computed(() => {
  return currentQuestion.value.difficulty === 'hard' && !hintUsed.value
})

const rewards = computed(() => {
  const baseRewards = [
    { id: 1, icon: '💰', text: `+${earnedFunds.value}创业资金` },
    { id: 2, icon: '🔥', text: '连续打卡+1天' }
  ]
  
  if (accuracy.value === 100) {
    baseRewards.push({ id: 3, icon: '🏆', text: '完美主义成就' })
  }
  
  if (timeSpent.value < estimatedTime.value / 2) {
    baseRewards.push({ id: 4, icon: '⚡', text: '闪电侠成就' })
  }
  
  return baseRewards
})

// 方法
const formatQuestionText = (text: string) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const getDifficultyText = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return map[difficulty] || difficulty
}

const selectQuestion = (index: number) => {
  currentQuestionIndex.value = index
}

const submitAnswer = async () => {
  if (!canSubmitAnswer.value) {
    notificationStore.addNotification({
      title: '提示',
      message: '请先输入答案',
      type: 'warning'
    })
    return
  }

  try {
    isSubmitting.value = true
    
    const answer = userAnswers.value[currentQuestionIndex.value]
    const question = currentQuestion.value
    
    // 调用API提交答案
    const response = await api.post('/ai/grade', {
      questionId: question.id,
      studentAnswer: answer,
      questionType: question.type,
      correctAnswer: question.correctAnswer
    })
    
    const result = response.data
    
    // 更新结果
    questionResults.value[currentQuestionIndex.value] = {
      isCorrect: result.isCorrect,
      aiFeedback: result.feedback,
      suggestion: result.suggestion
    }
    
    // 更新游戏数据
    if (result.isCorrect) {
      authStore.updateGameData({
        funds: (gameData.value?.funds || 0) + question.points
      })
    }
    
    // 自动跳转到下一题
    if (currentQuestionIndex.value < questions.value.length - 1) {
      setTimeout(() => {
        nextQuestion()
      }, 1500)
    }
    
  } catch (error) {
    console.error('提交答案失败:', error)
    notificationStore.addNotification({
      title: '提交失败',
      message: '网络错误，请稍后重试',
      type: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

const submitAllAnswers = async () => {
  if (!canSubmitAll.value) {
    notificationStore.addNotification({
      title: '提示',
      message: '请先完成所有题目',
      type: 'warning'
    })
    return
  }

  try {
    isSubmittingAll.value = true
    
    // 调用API提交所有答案
    const response = await api.post('/training/submit', {
      day: currentDay.value,
      answers: userAnswers.value,
      timeSpent: timeSpent.value
    })
    
    const result = response.data
    
    // 更新游戏数据
    authStore.updateGameData({
      funds: (gameData.value?.funds || 0) + result.totalFunds,
      dailyStreak: (gameData.value?.dailyStreak || 0) + 1
    })
    
    // 显示完成弹窗
    showCompletionDialog.value = true
    
    // 记录训练完成
    notificationStore.addNotification({
      title: '训练完成',
      message: `今日训练完成！正确率：${result.accuracy}%`,
      type: 'success'
    })
    
  } catch (error) {
    console.error('提交训练失败:', error)
    notificationStore.addNotification({
      title: '提交失败',
      message: '网络错误，请稍后重试',
      type: 'error'
    })
  } finally {
    isSubmittingAll.value = false
  }
}

const showHint = () => {
  if (hintUsed.value) return
  
  hintUsed.value = true
  notificationStore.addNotification({
    title: '提示',
    message: currentQuestion.value.hint || '请仔细阅读题目条件',
    type: 'info'
  })
}

const skipQuestion = () => {
  if (!canSkip.value) return
  
  userAnswers.value[currentQuestionIndex.value] = '跳过'
  questionResults.value[currentQuestionIndex.value] = {
    isCorrect: false,
    aiFeedback: '此题已跳过'
  }
  
  nextQuestion()
}

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.length - 1) {
    currentQuestionIndex.value++
  }
}

const addCalculationStep = () => {
  calculationSteps.value.push({ value: '' })
}

const removeCalculationStep = (index: number) => {
  calculationSteps.value.splice(index, 1)
}

const showTodayTraining = async () => {
  try {
    isLoading.value = true
    
    // 调用API获取今日训练
    const response = await api.get(`/training/today`)
    const data = response.data
    
    questions.value = data.questions
    currentDay.value = data.day
    currentQuestionIndex.value = 0
    userAnswers.value = []
    questionResults.value = []
    hintUsed.value = false
    timeSpent.value = 0
    
    // 重置计时器
    startTimer()
    
    notificationStore.addNotification({
      title: '加载成功',
      message: `已加载第${data.day}天训练内容`,
      type: 'success'
    })
    
  } catch (error) {
    console.error('加载训练失败:', error)
    notificationStore.addNotification({
      title: '加载失败',
      message: '无法加载训练内容，请稍后重试',
      type: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

const showProgress = () => {
  router.push('/student/progress')
}

const goToProgress = () => {
  showCompletionDialog.value = false
  router.push('/student/progress')
}

const goToNextDay = () => {
  showCompletionDialog.value = false
  currentDay.value++
  showTodayTraining()
}

// 计时器相关
let timerInterval: number | null = null

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  
  timerInterval = setInterval(() => {
    timeSpent.value++
  }, 60000) // 每分钟更新一次
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// 生命周期
onMounted(() => {
  // 从路由参数获取天数
  const dayParam = route.params.day
  if (dayParam) {
    currentDay.value = parseInt(dayParam as string)
  }
  
  // 加载训练内容
  showTodayTraining()
  
  // 开始计时
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})

// 监听路由变化
watch(() => route.params.day, (newDay) => {
  if (newDay) {
    currentDay.value = parseInt(newDay as string)
    showTodayTraining()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.training-page {
  padding: $spacing-6;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: $breakpoint-md) {
    padding: $spacing-4;
  }
  
  @media (max-width: $breakpoint-sm) {
    padding: $spacing-2;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-8;
  flex-wrap: wrap;
  gap: $spacing-4;
}

.header-content {
  flex: 1;
  min-width: 300px;
}

.page-title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
  margin-bottom: $spacing-2;
  display: flex;
  align-items: center;
  gap: $spacing-3;
}

.title-icon {
  font-size: $font-size-4xl;
}

.page-subtitle {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: $spacing-3;
  flex-wrap: wrap;
}

.game-info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-4;
  margin-bottom: $spacing-8;
  
  @media (max-width: $breakpoint-sm) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.game-card {
  border: none;
  border-radius: $border-radius-xl;
  background: linear-gradient(135deg, $background-color, $background-secondary);
  transition: all $transition-base;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }
}

.card-content {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4;
}

.card-icon {
  font-size: $font-size-3xl;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($primary-color, 0.1);
  border-radius: $border-radius-lg;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-1;
}

.card-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.training-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: $spacing-8;
  
  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}

.questions-card,
.answer-card {
  border: 1px solid $border-color;
  border-radius: $border-radius-xl;
  height: 100%;
}

.card-header {
  padding: $spacing-4;
  border-bottom: 1px solid $border-color;
}

.card-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin: 0 0 $spacing-2 0;
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.card-subtitle {
  font-size: $font-size-sm;
  color: $text-secondary;
}

.questions-list {
  max-height: 600px;
  overflow-y: auto;
  padding: $spacing-2;
}

.question-item {
  display: flex;
  align-items: center;
  padding: $spacing-4;
  border-radius: $border-radius-lg;
  margin-bottom: $spacing-2;
  cursor: pointer;
  transition: all $transition-fast;
  border: 1px solid transparent;
  
  &:hover {
    background: $background-secondary;
    border-color: $border-color;
  }
  
  &.current {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
  }
  
  &.answered {
    &.correct {
      background: rgba($success-color, 0.1);
      border-color: $success-color;
    }
    
    &:not(.correct) {
      background: rgba($error-color, 0.1);
      border-color: $error-color;
    }
  }
}

.question-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $background-tertiary;
  border-radius: $border-radius-full;
  margin-right: $spacing-4;
  position: relative;
}

.number {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.status-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: $success-color;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-xs;
  
  .question-item:not(.correct) & {
    background: $error-color;
  }
}

.question-info {
  flex: 1;
}

.question-text {
  font-size: $font-size-base;
  color: $text-primary;
  margin-bottom: $spacing-2;
  line-height: $line-height-normal;
  
  :deep(br) {
    display: block;
    content: "";
    margin-bottom: $spacing-1;
  }
}

.question-meta {
  display: flex;
  gap: $spacing-3;
  font-size: $font-size-xs;
}

.difficulty {
  padding: 2px 8px;
  border-radius: $border-radius-full;
  font-weight: $font-weight-medium;
  
  &.easy {
    background: rgba($success-color, 0.1);
    color: $success-color;
  }
  
  &.medium {
    background: rgba($warning-color, 0.1);
    color: $warning-color;
  }
  
  &.hard {
    background: rgba($error-color, 0.1);
    color: $error-color;
  }
}

.points {
  color: $game-funds-color;
  font-weight: $font-weight-semibold;
}

.question-content {
  padding: $spacing-6;
}

.question-text {
  font-size: $font-size-lg;
  line-height: $line-height-relaxed;
  color: $text-primary;
  margin-bottom: $spacing-6;
  padding: $spacing-4;
  background: $background-secondary;
  border-radius: $border-radius-lg;
  
  :deep(br) {
    display: block;
    content: "";
    margin-bottom: $spacing-2;
  }
}

.question-options {
  margin: $spacing-6 0;
}

.option-item {
  display: block;
  margin-bottom: $spacing-3;
  padding: $spacing-3 $spacing-4;
  border: 1px solid $border-color;
  border-radius: $border-radius-lg;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $primary-color;
    background: rgba($primary-color, 0.05);
  }
  
  &.is-checked {
    border-color: $primary-color;
    background: rgba($primary-color, 0.1);
  }
}

.option-label {
  font-weight: $font-weight-bold;
  color: $primary-color;
  margin-right: $spacing-2;
}

.question-input {
  margin: $spacing-6 0;
}

.input-hint {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-top: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: $background-tertiary;
  border-radius: $border-radius-base;
}

.calc-steps {
  margin-bottom: $spacing-4;
}

.calc-step {
  display: flex;
  gap: $spacing-2;
  margin-bottom: $spacing-3;
}

.answer-actions {
  padding: $spacing-6;
  border-top: 1px solid $border-color;
  display: flex;
  gap: $spacing-3;
  flex-wrap: wrap;
}

.result-card {
  margin-top: $spacing-6;
  border: 2px solid transparent;
  
  &.correct {
    border-color: $success-color;
    background: rgba($success-color, 0.05);
  }
  
  &.incorrect {
    border-color: $error-color;
    background: rgba($error-color, 0.05);
  }
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-title {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
}

.result-points {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $game-funds-color;
}

.result-content {
  padding: $spacing-4;
}

.correct-answer {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: $spacing-4;
  padding: $spacing-3;
  background: $background-secondary;
  border-radius: $border-radius-lg;
}

.correct-label {
  font-weight: $font-weight-semibold;
  color: $text-secondary;
}

.correct-value {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $success-color;
}

.ai-feedback,
.suggestion {
  margin-bottom: $spacing-4;
  padding: $spacing-3;
  background: $background-secondary;
  border-radius: $border-radius-lg;
  border-left: 4px solid $info-color;
}

.suggestion {
  border-left-color: $primary-color;
}

.feedback-label,
.suggestion-label {
  font-weight: $font-weight-semibold;
  color: $text-secondary;
  margin-bottom: $spacing-1;
}

.feedback-content,
.suggestion-content {
  color: $text-primary;
  line-height: $line-height-normal;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: $spacing-6;
  padding: $spacing-4;
  background: $background-secondary;
  border-radius: $border-radius-lg;
}

.completion-dialog {
  text-align: center;
}

.completion-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-4;
  margin-bottom: $spacing-8;
  
  @media (max-width: $breakpoint-sm) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-item {
  padding: $spacing-4;
  background: $background-secondary;
  border-radius: $border-radius-lg;
}

.stat-value {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: $primary-color;
  margin-bottom: $spacing-1;
}

.stat-label {
  font-size: $font-size-sm;
  color: $text-secondary;
}

.completion-rewards {
  margin-bottom: $spacing-8;
  text-align: left;
}

.rewards-list {
  list-style: none;
  padding: 0;
  margin: $spacing-4 0 0 0;
}

.rewards-list li {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-3;
  margin-bottom: $spacing-2;
  background: $background-secondary;
  border-radius: $border-radius-lg;
}

.reward-icon {
  font-size: $font-size-xl;
  width: 40px;
  text-align: center;
}

.reward-text {
  font-size: $font-size-base;
  color: $text-primary;
}

.completion-actions {
  display: flex;
  justify-content: center;
  gap: $spacing-4;
}

.question-position {
  margin-left: $spacing-2;
  color: $primary-color;
  font-weight: $font-weight-bold;
}

// 响应式调整
@media (max-width: $breakpoint-lg) {
  .training-content {
    gap: $spacing-6;
  }
  
  .questions-list {
    max-height: 400px;
  }
}

@media (max-width: $breakpoint-md) {
  .page-title {
    font-size: $font-size-2xl;
  }
  
  .page-subtitle {
    font-size: $font-size-base;
  }
  
  .game-info-cards {
    gap: $spacing-3;
  }
  
  .card-icon {
    width: 50px;
    height: 50px;
    font-size: $font-size-2xl;
  }
  
  .card-value {
    font-size: $font-size-xl;
  }
}

@media (max-width: $breakpoint-sm) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .game-info-cards {
    grid-template-columns: 1fr;
  }
  
  .navigation-buttons {
    flex-direction: column;
    gap: $spacing-3;
  }
  
  .completion-actions {
    flex-direction: column;
  }
}
</style>