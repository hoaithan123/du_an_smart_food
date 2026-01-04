const express = require('express');
const axios = require('axios');
const prisma = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Gợi ý món ăn cá nhân hóa
router.get('/personal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Pull recent orders with items for recency weighting
    const recentOrders = await prisma.order.findMany({
      where: { userId, status: { not: 'CANCELLED' } },
      include: { orderItems: true },
      orderBy: { orderTime: 'desc' },
      take: 50
    });

    if (recentOrders.length === 0) {
      const popularDishes = await prisma.dish.findMany({
        where: { isAvailable: true },
        include: { category: { select: { name: true } } },
        orderBy: [ { totalOrders: 'desc' }, { rating: 'desc' } ],
        take: parseInt(limit)
      });
      return res.json({
        recommendations: popularDishes.map(dish => ({
          ...dish,
          category_name: dish.category.name,
          reason: 'Popular dishes'
        })),
        type: 'popular'
      });
    }

    // Build recency-weighted scores
    const now = Date.now();
    const dishScore = new Map();
    const categoryScore = new Map();
    const purchasedDishIds = new Set();

    for (const order of recentOrders) {
      const ageDays = Math.max(0, (now - new Date(order.orderTime).getTime()) / (1000 * 60 * 60 * 24));
      const decay = Math.exp(-ageDays / 30); // 30-day half-life approx
      for (const it of order.orderItems) {
        const base = Number(it.quantity || 1) * decay;
        dishScore.set(it.dishId, (dishScore.get(it.dishId) || 0) + base);
        purchasedDishIds.add(it.dishId);
      }
    }

    // Fetch categories for purchased dishes
    const purchased = await prisma.dish.findMany({
      where: { id: { in: Array.from(purchasedDishIds) } },
      select: { id: true, categoryId: true }
    });
    for (const d of purchased) {
      categoryScore.set(d.categoryId, (categoryScore.get(d.categoryId) || 0) + (dishScore.get(d.id) || 0));
    }

    const topPurchasedIds = Array.from(purchasedDishIds);
    // sort purchased by score desc
    topPurchasedIds.sort((a, b) => (dishScore.get(b) || 0) - (dishScore.get(a) || 0));

    const topCategories = Array.from(categoryScore.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cid]) => cid)
      .slice(0, 5);

    // 1) Re-order favorites (helpful quick buy)
    const favoriteDishes = await prisma.dish.findMany({
      where: { id: { in: topPurchasedIds.slice(0, 20) }, isAvailable: true },
      include: { category: { select: { name: true } } }
    });
    const favoriteByScore = favoriteDishes
      .map(d => ({ dish: d, _score: dishScore.get(d.id) || 0 }))
      .sort((a, b) => b._score - a._score)
      .map(x => ({
        ...x.dish,
        category_name: x.dish.category.name,
        reason: 'Your frequent orders'
      }));

    // 2) Explore within top categories excluding purchased dishes
    const exploreDishes = await prisma.dish.findMany({
      where: { isAvailable: true, categoryId: { in: topCategories }, id: { notIn: topPurchasedIds } },
      include: { category: { select: { name: true } } },
      orderBy: [ { rating: 'desc' }, { createdAt: 'desc' } ],
      take: parseInt(limit)
    });
    let exploreList = exploreDishes;
    if (!exploreList || exploreList.length === 0) {
      exploreList = await prisma.dish.findMany({
        where: { isAvailable: true },
        include: { category: { select: { name: true } } },
        orderBy: [ { rating: 'desc' }, { createdAt: 'desc' } ],
        take: parseInt(limit)
      });
    }
    const explore = exploreList.map(dish => ({
      ...dish,
      category_name: dish.category.name,
      reason: 'Similar to your favorites'
    }));

    // 3) Collaborative (as before) for discovery
    const collaborativeRecs = await prisma.orderItem.groupBy({
      by: ['dishId'],
      where: {
        order: { userId: { not: userId }, status: { not: 'CANCELLED' } },
        dish: { id: { in: topPurchasedIds.slice(0, 20) } }
      },
      _count: { dishId: true },
      orderBy: { _count: { dishId: 'desc' } },
      take: parseInt(limit)
    });
    const collaborativeDishIds = collaborativeRecs.map(r => r.dishId).filter(id => !purchasedDishIds.has(id));
    const collaborativeDishes = await prisma.dish.findMany({
      where: { isAvailable: true, id: { in: collaborativeDishIds } },
      include: { category: { select: { name: true } } }
    });
    const collaborative = collaborativeDishes.map(d => ({
      ...d,
      category_name: d.category.name,
      reason: 'Popular among similar users'
    }));

    // Merge, de-dup, and cap by limit
    const merged = [...favoriteByScore, ...explore, ...collaborative];
    const seen = new Set();
    const unique = [];
    for (const it of merged) {
      if (!seen.has(it.id)) { seen.add(it.id); unique.push(it); }
      if (unique.length >= parseInt(limit)) break;
    }

    res.json({ recommendations: unique, type: 'personal' });
  } catch (error) {
    console.error('Personal recommendations error:', error);
    res.status(500).json({ message: 'Failed to get personal recommendations' });
  }
});

