// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // URL backend của bạn
});

// Interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints cho admin
export const adminAPI = {
  // Auth
  login: (data) => api.post('/auth/login', data),

  // Dashboard (tổng hợp từ các endpoint của SmartFood)
  getDashboardSummary: async () => {
    const [overviewRes, dishesStatsRes, customersRes, recentOrdersRes, dishesCountRes, employeesRes] = await Promise.all([
      api.get('/analytics/overview', { params: { period: '30' } }),
      api.get('/analytics/dishes', { params: { period: '30' } }),
      api.get('/analytics/customers'),
      api.get('/orders/admin/all', { params: { limit: 5, offset: 0 } }),
      api.get('/dishes', { params: { limit: 1, offset: 0 } }),
      api.get('/users/admin/all', { params: { limit: 1, offset: 0 } })
    ]);

    const overview = overviewRes?.data || {};
    const ov = overview?.overview || {};
    const dailyStats = overview?.daily_stats || [];
    const dishesStats = dishesStatsRes?.data || {};
    const popularDishes = dishesStats?.popular_dishes || [];
    const lowSelling = dishesStats?.low_selling_dishes || [];
    const lowStock = dishesStats?.low_stock_dishes || []; // Thêm debug
    console.log('Low stock dishes from API:', lowStock); // Debug log
    const customers = customersRes?.data || {};
    const orders = recentOrdersRes?.data?.orders || [];
    const totalDishes = Number(dishesCountRes?.data?.total || 0);
    const employeesCount = (employeesRes?.data?.users || []).filter(u => (u.role || '').toUpperCase() === 'ADMIN').length;

    const stats = {
      totalProducts: totalDishes,
      totalCustomers: Number(ov.total_customers || 0),
      totalEmployees: employeesCount,
      totalRevenue: Number(ov.total_revenue || 0),
      totalInvoices: Number(ov.total_orders || 0),
      totalBuyersLast7Days: Number(customers.active_customers || 0) // thực tế 30 ngày từ API
    };

    const charts = {
      dailyRevenue: dailyStats.map((d) => ({
        date: d.date,
        revenue: Number(d.revenue || 0),
        buyers: Number(d.orders || 0) // dùng số đơn hàng như số người mua
      })),
      stockByType: popularDishes.slice(0, 5).map((d) => ({
        type: d.name,
        value: Number(d.revenue || d.total_quantity || 0)
      }))
    };

    const topSellingProducts = popularDishes.slice(0, 5).map((d) => ({
      name: d.name,
      sold: Number(d.total_quantity || 0)
    }));

    const lowStockProducts = (lowStock || []).map((d) => ({
      name: d.name,
      quantity: Number(d.stock || 0) // Dùng lowStock thay vì lowSelling
    }));

    const topCustomers = (customers.top_customers || []).map((c) => ({
      name: c.full_name || c.email,
      revenue: Number(c.total_spent || 0)
    }));

    const recentActivities = orders.map((o) => ({
      type: 'sale',
      description: `Đơn ${o.order_number} - ${new Intl.NumberFormat('vi-VN').format(Number(o.total_amount || 0))}đ - ${o.status}`,
      date: o.order_time
    }));

    return {
      data: {
        stats,
        charts,
        topSellingProducts,
        lowStockProducts,
        topCustomers,
        recentActivities
      }
    };
  },

  // Orders (Admin)
  getAllOrders: async (params = {}) => {
    const res = await api.get('/orders/admin/all', { params });
    const orders = res?.data?.orders || [];
    const mapStatusToVi = (s) => {
      switch ((s || '').toUpperCase()) {
        case 'PENDING': return 'cho_xac_nhan';
        case 'CONFIRMED': return 'da_xac_nhan';
        case 'PREPARING':
        case 'READY': return 'dang_giao';
        case 'DELIVERED': return 'da_giao';
        case 'CANCELLED': return 'da_huy';
        default: return 'cho_xac_nhan';
      }
    };
    const mapped = orders.map((o) => ({
      id: o.id,
      ma_don_hang: o.order_number,
      ho_ten_nguoi_nhan: o.full_name || 'Khách hàng',
      so_dien_thoai: o.phone || '',
      dia_chi_giao_hang: o.delivery_address || '',
      tong_tien: Number(o.total_amount || 0),
      trang_thai: mapStatusToVi(o.status),
      trang_thai_thanh_toan: (o.payment_status || '').toString().toUpperCase() === 'PAID',
      phuong_thuc_thanh_toan: (o.payment_method || '').toString().toLowerCase(),
      ngay_tao: o.order_time,
      khach_hang: { ho_ten: o.full_name || 'Khách hàng' },
    }));
    return { data: mapped };
  },
  updateOrderStatus: (id, data) => {
    const vi = (data?.trang_thai || data?.status || '').toString();
    const mapViToEn = (s) => {
      switch (s) {
        case 'cho_xac_nhan': return 'PENDING';
        case 'da_xac_nhan': return 'CONFIRMED';
        case 'dang_giao': return 'READY';
        case 'da_giao': return 'DELIVERED';
        case 'da_huy': return 'CANCELLED';
        default: return 'PENDING';
      }
    };
    return api.put(`/orders/${id}/status`, { status: mapViToEn(vi) });
  },
  getOrderDetail: async (id) => {
    const res = await api.get(`/orders/admin/${id}`);
    const o = res?.data?.order;
    if (!o) return { data: null };
    const items = (o.items || []).map((it) => ({
      ten_san_pham: it.dish_name,
      so_luong: it.quantity,
      don_gia: Number(it.price || 0),
    }));
    const mapped = {
      id: o.id,
      ma_don_hang: o.order_number,
      ho_ten_nguoi_nhan: o.full_name || '',
      so_dien_thoai: o.phone || '',
      dia_chi_giao_hang: o.delivery_address || '',
      tong_tien: Number(o.total_amount || 0),
      trang_thai: o.status,
      trang_thai_thanh_toan: (o.payment_status || '').toString().toUpperCase() === 'PAID',
      phuong_thuc_thanh_toan: (o.payment_method || '').toString().toLowerCase(),
      ngay_tao: o.order_time,
      chi_tiet_don_hang: items,
    };
    return { data: mapped };
  },

  // Users (Customers management)
  getAllCustomers: async (params = {}) => {
    const res = await api.get('/users/admin/all', { params });
    const users = res?.data?.users || [];
    const mapped = users.map((u) => ({
      id: u.id,
      ho_ten: u.fullName || u.username || 'Khách hàng',
      email: u.email,
      so_dien_thoai: u.phone || '',
      trang_thai: true,
      ngay_tao: u.createdAt,
      dia_chi: [],
      don_hang: [],
    }));
    return { data: mapped };
  },
  updateCustomerStatus: async (id, data) => {
    // Backend chưa có trạng thái kích hoạt/khóa; bỏ qua và trả về thành công giả lập
    return { data: { message: 'Status updated (no-op)' } };
  },

  // Employees (map to SmartFood users API)
  getEmployees: async (params = {}) => {
    const res = await api.get('/users/admin/all', { params });
    const users = res?.data?.users || [];
    const mapped = users
      .filter((u) => (u.role || '').toUpperCase() === 'ADMIN') // chỉ lấy admin làm nhân viên quản trị
      .map((u) => ({
        id: u.id,
        ho_ten: u.fullName || u.username || 'Nhân viên',
        tai_khoan: u.username || (u.email ? u.email.split('@')[0] : ''),
        email: u.email,
        so_dien_thoai: u.phone || '',
        vai_tro: 'quan_ly',
        trang_thai: 'Dang_lam',
        ngay_sinh: null,
        ngay_vao_lam: u.createdAt,
        dia_chi: '',
      }));
    return { data: mapped };
  },
  createEmployee: async (data) => {
    // Đăng ký user mới, sau đó gán role phù hợp
    const registerRes = await api.post('/auth/register', {
      username: data.tai_khoan || (data.email ? data.email.split('@')[0] : ''),
      email: data.email,
      password: data.mat_khau || '12345678',
      fullName: data.ho_ten,
      phone: data.so_dien_thoai,
      address: data.dia_chi,
    });
    const created = registerRes?.data?.user;
    if (created?.id) {
      const backendRole = data.vai_tro === 'quan_ly' ? 'ADMIN' : 'CUSTOMER';
      await api.put(`/users/${created.id}/role`, { role: backendRole });
    }
    return { data: { message: 'Employee created' } };
  },
  updateEmployee: async (id, data) => {
    const backendRole = data.vai_tro === 'quan_ly' ? 'ADMIN' : 'CUSTOMER';
    await api.put(`/users/${id}/role`, { role: backendRole });
    return { data: { message: 'Employee updated' } };
  },
  deleteEmployee: async (id) => {
    // Không có xóa user, chuyển role về CUSTOMER để ẩn khỏi danh sách nhân viên
    await api.put(`/users/${id}/role`, { role: 'CUSTOMER' });
    return { data: { message: 'Employee removed from admin role' } };
  },

  // Dishes (Products)
  getProducts: async (params = {}) => {
    const base = { ...params };
    const firstQuery = { ...base, limit: base.limit ?? 'all' };
    try {
      const res = await api.get('/dishes', { params: firstQuery });
      const dishes = res?.data?.dishes || [];
      const mapped = dishes.map((d) => ({
        id: d.id,
        ma_san_pham: `SP${d.id}`,
        ten_san_pham: d.name,
        don_vi_tinh: 'phần',
        gia_ban: Number(d.price || 0),
        // Lấy tồn kho từ nhiều tên trường khác nhau để tránh trả về 0
        ...(() => {
          const quantity =
            d.stock ??
            d.so_luong ??
            d.quantity ??
            d.available_quantity ??
            d.availableQuantity ??
            d.inventory ??
            0;
          const q = Number(quantity) || 0;
          return { so_luong: q, stock: q };
        })(),
        category_id: d.category_id || d.categoryId || 1,
      }));
      return { data: mapped, total: Number(res?.data?.total || mapped.length) };
    } catch (err) {
      // Fallback: older backend may not support limit=all
      const fallbackQuery = { ...base, limit: base.limit ?? 10000 };
      const res = await api.get('/dishes', { params: fallbackQuery });
      const dishes = res?.data?.dishes || [];
      const mapped = dishes.map((d) => ({
        id: d.id,
        ma_san_pham: `SP${d.id}`,
        ten_san_pham: d.name,
        don_vi_tinh: 'phần',
        gia_ban: Number(d.price || 0),
        so_luong: Number(d.stock ?? 0),
        category_id: d.category_id || d.categoryId || 1,
      }));
      return { data: mapped, total: Number(res?.data?.total || mapped.length) };
    }
  },
  getCategories: async () => {
    const res = await api.get('/dishes/categories/list');
    const cats = res?.data?.categories || [];
    return { data: cats.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive !== false })) };
  },
  createCategory: async (data) => {
    const res = await api.post('/dishes/categories', data);
    return { data: res?.data?.category || res?.data };
  },
  updateCategory: async (id, data) => {
    const res = await api.put(`/dishes/categories/${id}`, data);
    return { data: res?.data?.category || res?.data };
  },
  deleteCategory: async (id) => {
    const res = await api.delete(`/dishes/categories/${id}`);
    return { data: res?.data };
  },
  createProduct: async (data) => {
    let categoryId = data.category_id;
    if (!categoryId) {
      try {
        const res = await api.get('/dishes/categories/list');
        categoryId = res?.data?.categories?.[0]?.id || 1;
      } catch (_) {
        categoryId = 1;
      }
    }
    const payload = {
      name: data.ten_san_pham,
      description: '',
      price: Number(data.gia_ban),
      image: '',
      category_id: categoryId,
      ingredients: null,
      nutrition_info: null,
      tags: [],
      preparation_time: null,
      stock: typeof data.so_luong !== 'undefined' ? parseInt(data.so_luong, 10) : 0,
    };
    return api.post('/dishes', payload);
  },
  updateProduct: (id, data) => {
    const numPrice = Number(data.gia_ban);
    const payload = {
      name: data.ten_san_pham,
      // only include price if valid number
      ...(Number.isFinite(numPrice) ? { price: numPrice } : {}),
      // only include category_id when present
      ...(typeof data.category_id !== 'undefined' ? { category_id: data.category_id } : {}),
      // do not send is_available here to avoid accidental disable
      ...(typeof data.so_luong !== 'undefined' ? { stock: parseInt(data.so_luong, 10) } : {}),
    };
    return api.put(`/dishes/${id}`, payload);
  },
  deleteProduct: (id) => api.delete(`/dishes/${id}`),

  // Stock management
  backfillStock: (defaultStock = 50) => api.post('/dishes/admin/backfill-stock', { default_stock: defaultStock }),

  // Reports/Analytics pass-through
  getRevenueReport: (params) => api.get('/analytics/revenue', { params }),

  // Vouchers (backend API)
  getVouchers: async () => {
    const res = await api.get('/vouchers');
    const list = res?.data?.vouchers || [];
    return { data: list };
  },
  createVoucher: async (data) => {
    const res = await api.post('/vouchers', data);
    return { data: res?.data?.voucher || res?.data };
  },
  updateVoucher: async (id, data) => {
    const res = await api.put(`/vouchers/${id}`, data);
    return { data: res?.data?.voucher || res?.data };
  },
  deleteVoucher: async (id) => {
    const res = await api.delete(`/vouchers/${id}`);
    return { data: res?.data };
  },
  getVoucherStats: async () => {
    const res = await api.get('/vouchers');
    const list = res?.data?.vouchers || [];
    const now = new Date();
    const computeStatus = (v) => {
      const used = Number(v.so_luong_da_dung || 0);
      const total = Number(v.so_luong || 0);
      const start = v.ngay_bat_dau ? new Date(v.ngay_bat_dau) : null;
      const end = v.ngay_ket_thuc ? new Date(v.ngay_ket_thuc) : null;
      if (total > 0 && used >= total) return 'het_luong';
      if (end && end < now) return 'het_han';
      if (start && start > now) return 'tam_dung';
      return 'hoat_dong';
    };
    const total = list.length;
    const usedTotal = list.reduce((sum, v) => sum + Number(v.so_luong_da_dung || 0), 0);
    const active = list.filter((v) => (v.trang_thai || computeStatus(v)) === 'hoat_dong').length;
    const expired = list.filter((v) => (v.trang_thai || computeStatus(v)) === 'het_han').length;
    return { data: {
      tong_so_voucher: total,
      voucher_dang_hoat_dong: active,
      tong_luot_su_dung: usedTotal,
      voucher_het_han: expired,
    }};
  },
};

export default api;
