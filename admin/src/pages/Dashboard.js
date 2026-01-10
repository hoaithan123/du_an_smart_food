import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  message, 
  Spin, 
  Empty, 
  List, 
  Avatar, 
  Tag, 
  Typography, 
  Badge
} from 'antd';
import {
  ShoppingOutlined,
  UserOutlined,
  DollarOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  ImportOutlined,
  WarningOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';
import { Column, Pie } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [stockByType, setStockByType] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          message.error('Bạn chưa đăng nhập');
          navigate('/login');
          return;
        }

        const res = await adminAPI.getDashboardSummary();
        
        setStats(res.data.stats);
        setDailyRevenue(res.data.charts.dailyRevenue || []);
        setStockByType(res.data.charts.stockByType || []);
        setTopSellingProducts(res.data.topSellingProducts || []);
        setLowStockProducts(res.data.lowStockProducts || []);
        setTopCustomers(res.data.topCustomers || []);
        setRecentActivities(res.data.recentActivities || []);
      } catch (error) {
        console.error('Lỗi tải Dashboard:', error);
        if (error.response?.status === 401) {
          message.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          message.error('Không thể tải dữ liệu Dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(num)}đ`;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleCardClick = (card) => {
    if (card.clickable && card.route) {
      navigate(card.route);
    }
  };

  const dashboardCards = [
    {
      title: 'Tổng sản phẩm',
      value: stats.totalProducts ?? 0,
      icon: <ShoppingOutlined style={{ fontSize: 36, color: '#1890ff' }} />,
      color: '#e6f7ff',
      clickable: true,
      route: '/sanpham'
    },
    {
      title: 'Tổng nhân viên',
      value: stats.totalEmployees ?? 0,
      icon: <UserOutlined style={{ fontSize: 36, color: '#52c41a' }} />,
      color: '#f6ffed',
      clickable: true,
      route: '/nhanvien'
    },
    {
      title: 'Tổng doanh thu',
      value: formatCurrency(stats.totalRevenue || 0),
      icon: <DollarOutlined style={{ fontSize: 36, color: '#faad14' }} />,
      color: '#fffbe6',
      clickable: true,
      route: '/baocao/doanhthu'
    },
    {
      title: 'Tổng hóa đơn',
      value: stats.totalInvoices ?? 0,
      icon: <FileTextOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
      color: '#f9f0ff',
      clickable: true,
      route: '/don-hang'
    },
    {
      title: 'Người mua (7 ngày)',
      value: stats.totalBuyersLast7Days ?? 0,
      icon: <TeamOutlined style={{ fontSize: 36, color: '#13c2c2' }} />,
      color: '#e6fffb',
      clickable: true,
      route: '/don-hang'
    }
  ];

  // Format daily revenue data
  const formattedDailyRevenue = (Array.isArray(dailyRevenue) ? dailyRevenue : [])
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(item => {
      const iso = String(item.date);
      const parts = iso.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        const dateFormatted = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return { ...item, dateFormatted };
      }
      return { ...item, dateFormatted: iso };
    });

  // Column chart data: Revenue & Buyers
  const columnChartData = formattedDailyRevenue.flatMap((item) => {
    const revenue = Number(item.revenue) || 0;
    const buyers = Number(item.buyers) || 0;
    return [
      {
        dateFormatted: item.dateFormatted,
        date: item.date,
        type: 'Doanh thu',
        value: revenue,
      },
      {
        dateFormatted: item.dateFormatted,
        date: item.date,
        type: 'Người mua',
        value: buyers,
      },
    ];
  });

  const columnConfig = {
    data: columnChartData,
    isGroup: true,
    xField: 'dateFormatted',
    yField: 'value',
    seriesField: 'type',
    color: ['#1890ff', '#52c41a'],
    meta: {
      dateFormatted: { alias: 'Ngày' },
      value: { alias: 'Giá trị' },
    },
    label: false,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    legend: {
      position: 'top',
    },
    tooltip: {
      shared: true,
      title: 'dateFormatted',
      showMarkers: false,
      fields: ['dateFormatted', 'type', 'value'],
      customContent: (title, items) => {
        if (!items || items.length === 0) return '';
        const computedTitle = title || items?.[0]?.data?.dateFormatted || '';
        const rows = items.map((it) => {
          const datum = it?.data || {};
          const type = datum.type || it?.name || '';
          const raw = datum.value ?? it?.value ?? 0;
          const num = Number(raw) || 0;
          const formatted = type === 'Doanh thu'
            ? formatCurrency(num)
            : `${num} người`;
          const color = it?.color || '#999';
          return `
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
              <span style="flex:1;">${type}</span>
              <span>${formatted}</span>
            </div>
          `;
        }).join('');
        return `
          <div style="padding:8px 12px;">
            <div style="font-weight:600;margin-bottom:4px;">${computedTitle}</div>
            ${rows}
          </div>
        `;
      },
    },
    yAxis: {
      label: {
        formatter: (val) => {
          const numVal = Number(val);
          if (numVal >= 1000000) {
            return `${(numVal / 1000000).toFixed(1)}M`;
          } else if (numVal >= 1000) {
            return `${(numVal / 1000).toFixed(1)}K`;
          }
          return new Intl.NumberFormat('vi-VN').format(numVal);
        },
      },
    },
  };

  // Pie chart data (7 ngày gần nhất)
  const revenueByCategory7Days = [
    { type: 'Món chính', value: 45 },
    { type: 'Món phụ', value: 30 },
    { type: 'Đồ uống', value: 20 },
    { type: 'Tráng miệng', value: 5 },
  ];
  // Pie chart config
  const pieConfig = {
    data: revenueByCategory7Days,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    height: 280
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sale':
        return <ShoppingCartOutlined style={{ color: '#52c41a' }} />;
      case 'customer_purchase':
        return <ShoppingCartOutlined style={{ color: '#13c2c2' }} />;
      case 'purchase':
        return <ImportOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'sale':
        return 'success';
      case 'customer_purchase':
        return 'processing';
      case 'purchase':
        return 'processing';
      default:
        return 'default';
    }
  };

  return (
    <MainLayout>
      <div style={{ padding: '0 24px' }}>
        <Title level={2} style={{ marginBottom: 32, color: '#001529' }}>
          Dashboard - Tổng quan hệ thống
        </Title>
        
        <Spin spinning={loading}>
          {/* Thống kê tổng quan */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            {dashboardCards.map((card, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card
                  onClick={() => handleCardClick(card)}
                  style={{
                    backgroundColor: card.color,
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    cursor: card.clickable ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: 'none',
                    height: '120px'
                  }}
                  onMouseEnter={(e) => {
                    if (card.clickable) {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (card.clickable) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16,
                    height: '100%'
                  }}>
                    <div style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '50%',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {card.icon}
                    </div>
                    <Statistic 
                      title={card.title} 
                      value={card.value}
                      titleStyle={{ fontSize: 14, fontWeight: 500 }}
                      valueStyle={{ fontSize: 20, fontWeight: 'bold' }}
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Người mua của tháng và Hoạt động gần đây */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrophyOutlined style={{ color: '#faad14' }} />
                    <span>Người mua của tháng</span>
                  </div>
                }
                style={{
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none',
                  height: '200px'
                }}
                styles={{ body: {
                    padding: '0 16px',
                    height: '140px',
                    overflow: 'auto'
                }}}
              >
                {topCustomers.length > 0 ? (
                  <List
                    dataSource={topCustomers}
                    renderItem={(item, index) => (
                      <List.Item style={{ padding: '10px 0', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                          <Badge
                            count={index + 1}
                            style={{
                              backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#d9d9d9' : '#f0f0f0',
                              color: index <= 1 ? '#fff' : '#666',
                              boxShadow: '0 0 0 1px #fff'
                            }}
                          />
                          <Avatar icon={<UserOutlined />} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: 'block' }}>
                              {item.name}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Chi tiêu: {formatCurrency(item.revenue)}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty
                      description="Chưa có dữ liệu người mua của tháng"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    <span>Hoạt động gần đây</span>
                  </div>
                }
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none',
                  height: '200px'
                }}
                styles={{ body: { padding: '16px', height: '140px', overflow: 'hidden' } }}
              >
                {recentActivities.length > 0 ? (
                  <List
                    size="small"
                    dataSource={recentActivities}
                    renderItem={item => (
                      <List.Item style={{ padding: '8px 0', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                          <Avatar 
                            size="small" 
                            icon={getActivityIcon(item.type)}
                            style={{ 
                              backgroundColor: item.type === 'sale' ? '#f6ffed' : item.type === 'customer_purchase' ? '#e6fffb' : '#e6f7ff',
                              border: item.type === 'sale' ? '1px solid #b7eb8f' : item.type === 'customer_purchase' ? '1px solid #87e8de' : '1px solid #91d5ff'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 12, display: 'block' }} ellipsis>
                              {item.description}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {formatDate(item.date)}
                            </Text>
                          </div>
                          <Tag color={getActivityColor(item.type)} size="small">
                            {item.type === 'sale' ? 'Bán' : (item.type === 'purchase' ? 'Nhập' : (item.type === 'customer_purchase' ? 'Mua hàng' : 'Khác'))}
                          </Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty 
                    description="Chưa có hoạt động gần đây"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* Biểu đồ doanh thu */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col span={24}>
              <Card 
                title="Doanh thu & số người mua 7 ngày gần nhất"
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none'
                }}
              >
                {columnChartData && columnChartData.length > 0 ? (
                  <Column {...columnConfig} />
                ) : (
                  <Empty description="Không có dữ liệu doanh thu để hiển thị" />
                )}
              </Card>
            </Col>
          </Row>

          {/* Sản phẩm bán chạy, Tồn kho và Cảnh báo */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={8}>
              <Card 
                title="Top 5 sản phẩm bán chạy"
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none',
                  height: '400px'
                }}
                styles={{ body: { height: '320px', overflow: 'auto' } }}
              >
                {topSellingProducts.length > 0 ? (
                  <List
                    dataSource={topSellingProducts}
                    renderItem={(item, index) => (
                      <List.Item style={{ padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                          <Badge 
                            count={index + 1} 
                            style={{ 
                              backgroundColor: index === 0 ? '#faad14' : index === 1 ? '#d9d9d9' : '#f0f0f0',
                              color: index <= 1 ? '#fff' : '#666'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: 'block' }}>
                              {item.name}
                            </Text>
                            <Text type="secondary">
                              Đã bán: {item.sold}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Chưa có dữ liệu sản phẩm bán chạy" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card 
                title="TỶ LỆ DOANH THU THEO DANH MỤC SẢN PHẨM"
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none',
                  height: '400px'
                }}
                styles={{ body: {
                  height: '320px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}}
              >
                {revenueByCategory7Days.length > 0 ? (
                  <div style={{ width: '100%', height: '100%' }}>
                    <Pie {...pieConfig} />
                  </div>
                ) : (
                  <Empty description="Không có dữ liệu doanh thu theo danh mục" />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                    <span>Cảnh báo tồn kho thấp</span>
                  </div>
                }
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: 'none',
                  height: '400px'
                }}
                styles={{ body: { height: '320px', overflow: 'auto' } }}
              >
                {lowStockProducts.length > 0 ? (
                  <List
                    dataSource={lowStockProducts}
                    renderItem={item => (
                      <List.Item style={{ padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                          <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: 'block' }}>
                              {item.name}
                            </Text>
                            <Tag color="error" size="small">
                              Còn lại: {item.quantity}
                            </Tag>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">Tất cả sản phẩm đều có tồn kho đủ</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
    </MainLayout>
  );
};

export default Dashboard;