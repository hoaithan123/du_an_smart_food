import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { ordersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading, error, refetch } = useQuery(
    ['orders', statusFilter],
    () => ordersAPI.getMyOrders({ status: statusFilter || undefined }),
    {
      refetchOnWindowFocus: false,
    }
  );

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'CASH':
        return 'Thanh toán khi nhận hàng (COD)';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản ngân hàng';
      case 'CARD':
        return 'Ví MoMo';
      default:
        return method || 'Không xác định';
    }
  };

  const orders = ordersData?.data?.orders || [];

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    if (orders.some((o) => String(o?.status) === 'DELIVERED')) {
      queryClient.invalidateQueries('profile');
    }
  }, [ordersData, orders, queryClient]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800';
      case 'READY':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PREPARING':
        return 'Đang chuẩn bị';
      case 'READY':
        return 'Sẵn sàng giao';
      case 'DELIVERED':
        return 'Đã giao';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
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
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải dữ liệu</h2>
            <p className="text-gray-600 mb-4">Không thể tải danh sách đơn hàng.</p>
            <button
              onClick={() => refetch()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📋</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Chưa có đơn hàng</h1>
            <p className="text-gray-600 mb-8">
              Bạn chưa có đơn hàng nào. Hãy khám phá menu và đặt món ăn yêu thích!
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📋 Đơn hàng của tôi</h1>
          <p className="text-gray-600">
            Theo dõi trạng thái đơn hàng và lịch sử mua sắm
          </p>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chờ xác nhận
            </button>
            <button
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === 'CONFIRMED'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã xác nhận
            </button>
            <button
              onClick={() => setStatusFilter('PREPARING')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === 'PREPARING'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đang chuẩn bị
            </button>
            <button
              onClick={() => setStatusFilter('DELIVERED')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                statusFilter === 'DELIVERED'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã giao
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.map((order) => {
            const rawSubtotal = (order?.order_base_total != null)
              ? Number(order.order_base_total)
              : (Array.isArray(order?.items) ? order.items.reduce((sum, i) => sum + Number((i?.original_price ?? i?.price) || 0) * Number(i?.quantity || 0), 0) : 0);
            const apiFinal = (order?.order_final_total != null) ? Number(order.order_final_total) : Number(order?.total_amount ?? 0);
            const subtotal = isFinite(rawSubtotal) ? rawSubtotal : 0;
            const finalTotal = Math.max(0, isFinite(apiFinal) ? apiFinal : 0);
            const discount = Math.max(0, subtotal - finalTotal);

            return (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Order Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Đơn hàng #{order.order_number}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Đặt lúc: {formatDate(order.order_time)}
                    </p>
                    {order.delivery_time && (
                      <p className="text-sm text-gray-600">
                        Giao lúc (thời gian khác): {formatDate(order.delivery_time)}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <p className="text-lg font-bold text-blue-600 mt-2">{formatPrice(finalTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Món ăn đã đặt:</h4>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.dish_image ? (
                          <img
                            src={item.dish_image}
                            alt={item.dish_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-lg">🍽️</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{item.dish_name}</h5>
                        {item.special_requests && (
                          <p className="text-sm text-gray-600">
                            Ghi chú: {item.special_requests}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right text-sm">
                        {item.original_price && item.original_price !== item.price ? (
                          <div className="space-y-0.5">
                            <div className="text-gray-500 line-through">{item.quantity} × {formatPrice(item.original_price)}</div>
                            <div className="font-semibold text-gray-900">{item.quantity} × {formatPrice(item.price)}</div>
                            <div className="text-green-600">- {formatPrice((item.original_price - item.price) * item.quantity)}</div>
                            <div>= {formatPrice(item.quantity * item.price)}</div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900">{item.quantity} × {formatPrice(item.price)}</p>
                            <p className="text-gray-600">= {formatPrice(item.quantity * item.price)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing Summary */}
                <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Tạm tính (giá gốc)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Giảm giá</span>
                      <span>- {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 border-t pt-2 mt-2">
                    <span>Tổng cộng</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Order Details */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Thông tin giao hàng:</h5>
                      <p className="text-sm text-gray-600">📍 {order.delivery_address}</p>
                      <p className="text-sm text-gray-600 mt-1">💳 {getPaymentMethodText(order.payment_method)}</p>
                    </div>
                    {order.notes && (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">Ghi chú:</h5>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Xem chi tiết
                  </button>
                  
                  {order.status === 'DELIVERED' && (
                    <button
                      onClick={() => navigate('/menu')}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
              </div>
            </div>
          );})}
        </div>

        {/* Results Count */}
        <div className="mt-8 text-center text-gray-600">
          Hiển thị {orders.length} đơn hàng
        </div>
      </div>
    </div>
  );
};

export default Orders;
