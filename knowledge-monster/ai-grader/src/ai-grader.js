/**
 * 知识怪 - AI批改核心模块
 * 实现三级批改策略：本地规则 → 简单AI → 深度AI
 */

const axios = require('axios');
const math = require('mathjs');
const natural = require('natural');
const logger = require('./logger');

// 配置
const config = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.volcengine.com/deepseek/v3',
    model: 'deepseek-v3-2-251201',
    temperature: 0.3,
    maxTokens: 500
  },
  grading: {
    // 批改策略比例
    localRuleRatio: 0.7,    // 70% 使用本地规则
    simpleAIRatio: 0.25,    // 25% 使用简单AI
    deepAIRatio: 0.05,      // 5% 使用深度AI
    
    // 难度阈值
    easyThreshold: 0.8,     // 简单题正确率阈值
    mediumThreshold: 0.6,   // 中等题正确率阈值
    hardThreshold: 0.4,     // 困难题正确率阈值
    
    // 时间限制（毫秒）
    localTimeout: 1000,
    simpleAITimeout: 3000,
    deepAITimeout: 10000
  }
};

// 数学表达式评估器
class MathEvaluator {
  constructor() {
    this.parser = math.parser();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  /**
   * 标准化数学表达式
   */
  normalizeExpression(expr) {
    if (typeof expr !== 'string') return expr;
    
    // 移除空格
    let normalized = expr.replace(/\s+/g, '');
    
    // 标准化运算符
    normalized = normalized
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/·/g, '*');
    
    // 标准化分数
    normalized = normalized.replace(/(\d+)\/(\d+)/g, '($1)/($2)');
    
    // 标准化小数
    normalized = normalized.replace(/\.(\d+)/g, '.$1');
    
    return normalized;
  }

  /**
   * 评估数学表达式
   */
  evaluateExpression(expr) {
    try {
      const normalized = this.normalizeExpression(expr);
      const result = math.evaluate(normalized);
      return {
        success: true,
        value: result,
        normalized
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        normalized: expr
      };
    }
  }

  /**
   * 比较两个数学表达式是否相等
   */
  compareExpressions(expr1, expr2, tolerance = 0.0001) {
    try {
      const result1 = this.evaluateExpression(expr1);
      const result2 = this.evaluateExpression(expr2);
      
      if (!result1.success || !result2.success) {
        return false;
      }
      
      const diff = Math.abs(result1.value - result2.value);
      return diff <= tolerance;
    } catch (error) {
      return false;
    }
  }

  /**
   * 解析应用题文本
   */
  parseWordProblem(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stemmed = tokens.map(token => this.stemmer.stem(token));
    
    // 识别数学关键词
    const mathKeywords = [
      'add', 'plus', 'sum', 'total', 'together',
      'subtract', 'minus', 'difference', 'less',
      'multiply', 'times', 'product', 'of',
      'divide', 'quotient', 'per', 'each',
      'equal', 'equals', 'is', 'are',
      'more', 'less', 'than', 'from'
    ];
    
    // 提取数字
    const numbers = text.match(/\d+(\.\d+)?/g) || [];
    
    // 识别单位
    const units = text.match(/(元|角|分|米|厘米|千克|克|小时|分钟|秒)/g) || [];
    
    return {
      tokens,
      stemmed,
      hasMathKeywords: stemmed.some(token => mathKeywords.includes(token)),
      numbers: numbers.map(n => parseFloat(n)),
      units,
      isWordProblem: numbers.length > 0 && (stemmed.some(token => mathKeywords.includes(token)) || units.length > 0)
    };
  }
}

// 本地规则批改器
class LocalRuleGrader {
  constructor() {
    this.mathEvaluator = new MathEvaluator();
    this.rules = this.initializeRules();
  }

