const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHideCategory() {
  try {
    console.log('🧪 Test ẩn danh mục "Món chính"...');

    // Tìm danh mục "Món chính"
    const category = await prisma.category.findFirst({
      where: { name: 'Món chính' }
    });

    if (!category) {
      console.log('❌ Không tìm thấy danh mục "Món chính"');
      return;
    }

    console.log(`📍 Danh mục "Món chính" hiện tại: ID ${category.id}, Active: ${category.isActive}`);

    // ẩn danh mục
    await prisma.category.update({
      where: { id: category.id },
      data: { isActive: false }
    });

    console.log('✅ Đã ẩn danh mục "Món chính"');

    // Kiểm tra API frontend
    const activeCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 Categories sẽ hiển thị ở frontend:');
    activeCategories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id})`);
    });

    // Kiểm tra API admin
    const allCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 Categories sẽ hiển thị ở admin:');
    allCategories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id}, Active: ${cat.isActive ? '✅' : '❌'})`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHideCategory();
