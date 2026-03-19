#!/bin/bash

# 知识怪 - 依赖安装脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js
check_node() {
    print_info "检查Node.js版本..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        print_info "请访问: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ $major_version -lt 18 ]; then
        print_error "Node.js 版本过低 (当前: $node_version，需要: 18+)"
        exit 1
    fi
    
    print_success "Node.js 版本: $node_version"
}

# 检查npm
check_npm() {
    print_info "检查npm版本..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    local npm_version=$(npm -v)
    print_success "npm 版本: $npm_version"
}

# 安装前端依赖
install_frontend() {
    print_info "安装前端依赖..."
    
    cd frontend
    
    if [ -d "node_modules" ]; then
        print_warning "前端依赖已存在，跳过安装"
        cd ..
        return
    fi
    
    print_info "正在安装前端依赖，这可能需要几分钟..."
    
    if npm install; then
        print_success "前端依赖安装完成"
    else
        print_error "前端依赖安装失败"
        exit 1
    fi
    
    cd ..
}

# 安装后端依赖
install_backend() {
    print_info "安装后端依赖..."
    
    cd backend
    
    if [ -d "node_modules" ]; then
        print_warning "后端依赖已存在，跳过安装"
        cd ..
        return
    fi
    
    print_info "正在安装后端依赖，这可能需要几分钟..."
    
    if npm install; then
        print_success "后端依赖安装完成"
    else
        print_error "后端依赖安装失败"
        exit 1
    fi
    
    cd ..
}

# 安装AI批改模块依赖
install_ai_grader() {
    print_info "安装AI批改模块依赖..."
    
    cd ai-grader
    
    if [ -d "node_modules" ]; then
        print_warning "AI批改模块依赖已存在，跳过安装"
        cd ..
        return
    fi
    
    print_info "正在安装AI批改模块依赖..."
    
    if npm install; then
        print_success "AI批改模块依赖安装完成"
    else
        print_warning "AI批改模块依赖安装失败，但可以继续"
    fi
    
    cd ..
}

# 主函数
main() {
    print_info "开始安装知识怪项目依赖..."
    echo ""
    
    # 检查环境
    check_node
    check_npm
    
    # 安装依赖
    install_frontend
    install_backend
    install_ai_grader
    
    echo ""
    print_success "所有依赖安装完成！"
    echo ""
    print_info "下一步: 运行 ./scripts/dev-start.sh 启动开发环境"
}

# 运行主函数
main "$@"