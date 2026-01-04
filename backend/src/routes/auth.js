const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

// Đăng ký
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Tạo user mới
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        phone,
        address
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    // Tạo token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Tìm user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Kiểm tra password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Tạo token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          address: true,
          dateOfBirth: true,
          gender: true,
          lifetimeSpend: true,
          membershipTier: true,
          memberSince: true,
          role: true,
          avatar: true,
          preferences: true
        }
      });
    } catch (e) {
      // Fallback if database schema is missing new membership/profile columns
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          address: true,
          role: true,
          avatar: true,
          preferences: true
        }
      });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lifetime = Number(user?.lifetimeSpend || 0);
    const tier = user?.membershipTier || 'BRONZE';
    const since = user?.memberSince || null;

    res.json({
      user: {
        ...user,
        lifetimeSpend: lifetime,
        membershipTier: tier,
        memberSince: since
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user info' });
  }
});

// Cập nhật profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, address, preferences, dateOfBirth, gender } = req.body;
    const userId = req.user.id;

    const data = { fullName, phone, address, preferences };
    if (typeof dateOfBirth !== 'undefined') {
      data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (typeof gender !== 'undefined') {
      data.gender = gender;
    }

    await prisma.user.update({
      where: { id: userId },
      data
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;

// Forgot/Reset password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success for security even if user not found
    if (!user) return res.json({ message: 'If the email exists, a reset link was sent' });

    const token = jwt.sign({ userId: user.id, action: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Here you'd send email. For now, return the link for testing.
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: !!(process.env.SMTP_SECURE === 'true'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Reset your password',
          html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`
        });
      }
    } catch (mailErr) {
      console.error('Send reset email error:', mailErr);
    }
    return res.json({ message: 'Reset link generated', resetLink });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.action !== 'reset') return res.status(400).json({ message: 'Invalid token' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: payload.userId }, data: { password: hashedPassword } });
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// Đổi mật khẩu (yêu cầu đăng nhập)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Failed to change password' });
  }
});
