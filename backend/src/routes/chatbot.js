const express = require('express');
const prisma = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Xử lý tin nhắn chatbot
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    const userId = req.user.id;

    // Phân tích intent từ tin nhắn
    const intent = analyzeIntent(message);
    
    let response = '';
    let recommendations = [];

    switch (intent.type) {
      case 'greeting':
        response = "Xin chào! Tôi có thể giúp bạn tìm món ăn phù hợp. Bạn muốn ăn gì hôm nay?";
        break;
        
      case 'spicy_preference':
        response = await handleSpicyPreference(intent.value);
        break;
        
      case 'price_range':
        response = await handlePriceRange(intent.value);
        break;
        
      case 'category_preference':
        response = await handleCategoryPreference(intent.value);
        break;
        
      case 'time_preference':
        response = await handleTimePreference(intent.value);
        break;
        
      case 'dietary_restriction':
        response = await handleDietaryRestriction(intent.value);
        break;
        
      case 'recommendation_request':
        const recs = await getRecommendationsForQuery(message, userId);
        response = recs.response;
        recommendations = recs.dishes;
        break;
        
      default:
        response = "Tôi hiểu bạn muốn tìm món ăn. Bạn có thể cho tôi biết:\n- Bạn thích ăn cay hay không cay?\n- Ngân sách của bạn là bao nhiêu?\n- Bạn muốn ăn món gì (cơm, phở, bún...)?";
    }

    // Lưu conversation
    await prisma.chatbotConversation.create({
      data: {
        userId,
        sessionId: session_id,
        message,
        response,
        intent: intent.type
      }
    });

    res.json({
      response,
      recommendations,
      intent: intent.type,
      session_id
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    res.status(500).json({ message: 'Failed to process message' });
  }
});

// Lấy lịch sử chat
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { session_id, limit = 20 } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (session_id) {
      where.sessionId = session_id;
    }

    const conversations = await prisma.chatbotConversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ conversations: conversations.reverse() });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Failed to get chat history' });
  }
});

// Phân tích intent từ tin nhắn
function analyzeIntent(message) {
  const msg = message.toLowerCase();
  
  // Greeting
  if (msg.includes('xin chào') || msg.includes('hello') || msg.includes('hi')) {
    return { type: 'greeting', value: null };
  }
  
  // Spicy preference
  if (msg.includes('cay') || msg.includes('spicy')) {
    return { type: 'spicy_preference', value: 'spicy' };
  }
  if (msg.includes('không cay') || msg.includes('không') || msg.includes('mild')) {
    return { type: 'spicy_preference', value: 'mild' };
  }
  
  // Price range
  if (msg.includes('rẻ') || msg.includes('dưới 50') || msg.includes('dưới 50000')) {
    return { type: 'price_range', value: 'low' };
  }
  if (msg.includes('trung bình') || msg.includes('50-100') || msg.includes('50000-100000')) {
    return { type: 'price_range', value: 'medium' };
  }
  if (msg.includes('đắt') || msg.includes('trên 100') || msg.includes('trên 100000')) {
    return { type: 'price_range', value: 'high' };
  }
  
  // Category preference
  if (msg.includes('cơm') || msg.includes('rice')) {
    return { type: 'category_preference', value: 'rice' };
  }
  if (msg.includes('phở') || msg.includes('pho')) {
    return { type: 'category_preference', value: 'pho' };
  }
  if (msg.includes('bún') || msg.includes('bun')) {
    return { type: 'category_preference', value: 'bun' };
  }
  if (msg.includes('đồ uống') || msg.includes('nước') || msg.includes('drink')) {
    return { type: 'category_preference', value: 'drink' };
  }
  
  // Time preference
  if (msg.includes('sáng') || msg.includes('morning')) {
    return { type: 'time_preference', value: 'morning' };
  }
  if (msg.includes('trưa') || msg.includes('lunch')) {
    return { type: 'time_preference', value: 'lunch' };
  }
  if (msg.includes('tối') || msg.includes('dinner')) {
    return { type: 'time_preference', value: 'dinner' };
  }
  
  // Dietary restriction
  if (msg.includes('chay') || msg.includes('vegetarian')) {
    return { type: 'dietary_restriction', value: 'vegetarian' };
  }
  if (msg.includes('ít dầu') || msg.includes('healthy')) {
    return { type: 'dietary_restriction', value: 'healthy' };
  }
  
  // General recommendation request
  if (msg.includes('gợi ý') || msg.includes('recommend') || msg.includes('tư vấn')) {
    return { type: 'recommendation_request', value: null };
  }
  
  return { type: 'unknown', value: null };
}

