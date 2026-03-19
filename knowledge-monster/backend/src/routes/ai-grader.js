const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticate, authorize, apiLimiter } = require('../middleware/auth');
const logger = require('../utils/logger');
const { getGrader, quickGrade, quickBatchGrade } = require('../../ai-grader/src/ai-grader');

// 验证模式
const gradeSchema = Joi.object({
  questionId: Joi.string().required(),
  studentAnswer: Joi.any().required(),
  questionType: Joi.string().valid('choice', 'fill', 'calculation', 'truefalse').required(),
  correctAnswer: Joi.any().required(),
  questionText: Joi.string(),
  knowledgePoint: Joi.string(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard')
});

const batchGradeSchema = Joi.object({
  questions: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('choice', 'fill', 'calculation', 'truefalse').required(),
    text: Joi.string().required(),
    correctAnswer: Joi.any().required(),
    knowledgePoint: Joi.string().required(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    options: Joi.array().items(Joi.string())
  })).min(1).max(50).required(),
  studentAnswers: Joi.array().items(Joi.any()).min(1).max(50).required()
});

/**
 * @route POST /api/ai/grade
 * @desc 单题AI批改
 * @access Private
 */
router.post('/grade', authenticate, apiLimiter, async (req, res) => {
  try {
    // 验证输入
    const { error } = gradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      questionId,
      studentAnswer,
      questionType,
      correctAnswer,
      questionText,
      knowledgePoint,
      difficulty = 'medium'
    } = req.body;

    // 构建题目对象
    const question = {
      id: questionId,
      type: questionType,
      text: questionText || `题目 ${questionId}`,
      correctAnswer,
      knowledgePoint: knowledgePoint || '数学计算',
      difficulty
    };

    // 记录请求
    logger.info('AI批改请求', {
      questionId,
      questionType,
      difficulty,
      userId: req.user?.userId
    });

    // 执行批改
    const startTime = Date.now();
    const result = await quickGrade(question, studentAnswer);
    const processingTime = Date.now() - startTime;

    // 记录结果
    logger.info('AI批改完成', {
      questionId,
      isCorrect: result.isCorrect,
      confidence: result.confidence,
      method: result.method,
      processingTime: result.processingTime,
      totalTime: processingTime
    });

    // 返回结果
    res.json({
      success: true,
      data: {
        isCorrect: result.isCorrect,
        confidence: result.confidence,
        feedback: result.feedback,
        suggestion: result.suggestion,
        analysis: result.analysis,
        method: result.method,
        processingTime: result.processingTime,
        totalTime: processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('AI批改失败:', error);
    
    res.status(500).json({
      success: false,
      message: 'AI批改服务暂时不可用',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/batch-grade
 * @desc 批量AI批改
 * @access Private
 */
router.post('/batch-grade', authenticate, apiLimiter, async (req, res) => {
  try {
    // 验证输入
    const { error } = batchGradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { questions, studentAnswers } = req.body;

    // 验证题目格式
    const grader = getGrader();
    const validationResults = questions.map(question => grader.validateQuestion(question));
    const invalidQuestions = validationResults.filter(result => !result.isValid);
    
    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        message: '题目格式验证失败',
        errors: invalidQuestions.flatMap(result => result.errors)
      });
    }

    // 记录请求
    logger.info('批量AI批改请求', {
      questionCount: questions.length,
      userId: req.user?.userId
    });

    // 执行批量批改
    const startTime = Date.now();
    const batchResult = await quickBatchGrade(questions, studentAnswers);
    const processingTime = Date.now() - startTime;

    // 记录结果
    logger.info('批量AI批改完成', {
      questionCount: questions.length,
      correctCount: batchResult.stats.correct,
      accuracy: batchResult.stats.accuracy,
      totalTime: processingTime
    });

    // 返回结果
    res.json({
      success: true,
      data: {
        results: batchResult.results.map(result => ({
          questionId: result.questionId,
          isCorrect: result.isCorrect,
          confidence: result.confidence,
          feedback: result.feedback,
          suggestion: result.suggestion,
          method: result.method,
          processingTime: result.processingTime
        })),
        stats: {
          total: batchResult.stats.total,
          correct: batchResult.stats.correct,
          accuracy: batchResult.stats.accuracy,
          totalTime: processingTime,
          strategyDistribution: batchResult.stats.strategyDistribution
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('批量AI批改失败:', error);
    
    res.status(500).json({
      success: false,
      message: '批量AI批改服务暂时不可用',
      error: error.message
    });
  }
});

/**
 * @route GET /api/ai/stats
 * @desc 获取AI批改统计信息
 * @access Private (仅教师)
 */
router.get('/stats', authenticate, authorize(['teacher']), async (req, res) => {
  try {
    const grader = getGrader();
    const stats = grader.getStats();

    res.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('获取AI统计失败:', error);
    
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/stats/reset
 * @desc 重置AI批改统计
 * @access Private (仅教师)
 */
router.post('/stats/reset', authenticate, authorize(['teacher']), async (req, res) => {
  try {
    const grader = getGrader();
    grader.resetStats();

    logger.info('AI统计已重置', { userId: req.user?.userId });

    res.json({
      success: true,
      message: '统计信息已重置',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('重置AI统计失败:', error);
    
    res.status(500).json({
      success: false,
      message: '重置统计信息失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/analyze-error
 * @desc 深度错题分析
 * @access Private
 */
router.post('/analyze-error', authenticate, apiLimiter, async (req, res) => {
  try {
    const { question, studentAnswer, errorType } = req.body;

    if (!question || !studentAnswer) {
      return res.status(400).json({
        success: false,
        message: '题目和答案不能为空'
      });
    }

    // 构建分析提示
    const analysisPrompt = `请分析学生的错误：

题目：${question.text}
知识点：${question.knowledgePoint}
标准答案：${question.correctAnswer}
学生答案：${studentAnswer}
错误类型：${errorType || '未知'}

请提供：
1. 错误原因分析
2. 相关知识点复习建议
3. 避免类似错误的技巧
4. 推荐练习题目类型

请用对七年级学生友好的语言回答。`;

    // 这里可以调用大模型进行深度分析
    // 暂时返回模拟数据
    const mockAnalysis = {
      errorReason: '学生在计算过程中忽略了进位规则，导致最终结果偏差。',
      knowledgeReview: '需要复习两位数加减法的进位规则，特别注意十位和个位的对齐。',
      avoidanceTips: '1. 计算时先对齐数位\n2. 从个位开始计算\n3. 注意进位标记\n4. 最后检查结果',
      practiceRecommendation: '建议练习：两位数加减法混合运算，特别是需要进位的题目。',
      confidence: 0.85
    };

    res.json({
      success: true,
      data: {
        analysis: mockAnalysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('错题分析失败:', error);
    
    res.status(500).json({
      success: false,
      message: '错题分析服务暂时不可用',
      error: error.message
    });
  }
});

/**
 * @route GET /api/ai/health
 * @desc AI服务健康检查
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const grader = getGrader();
    const stats = grader.getStats();

    // 测试简单批改
    const testQuestion = {
      id: 'test-001',
      type: 'calculation',
      text: '计算：25 + 37',
      correctAnswer: '62',
      knowledgePoint: '两位数加法',
      difficulty: 'easy'
    };

    const testResult = await quickGrade(testQuestion, '62');

    res.json({
      success: true,
      data: {
        status: 'healthy',
        service: 'AI Grading Service',
        version: '1.0.0',
        uptime: process.uptime(),
        stats: {
          totalRequests: stats.total,
          strategyDistribution: stats.distribution
        },
        testResult: {
          isCorrect: testResult.isCorrect,
          confidence: testResult.confidence,
          method: testResult.method
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('AI健康检查失败:', error);
    
    res.json({
      success: false,
      data: {
        status: 'unhealthy',
        service: 'AI Grading Service',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/ai/simulate
 * @desc 模拟批改（开发测试用）
 * @access Private (仅开发环境)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/simulate', authenticate, async (req, res) => {
    try {
      const { count = 10, difficulty = 'medium' } = req.body;

      const testQuestions = [];
      const testAnswers = [];

      // 生成测试数据
      for (let i = 0; i < count; i++) {
        const questionType = ['choice', 'fill', 'calculation'][Math.floor(Math.random() * 3)];
        
        let question;
        let correctAnswer;
        let studentAnswer;

        switch (questionType) {
          case 'choice':
            correctAnswer = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
            studentAnswer = Math.random() > 0.3 ? correctAnswer : ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
            question = {
              id: `test-choice-${i}`,
              type: 'choice',
              text: `选择题 ${i + 1}`,
              correctAnswer,
              knowledgePoint: '选择题知识点',
              difficulty,
              options: ['选项A', '选项B', '选项C', '选项D']
            };
            break;

          case 'fill':
            correctAnswer = (Math.random() * 100).toFixed(2);
            studentAnswer = Math.random() > 0.4 ? correctAnswer : (parseFloat(correctAnswer) + (Math.random() - 0.5) * 10).toFixed(2);
            question = {
              id: `test-fill-${i}`,
              type: 'fill',
              text: `填空题 ${i + 1}`,
              correctAnswer,
              knowledgePoint: '填空题知识点',
              difficulty
            };
            break;

          case 'calculation':
            const num1 = Math.floor(Math.random() * 100);
            const num2 = Math.floor(Math.random() * 100);
            const operator = ['+', '-', '*', '/'][Math.floor(Math.random() * 4)];
            
            let result;
            switch (operator) {
              case '+': result = num1 + num2; break;
              case '-': result = num1 - num2; break;
              case '*': result = num1 * num2; break;
              case '/': result = num2 !== 0 ? (num1 / num2).toFixed(2) : '0';
            }
            
            correctAnswer = result.toString();
            studentAnswer = Math.random() > 0.5 ? correctAnswer : (parseFloat(result) + (Math.random() - 0.5) * 5).toFixed(2);
            
            question = {
              id: `test-calc-${i}`,
              type: 'calculation',
              text: `计算：${num1} ${operator} ${num2}`,
              correctAnswer,
              knowledgePoint: '四则运算',
              difficulty
            };
            break;
        }

        testQuestions.push(question);
        testAnswers.push(studentAnswer);
      }

      // 执行批量批改
      const startTime = Date.now();
      const batchResult = await quickBatchGrade(testQuestions, testAnswers);
      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          testConfig: { count, difficulty },
          results: batchResult.results,
          stats: {
            ...batchResult.stats,
            processingTime
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('模拟批改失败:', error);
      
      res.status(500).json({
        success: false,
        message: '模拟批改失败',
        error: error.message
      });
    }
  });
}

module.exports = router;