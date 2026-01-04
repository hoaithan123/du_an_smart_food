import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const TIER_THRESHOLDS = {
  SILVER: 2000000,
  GOLD: 5000000,
  PLATINUM: 10000000,
};

const formatCurrency = (v) => new Intl.NumberFormat('vi-VN').format(Number(v || 0)) + 'đ';

const Profile = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery('profile', () => authAPI.getProfile());
  const user = data?.data?.user;

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const { currentTier, lifetimeSpend, toNext, nextTier, progress } = useMemo(() => {
    const spent = Number(user?.lifetimeSpend || 0);
    const computedTier = spent >= TIER_THRESHOLDS.PLATINUM
      ? 'PLATINUM'
      : spent >= TIER_THRESHOLDS.GOLD
      ? 'GOLD'
      : spent >= TIER_THRESHOLDS.SILVER
      ? 'SILVER'
      : 'BRONZE';
    const tier = computedTier;
    let next = null;
    let nextThreshold = null;
    let floor = 0;
    if (tier === 'BRONZE') { next = 'SILVER'; nextThreshold = TIER_THRESHOLDS.SILVER; floor = 0; }
    else if (tier === 'SILVER') { next = 'GOLD'; nextThreshold = TIER_THRESHOLDS.GOLD; floor = TIER_THRESHOLDS.SILVER; }
    else if (tier === 'GOLD') { next = 'PLATINUM'; nextThreshold = TIER_THRESHOLDS.PLATINUM; floor = TIER_THRESHOLDS.GOLD; }
    else { next = null; nextThreshold = null; floor = TIER_THRESHOLDS.PLATINUM; }
    const denom = nextThreshold != null ? (nextThreshold - floor) : 1;
    const prog = nextThreshold != null ? Math.min(1, Math.max(0, (spent - floor) / denom)) : 1;
    const remain = nextThreshold != null ? Math.max(0, nextThreshold - spent) : 0;
    return {
      currentTier: tier,
      lifetimeSpend: spent,
      toNext: remain,
      nextTier: next,
      progress: prog,
    };
  }, [user]);

  const tierClasses = useMemo(() => {
    const t = String(currentTier || 'BRONZE');
    if (t === 'BRONZE') return { container: 'bg-gradient-to-r from-amber-700 to-amber-500', text: 'text-white', progress: 'bg-amber-300' };
    if (t === 'SILVER') return { container: 'bg-gradient-to-r from-gray-400 to-gray-200', text: 'text-gray-900', progress: 'bg-gray-300' };
    if (t === 'GOLD') return { container: 'bg-gradient-to-r from-yellow-500 to-amber-400', text: 'text-white', progress: 'bg-yellow-300' };
    return { container: 'bg-gradient-to-r from-slate-400 to-zinc-200', text: 'text-gray-900', progress: 'bg-slate-300' };
  }, [currentTier]);

  const updateMutation = useMutation((payload) => authAPI.updateProfile(payload), {
    onSuccess: () => {
      toast.success('Cập nhật hồ sơ thành công');
      queryClient.invalidateQueries('profile');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Cập nhật thất bại';
      toast.error(msg);
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      address: form.address,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải hồ sơ</h2>
            <p className="text-gray-600">Không thể tải thông tin người dùng.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">👤 Hồ sơ</h1>

        <div className={`${tierClasses.container} ${tierClasses.text} rounded-lg shadow-md p-6 mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase text-sm opacity-80">Hạng thành viên</p>
              <h2 className="text-2xl font-bold mt-1">{currentTier}</h2>
              <p className="mt-2 text-sm opacity-90">Tổng chi tiêu: <span className="font-semibold">{formatCurrency(lifetimeSpend)}</span></p>
            </div>
            <div className="text-5xl">🏅</div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
              <div
                className={`${tierClasses.progress} h-3 rounded-full`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2 opacity-90">
              <span>{currentTier}</span>
              {nextTier ? (
                <span>Đến {nextTier}: còn {formatCurrency(toNext)}</span>
              ) : (
                <span>Đã đạt hạng cao nhất 🎉</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn --</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updateMutation.isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {updateMutation.isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
