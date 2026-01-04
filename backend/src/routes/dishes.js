const express = require('express');
const prisma = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Lấy danh mục (cho frontend khách hàng - chỉ lấy danh mục hoạt động)
router.get('/categories', async (req, res) => {
  try {
    // Chỉ lấy danh mục đang hoạt động cho frontend
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Lấy danh sách món ăn
router.get('/', async (req, res) => {
  try {
    const { category, search, tags, limit = 20, offset = 0, sort = 'popular', include_unavailable, admin } = req.query;
    
    const includeInactive = (String(include_unavailable).toLowerCase() === 'true') || (String(admin).toLowerCase() === 'true');

    const where = {};
    if (!includeInactive) {
      where.isAvailable = true;
      // Chỉ lấy món ăn từ categories đang hoạt động cho frontend
      where.category = {
        isActive: true
      };
    }

    if (category) {
      where.categoryId = parseInt(category);
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',');
      where.tags = {
        array_contains: tagArray
      };
    }

    // Build sort
    let orderBy = [];
    switch ((sort || '').toString()) {
      case 'price_low':
        orderBy = [{ price: 'asc' }];
        break;
      case 'price_high':
        orderBy = [{ price: 'desc' }];
        break;
      case 'rating':
        orderBy = [{ rating: 'desc' }];
        break;
      case 'newest':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'popular':
      default:
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    const total = await prisma.dish.count({ where });
    const wantAll = String(limit).toLowerCase() === 'all';
    const take = wantAll ? undefined : parseInt(limit);
    const skip = wantAll ? undefined : parseInt(offset);

    const dishes = await prisma.dish.findMany({
      where,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy,
      ...(typeof take === 'number' ? { take } : {}),
      ...(typeof skip === 'number' ? { skip } : {})
    });

// (moved endpoints below)

    // Transform data (explicit fields only)
    const processedDishes = dishes.map(dish => {
      const stock = Number(dish.stock ?? 0);
      return {
        id: dish.id,
        name: dish.name,
        description: dish.description,
        price: Number(dish.price ?? 0),
        image: dish.image,
        category_id: dish.categoryId,
        category_name: dish.category?.name || null,
        is_available: !!dish.isAvailable,
        stock,
        // Provide alias so_luong for admin UI compatibility
        so_luong: stock,
        preparation_time: dish.preparationTime != null ? Number(dish.preparationTime) : null,
        nutrition_info: dish.nutritionInfo,
        tags: dish.tags,
        rating: Number(dish.rating ?? 0),
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt
      };
    });

    const respLimit = wantAll ? dishes.length : parseInt(limit);
    const respOffset = wantAll ? 0 : parseInt(offset);
    res.json({ dishes: processedDishes, total, limit: respLimit, offset: respOffset });
  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({ message: 'Failed to fetch dishes' });
  }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const dishId = parseInt(req.params.id);
    if (!Number.isInteger(dishId)) {
      return res.status(400).json({ message: 'Invalid dish id' });
    }

    const rows = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT oi.order_id) AS orders_count,
        COALESCE(SUM(oi.quantity), 0) AS units_sold,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.dish_id = ${dishId} AND o.status = 'DELIVERED'
    `;

    const row = Array.isArray(rows) && rows.length ? rows[0] : {};
    res.json({
      dish_id: dishId,
      orders_count: Number(row.orders_count || 0),
      units_sold: Number(row.units_sold || 0),
      revenue: Number(row.revenue || 0)
    });
  } catch (error) {
    console.error('Get dish stats error:', error);
    res.status(500).json({ message: 'Failed to get dish stats' });
  }
});

router.get('/:id/review-status', authenticateToken, async (req, res) => {
  try {
    const dishId = parseInt(req.params.id);
    const userId = req.user.id;
    if (!Number.isInteger(dishId)) {
      return res.status(400).json({ message: 'Invalid dish id' });
    }

    const items = await prisma.orderItem.findMany({
      where: { dishId, order: { userId, status: 'DELIVERED' } },
      select: { orderId: true }
    });
    const orderIds = [...new Set(items.map(i => i.orderId))];

    if (orderIds.length === 0) {
      return res.json({
        dish_id: dishId,
        total_purchases: 0,
        reviews_written: 0,
        pending_reviews: 0,
        can_review: false,
        next_order_id_to_review: null
      });
    }

    const written = await prisma.review.findMany({
      where: { userId, dishId, orderId: { in: orderIds } },
      select: { orderId: true }
    });
    const writtenSet = new Set(written.map(r => r.orderId));

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderTime: true },
      orderBy: { orderTime: 'desc' }
    });
    const next = orders.find(o => !writtenSet.has(o.id));

    const totalPurchases = orderIds.length;
    const reviewsWritten = writtenSet.size;
    const pending = Math.max(0, totalPurchases - reviewsWritten);

    res.json({
      dish_id: dishId,
      total_purchases: totalPurchases,
      reviews_written: reviewsWritten,
      pending_reviews: pending,
      can_review: pending > 0,
      next_order_id_to_review: next ? next.id : null
    });
  } catch (error) {
    console.error('Get review status error:', error);
    res.status(500).json({ message: 'Failed to get review status' });
  }
});

// Lấy món ăn theo ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const includeInactive = (String(req.query.include_unavailable).toLowerCase() === 'true') || (String(req.query.admin).toLowerCase() === 'true');
    const parsedId = parseInt(id);

    if (!Number.isInteger(parsedId)) {
      return res.status(400).json({ message: 'Invalid dish id' });
    }
    
    const dish = await prisma.dish.findFirst({
      where: {
        id: parsedId,
        ...(includeInactive ? {} : { isAvailable: true })
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    const stock = Number(dish.stock ?? 0);
    const processedDish = {
      id: dish.id,
      name: dish.name,
      description: dish.description,
      price: Number(dish.price ?? 0),
      image: dish.image,
      category_id: dish.categoryId,
      category_name: dish.category?.name || null,
      is_available: !!dish.isAvailable,
      stock,
      // Alias for admin UI
      so_luong: stock,
      preparation_time: dish.preparationTime != null ? Number(dish.preparationTime) : null,
      nutrition_info: dish.nutritionInfo,
      tags: dish.tags,
      rating: Number(dish.rating ?? 0),
      createdAt: dish.createdAt,
      updatedAt: dish.updatedAt
    };

    res.json({ dish: processedDish });
  } catch (error) {
    console.error('Get dish error:', error);
    res.status(500).json({ message: 'Failed to fetch dish', error: error.message });
  }
});

// Lấy danh sách đánh giá của món ăn
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where: { dishId: parseInt(id) } }),
      prisma.review.findMany({
        where: { dishId: parseInt(id) },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      })
    ]);

    const data = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt,
      user: {
        id: r.user.id,
        name: r.user.fullName || r.user.username,
        avatar: r.user.avatar || null
      }
    }));

    res.json({ reviews: data, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Tạo đánh giá cho món ăn (yêu cầu đã mua và chưa đánh giá trước đó)
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const dishId = parseInt(id);
    const parsedRating = parseInt(rating);

    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating phải từ 1 đến 5' });
    }

    const orderIdBody = req.body?.order_id;
    const maybeOrderId = orderIdBody != null ? parseInt(orderIdBody) : null;
    const providedOrderId = Number.isInteger(maybeOrderId) ? maybeOrderId : null;

    let targetOrderId = providedOrderId;

    if (providedOrderId) {
      const validOrder = await prisma.order.findFirst({
        where: { id: providedOrderId, userId, status: 'DELIVERED' },
        select: { id: true }
      });
      if (!validOrder) {
        return res.status(400).json({ message: 'Đơn hàng không hợp lệ hoặc chưa được giao' });
      }
      const itemInOrder = await prisma.orderItem.findFirst({
        where: { orderId: providedOrderId, dishId },
        select: { id: true }
      });
      if (!itemInOrder) {
        return res.status(400).json({ message: 'Đơn hàng này không chứa món ăn này' });
      }
      const dup = await prisma.review.findFirst({ where: { userId, dishId, orderId: providedOrderId } });
      if (dup) {
        return res.status(409).json({ message: 'Bạn đã đánh giá món này cho đơn hàng này rồi' });
      }
    } else {
      const items = await prisma.orderItem.findMany({
        where: { dishId, order: { userId, status: 'DELIVERED' } },
        select: { orderId: true }
      });
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Bạn chỉ có thể đánh giá món đã mua (đã giao)' });
      }
      const orderIds = [...new Set(items.map(i => i.orderId))];
      const reviewed = await prisma.review.findMany({
        where: { userId, dishId, orderId: { in: orderIds } },
        select: { orderId: true }
      });
      const reviewedSet = new Set(reviewed.map(r => r.orderId));
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderTime: true },
        orderBy: { orderTime: 'desc' }
      });
      const next = orders.find(o => !reviewedSet.has(o.id));
      if (!next) {
        return res.status(409).json({ message: 'Bạn đã đánh giá cho tất cả lượt mua của món này' });
      }
      targetOrderId = next.id;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        dishId,
        rating: parsedRating,
        comment: comment || null,
        orderId: targetOrderId
      }
    });

    // Cập nhật điểm trung bình của món ăn
    const agg = await prisma.review.aggregate({
      where: { dishId },
      _avg: { rating: true }
    });
    const avg = Number(agg._avg.rating || 0);
    await prisma.dish.update({ where: { id: dishId }, data: { rating: avg } });

    res.status(201).json({ message: 'Đã tạo đánh giá', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

// Tạo món ăn mới (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name, description, price, image, category_id, ingredients,
      nutrition_info, tags, preparation_time
    } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    let catId = category_id ? parseInt(category_id) : undefined;
    if (!Number.isInteger(catId)) catId = undefined;

    let category;
    if (catId) {
      category = await prisma.category.findUnique({ where: { id: catId } });
    }
    if (!category) {
      // fallback to first category or create one
      category = await prisma.category.findFirst({ where: { isActive: true } });
      if (!category) {
        category = await prisma.category.create({ data: { name: 'Uncategorized', isActive: true } });
      }
      catId = category.id;
    }

    // Parse stock from 'stock' or alias 'so_luong'
    const rawStock = typeof req.body.stock !== 'undefined' ? req.body.stock : req.body.so_luong;
    let parsedStock = rawStock != null ? parseInt(rawStock) : 0;
    if (!Number.isInteger(parsedStock) || parsedStock < 0) parsedStock = 0;

    const dish = await prisma.dish.create({
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        image: image || null,
        categoryId: catId,
        ingredients: ingredients || null,
        nutritionInfo: nutrition_info ?? null,
        tags: Array.isArray(tags) ? tags : [],
        preparationTime: preparation_time ? parseInt(preparation_time) : null,
        isAvailable: true,
        stock: parsedStock
      }
    });

    res.status(201).json({
      message: 'Dish created successfully',
      dish_id: dish.id
    });
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({ message: 'Failed to create dish' });
  }
});

// Cập nhật món ăn (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);
    if (!Number.isInteger(parsedId)) {
      return res.status(400).json({ message: 'Invalid dish id' });
    }
    const {
      name, description, price, image, category_id, ingredients,
      nutrition_info, tags, preparation_time, is_available
    } = req.body;

    const data = {
      name: name ?? undefined,
      description: typeof description !== 'undefined' ? (description || null) : undefined,
      price: typeof price !== 'undefined' ? parseFloat(price) : undefined,
      image: typeof image !== 'undefined' ? (image || null) : undefined,
      ingredients: typeof ingredients !== 'undefined' ? (ingredients || null) : undefined,
      nutritionInfo: typeof nutrition_info !== 'undefined' ? nutrition_info : undefined,
      tags: typeof tags !== 'undefined' ? (Array.isArray(tags) ? tags : []) : undefined,
      preparationTime: preparation_time ? parseInt(preparation_time) : undefined,
      isAvailable: typeof is_available !== 'undefined' ? !!is_available : undefined
    };

    // Stock update from 'stock' or alias 'so_luong'
    if (typeof req.body.stock !== 'undefined' || typeof req.body.so_luong !== 'undefined') {
      const raw = typeof req.body.stock !== 'undefined' ? req.body.stock : req.body.so_luong;
      const st = parseInt(raw);
      if (Number.isInteger(st) && st >= 0) data.stock = st;
    }

    // Validate category if provided
    if (typeof category_id !== 'undefined') {
      const cid = parseInt(category_id);
      if (Number.isInteger(cid)) {
        const exist = await prisma.category.findUnique({ where: { id: cid } });
        if (exist) data.categoryId = cid;
      }
    }

    // Validate numeric fields
    if (typeof data.price !== 'undefined' && (!Number.isFinite(data.price) || data.price < 0)) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    await prisma.dish.update({ where: { id: parsedId }, data });

    res.json({ message: 'Dish updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Dish not found' });
    }
    console.error('Update dish error:', error);
    res.status(500).json({ message: 'Failed to update dish', error: error.message });
  }
});

// Xóa món ăn (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.dish.update({
      where: { id: parseInt(id) },
      data: { isAvailable: false }
    });

    res.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({ message: 'Failed to delete dish' });
  }
});

router.post('/admin/backfill-stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const raw = req.body?.default_stock;
    const parsed = parseInt(raw);
    const defaultStock = Number.isInteger(parsed) && parsed >= 0 ? parsed : 50;

    const result = await prisma.dish.updateMany({
      where: { stock: { lte: 0 } },
      data: { stock: defaultStock }
    });

    res.json({ message: 'Stock backfilled successfully', updated: result.count, default_stock: defaultStock });
  } catch (error) {
    console.error('Backfill stock error:', error);
    res.status(500).json({ message: 'Failed to backfill stock' });
  }
});

// Lấy danh mục (cho admin - lấy tất cả kể cả ẩn)
router.get('/categories/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Lấy tất cả danh mục, kể cả danh mục ẩn (cho admin)
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Tạo danh mục mới (Admin only)
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Create category request body:', req.body);
    console.log('User info:', req.user);
    
    const { name, isActive = true } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Tên danh mục là bắt buộc!' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Tên danh mục phải có ít nhất 2 ký tự!' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ message: 'Tên danh mục không được quá 50 ký tự!' });
    }

    // Kiểm tra tên danh mục đã tồn tại chưa
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: name.trim()
      }
    });

    if (existingCategory) {
      return res.status(409).json({ message: 'Danh mục này đã tồn tại!' });
    }

    const categoryData = {
      name: name.trim(),
      isActive: Boolean(isActive)
    };
    
    console.log('Creating category with data:', categoryData);

    const category = await prisma.category.create({
      data: categoryData
    });

    console.log('Category created successfully:', category);

    res.status(201).json({
      message: 'Tạo danh mục thành công',
      category
    });
  } catch (error) {
    console.error('Create category error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Lỗi khi tạo danh mục',
      error: error.message 
    });
  }
});

// Cập nhật danh mục (Admin only)
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const parsedId = parseInt(id);

    if (!Number.isInteger(parsedId)) {
      return res.status(400).json({ message: 'ID danh mục không hợp lệ' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedId }
    });

    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Tên danh mục là bắt buộc!' });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({ message: 'Tên danh mục phải có ít nhất 2 ký tự!' });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({ message: 'Tên danh mục không được quá 50 ký tự!' });
      }

      // Kiểm tra tên danh mục đã tồn tại chưa (trừ danh mục hiện tại)
      const existingCategory = await prisma.category.findFirst({
        where: { 
          name: name.trim(),
          id: { not: parsedId }
        }
      });

      if (existingCategory) {
        return res.status(409).json({ message: 'Danh mục này đã tồn tại!' });
      }

      updateData.name = name.trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parsedId },
      data: updateData
    });

    res.json({
      message: 'Cập nhật danh mục thành công',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Lỗi khi cập nhật danh mục' });
  }
});

// Xóa danh mục (Admin only)
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    if (!Number.isInteger(parsedId)) {
      return res.status(400).json({ message: 'ID danh mục không hợp lệ' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedId },
      include: {
        _count: {
          select: { dishes: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    // Kiểm tra xem có sản phẩm nào trong danh mục không
    if (category._count.dishes > 0) {
      // Thay vì xóa, chỉ ẩn danh mục đi
      await prisma.category.update({
        where: { id: parsedId },
        data: { isActive: false }
      });

      return res.json({
        message: `Danh mục có ${category._count.dishes} sản phẩm, đã được ẩn thay vì xóa`
      });
    }

    // Nếu không có sản phẩm thì xóa hoàn toàn
    await prisma.category.delete({
      where: { id: parsedId }
    });

    res.json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Lỗi khi xóa danh mục' });
  }
});

module.exports = router;
