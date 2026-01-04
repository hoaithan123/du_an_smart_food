import React, { useState } from 'react';
import { authAPI } from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!email.trim()) {
      setMessage('Vui lòng nhập email');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setMessage('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.');
      if (res?.data?.resetLink) {
        setResetLink(res.data.resetLink);
      } else {
        setResetLink('');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Quên mật khẩu</h1>
        <p className="text-gray-600 mb-6">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
        {message && (
          <div className="mb-4 text-sm text-blue-600">
            {message}
            {resetLink && (
              <div className="mt-2">
                Link kiểm tra (dev):{' '}
                <a href={resetLink} className="text-blue-700 underline" target="_blank" rel="noreferrer">
                  Đặt lại mật khẩu
                </a>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Email của bạn"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi liên kết'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;


