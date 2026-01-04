const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Món chính',
        description: 'Các món ăn chính như cơm, phở, bún',
        isActive: true
      }
    }),
    prisma.category.create({
      data: {
        name: 'Món phụ',
        description: 'Các món ăn kèm và đồ uống',
        isActive: true
      }
    }),
    prisma.category.create({
      data: {
        name: 'Tráng miệng',
        description: 'Bánh ngọt và đồ tráng miệng',
        isActive: true
      }
    }),
    prisma.category.create({
      data: {
        name: 'Đồ uống',
        description: 'Nước uống và đồ uống khác',
        isActive: true
      }
    })
  ]);

  console.log('✅ Categories created');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@smartfood.com',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'ADMIN',
      phone: '0123456789',
      address: 'Hà Nội, Việt Nam'
    }
  });

  console.log('✅ Admin user created');

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customerUser = await prisma.user.create({
    data: {
      username: 'customer',
      email: 'customer@smartfood.com',
      password: customerPassword,
      fullName: 'Nguyễn Văn A',
      role: 'CUSTOMER',
      phone: '0987654321',
      address: 'TP.HCM, Việt Nam'
    }
  });

  console.log('✅ Customer user created');

  // Create sample dishes
  const dishes = await Promise.all([
    prisma.dish.create({
      data: {
        name: 'Cơm gà nướng',
        description: 'Cơm trắng với gà nướng thơm ngon',
        price: 45000,
        categoryId: categories[0].id,
        ingredients: 'Gà, cơm, rau thơm',
        tags: ['main', 'chicken', 'grilled'],
        preparationTime: 15,
        isAvailable: true,
        stock: 30
      }
    }),
    prisma.dish.create({
      data: {
        name: 'Phở bò',
        description: 'Phở bò truyền thống với nước dùng đậm đà',
        price: 55000,
        categoryId: categories[0].id,
        ingredients: 'Bánh phở, thịt bò, hành tây',
        tags: ['main', 'beef', 'soup'],
        preparationTime: 10,
        isAvailable: true,
        stock: 25
      }
    }),
    prisma.dish.create({
      data: {
        name: 'Bún chả',
        description: 'Bún chả Hà Nội với thịt nướng',
        price: 50000,
        categoryId: categories[0].id,
        ingredients: 'Bún, thịt nướng, rau sống',
        tags: ['main', 'pork', 'grilled'],
        preparationTime: 12,
        isAvailable: true,
        stock: 18
      }
    }),
    prisma.dish.create({
      data: {
        name: 'Cà phê đen',
        description: 'Cà phê đen đậm đà',
        price: 15000,
        categoryId: categories[3].id,
        ingredients: 'Cà phê',
        tags: ['drink', 'coffee'],
        preparationTime: 3,
        isAvailable: true,
        stock: 50
      }
    }),
    prisma.dish.create({
      data: {
        name: 'Trà sữa trân châu',
        description: 'Trà sữa với trân châu dẻo',
        price: 25000,
        categoryId: categories[3].id,
        ingredients: 'Trà, sữa, trân châu',
        tags: ['drink', 'milk_tea'],
        preparationTime: 5,
        isAvailable: true,
        stock: 40
      }
    })
  ]);

  console.log('✅ Sample dishes created');

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      userId: customerUser.id,
      orderNumber: 'SF' + Date.now() + '001',
      totalAmount: 100000,
      status: 'DELIVERED',
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      deliveryAddress: '123 Đường ABC, Quận 1, TP.HCM',
      notes: 'Giao hàng nhanh'
    }
  });

  // Create order items
  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        dishId: dishes[0].id,
        quantity: 2,
        price: dishes[0].price
      },
      {
        orderId: order1.id,
        dishId: dishes[3].id,
        quantity: 1,
        price: dishes[3].price
      }
    ]
  });

  console.log('✅ Sample orders created');

  // Create sample reviews
  await prisma.review.createMany({
    data: [
      {
        userId: customerUser.id,
        dishId: dishes[0].id,
        orderId: order1.id,
        rating: 5,
        comment: 'Rất ngon, gà nướng thơm lừng!'
      },
      {
        userId: customerUser.id,
        dishId: dishes[3].id,
        orderId: order1.id,
        rating: 4,
        comment: 'Cà phê đậm đà, vị ngon'
      }
    ]
  });

  console.log('✅ Sample reviews created');

  // Create analytics data
  const today = new Date();
  await prisma.analytics.create({
    data: {
      date: today,
      totalOrders: 1,
      totalRevenue: 100000,
      totalUsers: 2,
      popularDishes: {
        'Cơm gà nướng': 2,
        'Cà phê đen': 1
      }
    }
  });

  console.log('✅ Analytics data created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@smartfood.com / admin123');
  console.log('Customer: customer@smartfood.com / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
