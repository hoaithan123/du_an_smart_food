import React, { useState, useCallback, useEffect } from 'react';
import { Card, DatePicker, message, Skeleton } from 'antd';
import dayjs from 'dayjs';
import api from '../../utils/api';
import MainLayout from '../../components/MainLayout';

const { RangePicker } = DatePicker;

const RevenueReport = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'day'), dayjs()]);

  // Memoized currency formatter để sử dụng lại và tránh re-render không cần thiết
  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }, []);

  const handleGenerateReport = async (dates) => {
    if (!dates || dates.length !== 2) {
      return message.error('Vui lòng chọn khoảng thời gian!');
    }
    const [startDate, endDate] = dates;
    setDateRange(dates);
    setLoading(true);
    setHasGenerated(true);
    setTotalRevenue(0); // Reset doanh thu khi bắt đầu tải

    try {
      const diffDays = endDate.diff(startDate, 'day') + 1;
      const response = await api.get('/analytics/overview', {
        params: { period: String(diffDays) }
      });
      setTotalRevenue(response.data?.overview?.total_revenue || 0);
    } catch (error) {
      console.error("Lỗi API báo cáo doanh thu:", error);
      message.error('Lỗi khi tính doanh thu. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MainLayout>
      <h2>Báo cáo Doanh thu</h2>

      <Card style={{ marginBottom: 20 }}>
        <p>Chọn khoảng thời gian để xem báo cáo doanh thu.</p>
        <RangePicker 
          value={dateRange}
          onChange={handleGenerateReport}
          getPopupContainer={() => document.body}
        />
      </Card>

      {hasGenerated && (
        <Card title="Tổng Doanh Thu">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrency(totalRevenue)}
            </p>
          )}
        </Card>
      )}
    </MainLayout>
  );
};

export default RevenueReport;