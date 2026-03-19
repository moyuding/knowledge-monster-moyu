#!/bin/bash

# 知识怪 - 数据库初始化脚本
# 初始化Supabase数据库表结构和种子数据

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 数据库相关文件
SCHEMA_FILE="$PROJECT_ROOT/database/schema.sql"
SEED_FILE="$PROJECT_ROOT/database/seed.sql"
MIGRATIONS_DIR="$PROJECT_ROOT/database/migrations"

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

# 检查Supabase CLI
check_supabase() {
    print_info "检查Supabase CLI..."
    
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI 未安装"
        print_info "请参考: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    
    print_success "Supabase CLI 已安装"
}

# 检查Supabase项目状态
check_supabase_status() {
    print_info "检查Supabase项目状态..."
    
    cd "$PROJECT_ROOT"
    
    if ! supabase status > /dev/null 2>&1; then
        print_error "Supabase 项目未初始化"
        print_info "请先运行: supabase init"
        exit 1
    fi
    
    print_success "Supabase 项目已初始化"
}

# 启动Supabase服务
start_supabase() {
    print_info "启动Supabase服务..."
    
    cd "$PROJECT_ROOT"
    
    # 检查是否已启动
    if supabase status | grep -q "supabase start" > /dev/null; then
        print_info "Supabase 服务已启动"
        return
    fi
    
    # 启动服务
    print_info "启动Supabase本地开发环境..."
    supabase start
    
    # 等待服务完全启动
    sleep 5
    
    print_success "Supabase 服务启动成功"
}

# 应用数据库架构
apply_schema() {
    print_info "应用数据库架构..."
    
    if [ ! -f "$SCHEMA_FILE" ]; then
        print_error "架构文件不存在: $SCHEMA_FILE"
        exit 1
    fi
    
    print_info "执行架构SQL: $SCHEMA_FILE"
    
    # 使用Supabase CLI执行SQL
    supabase db reset --schema public --data-only=false
    
    print_success "数据库架构应用完成"
}

# 插入种子数据
insert_seed_data() {
    print_info "插入种子数据..."
    
    if [ ! -f "$SEED_FILE" ]; then
        print_warning "种子文件不存在: $SEED_FILE"
        print_info "创建默认种子数据..."
        create_default_seed_data
    fi
    
    print_info "执行种子SQL: $SEED_FILE"
    
    # 使用Supabase CLI执行SQL
    supabase db reset --schema public --data-only=true
    
    print_success "种子数据插入完成"
}

# 创建默认种子数据
create_default_seed_data() {
    cat > "$SEED_FILE" << 'EOF'
-- 知识怪 - 默认种子数据
-- 创建日期: 2024-03-18

-- 插入测试教师用户
INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'teacher@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye3Z6c7dFbWtZ3RjKqQ6J7X8Y9Z0C1D2E', -- password: teacher123
  '测试教师',
  'teacher',
  NOW()
);

-- 插入测试班级
INSERT INTO classes (id, name, grade, teacher_id, join_code, created_at) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  '七年级一班',
  '7',
  '11111111-1111-1111-1111-111111111111',
  'CLASS001',
  NOW()
);

-- 插入测试学生用户
INSERT INTO users (id, email, password_hash, full_name, role, class_id, created_at) VALUES
(
  '33333333-3333-3333-3333-333333333333',
  'student@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye3Z6c7dFbWtZ3RjKqQ6J7X8Y9Z0C1D2E', -- password: student123
  '测试学生',
  'student',
  '22222222-2222-2222-2222-222222222222',
  NOW()
);

-- 插入训练计划
INSERT INTO training_plans (id, name, description, total_days, current_day, status, class_id, created_at, started_at) VALUES
(
  '44444444-4444-4444-4444-444444444444',
  '奶茶店创业模拟 - 30天训练',
  '七年级数学每日计算训练，通过奶茶店创业游戏化学习',
  30,
  1,
  'active',
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
);

