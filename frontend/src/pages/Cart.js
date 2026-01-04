import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Cart = () => {
  const { 
    items, 
    selectedItems,
    updateQuantity, 
    removeFromCart, 
    getTotalPrice, 
    getTotalItems, 
    getSelectedItems,
    getSelectedTotalPrice,
    getSelectedTotalItems,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = (dishId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(dishId);
    } else {
      updateQuantity(dishId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đặt hàng');
      navigate('/login');
      return;
    }

    const selectedItemsList = getSelectedItems();
    if (selectedItemsList.length === 0) {
      toast.error('Vui lòng chọn ít nhất một món ăn để đặt hàng');
      return;
    }

    // Chuyển đến trang Checkout
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Giỏ hàng trống</h1>
            <p className="text-gray-600 mb-8">
              Bạn chưa có món ăn nào trong giỏ hàng. Hãy khám phá menu và thêm món ăn yêu thích!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
            >
              Khám phá Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🛒 Giỏ hàng</h1>
          <p className="text-gray-600">
            Bạn có {getTotalItems()} món ăn trong giỏ hàng
            {getSelectedTotalItems() > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                ({getSelectedTotalItems()} món đã chọn)
              </span>
            )}
          </p>
          
          {/* Selection Controls */}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={selectAllItems}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              ✅ Chọn tất cả
            </button>
            <button
              onClick={deselectAllItems}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              ❌ Bỏ chọn tất cả
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Món ăn đã chọn</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center space-x-4">
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent"
                        />
                      </div>

                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.type === 'combo' ? (
                          <div className={`w-24 h-20 ${item.images?.length === 3 ? 'grid grid-cols-3' : 'grid grid-cols-2'} gap-0 rounded-lg overflow-hidden bg-gray-100`}>
                            {(item.images?.length === 3 ? item.images.slice(0,3) : item.images?.slice(0,2))?.map((img, idx) => (
                              <div key={idx} className="overflow-hidden">
                                {img ? (
                                  <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">{idx === 0 ? '🍽️' : (idx === 1 ? '🥤' : '🍰')}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">🍽️</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {item.name}
                        </h3>
                        {item.type === 'combo' ? (
                          <div className="text-xs text-gray-600 mt-1">
                            {item.subItems?.map((s, i) => (
                              <span key={s.id}>
                                {s.name}{i < item.subItems.length - 1 ? ' + ' : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                          )
                        )}
                        <div className="flex items-center mt-2 gap-2">
                          {item.type === 'combo' && item.originalTotal ? (
                            <>
                              <span className="text-lg font-bold text-accent">{(item.price).toLocaleString('vi-VN')}đ</span>
                              <span className="text-xs text-gray-500 line-through">{(item.originalTotal).toLocaleString('vi-VN')}đ</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-accent">{item.price.toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Xóa khỏi giỏ hàng"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>

              {/* Order Summary */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Số món đã chọn:</span>
                  <span className="font-semibold">{getSelectedTotalItems()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-semibold">
                    {getSelectedTotalPrice().toLocaleString('vi-VN')}đ
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Phí giao hàng:</span>
                  <span className="font-semibold text-green-600">Miễn phí</span>
                </div>
                
                <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-4">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600">
                    {getSelectedTotalPrice().toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={getSelectedTotalItems() === 0}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg mb-4"
              >
                🚀 Thanh toán
              </button>

              {/* Continue Shopping */}
              <button
                onClick={() => navigate('/menu')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