// Gợi ý theo thời gian
router.get('/time-based', async (req, res) => {
  try {
    const { limit = 10, hour, tzOffset } = req.query;
    let parsedHour;
    if (Number.isFinite(Number(hour))) {
      parsedHour = Number(hour);
    } else if (Number.isFinite(Number(tzOffset))) {
      // Compute client local hour from server now + offset (minutes)
      const now = new Date();
      const localMs = now.getTime() + Number(tzOffset) * 60 * 1000;
      parsedHour = new Date(localMs).getUTCHours();
    } else {
      parsedHour = new Date().getHours();
    }

    let tags = [];
    let timeCategory = '';

    // Finer-grained buckets: sang, trua, chieu, xe_chieu, toi, khuya
    if (parsedHour >= 5 && parsedHour < 10) {
      timeCategory = 'sang';
      tags = ['breakfast', 'coffee', 'bread', 'banh_mi', 'xoi'];
    } else if (parsedHour >= 10 && parsedHour < 12) {
      timeCategory = 'late_morning';
      tags = ['light_meal', 'salad', 'drink'];
    } else if (parsedHour >= 12 && parsedHour < 14) {
      timeCategory = 'trua';
      tags = ['main', 'rice', 'noodle', 'soup'];
    } else if (parsedHour >= 14 && parsedHour < 16) {
      timeCategory = 'chieu';
      tags = ['snack', 'drink', 'dessert', 'fruit'];
    } else if (parsedHour >= 16 && parsedHour < 18) {
      timeCategory = 'xe_chieu';
      tags = ['snack', 'streetfood', 'milk_tea', 'coffee'];
    } else if (parsedHour >= 18 && parsedHour < 22) {
      timeCategory = 'toi';
      tags = ['main', 'hotpot', 'grill', 'rice', 'noodle'];
    } else {
      timeCategory = 'khuya';
      tags = ['late-night', 'noodle', 'soup', 'fastfood', 'porridge'];
    }

    let dishes = await prisma.dish.findMany({
      where: {
        isAvailable: true,
        tags: {
          array_contains: tags
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    res.json({
      recommendations: dishes.map(dish => ({
        ...dish,
        category_name: dish.category.name,
        reason: `Phù hợp buổi ${timeCategory}`
      })),
      type: 'time-based',
      time_category: timeCategory,
      hour: parsedHour
    });
  } catch (error) {
    console.error('Time-based recommendations error:', error);
    res.status(500).json({ message: 'Failed to get time-based recommendations' });
  }
});

// Gợi ý theo thời tiết
router.get('/weather-based', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const weatherApiKey = process.env.WEATHER_API_KEY;

    if (!weatherApiKey) {
      return res.status(400).json({ message: 'Weather API not configured' });
    }

    // Lấy thông tin thời tiết (mặc định Hà Nội)
    const weatherResponse = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=Hanoi&appid=${weatherApiKey}&units=metric`
    );

    const weather = weatherResponse.data;
    const temperature = weather.main.temp;
    const condition = weather.weather[0].main.toLowerCase();

    let tags = [];
    let reason = '';

    if (temperature < 20 || condition.includes('rain')) {
      // Trời lạnh hoặc mưa - gợi ý món nóng
      tags = ['hot', 'soup', 'noodle', 'hotpot'];
      reason = 'Perfect for cold weather';
    } else if (temperature > 30) {
      // Trời nóng - gợi ý món mát
      tags = ['cold', 'drink', 'salad', 'ice'];
      reason = 'Refreshing for hot weather';
    } else {
      // Thời tiết bình thường
      tags = ['main', 'popular'];
      reason = 'Great for current weather';
    }

    const dishes = await prisma.dish.findMany({
      where: {
        isAvailable: true,
        tags: {
          array_contains: tags
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    res.json({ 
      recommendations: dishes.map(dish => ({
        ...dish,
        category_name: dish.category.name,
        reason
      })),
      type: 'weather-based',
      weather: {
        temperature,
        condition,
        city: weather.name
      }
    });
  } catch (error) {
    console.error('Weather-based recommendations error:', error);
    res.status(500).json({ message: 'Failed to get weather-based recommendations' });
  }
});

// Lưu phản hồi gợi ý
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { dish_id, recommendation_type, clicked, ordered } = req.body;
    const userId = req.user.id;

    await prisma.recommendationHistory.create({
      data: {
        userId,
        dishId: dish_id,
        recommendationType: recommendation_type,
        confidenceScore: 0.8, // Default confidence
        clicked: clicked || false,
        ordered: ordered || false
      }
    });

    res.json({ message: 'Feedback recorded successfully' });
  } catch (error) {
    console.error('Save recommendation feedback error:', error);
    res.status(500).json({ message: 'Failed to save feedback' });
  }
});

// Gợi ý tổng hợp (kết hợp nhiều yếu tố)
router.get('/smart', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, tzOffset, hour } = req.query;
    const userId = req.user.id;

    // Lấy gợi ý cá nhân
    const personalResponse = await fetch(`http://localhost:5000/api/recommendations/personal?limit=5`, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    const personalData = await personalResponse.json();
    const personalRecs = personalData.recommendations || [];
    
    // Lấy gợi ý theo thời gian
    const qs = new URLSearchParams({ limit: '5' });
    if (hour) qs.set('hour', String(hour));
    else if (tzOffset) qs.set('tzOffset', String(tzOffset));
    const timeResponse = await fetch(`http://localhost:5000/api/recommendations/time-based?${qs.toString()}`);
    const timeData = await timeResponse.json();
    const timeRecs = timeData.recommendations || [];
    
    // Lấy gợi ý theo thời tiết (nếu có API key)
    let weatherRecs = [];
    if (process.env.WEATHER_API_KEY) {
      try {
        const weatherResponse = await fetch(`http://localhost:5000/api/recommendations/weather-based?limit=5`);
        const weatherData = await weatherResponse.json();
        weatherRecs = weatherData.recommendations || [];
      } catch (error) {
        console.log('Weather API not available');
      }
    }

    // Kết hợp và xếp hạng
    const allRecs = [...personalRecs, ...timeRecs, ...weatherRecs];
    // Dedup by id, keep first occurrence priority personal > time > weather
    const seen = new Set();
    const uniqueRecs = [];
    for (const r of allRecs) {
      if (!seen.has(r.id)) { seen.add(r.id); uniqueRecs.push(r); }
    }

    // Weighted score + diversity (MMR-like)
    const weightPersonal = 1.0;
    const weightTime = 0.6;
    const weightWeather = 0.3;
    const popWeight = 0.01; // popularity scaler
    const rateWeight = 3;   // rating booster

    const baseWithSource = uniqueRecs.map(d => {
      let srcW = 0;
      if (d.reason?.includes('Your frequent') || d.reason?.includes('Similar to your favorites') || d.reason?.includes('personal')) srcW = weightPersonal;
      else if (d.reason?.includes('Phù hợp buổi') || d.reason?.includes('Perfect for')) srcW = weightTime;
      else srcW = weightWeather;
      const popularity = Number(d.totalOrders || 0) * popWeight;
      const rating = Number(d.rating || 0) * rateWeight;
      const base = srcW * 100 + popularity + rating;
      return { ...d, _base: base };
    });

    // Greedy MMR: encourage category diversity
    const selected = [];
    const selectedCats = new Set();
    const k = parseInt(limit);
    while (baseWithSource.length && selected.length < k) {
      // pick best by base minus penalty if category already used
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < baseWithSource.length; i++) {
        const it = baseWithSource[i];
        const cat = it.category_name || it.category?.name || '';
        const penalty = selectedCats.has(cat) ? 10 : 0; // small penalty to diversify
        const s = it._base - penalty;
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      }
      const chosen = baseWithSource.splice(bestIdx, 1)[0];
      selected.push(chosen);
      const cat = chosen.category_name || chosen.category?.name || '';
      if (cat) selectedCats.add(cat);
    }

    res.json({ 
      recommendations: selected,
      type: 'smart',
      sources: {
        personal: personalRecs.length,
        time_based: timeRecs.length,
        weather_based: weatherRecs.length
      }
    });
  } catch (error) {
    console.error('Smart recommendations error:', error);
    res.status(500).json({ message: 'Failed to get smart recommendations' });
  }
});

module.exports = router;