  initializeRules() {
    return {
      // 选择题规则
      choice: {
        exactMatch: (studentAnswer, correctAnswer) => {
          return studentAnswer === correctAnswer;
        },
        caseInsensitive: (studentAnswer, correctAnswer) => {
          return studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
        },
        numericChoice: (studentAnswer, correctAnswer) => {
          const studentNum = parseInt(studentAnswer);
          const correctNum = parseInt(correctAnswer);
          return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
        }
      },
      
      // 填空题规则
      fill: {
        exactMatch: (studentAnswer, correctAnswer) => {
          return studentAnswer === correctAnswer;
        },
        numericMatch: (studentAnswer, correctAnswer) => {
          const studentNum = parseFloat(studentAnswer);
          const correctNum = parseFloat(correctAnswer);
          return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
        },
        toleranceMatch: (studentAnswer, correctAnswer, tolerance = 0.01) => {
          const studentNum = parseFloat(studentAnswer);
          const correctNum = parseFloat(correctAnswer);
          if (isNaN(studentNum) || isNaN(correctNum)) return false;
          return Math.abs(studentNum - correctNum) <= tolerance;
        }
      },
      
      // 计算题规则
      calculation: {
        expressionMatch: (studentAnswer, correctAnswer) => {
          return this.mathEvaluator.compareExpressions(studentAnswer, correctAnswer);
        },
        resultMatch: (studentAnswer, correctAnswer) => {
          const studentResult = this.mathEvaluator.evaluateExpression(studentAnswer);
          const correctResult = this.mathEvaluator.evaluateExpression(correctAnswer);
          
          if (!studentResult.success || !correctResult.success) return false;
          return Math.abs(studentResult.value - correctResult.value) <= 0.0001;
        }
      },
      
      // 判断题规则
      truefalse: {
        exactMatch: (studentAnswer, correctAnswer) => {
          const normalizedStudent = studentAnswer.toLowerCase().trim();
          const normalizedCorrect = correctAnswer.toLowerCase().trim();
          
          const studentBool = normalizedStudent === 'true' || normalizedStudent === 't' || normalizedStudent === '1' || normalizedStudent === '对' || normalizedStudent === '正确';
          const correctBool = normalizedCorrect === 'true' || normalizedCorrect === 't' || normalizedCorrect === '1' || normalizedCorrect === '对' || normalizedCorrect === '正确';
          
          return studentBool === correctBool;
        }
      }
    };
  }

