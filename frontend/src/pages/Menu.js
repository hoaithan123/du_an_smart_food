import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { dishesAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [addingToCart, setAddingToCart] = useState({});
  
  const { addToCart } = useCart();
  const { user, showNotification } = useAuth();
  const navigate = useNavigate();

  // Fetch categories
  const { data: categoriesData } = useQuery('categories', dishesAPI.getCategories, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });
  const categories = categoriesData?.data?.categories || [];

  // Fetch dishes
  const { data: dishesData, isLoading, error } = useQuery(
    ['dishes', selectedCategory, searchTerm, sortBy, page, pageSize],
    () => dishesAPI.getDishes({
      category: selectedCategory || undefined,
      search: searchTerm || undefined,
      sort: sortBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    {
      keepPreviousData: true,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    }
  );

  const dishes = dishesData?.data?.dishes || [];
  const total = dishesData?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  const handleAddToCart = async (dish) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!', 'warning');
      navigate('/login');
      return;
    }

    setAddingToCart({ ...addingToCart, [dish.id]: true });
    
    try {
      addToCart(dish, 1);
      toast.success(`Đã thêm ${dish.name} vào giỏ hàng!`);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi thêm vào giỏ hàng!');
    } finally {
      setAddingToCart({ ...addingToCart, [dish.id]: false });
    }
  };

  const handleBuyNow = (dish) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để mua hàng!', 'warning');
      navigate('/login');
      return;
    }

    // Thêm vào giỏ hàng và chuyển đến trang thanh toán
    addToCart(dish, 1);
    toast.success(`Đã thêm ${dish.name} vào giỏ hàng!`);
    navigate('/checkout');
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải dữ liệu</h2>
            <p className="text-gray-600">Không thể tải menu. Vui lòng thử lại sau.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍽️ Menu</h1>
          <p className="text-gray-600">Khám phá các món ăn ngon và đặt hàng ngay!</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm món ăn
              </label>
              <input
                type="text"
                placeholder="Nhập tên món ăn..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sắp xếp
              </label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="popular">Phổ biến nhất</option>
                <option value="price_low">Giá thấp đến cao</option>
                <option value="price_high">Giá cao đến thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="newest">Mới nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === ''
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes Grid */}
        {dishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Không tìm thấy món ăn
            </h3>
            <p className="text-gray-500">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dishes.map((dish) => (
              <div
                key={dish.id}
                onClick={() => navigate(`/menu/${dish.id}`)}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-1 ring-1 ring-transparent hover:ring-blue-100"
              >
                {/* Dish Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🍽️</span>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-blue-600/90 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full shadow">
                      {dish.category_name}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  {dish.rating > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-yellow-400 text-yellow-900 text-xs px-2.5 py-1 rounded-full font-semibold shadow">
                        ⭐ {dish.rating}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dish Info */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {dish.name}
                  </h3>
                  
                  {dish.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {dish.description}
                    </p>
                  )}

                  {/* Tags */}
                  {dish.tags && dish.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {dish.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price and Buttons */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold text-blue-600">
                          {formatPrice(dish.price)}
                        </span>
                        {dish.preparation_time && (
                          <p className="text-xs text-gray-500">
                            ⏱️ {dish.preparation_time} phút
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 items-stretch">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuyNow(dish); }}
                        className="flex-[1.7] h-11 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all font-semibold text-sm shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70"
                      >
                        <span>⚡</span>
                        <span>Mua ngay</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(dish); }}
                        disabled={addingToCart[dish.id]}
                        className="w-14 h-11 inline-flex items-center justify-center bg-blue-600 text-white px-0 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                        aria-label="Thêm vào giỏ hàng"
                        title="Thêm vào giỏ hàng"
                      >
                        {addingToCart[dish.id] ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        ) : (
                          <span>🛒</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {dishes.length > 0 && (
          <div className="mt-8 text-center text-gray-600 space-y-4">
            <div>
              Hiển thị {dishes.length} / {total} món ăn
            </div>
            {/* Pagination */}
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              >
                ← Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, page - 3),
                  Math.min(totalPages, Math.max(0, page - 3) + 5)
                )
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-lg border text-sm ${p === page ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
