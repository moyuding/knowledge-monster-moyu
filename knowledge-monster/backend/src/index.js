const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const responseTime = require('response-time');
const { createClient } = require('@supabase/supabase-js');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teacher');
const aiGraderRoutes = require('./routes/ai-grader');
const gameRoutes = require('./routes/game');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const logger = require('./utils/logger');

// 加载环境变量
dotenv.config();

// 初始化应用
const app = express();
const PORT = process.env.PORT || 3000;

// 基础配置
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  ai: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.volcengine.com/deepseek/v3'
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  }
};

// 初始化Supabase客户端
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// 中间件
app.use(helmet());
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseTime());

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/ai', aiGraderRoutes);
app.use('/api/game', gameRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('数据库连接失败:', error);
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功！`);
      logger.info(`📡 地址: http://localhost:${PORT}`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV}`);
      logger.info(`⏰ 时间: ${new Date().toISOString()}`);
    });
    
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
});

// 启动服务器
startServer();

module.exports = app;