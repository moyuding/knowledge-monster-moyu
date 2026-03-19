#!/bin/bash

# 知识怪 - 开发环境启动脚本
# 启动前端、后端和数据库服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 日志文件
LOG_DIR="$PROJECT_ROOT/logs"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"
AI_GRADER_LOG="$LOG_DIR/ai-grader.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 打印带颜色的消息
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

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用 ($service)"
        return 1
    fi
    return 0
}

# 清理函数
cleanup() {
    print_info "正在停止所有服务..."
    
    # 停止所有后台进程
    pkill -f "node.*backend" || true
    pkill -f "vite" || true
    pkill -f "ai-grader" || true
    
    print_success "所有服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    # 检查 Supabase CLI (可选)
    if command -v supabase &> /dev/null; then
        print_success "Supabase CLI 已安装"
    else
        print_warning "Supabase CLI 未安装，数据库操作可能需要手动进行"
    fi
    
    print_success "依赖检查完成"
}

# 安装依赖
install_dependencies() {
    print_info "安装依赖..."
    
    # 前端依赖
    print_info "安装前端依赖..."
    cd "$PROJECT_ROOT/frontend"
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_info "前端依赖已存在，跳过安装"
    fi
    
    # 后端依赖
    print_info "安装后端依赖..."
    cd "$PROJECT_ROOT/backend"
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_info "后端依赖已存在，跳过安装"
    fi
    
    # AI批改模块依赖
    print_info "安装AI批改模块依赖..."
    cd "$PROJECT_ROOT/ai-grader"
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_info "AI批改模块依赖已存在，跳过安装"
    fi
    
    print_success "依赖安装完成"
}

# 启动数据库服务
start_database() {
    print_info "启动数据库服务..."
    
    # 检查是否已安装 Supabase CLI
    if command -v supabase &> /dev/null; then
        cd "$PROJECT_ROOT"
        
        # 检查是否已启动
        if supabase status | grep -q "supabase start" > /dev/null; then
            print_info "Supabase 服务已启动"
            return
        fi
        
        # 启动 Supabase
        print_info "启动 Supabase 本地开发环境..."
        supabase start > "$LOG_DIR/supabase.log" 2>&1 &
        SUPABASE_PID=$!
        
        # 等待服务启动
        sleep 5
        
        if ps -p $SUPABASE_PID > /dev/null; then
            print_success "Supabase 服务启动成功 (PID: $SUPABASE_PID)"
        else
            print_error "Supabase 服务启动失败"
            exit 1
        fi
    else
        print_warning "Supabase CLI 未安装，跳过数据库启动"
        print_info "请确保已配置远程 Supabase 数据库"
    fi
}

# 启动后端服务
start_backend() {
    print_info "启动后端服务..."
    
    # 检查端口
    if ! check_port 3000 "后端服务"; then
        print_error "后端服务端口被占用，请先停止占用 3000 端口的服务"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/backend"
    
    # 设置环境变量
    export NODE_ENV=development
    export PORT=3000
    
    # 启动服务
    print_info "启动后端服务 (端口: 3000)..."
    npm run dev > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    # 等待服务启动
    sleep 3
    
    # 检查服务是否启动
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "后端服务启动成功 (PID: $BACKEND_PID)"
        print_info "后端日志: $BACKEND_LOG"
    else
        print_error "后端服务启动失败"
        print_info "查看日志: $BACKEND_LOG"
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    print_info "启动前端服务..."
    
    # 检查端口
    if ! check_port 5173 "前端服务"; then
        print_error "前端服务端口被占用，请先停止占用 5173 端口的服务"
        exit 1
    fi
    
    cd "$PROJECT_ROOT/frontend"
    
    # 设置环境变量
    export VITE_API_BASE_URL=http://localhost:3000/api
    
    # 启动服务
    print_info "启动前端服务 (端口: 5173)..."
    npm run dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    # 等待服务启动
    sleep 5
    
    # 检查服务是否启动
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "前端服务启动成功 (PID: $FRONTEND_PID)"
        print_info "前端日志: $FRONTEND_LOG"
    else
        print_error "前端服务启动失败"
        print_info "查看日志: $FRONTEND_LOG"
        exit 1
    fi
}

# 启动AI批改服务
start_ai_grader() {
    print_info "启动AI批改服务..."
    
    # 检查端口
    if ! check_port 3001 "AI批改服务"; then
        print_warning "AI批改服务端口被占用，跳过启动"
        return
    fi
    
    cd "$PROJECT_ROOT/ai-grader"
    
    # 设置环境变量
    export NODE_ENV=development
    export PORT=3001
    
    # 启动服务
    print_info "启动AI批改服务 (端口: 3001)..."
    npm start > "$AI_GRADER_LOG" 2>&1 &
    AI_GRADER_PID=$!
    
    # 等待服务启动
    sleep 3
    
    # 检查服务是否启动
    if ps -p $AI_GRADER_PID > /dev/null; then
        print_success "AI批改服务启动成功 (PID: $AI_GRADER_PID)"
        print_info "AI批改日志: $AI_GRADER_LOG"
    else
        print_warning "AI批改服务启动失败，将使用内置批改功能"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}       知识怪开发环境启动完成          ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    echo -e "${BLUE}服务状态:${NC}"
    echo "  🔵 前端服务:   http://localhost:5173"
    echo "  🟢 后端服务:   http://localhost:3000"
    echo "  🟡 AI批改服务: http://localhost:3001"
    echo ""
    
    echo -e "${BLUE}API端点:${NC}"
    echo "  📡 健康检查:   http://localhost:3000/health"
    echo "  🤖 AI批改:     http://localhost:3000/api/ai/grade"
    echo "  📊 统计信息:   http://localhost:3000/api/ai/stats"
    echo ""
    
    echo -e "${BLUE}日志文件:${NC}"
    echo "  📝 前端日志:   $FRONTEND_LOG"
    echo "  📝 后端日志:   $BACKEND_LOG"
    echo "  📝 AI批改日志: $AI_GRADER_LOG"
    echo ""
    
    echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""
}

# 主函数
main() {
    print_info "启动知识怪开发环境..."
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 安装依赖
    install_dependencies
    
    # 启动数据库
    start_database
    
    # 启动后端
    start_backend
    
    # 启动前端
    start_frontend
    
    # 启动AI批改服务
    start_ai_grader
    
    # 显示状态
    show_status
    
    # 等待用户中断
    wait
}

# 运行主函数
main "$@"