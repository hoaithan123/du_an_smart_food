const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateCategories() {
  try {
    console.log('✨ Kích hoạt tất cả danh mục...');

    // Kích hoạt tất cả các danh mục hiện có
    const result = await prisma.category.updateMany({
      where: {},
      data: { isActive: true }
    });

    console.log(`✅ Đã kích hoạt ${result.count} danh mục`);

    // Hiển thị danh sách sau khi kích hoạt
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 Danh sách danh mục hiện tại:');
    categories.forEach(cat => {
      console.log(`- ID: ${cat.id}, Tên: "${cat.name}", Active: ${cat.isActive ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateCategories();
