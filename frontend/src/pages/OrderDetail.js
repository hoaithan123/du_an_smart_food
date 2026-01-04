import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { ordersAPI } from '../services/api';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery(['order', id], () => ordersAPI.getOrder(id), {
    refetchOnWindowFocus: false,
  });

  const order = data?.data?.order;

  React.useEffect(() => {
    if (order && String(order.status) === 'DELIVERED') {
      queryClient.invalidateQueries('profile');
    }
  }, [order, queryClient]);

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

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'CASH':
        return 'Thanh toán khi nhận hàng (COD)';
      case 'CARD':
        return 'Ví MoMo';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản ngân hàng';
      default:
        return method || 'Không xác định';
    }
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case 'PAID':
        return { badge: 'bg-green-100 text-green-800', text: 'Đã thanh toán' };
      case 'FAILED':
        return { badge: 'bg-red-100 text-red-800', text: 'Thanh toán thất bại' };
      case 'PENDING':
      default:
        return { badge: 'bg-yellow-100 text-yellow-800', text: 'Chờ thanh toán' };
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
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Không tìm thấy đơn hàng</h2>
            <button onClick={() => navigate('/orders')} className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">Quay lại danh sách</button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = (order.order_base_total != null)
    ? Number(order.order_base_total)
    : order.items.reduce((sum, item) => sum + (item.original_price ? item.original_price : item.price) * item.quantity, 0);
  const discountTotal = (order.order_discount_total != null)
    ? Number(order.order_discount_total)
    : subtotal - Number(order.total_amount || 0);
  const finalTotal = (order.order_final_total != null)
    ? Number(order.order_final_total)
    : Number(order.total_amount || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Quay lại</button>
          <div>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Đơn hàng #{order.order_number}</h1>
                <p className="text-gray-600 mt-1">Đặt lúc: {formatDate(order.order_time)}</p>
                {order.delivery_time && (
                  <p className="text-gray-600">Giao lúc: {formatDate(order.delivery_time)}</p>
                )}
                <p className="text-gray-600">Phương thức: {getPaymentMethodText(order.payment_method)}</p>
                {order.payment_status && (
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Trạng thái thanh toán:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full ${getPaymentStatusStyle(order.payment_status).badge}`}>
                      {getPaymentStatusStyle(order.payment_status).text}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Tổng tiền</p>
                <p className="text-2xl font-bold text-accent">{formatPrice(finalTotal)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="font-semibold text-gray-900 mb-4">Món ăn đã đặt</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.dish_image ? (
                        <img src={item.dish_image} alt={item.dish_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-xl">🍽️</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.dish_name}</h3>
                      {item.special_requests && (
                        <p className="text-sm text-gray-600">Ghi chú: {item.special_requests}</p>
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
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between"><span>Tạm tính (giá gốc)</span><span>{formatPrice(subtotal)}</span></div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-green-700"><span>Giảm giá</span><span>- {formatPrice(discountTotal)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Phí giao hàng</span><span>{formatPrice(0)}</span></div>
                  <div className="flex justify-between font-semibold text-gray-900 border-t pt-2"><span>Tổng tiền</span><span>{formatPrice(finalTotal)}</span></div>
                </div>
                <div className="mt-4 text-sm text-gray-700">
                  <p>📍 Địa chỉ: {order.delivery_address}</p>
                  <p className="mt-1">💳 Thanh toán: {getPaymentMethodText(order.payment_method)}</p>
                  {order.notes && <p className="mt-1">📝 Ghi chú: {order.notes}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
