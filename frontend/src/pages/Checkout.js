import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI, authAPI, vouchersAPI } from '../services/api';

const Checkout = () => {
  const { items: cartItems, getSelectedItems, getSelectedTotalPrice, clearCart } = useCart();
  const { user, showNotification } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [addressTouched, setAddressTouched] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('asap');
  const [notes, setNotes] = useState('');
  const [customDeliveryTime, setCustomDeliveryTime] = useState('');
  const [addressError, setAddressError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [transferNote, setTransferNote] = useState('');
  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [discountValue, setDiscountValue] = useState(0); // absolute VND
  const [discountLabel, setDiscountLabel] = useState('');
  const [availableVouchers, setAvailableVouchers] = useState([]);

  // Bank transfer config from env (set in frontend .env)
  const BANK_BIN = process.env.REACT_APP_BANK_BIN || '';
  const BANK_ACCOUNT = process.env.REACT_APP_BANK_ACCOUNT || '';
  const BANK_ACCOUNT_NAME = process.env.REACT_APP_BANK_ACCOUNT_NAME || '';
  const isBankConfigured = BANK_BIN && BANK_ACCOUNT && BANK_ACCOUNT_NAME;

  useEffect(() => {
    if (!showPaymentModal) return;
    setCountdown(90);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowPaymentModal(false);
          setPendingOrderData(null);
          showNotification('Giao dịch đã được hủy do hết thời gian!', 'error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showPaymentModal]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await vouchersAPI.getPublic();
        const list = Array.isArray(res?.data?.vouchers) ? res.data.vouchers : [];
        if (mounted) setAvailableVouchers(list);
      } catch (_) {
        if (mounted) setAvailableVouchers([]);
      }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (user && user.address && !addressTouched) {
      setDeliveryAddress(user.address);
    }
  }, [user?.address, addressTouched]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authAPI.getProfile();
        const addr = res?.data?.user?.address;
        if (addr && !addressTouched) {
          setDeliveryAddress(addr);
        }
      } catch (_) {}
    })();
  }, [addressTouched]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const generateTransferNote = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    return `ORDER-${user?.id || 'GUEST'}-${stamp}`;
  };

  const getBankQrUrl = () => {
    if (!isBankConfigured) return '/images/ma-qr.png';
    const amount = Math.round(getDiscountedTotal());
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: transferNote || generateTransferNote(),
      accountName: BANK_ACCOUNT_NAME,
    });
    return `https://img.vietqr.io/image/${BANK_BIN}-${BANK_ACCOUNT}-compact2.png?${params.toString()}`;
  };

  const applyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      showNotification('Vui lòng nhập mã voucher!', 'warning');
      return;
    }
    const subtotal = getSelectedTotalPrice();
    if (subtotal <= 0) {
      showNotification('Không có món nào để áp dụng voucher!', 'error');
      return;
    }
    const found = availableVouchers.find(
      (v) => (v.ma_voucher || '').toString().toUpperCase() === code
    );
    if (found) {
      if (found.trang_thai !== 'hoat_dong') {
        showNotification('Voucher hiện không khả dụng!', 'error');
        setVoucherApplied(false);
        setDiscountValue(0);
        setDiscountLabel('');
        return;
      }
      const minOrder = Number(found.gia_tri_toi_thieu || 0);
      if (minOrder > 0 && subtotal < minOrder) {
        showNotification('Đơn hàng chưa đạt giá trị tối thiểu để áp dụng voucher!', 'error');
        return;
      }
      let val = 0;
      if (found.loai_giam_gia === 'phan_tram') {
        const cap = Number(found.gia_tri_toi_da || 0);
        val = Math.round(subtotal * Number(found.gia_tri_giam || 0) / 100);
        if (cap > 0) val = Math.min(val, cap);
      } else {
        val = Math.round(Number(found.gia_tri_giam || 0));
      }
      val = Math.max(0, Math.min(val, subtotal));
      setDiscountValue(val);
      setDiscountLabel(found.ten_voucher || code);
      setVoucherApplied(true);
      showNotification('Đã áp dụng voucher ' + code, 'success');
      return;
    }
    if (code === 'SMART10') {
      const val = Math.min(Math.round(subtotal * 0.1), 100000);
      setDiscountValue(val);
      setDiscountLabel('Giảm 10% (tối đa 100.000đ)');
      setVoucherApplied(true);
      showNotification('Đã áp dụng voucher SMART10', 'success');
    } else if (code === 'SALE50K') {
      const val = 50000;
      setDiscountValue(Math.min(val, subtotal));
      setDiscountLabel('Giảm 50.000đ');
      setVoucherApplied(true);
      showNotification('Đã áp dụng voucher SALE50K', 'success');
    } else if (code === 'FREESHIP') {
      setDiscountValue(0);
      setDiscountLabel('Miễn phí vận chuyển');
      setVoucherApplied(true);
      showNotification('Đã áp dụng FREESHIP (phí giao hàng đã miễn phí)', 'success');
    } else {
      setVoucherApplied(false);
      setDiscountValue(0);
      setDiscountLabel('');
      showNotification('Mã voucher không hợp lệ!', 'error');
    }
  };

  const clearVoucher = () => {
    setVoucherApplied(false);
    setDiscountValue(0);
    setDiscountLabel('');
    setVoucherCode('');
  };

  const getItemImage = (item) => {
    if (item && item.image) return item.image;
    if (item && Array.isArray(item.images) && item.images.length > 0) return item.images[0];
    if (item && Array.isArray(item.subItems)) {
      const s = item.subItems.find((si) => si && si.image);
      if (s) return s.image;
    }
    return 'https://via.placeholder.com/80x80?text=No+Image';
  };

  const getDiscountedTotal = () => {
    const subtotal = getSelectedTotalPrice();
    const total = Math.max(0, subtotal - (voucherApplied ? discountValue : 0));
    return total;
  };

  const handlePlaceOrder = async () => {
    // Validate delivery address
    if (!deliveryAddress.trim()) {
      setAddressError('Địa chỉ giao hàng là bắt buộc');
      showNotification('Vui lòng nhập địa chỉ giao hàng!', 'error');
      return;
    }

    if (deliveryAddress.trim().length < 10) {
      setAddressError('Địa chỉ giao hàng phải có ít nhất 10 ký tự');
      showNotification('Địa chỉ giao hàng quá ngắn!', 'error');
      return;
    }

    setAddressError('');

    if (!user) {
      showNotification('Vui lòng đăng nhập để đặt hàng!', 'error');
      navigate('/login');
      return;
    }

    if (selectedItems.length === 0) {
      showNotification('Không có món ăn nào được chọn!', 'error');
      return;
    }

    try {
      // Validate selected items
      const validItems = selectedItems.filter(item => 
        item && item.id && item.quantity > 0 && item.price > 0
      );

      if (validItems.length === 0) {
        showNotification('Dữ liệu món ăn không hợp lệ!', 'error');
        return;
      }

      // Check if any item has invalid quantity
      const invalidItems = validItems.filter(item => 
        item.quantity < 1
      );

      if (invalidItems.length > 0) {
        showNotification('Số lượng món ăn phải từ 1 trở lên!', 'error');
        return;
      }

      // Check if any item has invalid price
      const invalidPriceItems = validItems.filter(item => 
        item.price < 1000 || item.price > 1000000
      );

      if (invalidPriceItems.length > 0) {
        showNotification('Giá món ăn không hợp lệ!', 'error');
        return;
      }

      // Check total amount
      const totalAmount = validItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      if (totalAmount < 10000) {
        showNotification('Tổng tiền đơn hàng phải ít nhất 10,000 VND!', 'error');
        return;
      }

      if (totalAmount > 5000000) {
        showNotification('Tổng tiền đơn hàng không được vượt quá 5,000,000 VND!', 'error');
        return;
      }

      // Map payment method from UI -> backend enum
      const paymentMap = {
        cod: 'CASH',
        bank: 'BANK_TRANSFER',
        card: 'CARD',
        momo: 'CARD', // tạm map MoMo vào CARD để server chấp nhận
      };
      const mappedPaymentMethod = paymentMap[paymentMethod] || paymentMethod?.toUpperCase();

      // Validate mapped payment method against backend enum
      const validPaymentEnums = ['CASH', 'CARD', 'BANK_TRANSFER'];
      if (!mappedPaymentMethod || !validPaymentEnums.includes(mappedPaymentMethod)) {
        showNotification('Vui lòng chọn phương thức thanh toán hợp lệ!', 'error');
        return;
      }

      // Validate notes length
      if (notes && notes.length > 500) {
        showNotification('Ghi chú không được vượt quá 500 ký tự!', 'error');
        return;
      }

      // Validate delivery time
      if (!deliveryTime || !['asap', '1hour', '2hours', 'custom'].includes(deliveryTime)) {
        showNotification('Vui lòng chọn thời gian giao hàng!', 'error');
        return;
      }
      if (deliveryTime === 'custom') {
        const dt = new Date(customDeliveryTime);
        if (!customDeliveryTime || isNaN(dt.getTime()) || !notes.trim()) {
          showNotification('Vui lòng chọn thời gian khác và ghi chú cho đơn hàng!', 'error');
          return;
        }
      }

      // Validate user
      if (!user || !user.id) {
        showNotification('Thông tin người dùng không hợp lệ!', 'error');
        navigate('/login');
        return;
      }

      // Validate token
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Phiên đăng nhập đã hết hạn!', 'error');
        navigate('/login');
        return;
      }

      // Expand combo items into their subItems for backend
      const expandedItems = [];
      for (const it of validItems) {
        if (it.type === 'combo' && Array.isArray(it.subItems)) {
          for (const sub of it.subItems) {
            expandedItems.push({
              dish_id: parseInt(sub.id),
              quantity: 1 * parseInt(it.quantity),
              price: parseFloat(sub.price),
              special_requests: it.name
            });
          }
        } else {
          expandedItems.push({
            dish_id: parseInt(it.id),
            quantity: parseInt(it.quantity),
            price: parseFloat(it.price),
            special_requests: it.special_requests || ''
          });
        }
      }
      // Calculate discount per item based on price ratio
      const totalBeforeDiscount = getSelectedTotalPrice();
      const discountRatio = voucherApplied && totalBeforeDiscount > 0 
        ? discountValue / totalBeforeDiscount 
        : 0;

      // Apply discount to each item
      const itemsWithDiscount = expandedItems.map(item => {
        const itemTotal = item.price * item.quantity;
        const itemDiscount = voucherApplied ? Math.round(itemTotal * discountRatio) : 0;
        
        return {
          ...item,
          original_price: item.price, // Save original price
          price: item.price - (itemDiscount / item.quantity), // Apply discount to unit price
          discount: itemDiscount, // Save discount amount for this item
        };
      });

      const orderData = {
        items: itemsWithDiscount,
        delivery_address: deliveryAddress.trim(),
        payment_method: mappedPaymentMethod,
        notes: notes.trim(),
        order_base_total: totalBeforeDiscount,
        order_discount_total: voucherApplied ? discountValue : 0,
        order_final_total: getDiscountedTotal(),
        ...(deliveryTime === 'custom' && customDeliveryTime && { delivery_time: new Date(customDeliveryTime).toISOString() }),
        ...(voucherApplied && voucherCode && {
          voucher_code: voucherCode.trim().toUpperCase(),
          discount_value: discountValue,
          discount_label: discountLabel
        })
      };

      // Validate order data
      if (!orderData.items || orderData.items.length === 0) {
        showNotification('Không có món ăn nào để đặt hàng!', 'error');
        return;
      }

      if (!orderData.delivery_address || orderData.delivery_address.length < 10) {
        showNotification('Địa chỉ giao hàng không hợp lệ!', 'error');
        return;
      }

      if (!orderData.payment_method || !validPaymentEnums.includes(orderData.payment_method)) {
        showNotification('Phương thức thanh toán không hợp lệ!', 'error');
        return;
      }

      console.log('Sending order data:', orderData);
      console.log('User token:', localStorage.getItem('token'));
      
      // For bank or momo, open modal first, do not submit yet
      if (paymentMethod === 'bank' || paymentMethod === 'momo') {
        setPendingOrderData(orderData);
        setTransferNote(generateTransferNote());
        setShowPaymentModal(true);
        return;
      }

      setLoading(true);
      setOrderPlacing(true);

      const response = await ordersAPI.createOrder(orderData);
      console.log('Order response:', response);

      if (!response || !response.data) {
        showNotification('Phản hồi từ server không hợp lệ!', 'error');
        return;
      }

      if (!response.data.order || !response.data.order.id) {
        showNotification('Đơn hàng không được tạo thành công!', 'error');
        return;
      }

      try {
        if (voucherApplied && voucherCode) {
          await vouchersAPI.useVoucher(voucherCode.trim().toUpperCase());
          try {
            const res2 = await vouchersAPI.getPublic();
            const list2 = Array.isArray(res2?.data?.vouchers) ? res2.data.vouchers : [];
            setAvailableVouchers(list2);
          } catch (_) {}
        }
      } catch (_) {}
      showNotification('Đặt hàng thành công! 🎉', 'success');
      clearCart();
      navigate('/orders');
      
    } catch (error) {
      console.error('Order error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Có lỗi xảy ra khi đặt hàng!';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';
        navigate('/login');
      } else if (error.response?.status === 500) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau!';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
      setOrderPlacing(false);
    }
  };

  const selectedItems = getSelectedItems();
  
  if (!selectedItems || selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không có món ăn được chọn</h2>
          <p className="text-gray-600 mb-8">Vui lòng chọn món ăn trong giỏ hàng trước khi thanh toán</p>
          <button
            onClick={() => navigate('/cart')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại giỏ hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Thanh toán</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Chi tiết đơn hàng</h2>
            
            <div className="space-y-4 mb-6">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img 
                    src={getItemImage(item)} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">Số lượng: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Tạm tính:</span>
                <span>{formatPrice(getSelectedTotalPrice())}</span>
              </div>
              {voucherApplied && discountValue > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Giảm giá ({discountLabel}):</span>
                  <span className="text-green-600">- {formatPrice(discountValue)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Tổng cộng:</span>
                  <span className="text-accent">{formatPrice(getDiscountedTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin giao hàng</h2>
            
            <div className="space-y-6">
              {/* Delivery Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ giao hàng <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    setAddressTouched(true);
                    if (addressError) setAddressError('');
                  }}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                    addressError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Nhập địa chỉ giao hàng chi tiết"
                  required
                />
                {addressError && (
                  <p className="mt-1 text-sm text-red-600">{addressError}</p>
                )}
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian giao hàng
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asap">Giao ngay (30-45 phút)</option>
                  <option value="1hour">Sau 1 giờ</option>
                  <option value="2hours">Sau 2 giờ</option>
                  <option value="custom">Thời gian khác</option>
                </select>
                {deliveryTime === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn thời gian cụ thể <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      value={customDeliveryTime}
                      onChange={(e) => setCustomDeliveryTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Vui lòng chọn thời gian cụ thể và nhập ghi chú cho đơn hàng.</p>
                  </div>
                )}
              </div>

              {/* Voucher */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã voucher
                </label>
                {/* Preset vouchers */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(availableVouchers && availableVouchers.length > 0
                    ? availableVouchers.map((v) => ({ code: (v.ma_voucher || '').toString().toUpperCase(), label: v.ten_voucher || v.ma_voucher }))
                    : [
                        { code: 'SMART10', label: 'Giảm 10% tối đa 100k' },
                        { code: 'SALE50K', label: 'Giảm 50.000đ' },
                        { code: 'FREESHIP', label: 'Freeship' },
                      ]
                  ).map((v) => (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => { setVoucherCode(v.code); setTimeout(applyVoucher, 0); }}
                      className={`px-3 py-2 rounded-lg border text-sm ${voucherApplied && voucherCode.toUpperCase() === v.code ? 'border-accent text-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      title={v.label}
                    >
                      {v.code}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Nhập mã (SMART10, SALE50K, FREESHIP)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {!voucherApplied ? (
                    <button type="button" onClick={applyVoucher} className="px-4 py-3 rounded-lg bg-accent text-white hover:opacity-95">
                      Áp dụng
                    </button>
                  ) : (
                    <button type="button" onClick={clearVoucher} className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-100">
                      Hủy mã
                    </button>
                  )}
                </div>
                {voucherApplied && discountLabel && (
                  <div className="mt-2 text-sm text-green-700">Đã áp dụng: {discountLabel}</div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phương thức thanh toán
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-accent"
                    />
                    <span>💵 Thanh toán khi nhận hàng (COD)</span>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-accent"
                    />
                    <span>🏦 Chuyển khoản ngân hàng</span>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="momo"
                      checked={paymentMethod === 'momo'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-accent"
                    />
                    <span>📱 Ví điện tử MoMo</span>
                  </label>
                </div>
              </div>

              {/* Payment Details */}
              {paymentMethod === 'cod' && (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                  💡 Hãy chuẩn bị tiền khi nhận hàng, cảm ơn.
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú cho đơn hàng {deliveryTime === 'custom' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={deliveryTime === 'custom' ? 'Nhập ghi chú cho đơn hàng (bắt buộc khi chọn Thời gian khác)' : 'Ghi chú thêm cho đơn hàng (không bắt buộc)'}
                />
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || orderPlacing}
                className="w-full bg-accent text-white py-4 px-6 rounded-lg font-semibold hover:opacity-95 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading || orderPlacing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </div>
                ) : (
                  '🚀 Đặt hàng ngay'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tóm tắt đơn hàng</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-cream rounded-lg">
              <div className="text-2xl font-bold text-accent">{selectedItems.length}</div>
              <div className="text-sm text-gray-600">Món ăn</div>
            </div>
            <div className="p-4 bg-cream rounded-lg">
              <div className="text-2xl font-bold text-accent">{formatPrice(getDiscountedTotal())}</div>
              <div className="text-sm text-gray-600">Tổng tiền</div>
            </div>
            <div className="p-4 bg-cream rounded-lg">
              <div className="text-2xl font-bold text-accent">30-45</div>
              <div className="text-sm text-gray-600">Phút giao hàng</div>
            </div>
          </div>
        </div>
        
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Xác nhận thanh toán {paymentMethod === 'bank' ? 'Ngân hàng' : 'MoMo'}</h3>
                <div className="text-sm font-semibold text-red-600">
                  Thời gian còn lại: {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600">Số tiền cần thanh toán</div>
                    <div className="text-2xl font-bold text-green-600">{formatPrice(getDiscountedTotal())}</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phương thức:</span>
                      <span className="font-medium">{paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' : 'Ví MoMo'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nội dung chuyển khoản:</span>
                      <span className="font-medium truncate max-w-[220px] text-right" title={transferNote}>{transferNote}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Chi tiết đơn hàng</div>
                    <div className="max-h-40 overflow-auto border rounded-lg divide-y">
                      {selectedItems.map((it) => (
                        <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="truncate mr-2">{it.name} × {it.quantity}</div>
                          <div className="font-medium">{formatPrice(it.price * it.quantity)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                    Vui lòng chuyển đúng số tiền và nội dung để hệ thống xác nhận nhanh hơn.
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full flex items-center justify-center">
                    <img
                      src={paymentMethod === 'bank' ? getBankQrUrl() : '/images/momo.jpg'}
                      alt={paymentMethod === 'bank' ? 'Mã QR chuyển khoản ngân hàng' : 'Mã QR MoMo'}
                      className="w-full max-w-md h-auto rounded-xl border shadow-lg"
                    />
                  </div>
                  <div className="mt-3 text-center text-gray-600 text-sm">Quét mã QR để thanh toán</div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex flex-col md:flex-row gap-3 md:gap-0 md:items-center md:justify-between">
                <div className="text-sm text-gray-600">Sau khi chuyển khoản xong, vui lòng nhấn "Tôi đã chuyển khoản".</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPendingOrderData(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Hủy giao dịch
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingOrderData) return;
                      try {
                        setLoading(true);
                        setOrderPlacing(true);
                        const response = await ordersAPI.createOrder(pendingOrderData);
                        if (!response || !response.data || !response.data.order || !response.data.order.id) {
                          showNotification('Đơn hàng không được tạo thành công!', 'error');
                          return;
                        }
                        try {
                          if (voucherApplied && voucherCode) {
                            await vouchersAPI.useVoucher(voucherCode.trim().toUpperCase());
                            try {
                              const res2 = await vouchersAPI.getPublic();
                              const list2 = Array.isArray(res2?.data?.vouchers) ? res2.data.vouchers : [];
                              setAvailableVouchers(list2);
                            } catch (_) {}
                          }
                        } catch (_) {}
                        showNotification('Đặt hàng thành công! 🎉', 'success');
                        setShowPaymentModal(false);
                        setPendingOrderData(null);
                        clearCart();
                        navigate('/orders');
                      } catch (error) {
                        console.error('Order error:', error);
                        showNotification('Có lỗi xảy ra khi xác nhận thanh toán!', 'error');
                      } finally {
                        setLoading(false);
                        setOrderPlacing(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Tôi đã chuyển khoản
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
