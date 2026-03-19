# 🐙 知识怪 - 奶茶店创业计算训练平台

> 七年级数学每日计算训练系统 · AI自动批改 · 游戏化学习

## 📋 项目概述

**知识怪**是一个专为七年级学生设计的数学计算训练平台，通过**奶茶店创业模拟**的游戏化方式，结合**AI自动批改**技术，让数学学习变得有趣且高效。

### 🎯 核心功能

- **🎮 游戏化学习** - 奶茶店创业模拟，通过答题获得创业资金
- **🤖 AI智能批改** - 三级批改策略（本地规则 → 简单AI → 深度AI）
- **📊 实时进度追踪** - 学生、教师双端数据可视化
- **📝 30天系统训练** - 分阶段训练计划，循序渐进
- **📱 多端适配** - 响应式设计，支持PC/平板/手机

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 (Vue 3)                         │
│                   vite + TypeScript + Element Plus          │
├─────────────────────────────────────────────────────────────┤
│                         后端 (Node.js)                       │
│                   Express + Supabase + JWT                  │
├─────────────────────────────────────────────────────────────┤
│                        AI批改模块                           │
│               三级策略 + DeepSeek API + 本地规则            │
├─────────────────────────────────────────────────────────────┤
│                        数据库 (Supabase)                     │
│                   PostgreSQL + 实时订阅                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- Supabase CLI (可选，用于本地数据库)
- Git

### 1. 克隆项目

```bash
git clone https://github.com/your-username/knowledge-monster.git
cd knowledge-monster
```

### 2. 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# 需要配置：Supabase、DeepSeek API、JWT密钥等
```

### 3. 安装依赖

```bash
# 安装所有模块依赖
./scripts/install-all.sh
```

### 4. 初始化数据库

```bash
# 使用Supabase CLI初始化本地数据库
./scripts/init-database.sh
```

### 5. 启动开发环境

```bash
# 一键启动所有服务（前端、后端、数据库）
./scripts/dev-start.sh
```

### 6. 访问应用

- 🌐 **前端界面**: http://localhost:5173
- 🔧 **后端API**: http://localhost:3000
- 🗄️ **数据库管理**: http://localhost:54323
- 📊 **API文档**: http://localhost:54321

### 测试账户

- 👨‍🏫 **教师账户**: teacher@example.com / teacher123
- 👨‍🎓 **学生账户**: student@example.com / student123 (班级代码: CLASS001)

## 📁 项目结构

```
knowledge-monster/
├── frontend/                 # 前端Vue 3应用
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   ├── components/      # 可复用组件
│   │   ├── stores/          # Pinia状态管理
│   │   ├── router/          # 路由配置
│   │   ├── styles/          # 样式文件
│   │   └── utils/           # 工具函数
│   └── vite.config.js       # Vite配置
│
├── backend/                  # 后端Node.js服务
│   ├── src/
│   │   ├── routes/          # API路由
│   │   ├── middleware/      # 中间件
│   │   ├── utils/           # 工具函数
│   │   └── index.js         # 主入口
│   └── package.json
│
├── ai-grader/               # AI批改模块
│   ├── src/
│   │   ├── ai-grader.js     # 核心批改逻辑
│   │   └── logger.js        # 日志工具
│   └── package.json
│
├── database/                # 数据库相关
│   ├── schema.sql          # 数据库架构
│   ├── seed.sql            # 种子数据
│   └── migrations/         # 数据库迁移
│
├── scripts/                # 自动化脚本
│   ├── dev-start.sh        # 开发环境启动
│   ├── init-database.sh    # 数据库初始化
│   └── install-all.sh      # 一键安装依赖
│
├── deploy/                 # 部署配置
│   ├── Dockerfile          # Docker配置
│   ├── docker-compose.yml  # Docker Compose
│   ├── vercel.json         # Vercel部署
│   └── railway.toml        # Railway部署
│
├── logs/                   # 日志文件（自动生成）
├── .env.example            # 环境变量示例
└── README.md              # 项目文档
```

## 🔧 开发指南

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

### 后端开发

```bash
cd backend
npm install
npm run dev
```

### AI批改模块开发

```bash
cd ai-grader
npm install
npm start
```

### 代码规范

- **ESLint**: Airbnb风格
- **Prettier**: 代码格式化
- **TypeScript**: 强类型检查
- **Git Hooks**: 提交前自动检查

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 🎮 游戏化设计

### 奶茶店创业模拟

1. **市场调研期** (第1-7天)
   - 基础计算，了解市场
   - 解锁：基础奶茶配方

2. **产品研发期** (第8-14天)
   - 分数、小数计算
   - 解锁：特色奶茶配方

3. **成本核算期** (第15-21天)
   - 百分比、比例计算
   - 解锁：店铺装饰

4. **分店筹备期** (第22-30天)
   - 综合应用题
   - 解锁：分店管理

### 成就系统

- ⚡ **闪电侠**: 5分钟内完成所有题目
- 🏆 **完美主义**: 连续3天正确率100%
- 💰 **创业先锋**: 累计获得10000创业资金
- 📈 **数据分析师**: 完成所有数据分析题目
- 🎯 **精准打击**: 连续10题全对

## 🤖 AI批改系统

### 三级批改策略

1. **本地规则批改 (70%)**
   - 基于预设规则的快速批改
   - 支持：选择题、填空题、计算题
   - 响应时间: <1秒

2. **简单AI批改 (25%)**
   - 基于语义分析和模式识别
   - 提供错误类型分析和学习建议
   - 响应时间: <3秒

3. **深度AI批改 (5%)**
   - 调用DeepSeek大模型
   - 深度错题分析和个性化建议
   - 响应时间: <10秒

### 错误分析类型

- **计算错误**: 进位、小数点、符号错误
- **概念错误**: 公式用错、定义不清
- **理解错误**: 题意理解偏差
- **粗心错误**: 看错数字、漏写单位

## 📊 数据模型

### 核心数据表

1. **users** - 用户表（学生/教师）
2. **classes** - 班级表
3. **training_plans** - 训练计划
4. **daily_tasks** - 每日任务
5. **student_records** - 学生记录
6. **error_records** - 错题记录
7. **achievements** - 成就系统
8. **game_data** - 游戏数据
9. **reports** - 报告系统

### 数据关系

```
用户 (1) → (n) 班级
班级 (1) → (n) 训练计划
训练计划 (1) → (n) 每日任务
学生 (1) → (n) 训练记录
训练记录 (1) → (n) 错题记录
学生 (1) → (n) 成就解锁
```

## 🚢 部署指南

### 本地部署 (Docker)

```bash
# 使用Docker Compose
cd deploy
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 云部署

