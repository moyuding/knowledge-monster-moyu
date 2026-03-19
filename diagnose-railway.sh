#!/bin/bash

echo "🔍 Railway 环境诊断脚本"
echo "=============================="

echo "1. 当前目录和内容:"
pwd
ls -la

echo -e "\n2. 查找 backend 目录:"
find . -type d -name "backend" 2>/dev/null

echo -e "\n3. 查找 package.json 文件:"
find . -name "package.json" -type f 2>/dev/null | head -10

echo -e "\n4. 检查 Node.js 和 npm:"
which node 2>/dev/null || echo "node: 未找到"
which npm 2>/dev/null || echo "npm: 未找到"
node --version 2>/dev/null || echo "Node.js 未安装"
npm --version 2>/dev/null || echo "npm 未安装"

echo -e "\n5. 尝试不同路径:"
PATHS=(
    "."
    "knowledge-monster"
    "knowledge-monster/knowledge-monster"
    "knowledge-monster/backend"
    "backend"
    "app"
    "workspace"
)

for path in "${PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ 目录存在: $path"
        echo "   内容: $(ls "$path" | tr '\n' ' ')"
    else
        echo "❌ 目录不存在: $path"
    fi
done

echo -e "\n6. 自动查找并构建:"
BACKEND_DIR=$(find . -type d -name "backend" 2>/dev/null | head -1)
if [ -n "$BACKEND_DIR" ]; then
    echo "找到 backend 目录: $BACKEND_DIR"
    cd "$BACKEND_DIR"
    echo "当前目录: $(pwd)"
    
    if [ -f "package.json" ]; then
        echo "找到 package.json，开始安装依赖..."
        npm install --verbose
    else
        echo "错误：backend 目录中没有 package.json"
        find . -name "package.json" | head -5
    fi
else
    echo "错误：找不到 backend 目录"
    echo "所有目录:"
    find . -type d | head -20
fi

echo "=============================="