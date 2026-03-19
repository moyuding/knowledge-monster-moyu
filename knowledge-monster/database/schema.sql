-- 知识怪数据库架构
-- 创建日期: 2024-03-18

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================ 用户表 ================
CREATE TABLE users (
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

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_class_id ON users(class_id);
CREATE INDEX idx_users_role ON users(role);

-- ================ 班级表 ================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id),
  join_code VARCHAR(10) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_grade ON classes(grade);

-- ================ 训练计划表 ================
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  total_days INTEGER NOT NULL,
  current_day INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_training_plans_class_id ON training_plans(class_id);
CREATE INDEX idx_training_plans_status ON training_plans(status);

-- ================ 每日任务表 ================
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_number INTEGER NOT NULL,
  plan_id UUID NOT NULL REFERENCES training_plans(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  phase VARCHAR(50),
  knowledge_points JSONB,
  questions JSONB NOT NULL,
  correct_answers JSONB NOT NULL,
  difficulty_distribution JSONB,
  estimated_time INTEGER,
  unlock_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, day_number)
);

-- 索引
CREATE INDEX idx_daily_tasks_plan_id ON daily_tasks(plan_id);
CREATE INDEX idx_daily_tasks_day_number ON daily_tasks(day_number);
CREATE INDEX idx_daily_tasks_unlock_time ON daily_tasks(unlock_time);

-- ================ 学生训练记录表 ================
CREATE TABLE student_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  task_id UUID NOT NULL REFERENCES daily_tasks(id),
  answers JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  accuracy DECIMAL(5,2),
  time_spent INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  ai_feedback JSONB,
  error_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, task_id)
);

-- 索引
CREATE INDEX idx_student_records_student_id ON student_records(student_id);
CREATE INDEX idx_student_records_task_id ON student_records(task_id);
CREATE INDEX idx_student_records_submitted_at ON student_records(submitted_at);
CREATE INDEX idx_student_records_is_completed ON student_records(is_completed);

-- ================ 错题表 ================
CREATE TABLE error_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  task_id UUID NOT NULL REFERENCES daily_tasks(id),
  question_id VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  student_answer TEXT,
  correct_answer TEXT NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  error_detail TEXT,
  ai_suggestion TEXT,
  is_corrected BOOLEAN DEFAULT FALSE,
  corrected_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_error_records_student_id ON error_records(student_id);
CREATE INDEX idx_error_records_error_type ON error_records(error_type);
CREATE INDEX idx_error_records_created_at ON error_records(created_at);
CREATE INDEX idx_error_records_is_corrected ON error_records(is_corrected);

-- ================ 成就表 ================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  rarity VARCHAR(20) DEFAULT 'common',
  condition_type VARCHAR(50) NOT NULL,
  condition_value JSONB NOT NULL,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 学生成就解锁表
CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id),
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress JSONB,
  UNIQUE(student_id, achievement_id)
);

-- 索引
CREATE INDEX idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_achievement_id ON student_achievements(achievement_id);

-- ================ 游戏数据表 ================
CREATE TABLE game_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  shop_name VARCHAR(100) DEFAULT '我的奶茶店',
  funds DECIMAL(10,2) DEFAULT 0,
  shop_level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  unlocked_recipes JSONB DEFAULT '[]',
  unlocked_decorations JSONB DEFAULT '[]',
  daily_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_game_data_student_id ON game_data(student_id);
CREATE INDEX idx_game_data_shop_level ON game_data(shop_level);

-- ================ 报告表 ================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  report_type VARCHAR(50) NOT NULL,
  period_start DATE,
  period_end DATE,
  content JSONB NOT NULL,
  summary TEXT,
  sent_to JSONB DEFAULT '[]',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_reports_teacher_id ON reports(teacher_id);
CREATE INDEX idx_reports_class_id ON reports(class_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- ================ 触发器：更新时间戳 ================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_plans_updated_at BEFORE UPDATE ON training_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_records_updated_at BEFORE UPDATE ON student_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_data_updated_at BEFORE UPDATE ON game_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================ 初始数据 ================
-- 将在 seed.sql 中插入