-- 插入第1天训练任务
INSERT INTO daily_tasks (id, day_number, plan_id, title, description, phase, knowledge_points, questions, correct_answers, difficulty_distribution, estimated_time, unlock_time, created_at) VALUES
(
  '55555555-5555-5555-5555-555555555555',
  1,
  '44444444-4444-4444-4444-444444444444',
  '市场调研期 - 第1天',
  '了解奶茶店市场，计算基础数据',
  'market_research',
  '["整数运算", "小数计算", "百分比"]',
  '[
    {
      "id": "q1-1",
      "type": "calculation",
      "text": "计算：25 + 37",
      "points": 100,
      "difficulty": "easy",
      "hint": "从个位开始计算，注意进位"
    },
    {
      "id": "q1-2",
      "type": "fill",
      "text": "一杯奶茶成本12.5元，售价25元，利润率是百分之几？",
      "points": 150,
      "difficulty": "medium",
      "hint": "利润率 = (售价 - 成本) / 成本 × 100%"
    },
    {
      "id": "q1-3",
      "type": "choice",
      "text": "如果每天卖出80杯奶茶，每杯利润12.5元，一个月（30天）总利润是多少？",
      "options": ["30000元", "3000元", "300元", "30元"],
      "points": 200,
      "difficulty": "hard",
      "hint": "总利润 = 每天杯数 × 每杯利润 × 天数"
    }
  ]',
  '["62", "100", "A"]',
  '{"easy": 1, "medium": 1, "hard": 1}',
  15,
  NOW(),
  NOW()
);

-- 插入学生游戏数据
INSERT INTO game_data (id, student_id, shop_name, funds, shop_level, experience, unlocked_recipes, unlocked_decorations, daily_streak, best_streak, last_active_date, created_at) VALUES
(
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333',
  '测试学生的奶茶店',
  1000.00,
  1,
  0,
  '[]',
  '[]',
  0,
  0,
  CURRENT_DATE,
  NOW()
);

-- 插入成就数据
INSERT INTO achievements (id, name, description, icon, rarity, condition_type, condition_value, reward_points, created_at) VALUES
(
  '77777777-7777-7777-7777-777777777777',
  '闪电侠',
  '在5分钟内完成所有题目',
  '⚡',
  'rare',
  'time_limit',
  '{"maxMinutes": 5}',
  500,
  NOW()
),
(
  '88888888-8888-8888-8888-888888888888',
  '完美主义',
  '连续3天正确率100%',
  '🏆',
  'epic',
  'accuracy_streak',
  '{"minAccuracy": 100, "days": 3}',
  1000,
  NOW()
),
(
  '99999999-9999-9999-9999-999999999999',
  '创业先锋',
  '累计获得10000创业资金',
  '💰',
  'legendary',
  'total_funds',
  '{"minFunds": 10000}',
  2000,
  NOW()
);

-- 插入学生成就
INSERT INTO student_achievements (id, student_id, achievement_id, unlocked_at, progress) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  '77777777-7777-7777-7777-777777777777',
  NOW(),
  '{"currentTime": 280, "targetTime": 300}'
);

-- 插入报告数据
INSERT INTO reports (id, teacher_id, class_id, report_type, period_start, period_end, content, summary, sent_to, sent_at, created_at) VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'weekly',
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE,
  '{
    "totalStudents": 1,
    "activeStudents": 1,
    "averageAccuracy": 85.5,
    "totalQuestions": 30,
    "commonErrors": ["进位错误", "小数点位置错误"],
    "topPerformers": ["测试学生"],
    "recommendations": ["加强进位练习", "复习小数运算"]
  }',
  '本周班级整体表现良好，平均正确率85.5%。建议加强进位和小数点练习。',
  '["teacher@example.com"]',
  NOW(),
  NOW()
);

-- 插入学生训练记录
INSERT INTO student_records (id, student_id, task_id, answers, is_completed, score, accuracy, time_spent, submitted_at, graded_at, ai_feedback, error_analysis, created_at) VALUES
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  '55555555-5555-5555-5555-555555555555',
  '["62", "100", "A"]',
  true,
  450,
  100.00,
  10,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour',
  '{
    "q1-1": "回答正确！计算准确。",
    "q1-2": "完全正确！利润率计算无误。",
    "q1-3": "正确！总利润计算正确。"
  }',
  '{
    "q1-1": null,
    "q1-2": null,
    "q1-3": null
  }',
  NOW()
);

-- 插入错题记录
INSERT INTO error_records (id, student_id, task_id, question_id, question_text, student_answer, correct_answer, error_type, error_detail, ai_suggestion, is_corrected, corrected_at, retry_count, last_retry_at, created_at) VALUES
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '33333333-3333-3333-3333-333333333333',
  '55555555-5555-5555-5555-555555555555',
  'q1-2',
  '一杯奶茶成本12.5元，售价25元，利润率是百分之几？',
  '50',
  '100',
  'calculation',
  '忘记乘以100%',
  '利润率计算需要乘以100%转换为百分比',
  true,
  NOW(),
  1,
  NOW(),
  NOW()
);
EOF
    
    print_success "默认种子数据已创建: $SEED_FILE"
}

