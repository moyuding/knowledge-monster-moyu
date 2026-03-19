const winston = require('winston');
const path = require('path');

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根据环境定义日志级别
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// 定义日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加颜色
winston.addColors(colors);

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 定义日志传输
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // 错误日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // 所有日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/all.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// 创建日志记录器
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// 创建HTTP请求日志记录器
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/http.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// 创建审计日志记录器
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/audit.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// 辅助函数：记录API请求
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  httpLogger.http('收到请求', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  // 保存原始的send方法
  const originalSend = res.send;
  
  // 重写send方法以记录响应
  res.send = function(body) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // 记录请求完成
    httpLogger.http('请求完成', {
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // 如果是错误响应，记录到错误日志
    if (statusCode >= 400) {
      logger.error('请求错误', {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        body: typeof body === 'string' ? body.substring(0, 500) : body // 限制日志长度
      });
    }
    
    // 调用原始的send方法
    originalSend.call(this, body);
  };
  
  next();
};

// 辅助函数：记录用户操作
const logUserAction = (userId, action, details = {}) => {
  auditLogger.info('用户操作', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// 辅助函数：记录系统事件
const logSystemEvent = (event, details = {}) => {
  logger.info('系统事件', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

// 辅助函数：记录错误
const logError = (error, context = {}) => {
  logger.error('系统错误', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// 辅助函数：记录性能数据
const logPerformance = (operation, duration, details = {}) => {
  logger.info('性能数据', {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString()
  });
};

// 辅助函数：记录数据库操作
const logDatabase = (operation, query, duration, result) => {
  logger.debug('数据库操作', {
    operation,
    query: typeof query === 'string' ? query.substring(0, 200) : query, // 限制日志长度
    duration: `${duration}ms`,
    resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
    timestamp: new Date().toISOString()
  });
};

// 创建日志目录
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  httpLogger,
  auditLogger,
  logRequest,
  logUserAction,
  logSystemEvent,
  logError,
  logPerformance,
  logDatabase
};