const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * 认证中间件
 * 验证JWT令牌并附加用户信息到请求对象
 */
const authenticate = (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 附加用户信息到请求对象
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      classId: decoded.classId
    };

    next();
  } catch (error) {
    logger.error('认证失败:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期，请重新登录'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }

    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
};

/**
 * 角色检查中间件
 * @param {Array} allowedRoles - 允许的角色数组
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 速率限制中间件
 * 防止API滥用
 */
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 验证中间件
 * 使用Joi验证请求体
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: '验证失败',
        errors
      });
    }
    
    next();
  };
};

/**
 * 日志中间件
 * 记录请求和响应
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  logger.info('收到请求', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // 保存原始的send方法
  const originalSend = res.send;
  
  // 重写send方法以记录响应
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    logger.info('请求完成', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    // 调用原始的send方法
    originalSend.call(this, body);
  };
  
  next();
};

/**
 * 安全检查中间件
 * 防止常见安全攻击
 */
const securityChecks = (req, res, next) => {
  // 检查请求体大小
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    return res.status(413).json({
      success: false,
      message: '请求体过大'
    });
  }
  
  // 检查内容类型
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: '不支持的内容类型'
      });
    }
  }
  
  next();
};

/**
 * CORS中间件
 */
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  authenticate,
  authorize,
  apiLimiter,
  validate,
  requestLogger,
  securityChecks,
  corsOptions
};