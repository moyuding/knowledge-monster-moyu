# 知识怪 - Docker配置
# 多阶段构建，优化镜像大小

# 第一阶段：前端构建
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端文件
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# 第二阶段：后端构建
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端文件
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

# 第三阶段：AI批改模块构建
FROM node:18-alpine AS ai-builder

WORKDIR /app/ai-grader

# 复制AI批改模块文件
COPY ai-grader/package*.json ./
RUN npm ci --only=production

COPY ai-grader/ ./

# 第四阶段：生产镜像
FROM node:18-alpine

# 安装必要的系统工具
RUN apk add --no-cache \
    bash \
    curl \
    tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建非root用户
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder /app/backend ./backend
COPY --from=ai-builder /app/ai-grader ./ai-grader

# 复制其他必要文件
COPY database/ ./database/
COPY scripts/ ./scripts/
COPY package*.json ./

# 设置权限
RUN chown -R nodejs:nodejs /app \
    && chmod +x ./scripts/*.sh

# 切换到非root用户
USER nodejs

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=Asia/Shanghai

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "backend/src/index.js"]