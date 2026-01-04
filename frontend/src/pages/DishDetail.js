import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { dishesAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const DishDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, addComboToCart } = useCart();
  const { user, showNotification } = useAuth();

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(['dish', id], () => dishesAPI.getDish(id));
  const { data: reviewsRes, isLoading: reviewsLoading } = useQuery(['dishReviews', id], () => dishesAPI.getReviews(id));
  const dish = data?.data?.dish;
  const reviews = reviewsRes?.data?.reviews || [];

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Combo states
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboType, setComboType] = useState('combo'); // 'combo' | 'super'
  const [drinks, setDrinks] = useState([]);
  const [desserts, setDesserts] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedDessert, setSelectedDessert] = useState(null);

  useEffect(() => {
    const fetchExtras = async () => {
      try {
        // Try to fetch by tags first
        const [drinkRes, dessertRes] = await Promise.all([
          dishesAPI.getDishes({ tags: 'drink', limit: 12 }),
          dishesAPI.getDishes({ tags: 'dessert', limit: 12 })
        ]);
        let dks = drinkRes?.data?.dishes || [];
        let dss = dessertRes?.data?.dishes || [];
        // Fallback: popular if tags not available
        if (dks.length === 0) {
          const pop = await dishesAPI.getDishes({ limit: 12, sort: 'popular' });
          dks = (pop?.data?.dishes || []).slice(0, 12);
        }
        if (dss.length === 0) {
          const pop2 = await dishesAPI.getDishes({ limit: 12, sort: 'popular' });
          dss = (pop2?.data?.dishes || []).slice(0, 12);
        }
        setDrinks(dks.filter(x => x.id !== Number(id)));
        setDesserts(dss.filter(x => x.id !== Number(id)));
      } catch (e) {
        // ignore
      }
    };
    fetchExtras();
  }, [id]);

  const handleAddToCart = () => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để thêm món ăn vào giỏ hàng!', 'warning');
      navigate('/login');
      return;
    }
    addToCart(dish, 1);
    toast.success(`Đã thêm ${dish.name} vào giỏ hàng!`);
  };

  const openCombo = (type) => {
    setComboType(type);
    setShowComboModal(true);
  };

  const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';

  const handleAddComboToCart = () => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để mua combo!', 'warning');
      navigate('/login');
      return;
    }
    if (!dish) return;
    if (!selectedDrink) {
      toast.error('Vui lòng chọn đồ uống');
      return;
    }
    const items = [dish, selectedDrink];
    if (comboType === 'super') {
      if (!selectedDessert) {
        toast.error('Vui lòng chọn tráng miệng');
        return;
      }
      items.push(selectedDessert);
    }
    const sum = items.reduce((s, it) => s + Number(it.price || 0), 0);
    const rate = comboType === 'super' ? 0.10 : 0.07; // Super 10%, Combo 7%
    let target = Math.round(sum * (1 - rate));
    const maxSingle = Math.max(...items.map(it => Number(it.price) || 0));
    if (target < maxSingle) target = maxSingle;
    // Distribute discount proportionally by original price
    const distributed = [];
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const fraction = Number(it.price) / sum;
      let newUnit = Math.round(Number(it.price) * (1 - rate));
      // Accumulate and adjust last to hit exact target
      if (i === items.length - 1) {
        newUnit = Math.max(1, target - acc);
      }
      acc += newUnit;
      distributed.push({ ref: it, price: newUnit });
    }
    // Build single combo cart item
    const comboId = `combo-${dish.id}-${selectedDrink.id}-${comboType === 'super' && selectedDessert ? selectedDessert.id : 'na'}`;
    const comboName = comboType === 'super' ? `Super Combo: ${dish.name}` : `Combo: ${dish.name}`;
    const comboItem = {
      id: comboId,
      name: comboName,
      type: 'combo',
      price: target,
      originalTotal: sum,
      images: [dish.image, selectedDrink.image, ...(comboType === 'super' ? [selectedDessert?.image || null] : [])],
      subItems: [
        { id: dish.id, name: dish.name, price: distributed[0].price, original_price: Number(dish.price), image: dish.image },
        { id: selectedDrink.id, name: selectedDrink.name, price: distributed[1].price, original_price: Number(selectedDrink.price), image: selectedDrink.image },
        ...(comboType === 'super' && distributed[2] ? [{ id: selectedDessert.id, name: selectedDessert.name, price: distributed[2].price, original_price: Number(selectedDessert.price), image: selectedDessert.image }] : [])
      ]
    };
    addComboToCart(comboItem);
    toast.success(`${comboType === 'super' ? 'Super Combo' : 'Combo'} đã được thêm vào giỏ! Tổng ${formatVnd(target)}`);
    setShowComboModal(false);
    navigate('/cart');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      showNotification('Vui lòng đăng nhập để đánh giá!', 'warning');
      navigate('/login');
      return;
    }
    try {
      setSubmitting(true);
      await dishesAPI.createReview(id, { rating, comment });
      toast.success('Gửi đánh giá thành công!');
      setComment('');
      // reload reviews and dish (for avg rating)
      await Promise.all([
        queryClient.invalidateQueries(['dishReviews', id]),
        queryClient.invalidateQueries(['dish', id])
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để mua hàng!', 'warning');
      navigate('/login');
      return;
    }
    addToCart(dish, 1);
    toast.success(`Đã thêm ${dish.name} vào giỏ hàng!`);
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dish) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Không tìm thấy món ăn</h2>
            <button onClick={() => navigate('/menu')} className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">Quay lại Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Quay lại</button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="h-80 md:h-full bg-gray-200">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="mb-2">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{dish.category_name}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{dish.name}</h1>
              {dish.rating > 0 && (
                <div className="mb-3 text-yellow-600 font-semibold">⭐ {dish.rating}</div>
              )}
              {dish.description && (
                <p className="text-gray-700 mb-4">{dish.description}</p>
              )}

              {dish.tags && dish.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {dish.tags.map((tag, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              )}

              {dish.nutrition_info && (
                <div className="mb-4 text-sm text-gray-600">
                  {typeof dish.nutrition_info === 'string' ? dish.nutrition_info : JSON.stringify(dish.nutrition_info)}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">{dish.price.toLocaleString('vi-VN')}đ</span>
                  {Number(dish.rating) > 0 && (
                    <div className="text-yellow-600 font-semibold">⭐ {Number(dish.rating).toFixed(1)}</div>
                  )}
                </div>
                {dish.preparation_time && (
                  <p className="text-sm text-gray-500 mt-1">⏱️ {dish.preparation_time} phút</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    aria-label="Thêm vào giỏ hàng"
                    title="Thêm vào giỏ hàng"
                    className="h-12 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <span>🛒</span>
                    <span>Thêm vào giỏ</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="h-12 bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <span>⚡</span>
                    <span>Mua ngay</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => openCombo('combo')}
                    className="h-11 bg-accent text-white px-4 rounded-lg hover:opacity-95 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    🥤 Combo
                  </button>
                  <button
                    onClick={() => openCombo('super')}
                    className="h-11 bg-amber-500 text-white px-4 rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    🍰 Super Combo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Đánh giá từ khách hàng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {reviewsLoading ? (
                <div className="text-gray-500">Đang tải đánh giá...</div>
              ) : reviews.length === 0 ? (
                <div className="text-gray-500">Chưa có đánh giá nào cho món này.</div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-auto pr-2">
                  {reviews.map((rv) => (
                    <div key={rv.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {(rv.user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="font-semibold text-gray-900">{rv.user?.name || 'Người dùng'}</div>
                        </div>
                        <div className="text-yellow-600 font-semibold">⭐ {rv.rating}</div>
                      </div>
                      {rv.comment && (
                        <div className="text-gray-700 text-sm">{rv.comment}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">{new Date(rv.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Viết đánh giá của bạn</h3>
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Chọn số sao</label>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map((s) => (
                      <button type="button" key={s} onClick={() => setRating(s)} className={`text-2xl ${s <= rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nhận xét</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Chia sẻ cảm nhận của bạn về món ăn"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {showComboModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {comboType === 'super' ? 'Chọn đồ uống & tráng miệng' : 'Chọn đồ uống'}
              </h3>
              <button onClick={() => setShowComboModal(false)} className="text-gray-500 hover:text-gray-700">✖</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="font-semibold text-gray-800 mb-2">Đồ uống</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-auto">
                  {drinks.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDrink(d)}
                      className={`text-left border rounded-lg p-3 hover:bg-gray-50 ${selectedDrink?.id === d.id ? 'border-accent' : 'border-gray-200'}`}
                    >
                      <div className="font-medium line-clamp-1">{d.name}</div>
                      <div className="text-sm text-gray-600">{new Intl.NumberFormat('vi-VN').format(d.price)}đ</div>
                    </button>
                  ))}
                </div>
              </div>
              {comboType === 'super' && (
                <div>
                  <div className="font-semibold text-gray-800 mb-2">Tráng miệng</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-auto">
                    {desserts.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDessert(d)}
                        className={`text-left border rounded-lg p-3 hover:bg-gray-50 ${selectedDessert?.id === d.id ? 'border-accent' : 'border-gray-200'}`}
                      >
                        <div className="font-medium line-clamp-1">{d.name}</div>
                        <div className="text-sm text-gray-600">{new Intl.NumberFormat('vi-VN').format(d.price)}đ</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col md:flex-row gap-3 md:gap-0 md:items-center md:justify-between">
              <div className="text-sm text-gray-600">
                {comboType === 'super' ? 'Ưu đãi Super Combo: -35% tổng 3 món' : 'Ưu đãi Combo: -30% tổng 2 món'}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowComboModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Hủy</button>
                <button onClick={handleAddComboToCart} className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-95">Thêm vào giỏ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishDetail;
