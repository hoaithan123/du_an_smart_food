const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupCategories() {
  try {
    console.log('🧹 Bắt đầu làm sạch dữ liệu danh mục...');

    // Lấy tất cả danh mục
    const allCategories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`Tìm thấy ${allCategories.length} danh mục:`);
    allCategories.forEach(cat => {
      console.log(`- ID: ${cat.id}, Tên: "${cat.name}", Active: ${cat.isActive}, Created: ${cat.createdAt}`);
    });

    // Tìm các nhóm trùng lặp theo tên
    const categoryMap = new Map();
    
    allCategories.forEach(category => {
      const normalizedName = category.name.trim().toLowerCase();
      if (!categoryMap.has(normalizedName)) {
        categoryMap.set(normalizedName, []);
      }
      categoryMap.get(normalizedName).push(category);
    });

    // Xử lý các nhóm trùng lặp
    for (const [name, duplicates] of categoryMap.entries()) {
      if (duplicates.length > 1) {
        console.log(`\n🔍 Phát hiện trùng lặp: "${name}" (${duplicates.length} bản ghi)`);
        
        // Sắp xếp theo ID, giữ bản ghi cũ nhất làm chính
        duplicates.sort((a, b) => a.id - b.id);
        const keepCategory = duplicates[0];
        const deleteCategories = duplicates.slice(1);
        
        console.log(`   - Giữ lại: ID ${keepCategory.id} (tạo lúc ${keepCategory.createdAt})`);
        console.log(`   - Xóa: ${deleteCategories.map(c => `ID ${c.id}`).join(', ')}`);
        
        // Kiểm tra xem có sản phẩm nào đang dùng các danh mục cần xóa không
        for (const deleteCat of deleteCategories) {
          const dishesCount = await prisma.dish.count({
            where: { categoryId: deleteCat.id }
          });
          
          if (dishesCount > 0) {
            console.log(`   ⚠️  Danh mục ID ${deleteCat.id} có ${dishesCount} sản phẩm, chuyển sản phẩm sang ID ${keepCategory.id}...`);
            
            // Chuyển tất cả sản phẩm sang danh mục chính
            await prisma.dish.updateMany({
              where: { categoryId: deleteCat.id },
              data: { categoryId: keepCategory.id }
            });
          }
          
          // Xóa danh mục trùng
          await prisma.category.delete({
            where: { id: deleteCat.id }
          });
          
          console.log(`   ✅ Đã xóa danh mục trùng ID ${deleteCat.id}`);
        }
      }
    }

    // Tạo lại các danh mục chuẩn nếu cần
    const standardCategories = [
      { name: 'Món chính', description: 'Các món ăn chính như cơm, phở, bún' },
      { name: 'Đồ uống', description: 'Nước uống và đồ uống khác' },
      { name: 'Tráng miệng', description: 'Bánh ngọt và đồ tráng miệng' },
      { name: 'Món phụ', description: 'Các món ăn kèm và đồ ăn phụ' }
    ];

    const finalCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    for (const standardCat of standardCategories) {
      const exists = finalCategories.some(cat => 
        cat.name.trim().toLowerCase() === standardCat.name.toLowerCase()
      );
      
      if (!exists) {
        console.log(`➕ Tạo danh mục chuẩn: "${standardCat.name}"`);
        await prisma.category.create({
          data: {
            name: standardCat.name,
            description: standardCat.description,
            isActive: true
          }
        });
      }
    }

    // Hiển thị kết quả cuối cùng
    const finalResult = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('\n✅ Hoàn thành! Danh mục cuối cùng:');
    finalResult.forEach(cat => {
      console.log(`- ID: ${cat.id}, Tên: "${cat.name}", Active: ${cat.isActive}`);
    });

  } catch (error) {
    console.error('❌ Lỗi khi làm sạch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupCategories();
