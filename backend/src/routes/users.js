const express = require('express');
const prisma = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Lấy danh sách users (Admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { fullName: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Cập nhật role user (Admin only)
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['CUSTOMER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role }
    });

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Lấy thống kê user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Tổng đơn hàng
    const orderStats = await prisma.order.aggregate({
      where: {
        userId,
        status: {
          not: 'CANCELLED'
        }
      },
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      _avg: {
        totalAmount: true
      }
    });

    // Món ăn yêu thích
    const favoriteDishes = await prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: {
          userId,
          status: {
            not: 'CANCELLED'
          }
        }
      },
      _sum: {
        quantity: true
      },
      _count: {
        dishId: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    // Lấy thông tin món ăn
    const dishIds = favoriteDishes.map(fav => fav.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    const favoriteDishesWithInfo = favoriteDishes.map(fav => {
      const dish = dishes.find(d => d.id === fav.dishId);
      return {
        name: dish?.name || 'Unknown',
        image: dish?.image,
        total_ordered: fav._sum.quantity
      };
    });

    // Thống kê theo tháng
    const monthlyStats = await prisma.order.groupBy({
      by: ['orderTime'],
      where: {
        userId,
        status: {
          not: 'CANCELLED'
        }
      },
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      }
    });

    // Group by month
    const monthlyData = monthlyStats.reduce((acc, stat) => {
      const month = stat.orderTime.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { orders: 0, revenue: 0 };
      }
      acc[month].orders += stat._count.id;
      acc[month].revenue += stat._sum.totalAmount || 0;
      return acc;
    }, {});

    const monthlyStatsFormatted = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    res.json({
      order_stats: {
        total_orders: orderStats._count.id,
        total_spent: orderStats._sum.totalAmount || 0,
        avg_order_value: orderStats._avg.totalAmount || 0
      },
      favorite_dishes: favoriteDishesWithInfo,
      monthly_stats: monthlyStatsFormatted
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to get user stats' });
  }
});

module.exports = router;
