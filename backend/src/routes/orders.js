const express = require('express');
const prisma = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const TIER_THRESHOLDS = {
  SILVER: 2000000,
  GOLD: 5000000,
  PLATINUM: 10000000,
};

function computeTier(total) {
  if (total >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (total >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (total >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

// Tạo đơn hàng mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, delivery_address, notes, payment_method, delivery_time } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order items required' });
    }

    // Tính tổng tiền: cho phép giá đã giảm nếu hợp lệ (<= giá hiện tại)
    let baseTotal = 0;
    let totalAmount = 0;
    const validatedItems = [];
    for (const item of items) {
      const dish = await prisma.dish.findUnique({
        where: { id: item.dish_id }
      });
      if (!dish || !dish.isAvailable) {
        throw new Error(`Dish with ID ${item.dish_id} not found or unavailable`);
      }
      const q = Math.max(1, parseInt(item.quantity || 1));
      const dishPrice = Number(dish.price);
      baseTotal += dishPrice * q;
      // client có thể gửi item.price (đã giảm) hoặc bỏ trống
      const candidate = item.price != null ? Number(item.price) : dishPrice;
      // bảo vệ: không cho giảm quá 70% 1 món, và không âm/0
      const minAllowed = dishPrice * 0.3; // tối đa giảm 70%
      const finalUnitPrice = (candidate > 0 && candidate <= dishPrice && candidate >= minAllowed)
        ? candidate
        : dishPrice;
      totalAmount += finalUnitPrice * q;
      validatedItems.push({
        dishId: item.dish_id,
        quantity: q,
        unitPrice: finalUnitPrice,
        specialRequests: item.special_requests || ''
      });
    }

    // Chuẩn hóa phương thức thanh toán từ frontend -> Prisma enum
    const paymentMap = {
      cod: 'CASH',
      card: 'CARD',
      bank: 'BANK_TRANSFER',
    };
    const rawPayment = (payment_method || '').toString().trim();
    const mappedPaymentMethod = paymentMap[rawPayment.toLowerCase()] || rawPayment.toUpperCase();

    const validPaymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER'];
    if (!validPaymentMethods.includes(mappedPaymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Parse optional delivery time (custom time from client)
    let deliveryDate = null;
    if (delivery_time) {
      const dt = new Date(delivery_time);
      if (isNaN(dt.getTime())) {
        return res.status(400).json({ message: 'Invalid delivery_time' });
      }
      deliveryDate = dt;
    }

    // Tạo order number
    const orderNumber = `SF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Tạo đơn hàng với transaction
    const order = await prisma.$transaction(async (tx) => {
      // Tạo đơn hàng
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          totalAmount,
          deliveryAddress: delivery_address,
          notes,
          deliveryTime: deliveryDate,
          paymentMethod: mappedPaymentMethod,
          // Mặc định: nếu không phải COD thì coi như đã thanh toán thành công
          paymentStatus: mappedPaymentMethod === 'CASH' ? 'PENDING' : 'PAID'
        }
      });

      // Thêm chi tiết đơn hàng với giá đã xác thực
      for (const vItem of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            dishId: vItem.dishId,
            quantity: vItem.quantity,
            price: vItem.unitPrice,
            specialRequests: vItem.specialRequests
          }
        });
      }

      // Cập nhật lifetime spend và membership tier ngay cho thanh toán không phải COD
      if (mappedPaymentMethod !== 'CASH') {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            lifetimeSpend: { increment: totalAmount }
          },
          select: { id: true, lifetimeSpend: true, membershipTier: true, memberSince: true }
        });

        const lifetime = Number(updatedUser.lifetimeSpend || 0);
        const computedTier = computeTier(lifetime);
        if (computedTier !== updatedUser.membershipTier) {
          await tx.user.update({
            where: { id: updatedUser.id },
            data: {
              membershipTier: computedTier,
              memberSince: updatedUser.memberSince ?? new Date()
            }
          });
        }
      }

      return newOrder;
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        order_number: order.orderNumber,
        total_amount: order.totalAmount,
        status: order.status
      },
      membershipUpdated: mappedPaymentMethod !== 'CASH' // Thêm flag để frontend biết cần refresh
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
});

// Lấy lịch sử đơn hàng của user
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 10, offset = 0, page, pageSize } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const take = parseInt(pageSize || limit);
    const maybePage = parseInt(page);
    const fallbackSkip = parseInt(offset);
    const skip = Number.isInteger(maybePage) && maybePage > 0 ? (maybePage - 1) * take : fallbackSkip;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              dish: {
                select: {
                  name: true,
                  image: true
                }
              }
            }
          }
        },
        orderBy: { orderTime: 'desc' },
        take,
        skip
      })
    ]);

    // Transform data
    const processedOrders = await Promise.all(orders.map(async (order) => {
      // Tính giá gốc theo giá hiện tại của món (lưu ý: có thể lệch nếu giá đã thay đổi sau khi đặt)
      let baseTotal = 0;
      let finalTotal = Number(order.totalAmount);
      const items = await Promise.all(order.orderItems.map(async (item) => {
        const dish = await prisma.dish.findUnique({ where: { id: item.dishId }, select: { price: true } });
        const originalUnit = Number(dish?.price || item.price);
        const itemBase = originalUnit * item.quantity;
        baseTotal += itemBase;
        return {
          id: item.id,
          dish_id: item.dishId,
          dish_name: item.dish.name,
          dish_image: item.dish.image,
          quantity: item.quantity,
          price: item.price,
          original_price: originalUnit,
          item_discount: (originalUnit - Number(item.price)) * item.quantity,
          special_requests: item.specialRequests
        };
      }));
      const discountTotal = baseTotal - finalTotal;
      return {
        ...order,
        order_number: order.orderNumber,
        total_amount: order.totalAmount,
        delivery_address: order.deliveryAddress,
        order_time: order.orderTime,
        delivery_time: order.deliveryTime,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        items,
        order_base_total: baseTotal,
        order_discount_total: discountTotal,
        order_final_total: finalTotal
      };
    }));

    const currentPage = Number.isInteger(maybePage) && maybePage > 0 ? maybePage : Math.floor(skip / take) + 1;
    const totalPages = Math.max(1, Math.ceil(total / take));

    res.json({
      orders: processedOrders,
      pagination: {
        total,
        page: currentPage,
        pageSize: take,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Lấy chi tiết đơn hàng
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId
      },
      include: {
        orderItems: {
          include: {
            dish: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Bổ sung minh bạch giá
    let baseTotal = 0;
    const items = await Promise.all(order.orderItems.map(async (item) => {
      const dishCur = await prisma.dish.findUnique({ where: { id: item.dishId }, select: { price: true } });
      const originalUnit = Number(dishCur?.price || item.price);
      baseTotal += originalUnit * item.quantity;
      return {
        id: item.id,
        dish_id: item.dishId,
        dish_name: item.dish.name,
        dish_image: item.dish.image,
        quantity: item.quantity,
        price: item.price,
        original_price: originalUnit,
        item_discount: (originalUnit - Number(item.price)) * item.quantity,
        special_requests: item.specialRequests
      };
    }));
    const processedOrder = {
      ...order,
      order_number: order.orderNumber,
      total_amount: order.totalAmount,
      delivery_address: order.deliveryAddress,
      order_time: order.orderTime,
      delivery_time: order.deliveryTime,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      items,
      order_base_total: baseTotal,
      order_discount_total: baseTotal - Number(order.totalAmount),
      order_final_total: Number(order.totalAmount)
    };

    res.json({ order: processedOrder });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Cập nhật trạng thái đơn hàng (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const orderId = parseInt(id);
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, totalAmount: true, userId: true, paymentMethod: true, paymentStatus: true }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const prevStatus = existing.status;

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      let membershipUpdated = false;
      let newTier = null;
      // Nếu không phải COD thì đảm bảo trạng thái thanh toán là PAID
      if (existing.paymentMethod && existing.paymentMethod !== 'CASH' && existing.paymentStatus !== 'PAID') {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID' }
        });
      }
      if (prevStatus !== 'DELIVERED' && status === 'DELIVERED') {
        const updatedUser = await tx.user.update({
          where: { id: existing.userId },
          data: {
            lifetimeSpend: { increment: existing.totalAmount }
          },
          select: { id: true, lifetimeSpend: true, membershipTier: true, memberSince: true }
        });

        const lifetime = Number(updatedUser.lifetimeSpend || 0);
        const computedTier = computeTier(lifetime);
        if (computedTier !== updatedUser.membershipTier) {
          await tx.user.update({
            where: { id: updatedUser.id },
            data: {
              membershipTier: computedTier,
              memberSince: updatedUser.memberSince ?? new Date()
            }
          });
          membershipUpdated = true;
          newTier = computedTier;
        }
      }

      return { updatedOrder, membershipUpdated, newTier };
    });

    res.json({ message: 'Order status updated successfully', membershipTierUpdated: result.membershipUpdated, newTier: result.newTier });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Lấy chi tiết đơn hàng (Admin only)
router.get('/admin/:id(\\d+)', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true,
            address: true
          }
        },
        orderItems: {
          include: {
            dish: {
              select: {
                name: true,
                image: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let baseTotal = 0;
    const items = order.orderItems.map((item) => {
      const originalUnit = Number(item.dish?.price ?? item.price);
      baseTotal += originalUnit * item.quantity;
      return {
        id: item.id,
        dish_id: item.dishId,
        dish_name: item.dish?.name,
        dish_image: item.dish?.image,
        quantity: item.quantity,
        price: item.price,
        original_price: originalUnit,
        item_discount: (originalUnit - Number(item.price)) * item.quantity,
        special_requests: item.specialRequests
      };
    });

    const processedOrder = {
      ...order,
      order_number: order.orderNumber,
      total_amount: order.totalAmount,
      delivery_address: order.deliveryAddress,
      order_time: order.orderTime,
      delivery_time: order.deliveryTime,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      items,
      full_name: order.user?.fullName,
      phone: order.user?.phone,
      email: order.user?.email,
      order_base_total: baseTotal,
      order_discount_total: baseTotal - Number(order.totalAmount),
      order_final_total: Number(order.totalAmount)
    };

    res.json({ order: processedOrder });
  } catch (error) {
    console.error('Get admin order detail error:', error);
    res.status(500).json({ message: 'Failed to fetch order detail' });
  }
});

// Lấy tất cả đơn hàng (Admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0, page, pageSize } = req.query;

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const take = parseInt(pageSize || limit);
    const maybePage = parseInt(page);
    const fallbackSkip = parseInt(offset);
    const skip = Number.isInteger(maybePage) && maybePage > 0 ? (maybePage - 1) * take : fallbackSkip;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              fullName: true,
              phone: true
            }
          }
        },
        orderBy: { orderTime: 'desc' },
        take,
        skip
      })
    ]);

    const processedOrders = orders.map(order => ({
      ...order,
      order_number: order.orderNumber,
      total_amount: order.totalAmount,
      delivery_address: order.deliveryAddress,
      order_time: order.orderTime,
      delivery_time: order.deliveryTime,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      full_name: order.user.fullName,
      phone: order.user.phone
    }));

    const currentPage = Number.isInteger(maybePage) && maybePage > 0 ? maybePage : Math.floor(skip / take) + 1;
    const totalPages = Math.max(1, Math.ceil(total / take));

    res.json({
      orders: processedOrders,
      pagination: {
        total,
        page: currentPage,
        pageSize: take,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

module.exports = router;