  /**
   * 本地规则批改
   */
  async grade(question, studentAnswer) {
    const startTime = Date.now();
    
    try {
      const { type, correctAnswer, difficulty = 'medium' } = question;
      
      if (!this.rules[type]) {
        return {
          isCorrect: false,
          confidence: 0,
          method: 'local',
          error: '不支持的题目类型'
        };
      }
      
      let isCorrect = false;
      let matchedRule = null;
      
      // 尝试所有规则
      for (const [ruleName, ruleFunc] of Object.entries(this.rules[type])) {
        if (ruleFunc(studentAnswer, correctAnswer)) {
          isCorrect = true;
          matchedRule = ruleName;
          break;
        }
      }
      
      // 根据难度调整置信度
      let confidence = isCorrect ? 0.95 : 0.05;
      if (difficulty === 'hard') confidence *= 0.9;
      if (difficulty === 'easy') confidence *= 1.1;
      
      const processingTime = Date.now() - startTime;
      
      return {
        isCorrect,
        confidence,
        method: 'local',
        matchedRule,
        processingTime,
        feedback: this.generateFeedback(isCorrect, question, studentAnswer)
      };
      
    } catch (error) {
      logger.error('本地规则批改失败:', error);
      return {
        isCorrect: false,
        confidence: 0,
        method: 'local',
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 生成反馈
   */
  generateFeedback(isCorrect, question, studentAnswer) {
    if (isCorrect) {
      const positiveFeedbacks = [
        '回答正确！思路清晰。',
        '完全正确，继续保持！',
        '答案准确，计算无误。',
        '正确！解题步骤完整。',
        '完美！理解透彻。'
      ];
      return positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];
    } else {
      const { type, correctAnswer } = question;
      
      switch (type) {
        case 'choice':
          return `正确答案是：${correctAnswer}。请仔细阅读选项。`;
        case 'fill':
          return `正确答案是：${correctAnswer}。检查计算过程。`;
        case 'calculation':
          return `正确答案是：${correctAnswer}。请检查计算步骤。`;
        case 'truefalse':
          return `正确答案是：${correctAnswer ? '正确' : '错误'}。`;
        default:
          return '答案不正确，请再思考一下。';
      }
    }
  }
}

// 简单AI批改器（基于规则+语义）
class SimpleAIGrader {
  constructor() {
    this.mathEvaluator = new MathEvaluator();
    this.tokenizer = new natural.WordTokenizer();
    this.similarity = natural.JaroWinklerDistance;
    
    // 常见错误模式
    this.errorPatterns = {
      calculation: [
        { pattern: /忘记进位/, suggestion: '注意进位规则' },
        { pattern: /小数点位置错误/, suggestion: '检查小数点对齐' },
        { pattern: /符号错误/, suggestion: '注意正负号' },
        { pattern: /单位转换错误/, suggestion: '检查单位换算' },
        { pattern: /公式用错/, suggestion: '复习相关公式' }
      ],
      concept: [
        { pattern: /概念混淆/, suggestion: '区分相似概念' },
        { pattern: /定义不清/, suggestion: '回顾定义' },
        { pattern: /性质理解错误/, suggestion: '理解性质本质' }
      ]
    };
  }

  /**
   * 简单AI批改
   */
  async grade(question, studentAnswer) {
    const startTime = Date.now();
    
    try {
      const { type, correctAnswer, text, difficulty = 'medium' } = question;
      
      // 基础检查
      if (!studentAnswer || studentAnswer.trim() === '') {
        return {
          isCorrect: false,
          confidence: 0.9,
          method: 'simple_ai',
          feedback: '请填写答案',
          suggestion: '仔细阅读题目要求'
        };
      }
      
      let isCorrect = false;
      let similarity = 0;
      let errorType = null;
      let suggestion = null;
      
      // 根据题目类型处理
      switch (type) {
        case 'choice':
        case 'truefalse':
          isCorrect = studentAnswer === correctAnswer;
          similarity = isCorrect ? 1.0 : 0;
          break;
          
        case 'fill':
          isCorrect = this.compareFillAnswers(studentAnswer, correctAnswer);
          similarity = this.calculateSimilarity(studentAnswer, correctAnswer);
          break;
          
        case 'calculation':
          const result = this.mathEvaluator.compareExpressions(studentAnswer, correctAnswer, 0.01);
          isCorrect = result;
          similarity = result ? 1.0 : this.analyzeCalculationError(studentAnswer, correctAnswer);
          break;
          
        default:
          isCorrect = false;
          similarity = 0;
      }
      
      // 分析错误类型
      if (!isCorrect) {
        const errorAnalysis = this.analyzeError(question, studentAnswer);
        errorType = errorAnalysis.type;
        suggestion = errorAnalysis.suggestion;
      }
      
      // 计算置信度
      let confidence = similarity;
      
      // 根据难度调整
      if (difficulty === 'hard') confidence *= 0.8;
      if (difficulty === 'easy') confidence *= 1.2;
      
      // 生成反馈
      const feedback = this.generateAIFeedback(isCorrect, question, studentAnswer, errorType);
      
      const processingTime = Date.now() - startTime;
      
      return {
        isCorrect,
        confidence: Math.min(Math.max(confidence, 0), 1),
        method: 'simple_ai',
        errorType,
        feedback,
        suggestion,
        processingTime
      };
      
    } catch (error) {
      logger.error('简单AI批改失败:', error);
      return {
        isCorrect: false,
        confidence: 0,
        method: 'simple_ai',
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 比较填空题答案
   */
  compareFillAnswers(studentAnswer, correctAnswer) {
    // 尝试数值比较
    const studentNum = parseFloat(studentAnswer);
    const correctNum = parseFloat(correctAnswer);
    
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      return Math.abs(studentNum - correctNum) <= 0.01;
    }
    
    // 字符串相似度比较
    const similarity = this.similarity(studentAnswer, correctAnswer);
    return similarity > 0.9;
  }

  /**
   * 计算相似度
   */
  calculateSimilarity(str1, str2) {
    return this.similarity(str1, str2);
  }

  /**
   * 分析计算错误
   */
  analyzeCalculationError(studentAnswer, correctAnswer) {
    try {
      const studentResult = this.mathEvaluator.evaluateExpression(studentAnswer);
      const correctResult = this.mathEvaluator.evaluateExpression(correctAnswer);
      
      if (studentResult.success && correctResult.success) {
        const diff = Math.abs(studentResult.value - correctResult.value);
        const relativeError = diff / Math.abs(correctResult.value);
        return 1 - Math.min(relativeError, 1);
      }
    } catch (error) {
      // 忽略评估错误
    }
    
    return 0;
  }

  /**
   * 分析错误类型
   */
  analyzeError(question, studentAnswer) {
    const { type, text } = question;
    const answerStr = studentAnswer.toString().toLowerCase();
    
    // 检查常见错误模式
    for (const [category, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.pattern.test(answerStr) || this.containsKeywords(answerStr, pattern.pattern)) {
          return {
            type: category,
            suggestion: pattern.suggestion
          };
        }
      }
    }
    
    // 默认错误类型
    return {
      type: 'general',
      suggestion: '仔细检查计算过程'
    };
  }

  containsKeywords(text, pattern) {
    const keywords = ['进位', '小数点', '符号', '单位', '公式', '概念', '定义', '性质'];
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 生成AI反馈
   */
  generateAIFeedback(isCorrect, question, studentAnswer, errorType) {
    if (isCorrect) {
      const feedbacks = [
        '回答正确！理解到位。',
        '完全正确，思路清晰。',
        '答案准确，计算无误。',
        '正确！解题方法得当。',
        '完美！知识点掌握牢固。'
      ];
      return feedbacks[Math.floor(Math.random() * feedbacks.length)];
    }
    
    const { type, correctAnswer } = question;
    
    let feedback = '';
    
    switch (errorType) {
      case 'calculation':
        feedback = '计算过程有误，';
        break;
      case 'concept':
        feedback = '概念理解有误，';
        break;
      default:
        feedback = '答案不正确，';
    }
    
    feedback += `正确答案是：${correctAnswer}。`;
    
    if (type === 'calculation') {
      feedback += '建议检查计算步骤。';
    } else if (type === 'fill') {
      feedback += '注意单位换算和精确度。';
    }
    
    return feedback;
  }
}

// 深度AI批改器（调用大模型）
class DeepAIGrader {
  constructor() {
    this.client = axios.create({
      baseURL: config.deepseek.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.grading.deepAITimeout
    });
  }

  /**
   * 深度AI批改
   */
  async grade(question, studentAnswer) {
    const startTime = Date.now();
    
    try {
      const { type, text, correctAnswer, knowledgePoint, difficulty = 'medium' } = question;
      
      // 构建提示词
      const prompt = this.buildPrompt(question, studentAnswer);
      
      // 调用API
      const response = await this.client.post('/chat/completions', {
        model: config.deepseek.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的数学老师，负责批改七年级学生的数学作业。请仔细分析学生的答案，给出准确的判断和建设性的反馈。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.deepseek.temperature,
        max_tokens: config.deepseek.maxTokens
      });
      
      const aiResponse = response.data.choices[0].message.content;
      const parsedResult = this.parseAIResponse(aiResponse);
      
      // 计算置信度
      let confidence = parsedResult.confidence || 0.9;
      if (difficulty === 'hard') confidence *= 0.85;
      if (difficulty === 'easy') confidence *= 1.1;
      
      const processingTime = Date.now() - startTime;
      
      return {
        isCorrect: parsedResult.isCorrect,
        confidence: Math.min(Math.max(confidence, 0), 1),
        method: 'deep_ai',
        feedback: parsedResult.feedback,
        suggestion: parsedResult.suggestion,
        analysis: parsedResult.analysis,
        processingTime,
        rawResponse: aiResponse
      };
      
    } catch (error) {
      logger.error('深度AI批改失败:', error);
      
      // 降级到简单AI
      const simpleGrader = new SimpleAIGrader();
      const fallbackResult = await simpleGrader.grade(question, studentAnswer);
      fallbackResult.method = 'deep_ai_fallback';
      fallbackResult.error = error.message;
      
      return fallbackResult;
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(question, studentAnswer) {
    const { type, text, correctAnswer, knowledgePoint, difficulty } = question;
    
    return `请批改以下数学题目：

题目类型：${type}
知识点：${knowledgePoint}
难度：${difficulty}
题目：${text}

标准答案：${correctAnswer}
学生答案：${studentAnswer}

请按照以下格式回复：
1. 是否正确：是/否
2. 置信度：0-1之间的小数
3. 反馈：简要说明对错原因
4. 建议：针对性的学习建议
5. 分析：详细分析错误原因（如果错误）

请确保反馈和建议对七年级学生友好、鼓励性。`;
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim());
      
      let isCorrect = false;
      let confidence = 0.9;
      let feedback = '';
      let suggestion = '';
      let analysis = '';
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('是否正确：')) {
          isCorrect = lowerLine.includes('是') && !lowerLine.includes('否');
        } else if (lowerLine.includes('置信度：')) {
          const match = line.match(/[\d.]+/);
          if (match) confidence = parseFloat(match[0]);
        } else if (lowerLine.includes('反馈：')) {
          feedback = line.split('：')[1]?.trim() || '';
        } else if (lowerLine.includes('建议：')) {
          suggestion = line.split('：')[1]?.trim() || '';
        } else if (lowerLine.includes('分析：')) {
          analysis = line.split('：')[1]?.trim() || '';
        }
      }
      
      // 如果没有明确解析出是否正确，尝试从反馈中推断
      if (!feedback && !suggestion) {
        const positiveKeywords = ['正确', '准确', '很好', '优秀', '完美'];
        const negativeKeywords = ['错误', '不对', '不正确', '有问题'];
        
        const hasPositive = positiveKeywords.some(keyword => response.includes(keyword));
        const hasNegative = negativeKeywords.some(keyword => response.includes(keyword));
        
        if (hasPositive && !hasNegative) isCorrect = true;
        if (hasNegative && !hasPositive) isCorrect = false;
      }
      
      return {
        isCorrect,
        confidence: Math.min(Math.max(confidence, 0), 1),
        feedback: feedback || (isCorrect ? '回答正确' : '回答错误'),
        suggestion: suggestion || (isCorrect ? '继续保持' : '请仔细检查'),
        analysis: analysis || ''
      };
      
    } catch (error) {
      logger.error('解析AI响应失败:', error);
      return {
        isCorrect: false,
        confidence: 0.5,
        feedback: 'AI分析失败',
        suggestion: '请手动检查',
        analysis: ''
      };
    }
  }
}

// 主批改器（三级策略）
class AIGrader {
  constructor() {
    this.localGrader = new LocalRuleGrader();
    this.simpleGrader = new SimpleAIGrader();
    this.deepGrader = new DeepAIGrader();
    this.strategyStats = {
      local: 0,
      simple_ai: 0,
      deep_ai: 0,
      deep_ai_fallback: 0
    };
  }

  /**
   * 选择批改策略
   */
  selectGradingStrategy(question) {
    const { difficulty = 'medium', type } = question;
    const rand = Math.random();
    
    // 根据题目类型和难度调整策略
    let localRatio = config.grading.localRuleRatio;
    let simpleRatio = config.grading.simpleAIRatio;
    
    if (difficulty === 'hard') {
      localRatio *= 0.8;
      simpleRatio *= 0.9;
    } else if (difficulty === 'easy') {
      localRatio *= 1.2;
      simpleRatio *= 1.1;
    }
    
    if (type === 'calculation') {
      localRatio *= 0.9;
    }
    
    // 归一化
    const total = localRatio + simpleRatio + config.grading.deepAIRatio;
    localRatio /= total;
    simpleRatio /= total;
    const deepRatio = config.grading.deepAIRatio / total;
    
    if (rand < localRatio) {
      return 'local';
    } else if (rand < localRatio + simpleRatio) {
      return 'simple_ai';
    } else {
      return 'deep_ai';
    }
  }

  /**
   * 主批改方法
   */
  async grade(question, studentAnswer) {
    const startTime = Date.now();
    
    try {
      // 验证输入
      if (!question || !studentAnswer) {
        throw new Error('题目或答案不能为空');
      }
      
      // 选择策略
      const strategy = this.selectGradingStrategy(question);
      
      let result;
      
      // 执行批改
      switch (strategy) {
        case 'local':
          result = await Promise.race([
            this.localGrader.grade(question, studentAnswer),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('本地批改超时')), config.grading.localTimeout)
            )
          ]);
          break;
          
        case 'simple_ai':
          result = await Promise.race([
            this.simpleGrader.grade(question, studentAnswer),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('简单AI批改超时')), config.grading.simpleAITimeout)
            )
          ]);
          break;
          
        case 'deep_ai':
          result = await Promise.race([
            this.deepGrader.grade(question, studentAnswer),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('深度AI批改超时')), config.grading.deepAITimeout)
            )
          ]);
          break;
          
        default:
          throw new Error('未知的批改策略');
      }
      
      // 更新统计
      this.strategyStats[result.method] = (this.strategyStats[result.method] || 0) + 1;
      
      // 添加元数据
      result.questionId = question.id;
      result.strategy = strategy;
      result.totalTime = Date.now() - startTime;
      result.timestamp = new Date().toISOString();
      
      // 记录日志
      logger.info('批改完成', {
        questionId: question.id,
        strategy,
        isCorrect: result.isCorrect,
        confidence: result.confidence,
        processingTime: result.totalTime
      });
      
      return result;
      
    } catch (error) {
      logger.error('批改过程失败:', error);
      
      // 降级处理
      try {
        const fallbackResult = await this.localGrader.grade(question, studentAnswer);
        fallbackResult.method = 'emergency_fallback';
        fallbackResult.error = error.message;
        this.strategyStats.emergency_fallback = (this.strategyStats.emergency_fallback || 0) + 1;
        
        return fallbackResult;
      } catch (fallbackError) {
        // 最后的回退
        return {
          isCorrect: false,
          confidence: 0,
          method: 'final_fallback',
          feedback: '系统错误，请稍后重试',
          suggestion: '请联系老师',
          error: error.message,
          totalTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * 批量批改
   */
  async batchGrade(questions, studentAnswers) {
    const results = [];
    const startTime = Date.now();
    
    try {
      // 验证输入
      if (!Array.isArray(questions) || !Array.isArray(studentAnswers)) {
        throw new Error('题目和答案必须是数组');
      }
      
      if (questions.length !== studentAnswers.length) {
        throw new Error('题目和答案数量不匹配');
      }
      
      // 并行批改（限制并发数）
      const batchSize = 5;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batchQuestions = questions.slice(i, i + batchSize);
        const batchAnswers = studentAnswers.slice(i, i + batchSize);
        
        const batchPromises = batchQuestions.map((question, index) =>
          this.grade(question, batchAnswers[index])
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 避免速率限制
        if (i + batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // 计算总体统计
      const stats = {
        total: results.length,
        correct: results.filter(r => r.isCorrect).length,
        accuracy: results.length > 0 ? (results.filter(r => r.isCorrect).length / results.length) * 100 : 0,
        totalTime: Date.now() - startTime,
        strategyDistribution: { ...this.strategyStats }
      };
      
      logger.info('批量批改完成', stats);
      
      return {
        results,
        stats
      };
      
    } catch (error) {
      logger.error('批量批改失败:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = Object.values(this.strategyStats).reduce((sum, count) => sum + count, 0);
    
    const distribution = {};
    for (const [strategy, count] of Object.entries(this.strategyStats)) {
      distribution[strategy] = total > 0 ? (count / total) * 100 : 0;
    }
    
    return {
      total,
      distribution,
      raw: { ...this.strategyStats }
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.strategyStats = {
      local: 0,
      simple_ai: 0,
      deep_ai: 0,
      deep_ai_fallback: 0,
      emergency_fallback: 0,
      final_fallback: 0
    };
  }

  /**
   * 验证题目格式
   */
  validateQuestion(question) {
    const requiredFields = ['id', 'type', 'text', 'correctAnswer', 'knowledgePoint'];
    const errors = [];
    
    for (const field of requiredFields) {
      if (!question[field]) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }
    
    // 验证题目类型
    const validTypes = ['choice', 'fill', 'calculation', 'truefalse'];
    if (!validTypes.includes(question.type)) {
      errors.push(`无效的题目类型: ${question.type}`);
    }
    
    // 验证难度
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (question.difficulty && !validDifficulties.includes(question.difficulty)) {
      errors.push(`无效的难度: ${question.difficulty}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 导出模块
module.exports = {
  AIGrader,
  LocalRuleGrader,
  SimpleAIGrader,
  DeepAIGrader,
  MathEvaluator
};

// 单例实例
let graderInstance = null;

/**
 * 获取批改器实例
 */
function getGrader() {
  if (!graderInstance) {
    graderInstance = new AIGrader();
  }
  return graderInstance;
}

/**
 * 快速批改函数
 */
async function quickGrade(question, studentAnswer) {
  const grader = getGrader();
  return await grader.grade(question, studentAnswer);
}

/**
 * 快速批量批改
 */
async function quickBatchGrade(questions, studentAnswers) {
  const grader = getGrader();
  return await grader.batchGrade(questions, studentAnswers);
}

module.exports = {
  getGrader,
  quickGrade,
  quickBatchGrade,
  AIGrader,
  LocalRuleGrader,
  SimpleAIGrader,
  DeepAIGrader,
  MathEvaluator
};