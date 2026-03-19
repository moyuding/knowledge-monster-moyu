#!/bin/bash

echo "🚀 Railway 构建脚本"
echo "========================"

# 显示环境信息
echo "1. 环境检查:"
pwd
ls -la
echo "Node.js: $(which node 2>/dev/null || echo '未找到')"
echo "npm: $(which npm 2>/dev/null || echo '未找到')"
node --version 2>/dev/null || echo "Node.js 未安装"
npm --version 2>/dev/null || echo "npm 未安装"

echo -e "\n2. 进入项目目录:"
if cd knowledge-monster 2>/dev/null; then
    echo "✅ 进入 knowledge-monster 成功"
    pwd
    ls -la
else
    echo "❌ 无法进入 knowledge-monster"
    exit 1
fi

echo -e "\n3. 进入后端目录:"
if cd backend 2>/dev/null; then
    echo "✅ 进入 backend 成功"
    pwd
    ls -la
else
    echo "❌ 无法进入 backend"
    exit 1
fi

echo -e "\n4. 安装依赖:"
npm install --verbose

echo -e "\n5. 检查安装结果:"
ls -la node_modules/ | head -10

echo -e "\n6. 启动应用测试:"
echo "启动命令: node src/index.js"
echo "========================"