// Xử lý sở thích cay
async function handleSpicyPreference(preference) {
  const tags = preference === 'spicy' ? ['spicy', 'hot'] : ['mild', 'sweet'];
  
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
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return "Tôi không tìm thấy món phù hợp với sở thích của bạn. Bạn có thể thử tìm kiếm khác không?";
  }

  const dishNames = dishes.map(dish => dish.name).join(', ');
  return `Dựa trên sở thích ${preference === 'spicy' ? 'cay' : 'không cay'} của bạn, tôi gợi ý: ${dishNames}. Bạn muốn xem chi tiết món nào?`;
}

// Xử lý khoảng giá
async function handlePriceRange(range) {
  let priceCondition = {};
  switch (range) {
    case 'low':
      priceCondition = { lt: 50000 };
      break;
    case 'medium':
      priceCondition = { gte: 50000, lte: 100000 };
      break;
    case 'high':
      priceCondition = { gt: 100000 };
      break;
  }

  const dishes = await prisma.dish.findMany({
    where: {
      isAvailable: true,
      price: priceCondition
    },
    include: {
      category: {
        select: { name: true }
      }
    },
    orderBy: [
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return "Tôi không tìm thấy món trong khoảng giá này. Bạn có thể thử khoảng giá khác không?";
  }

  const dishNames = dishes.map(dish => `${dish.name} (${dish.price.toLocaleString()}đ)`).join(', ');
  return `Trong khoảng giá ${range === 'low' ? 'dưới 50k' : range === 'medium' ? '50k-100k' : 'trên 100k'}, tôi gợi ý: ${dishNames}`;
}

// Xử lý sở thích danh mục
async function handleCategoryPreference(category) {
  const dishes = await prisma.dish.findMany({
    where: {
      isAvailable: true,
      OR: [
        { name: { contains: category } },
        { description: { contains: category } }
      ]
    },
    include: {
      category: {
        select: { name: true }
      }
    },
    orderBy: [
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return "Tôi không tìm thấy món trong danh mục này. Bạn có thể thử danh mục khác không?";
  }

  const dishNames = dishes.map(dish => dish.name).join(', ');
  return `Trong danh mục ${category}, tôi gợi ý: ${dishNames}. Bạn muốn xem chi tiết món nào?`;
}

// Xử lý sở thích thời gian
async function handleTimePreference(time) {
  let tags = [];
  switch (time) {
    case 'morning':
      tags = ['breakfast', 'coffee', 'bread'];
      break;
    case 'lunch':
      tags = ['main', 'rice', 'soup'];
      break;
    case 'dinner':
      tags = ['main', 'hotpot', 'noodle'];
      break;
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
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return "Tôi không tìm thấy món phù hợp cho thời gian này. Bạn có thể thử thời gian khác không?";
  }

  const dishNames = dishes.map(dish => dish.name).join(', ');
  return `Cho ${time === 'morning' ? 'buổi sáng' : time === 'lunch' ? 'buổi trưa' : 'buổi tối'}, tôi gợi ý: ${dishNames}`;
}

// Xử lý hạn chế ăn uống
async function handleDietaryRestriction(restriction) {
  let tags = [];
  switch (restriction) {
    case 'vegetarian':
      tags = ['vegetarian', 'vegan'];
      break;
    case 'healthy':
      tags = ['healthy', 'low-fat', 'salad'];
      break;
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
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return "Tôi không tìm thấy món phù hợp với yêu cầu này. Bạn có thể thử yêu cầu khác không?";
  }

  const dishNames = dishes.map(dish => dish.name).join(', ');
  return `Dựa trên yêu cầu ${restriction === 'vegetarian' ? 'chay' : 'healthy'}, tôi gợi ý: ${dishNames}`;
}

// Lấy gợi ý cho query
async function getRecommendationsForQuery(query, userId) {
  // Tìm kiếm món ăn dựa trên từ khóa
  const dishes = await prisma.dish.findMany({
    where: {
      isAvailable: true,
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { ingredients: { contains: query } }
      ]
    },
    include: {
      category: {
        select: { name: true }
      }
    },
    orderBy: [
      { totalOrders: 'desc' },
      { rating: 'desc' }
    ],
    take: 5
  });

  if (dishes.length === 0) {
    return {
      response: "Tôi không tìm thấy món phù hợp với từ khóa của bạn. Bạn có thể thử từ khóa khác không?",
      dishes: []
    };
  }

  const dishNames = dishes.map(dish => dish.name).join(', ');
  return {
    response: `Dựa trên từ khóa "${query}", tôi tìm thấy: ${dishNames}. Bạn muốn xem chi tiết món nào?`,
    dishes: dishes.map(dish => ({
      ...dish,
      category_name: dish.category.name
    }))
  };
}

module.exports = router;