#### Vercel (前端)

1. 导入项目到Vercel
2. 配置环境变量
3. 自动部署

#### Railway (后端)

1. 导入项目到Railway
2. 配置环境变量
3. 连接数据库

#### Supabase (数据库)

1. 创建Supabase项目
2. 导入数据库架构
3. 配置API密钥

### 环境变量配置

```env
# 前端
VITE_API_BASE_URL=https://your-backend-url/api

# 后端
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-url

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI服务
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_API_URL=https://api.volcengine.com/deepseek/v3
```

## 📈 性能优化

### 前端优化

- **代码分割**: 按路由懒加载
- **图片优化**: WebP格式 + 懒加载
- **缓存策略**: Service Worker + 本地存储
- **组件优化**: 虚拟滚动 + 防抖节流

### 后端优化

- **数据库索引**: 关键字段建立索引
- **查询优化**: 避免N+1查询
- **缓存层**: Redis缓存热点数据
- **连接池**: 数据库连接复用

### AI批改优化

- **批处理**: 批量请求合并
- **缓存结果**: 相似题目缓存
- **降级策略**: AI失败时自动降级
- **限流控制**: 防止API滥用

## 🔒 安全考虑

### 数据安全

- **加密传输**: HTTPS + TLS 1.3
- **数据加密**: 敏感字段加密存储
- **访问控制**: RBAC权限管理
- **审计日志**: 所有操作记录

### 应用安全

- **输入验证**: 所有输入严格验证
- **SQL防护**: 参数化查询
- **XSS防护**: 内容安全策略
- **CSRF防护**: 令牌验证

### AI安全

- **内容过滤**: 防止不当内容
- **隐私保护**: 匿名化处理数据
- **速率限制**: 防止API滥用
- **错误处理**: 优雅降级

## 🧪 测试策略

### 单元测试

```bash
# 前端测试
cd frontend
npm run test:unit

# 后端测试
cd backend
npm run test:unit

# AI模块测试
cd ai-grader
npm run test:unit
```

### 集成测试

```bash
# 运行所有集成测试
npm run test:integration
```

### E2E测试

```bash
# 使用Cypress进行端到端测试
npm run test:e2e
```

### 性能测试

```bash
# 使用k6进行压力测试
npm run test:performance
```

## 📚 API文档

### 认证相关

```
POST   /api/auth/login        # 用户登录
POST   /api/auth/register     # 用户注册
GET    /api/auth/profile      # 获取用户信息
PUT    /api/auth/profile      # 更新用户信息
POST   /api/auth/logout       # 用户登出
```

### 学生相关

```
GET    /api/students/training/today    # 获取今日训练
POST   /api/students/training/submit   # 提交训练答案
GET    /api/students/progress          # 获取学习进度
GET    /api/students/errors            # 获取错题本
GET    /api/students/achievements      # 获取成就
```

### 教师相关

```
GET    /api/teacher/classes            # 获取班级列表
GET    /api/teacher/classes/:id        # 获取班级详情
GET    /api/teacher/reports            # 获取报告列表
POST   /api/teacher/reports/generate   # 生成报告
GET    /api/teacher/analytics          # 获取分析数据
```

### AI批改相关

```
POST   /api/ai/grade                   # 单题批改
POST   /api/ai/batch-grade             # 批量批改
POST   /api/ai/analyze-error           # 错题分析
GET    /api/ai/stats                   # 获取统计信息
GET    /api/ai/health                  # 健康检查
```

## 🤝 贡献指南

1. **Fork项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建Pull Request**

### 开发规范

- 遵循现有代码风格
- 添加适当的测试
- 更新相关文档
- 确保向后兼容性

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- **Vue 3** - 渐进式JavaScript框架
- **Supabase** - 开源Firebase替代品
- **DeepSeek** - 强大的AI模型
- **Element Plus** - Vue 3组件库
- **Vercel** - 优秀的部署平台

## 📞 支持与反馈

- **问题反馈**: [GitHub Issues](https://github.com/your-username/knowledge-monster/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-username/knowledge-monster/discussions)
- **文档更新**: [GitHub Wiki](https://github.com/your-username/knowledge-monster/wiki)

---

**知识怪** - 让数学学习变得有趣！ 🐙✨