#!/bin/bash

echo "🚀 Starting Knowledge Monster Backend..."

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 检查环境变量
echo "🔧 Checking environment variables..."
if [ -z "$PORT" ]; then
  export PORT=3000
  echo "⚠️  PORT not set, defaulting to 3000"
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET is required but not set"
  exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL is required but not set"
  exit 1
fi

# 启动应用
echo "🎯 Starting Node.js application on port $PORT..."
exec node backend/src/index.js