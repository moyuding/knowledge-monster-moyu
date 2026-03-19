const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// 初始化Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 验证模式
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('student', 'teacher').required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().required(),
  role: Joi.string().valid('student', 'teacher').required(),
  classCode: Joi.string().optional().allow('') // 学生需要班级代码
});

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    // 验证输入
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.details[0].message 
      });
    }

    const { email, password, role } = req.body;

    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        classId: user.class_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // 记录登录日志
    logger.info('用户登录成功', { userId: user.id, role: user.role });

    // 返回用户信息和令牌
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        classId: user.class_id,
        settings: user.settings
      }
    });

  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    // 验证输入
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password, fullName, role, classCode } = req.body;

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '邮箱已被注册'
      });
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 准备用户数据
    const userData = {
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role,
      settings: {}
    };

    // 如果是学生，需要验证班级代码
    if (role === 'student' && classCode) {
      const { data: classInfo } = await supabase
        .from('classes')
        .select('id')
        .eq('join_code', classCode)
        .single();

      if (!classInfo) {
        return res.status(400).json({
          success: false,
          message: '班级代码无效'
        });
      }

      userData.class_id = classInfo.id;
    }

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // 如果是学生，初始化游戏数据
    if (role === 'student') {
      await supabase
        .from('game_data')
        .insert([{
          student_id: newUser.id,
          shop_name: `${fullName}的奶茶店`,
          funds: 1000,
          shop_level: 1,
          experience: 0,
          unlocked_recipes: [],
          unlocked_decorations: [],
          daily_streak: 0
        }]);
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        classId: newUser.class_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('用户注册成功', { userId: newUser.id, role: newUser.role });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        classId: newUser.class_id,
        settings: newUser.settings
      }
    });

  } catch (error) {
    logger.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc 获取用户信息
 * @access Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 如果是学生，获取游戏数据
    let gameData = null;
    if (user.role === 'student') {
      const { data: game } = await supabase
        .from('game_data')
        .select('*')
        .eq('student_id', userId)
        .single();
      
      gameData = game;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        classId: user.class_id,
        settings: user.settings,
        gameData
      }
    });

  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户信息
 * @access Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { fullName, avatarUrl, settings } = req.body;

    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (avatarUrl) updateData.avatar_url = avatarUrl;
    if (settings) updateData.settings = settings;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供更新数据'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        avatarUrl: updatedUser.avatar_url,
        settings: updatedUser.settings
      }
    });

  } catch (error) {
    logger.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', authenticate, (req, res) => {
  // 客户端应删除本地存储的token
  res.json({
    success: true,
    message: '登出成功'
  });
});

/**
 * @route POST /api/auth/refresh
 * @desc 刷新令牌
 * @access Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const { userId, email, role, classId } = req.user;

    // 生成新的JWT令牌
    const newToken = jwt.sign(
      {
        userId,
        email,
        role,
        classId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    logger.error('刷新令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '刷新失败'
    });
  }
});

module.exports = router;