# 创建迁移目录
create_migrations_dir() {
    print_info "创建迁移目录..."
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        mkdir -p "$MIGRATIONS_DIR"
        print_success "迁移目录已创建: $MIGRATIONS_DIR"
    else
        print_info "迁移目录已存在: $MIGRATIONS_DIR"
    fi
    
    # 创建示例迁移文件
    local example_migration="$MIGRATIONS_DIR/20240318000000_create_users_table.sql"
    if [ ! -f "$example_migration" ]; then
        cat > "$example_migration" << 'EOF'
-- Migration: create_users_table
-- Created: 2024-03-18

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  full_name VARCHAR(255),
  avatar_url TEXT,
  class_id UUID,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMIT;
EOF
        print_success "示例迁移文件已创建: $example_migration"
    fi
}

# 显示数据库连接信息
show_connection_info() {
    print_info "获取数据库连接信息..."
    
    cd "$PROJECT_ROOT"
    
    local status_output=$(supabase status)
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}       数据库连接信息                  ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # 提取连接信息
    local db_url=$(echo "$status_output" | grep "DB URL" | cut -d':' -f2- | xargs)
    local api_url=$(echo "$status_output" | grep "API URL" | cut -d':' -f2- | xargs)
    local anon_key=$(echo "$status_output" | grep "anon key" | cut -d':' -f2- | xargs)
    local service_key=$(echo "$status_output" | grep "service_role key" | cut -d':' -f2- | xargs)
    
    echo -e "${BLUE}数据库 URL:${NC}"
    echo "  $db_url"
    echo ""
    
    echo -e "${BLUE}API URL:${NC}"
    echo "  $api_url"
    echo ""
    
    echo -e "${BLUE}匿名密钥 (anon key):${NC}"
    echo "  $anon_key"
    echo ""
    
    echo -e "${BLUE}服务密钥 (service_role key):${NC}"
    echo "  $service_key"
    echo ""
    
    echo -e "${YELLOW}提示:${NC}"
    echo "  1. 将以上信息填入 .env 文件"
    echo "  2. 使用 Supabase Studio 管理数据: http://localhost:54323"
    echo "  3. 使用 pgAdmin 连接数据库: http://localhost:5050"
    echo ""
}

# 验证数据库连接
verify_database_connection() {
    print_info "验证数据库连接..."
    
    cd "$PROJECT_ROOT"
    
    # 获取数据库连接信息
    local db_url=$(supabase status | grep "DB URL" | cut -d':' -f2- | xargs)
    
    if [ -z "$db_url" ]; then
        print_error "无法获取数据库连接信息"
        return 1
    fi
    
    # 尝试连接数据库
    if psql "$db_url" -c "SELECT 1" > /dev/null 2>&1; then
        print_success "数据库连接验证成功"
        return 0
    else
        print_error "数据库连接验证失败"
        return 1
    fi
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}       数据库初始化完成                ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    echo -e "${BLUE}测试账户:${NC}"
    echo "  👨‍🏫 教师账户:"
    echo "    - 邮箱: teacher@example.com"
    echo "    - 密码: teacher123"
    echo ""
    echo "  👨‍🎓 学生账户:"
    echo "    - 邮箱: student@example.com"
    echo "    - 密码: student123"
    echo ""
    
    echo -e "${BLUE}管理界面:${NC}"
    echo "  🌐 Supabase Studio: http://localhost:54323"
    echo "  🗄️  pgAdmin: http://localhost:5050"
    echo "  📊  API文档: http://localhost:54321"
    echo ""
    
    echo -e "${YELLOW}下一步:${NC}"
    echo "  1. 启动开发环境: ./scripts/dev-start.sh"
    echo "  2. 访问前端: http://localhost:5173"
    echo "  3. 使用测试账户登录"
    echo ""
}

# 主函数
main() {
    print_info "开始初始化知识怪数据库..."
    echo ""
    
    # 检查Supabase CLI
    check_supabase
    
    # 检查项目状态
    check_supabase_status
    
    # 启动Supabase服务
    start_supabase
    
    # 应用架构
    apply_schema
    
    # 插入种子数据
    insert_seed_data
    
    # 创建迁移目录
    create_migrations_dir
    
    # 验证连接
    verify_database_connection
    
    # 显示连接信息
    show_connection_info
    
    # 显示完成信息
    show_completion_info
}

# 运行主函数
main "$@"