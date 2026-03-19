#!/usr/bin/env node

/**
 * 知识怪 - 项目结构测试
 * 无需依赖，直接检查文件完整性
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 知识怪 - 项目完整性检查\n');

// 检查的目录和文件
const checkList = [
  { path: 'frontend/src/App.vue', desc: '前端主组件' },
  { path: 'frontend/src/views/student/Training.vue', desc: '学生训练页面' },
  { path: 'backend/src/index.js', desc: '后端主入口' },
  { path: 'backend/src/routes/auth.js', desc: '认证路由' },
  { path: 'ai-grader/src/ai-grader.js', desc: 'AI批改核心' },
  { path: 'database/schema.sql', desc: '数据库架构' },
  { path: 'scripts/dev-start.sh', desc: '开发启动脚本' },
  { path: 'deploy/Dockerfile', desc: 'Docker配置' },
  { path: 'README.md', desc: '项目文档' }
];

let passed = 0;
let total = checkList.length;

console.log('📁 检查项目文件完整性:');
console.log('='.repeat(50));

checkList.forEach(item => {
  const fullPath = path.join(__dirname, item.path);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${item.desc}: ${item.path} (${stats.size} bytes)`);
    passed++;
  } else {
    console.log(`❌ ${item.desc}: ${item.path} (文件缺失)`);
  }
});

console.log('='.repeat(50));

// 检查目录结构
console.log('\n📂 检查目录结构:');
const directories = [
  'frontend/src/components',
  'frontend/src/stores',
  'frontend/src/router',
  'backend/src/middleware',
  'backend/src/utils',
  'database/migrations',
  'logs'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ 目录存在: ${dir}`);
  } else {
    console.log(`⚠️  目录缺失: ${dir} (可以后续创建)`);
  }
});

// 统计
console.log('\n📊 检查结果统计:');
console.log(`- 总检查项: ${total}`);
console.log(`- 通过项: ${passed}`);
console.log(`- 通过率: ${Math.round((passed / total) * 100)}%`);

if (passed === total) {
  console.log('\n🎉 所有核心文件完整！项目结构良好。');
} else if (passed >= total * 0.8) {
  console.log('\n👍 大部分文件完整，可以开始开发。');
} else {
  console.log('\n⚠️  部分文件缺失，建议补充。');
}

// 显示项目信息
console.log('\n📋 项目基本信息:');
console.log('- 项目名称: 知识怪 (Knowledge Monster)');
console.log('- 项目类型: 教育科技平台');
console.log('- 目标用户: 七年级学生');
console.log('- 核心功能: AI批改 + 游戏化学习');
console.log('- 技术栈: Vue 3 + Node.js + Supabase');

// 测试账户信息
console.log('\n👥 测试账户信息:');
console.log('- 学生账户: student@example.com / student123');
console.log('- 教师账户: teacher@example.com / teacher123');
console.log('- 班级代码: CLASS001');

// 部署信息
console.log('\n🚀 部署方案:');
console.log('- 前端: Vercel (免费托管)');
console.log('- 后端: Railway (自动部署)');
console.log('- 数据库: Supabase (免费层)');
console.log('- 容器: Docker (开发环境)');

// 下一步建议
console.log('\n🎯 下一步建议:');
console.log('1. 等待依赖安装完成');
console.log('2. 运行: chmod +x scripts/*.sh');
console.log('3. 运行: ./scripts/dev-start.sh');
console.log('4. 访问: http://localhost:5173');
console.log('5. 使用测试账户登录体验');

console.log('\n🐙 知识怪 - 项目完整性检查完成！');