const express = require('express');
const prisma = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Thống kê tổng quan (Admin only)
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Tổng quan
    const overview = await prisma.order.aggregate({
      where: {
        orderTime: {
          gte: daysAgo
        },
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

    // Tổng khách hàng
    const totalCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER'
      }
    });

    // Top món ăn bán chạy (dùng SQL để tránh hạn chế groupBy với quan hệ)
    const topDishRows = await prisma.$queryRaw`
      SELECT 
        oi.dish_id AS dishId,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.price * oi.quantity) AS revenue
      FROM order_items AS oi
      JOIN orders AS o ON o.id = oi.order_id
      WHERE o.order_time >= ${daysAgo}
        AND o.status != 'CANCELLED'
      GROUP BY oi.dish_id
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    // Lấy thông tin món ăn
    const dishIds = topDishRows.map(item => item.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    const topDishesWithInfo = topDishRows.map(item => {
      const dish = dishes.find(d => d.id === item.dishId);
      return {
        name: dish?.name || 'Unknown',
        image: dish?.image,
        total_sold: Number(item.total_quantity) || 0,
        revenue: Number(item.revenue) || 0
      };
    });

    // Thống kê theo ngày (dùng SQL để gom theo ngày)
    const dailyRows = await prisma.$queryRaw`
      SELECT 
        DATE(order_time) AS date,
        COUNT(*) AS orders,
        SUM(total_amount) AS revenue
      FROM orders
      WHERE order_time >= ${daysAgo}
        AND status != 'CANCELLED'
      GROUP BY DATE(order_time)
      ORDER BY date DESC
    `;

    // Thống kê theo giờ
    const hourlyStats = await prisma.$queryRaw`
      SELECT 
        HOUR(order_time) as hour,
        COUNT(*) as orders
      FROM orders 
      WHERE order_time >= ${daysAgo}
      AND status != 'CANCELLED'
      GROUP BY HOUR(order_time)
      ORDER BY hour
    `;

    res.json({
      overview: {
        total_orders: overview._count.id,
        total_revenue: overview._sum.totalAmount || 0,
        total_customers: totalCustomers,
        avg_order_value: overview._avg.totalAmount || 0
      },
      top_dishes: topDishesWithInfo,
      daily_stats: dailyRows.map(stat => ({
        date: (stat.date instanceof Date ? stat.date.toISOString().split('T')[0] : String(stat.date)),
        orders: Number(stat.orders) || 0,
        revenue: Number(stat.revenue) || 0
      })),
      hourly_stats: (hourlyStats || []).map(r => ({
        hour: Number(r.hour) || 0,
        orders: Number(r.orders) || 0
      }))
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ message: 'Failed to get analytics overview' });
  }
});

// Thống kê doanh thu
router.get('/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '12' } = req.query; // months
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(period));

    const revenueStats = await prisma.order.groupBy({
      by: ['orderTime'],
      where: {
        orderTime: {
          gte: monthsAgo
        },
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
      },
      orderBy: {
        orderTime: 'desc'
      }
    });

    // Group by month
    const monthlyData = revenueStats.reduce((acc, stat) => {
      const month = stat.orderTime.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { orders: 0, revenue: 0, avg_order_value: 0 };
      }
      acc[month].orders += stat._count.id;
      acc[month].revenue += stat._sum.totalAmount || 0;
      acc[month].avg_order_value = (acc[month].revenue / acc[month].orders) || 0;
      return acc;
    }, {});

    const revenueStatsFormatted = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ revenue_stats: revenueStatsFormatted });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Failed to get revenue stats' });
  }
});

// Thống kê khách hàng
router.get('/customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Khách hàng mới
    const newCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Khách hàng hoạt động
    const activeCustomers = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        orderTime: {
          gte: thirtyDaysAgo
        },
        status: {
          not: 'CANCELLED'
        }
      },
      _count: {
        userId: true
      }
    });

    // Top khách hàng
    const topCustomers = await prisma.order.groupBy({
      by: ['userId'],
      where: {
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
      orderBy: {
        _sum: {
          totalAmount: 'desc'
        }
      },
      take: 10
    });

    // Lấy thông tin khách hàng
    const userIds = topCustomers.map(customer => customer.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    const topCustomersWithInfo = topCustomers.map(customer => {
      const user = users.find(u => u.id === customer.userId);
      return {
        full_name: user?.fullName || 'Unknown',
        email: user?.email || 'Unknown',
        total_orders: customer._count.id,
        total_spent: customer._sum.totalAmount || 0
      };
    });

    res.json({
      new_customers: newCustomers,
      active_customers: activeCustomers.length,
      top_customers: topCustomersWithInfo
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ message: 'Failed to get customer stats' });
  }
});

// Thống kê món ăn
router.get('/dishes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Món ăn phổ biến (SQL để tránh hạn chế groupBy với quan hệ)
    const popularRows = await prisma.$queryRaw`
      SELECT 
        oi.dish_id AS dishId,
        COUNT(oi.id) AS order_count,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.price * oi.quantity) AS revenue
      FROM order_items AS oi
      JOIN orders AS o ON o.id = oi.order_id
      WHERE o.order_time >= ${daysAgo}
        AND o.status != 'CANCELLED'
      GROUP BY oi.dish_id
      ORDER BY total_quantity DESC
      LIMIT 20
    `;

    // Lấy thông tin món ăn
    const dishIds = popularRows.map(item => item.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: {
        id: true,
        name: true,
        image: true,
        price: true,
        rating: true
      }
    });

    const popularDishesWithInfo = popularRows.map(item => {
      const dish = dishes.find(d => d.id === item.dishId);
      return {
        name: dish?.name || 'Unknown',
        image: dish?.image,
        price: Number(dish?.price || 0),
        order_count: Number(item.order_count) || 0,
        total_quantity: Number(item.total_quantity) || 0,
        revenue: Number(item.revenue) || 0,
        avg_rating: Number(dish?.rating || 0)
      };
    });

    // Món ăn ít bán: ưu tiên món 0 đơn, sau đó món có tổng quantity thấp
    const aggLowRows = await prisma.$queryRaw`
      SELECT 
        oi.dish_id AS dishId,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM order_items AS oi
      JOIN orders AS o ON o.id = oi.order_id
      WHERE o.status != 'CANCELLED'
      GROUP BY oi.dish_id
      ORDER BY total_quantity ASC
      LIMIT 50
    `;

    const soldDishIds = (aggLowRows || []).map(r => r.dishId);
    // Lấy các món available nhưng chưa có đơn (0)
    const zeroSold = await prisma.dish.findMany({
      where: {
        isAvailable: true,
        id: { notIn: soldDishIds }
      },
      select: { id: true, name: true, image: true, price: true },
      take: 10
    });

    const zeroMapped = zeroSold.map(d => ({ id: d.id, name: d.name, image: d.image, price: d.price, totalOrders: 0 }));
    // Nếu chưa đủ 10, bổ sung từ danh sách đã bán với số lượng thấp
    const need = Math.max(0, 10 - zeroMapped.length);
    let lowMapped = [];
    if (need > 0) {
      const ids = aggLowRows.slice(0, 50).map(r => r.dishId);
      const dishes = await prisma.dish.findMany({
        where: { id: { in: ids }, isAvailable: true },
        select: { id: true, name: true, image: true, price: true }
      });
      const mapInfo = new Map(dishes.map(d => [d.id, d]));
      for (const r of aggLowRows) {
        const info = mapInfo.get(r.dishId);
        if (info) lowMapped.push({ id: info.id, name: info.name, image: info.image, price: info.price, totalOrders: Number(r.total_quantity || 0) });
        if (lowMapped.length >= need) break;
      }
    }

    const lowSellingDishes = [...zeroMapped, ...lowMapped];

    res.json({
      popular_dishes: popularDishesWithInfo,
      low_selling_dishes: lowSellingDishes
    });
  } catch (error) {
    console.error('Get dish stats error:', error);
    res.status(500).json({ message: 'Failed to get dish stats' });
  }
});

// Tổng số đơn hàng (tính từ bảng orders theo bộ lọc) - Admin only
router.get('/total-orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const where = {};

    if (from || to) {
      where.orderTime = {};
      if (from) where.orderTime.gte = new Date(from);
      if (to) where.orderTime.lte = new Date(to);
    }

    if (status) {
      const s = String(status).toUpperCase();
      where.status = s;
    } else {
      // Mặc định: loại CANCELLED
      where.status = { not: 'CANCELLED' };
    }

    const total = await prisma.order.count({ where });
    res.json({ total_orders: total });
  } catch (error) {
    console.error('Get total orders error:', error);
    res.status(500).json({ message: 'Failed to get total orders' });
  }
});

module.exports = router;
