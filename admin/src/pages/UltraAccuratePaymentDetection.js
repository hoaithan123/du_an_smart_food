import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Switch, 
  Statistic, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Alert, 
  Progress,
  message,
  Descriptions,
  Badge
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

const UltraAccuratePaymentDetection = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const columns = [
    {
      title: 'Mã giao dịch',
      dataIndex: 'ma_giao_dich',
      key: 'ma_giao_dich',
      width: 200,
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'ma_don_hang',
      key: 'ma_don_hang',
      width: 150,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div>{record.don_hang?.khach_hang?.ho_ten}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.don_hang?.khach_hang?.email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'so_tien',
      key: 'so_tien',
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      render: (status) => {
        const statusConfig = {
          cho_xac_nhan: { color: 'orange', text: 'Chờ xác nhận' },
          da_xac_nhan: { color: 'green', text: 'Đã xác nhận' },
          bi_tu_choi: { color: 'red', text: 'Bị từ chối' },
          het_han: { color: 'gray', text: 'Hết hạn' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Nguồn xác nhận',
      dataIndex: 'nguoi_xac_nhan',
      key: 'nguoi_xac_nhan',
      render: (source) => {
        if (source?.includes('ULTRA_ACCURATE')) {
          return (
            <Badge 
              status="success" 
              text={
                <Space>
                  <ThunderboltOutlined style={{ color: '#52c41a' }} />
                  <Text strong style={{ color: '#52c41a' }}>Siêu chính xác</Text>
                </Space>
              } 
            />
          );
        }
        return <Tag color="blue">{source}</Tag>;
      },
    },
    {
      title: 'Thời gian xác nhận',
      dataIndex: 'thoi_gian_xac_nhan',
      key: 'thoi_gian_xac_nhan',
      render: (time) => time ? new Date(time).toLocaleString('vi-VN') : '-',
    },
  ];

  const loadSystemStatus = async () => {
    try {
      const response = await api.get('/ultra-accurate-payment-detection/status');
      setSystemStatus(response.data.data);
    } catch (error) {
      message.error('Lỗi tải trạng thái hệ thống');
      console.error('Load system status error:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await api.get('/qr-payment/pending-bank');
      setRecentTransactions(response.data.data || []);
    } catch (error) {
      message.error('Lỗi tải danh sách giao dịch');
      console.error('Load recent transactions error:', error);
    }
  };

  const startSystem = async () => {
    setLoading(true);
    try {
      await api.post('/ultra-accurate-payment-detection/start');
      message.success('Hệ thống siêu chính xác đã được khởi động');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi khởi động hệ thống siêu chính xác');
      console.error('Start system error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopSystem = async () => {
    setLoading(true);
    try {
      await api.post('/ultra-accurate-payment-detection/stop');
      message.success('Hệ thống siêu chính xác đã được dừng');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi dừng hệ thống siêu chính xác');
      console.error('Stop system error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSystem = async () => {
    setLoading(true);
    try {
      await api.post('/ultra-accurate-payment-detection/test');
      message.success('Test hệ thống siêu chính xác thành công');
    } catch (error) {
      message.error('Lỗi test hệ thống siêu chính xác');
      console.error('Test system error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    loadRecentTransactions();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadSystemStatus();
      loadRecentTransactions();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#1890ff' }} />
              Hệ thống phát hiện thanh toán siêu chính xác
            </Space>
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadSystemStatus();
                loadRecentTransactions();
              }}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* System Status */}
        <Card title="Trạng thái hệ thống" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Trạng thái"
                value={systemStatus?.isRunning ? 'Đang chạy' : 'Đã dừng'}
                valueStyle={{ color: systemStatus?.isRunning ? '#3f8600' : '#cf1322' }}
                prefix={systemStatus?.isRunning ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Check Interval"
                value={systemStatus?.checkInterval === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                valueStyle={{ color: systemStatus?.checkInterval === 'active' ? '#3f8600' : '#cf1322' }}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Uptime"
                value={systemStatus?.uptime ? Math.floor(systemStatus.uptime / 1000) : 0}
                suffix="giây"
                prefix={<SafetyOutlined />}
              />
            </Col>
          </Row>
          
          <div style={{ marginTop: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startSystem}
                loading={loading}
                disabled={systemStatus?.isRunning}
              >
                Khởi động
              </Button>
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={stopSystem}
                loading={loading}
                disabled={!systemStatus?.isRunning}
              >
                Dừng
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={testSystem}
                loading={loading}
              >
                Test hệ thống
              </Button>
            </Space>
          </div>
        </Card>

        {/* Features */}
        <Card title="Tính năng siêu chính xác" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Alert
                message="Kiểm tra kép 6 bước"
                description="Xác minh thời gian hết hạn, số tiền, đơn hàng, khách hàng, trạng thái và tuổi giao dịch"
                type="success"
                showIcon
                icon={<SafetyOutlined />}
              />
            </Col>
            <Col span={12}>
              <Alert
                message="Timeout chính xác 1 phút"
                description="Tự động hủy giao dịch sau đúng 60 giây với độ chính xác cao"
                type="info"
                showIcon
                icon={<ClockCircleOutlined />}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Alert
                message="Phát hiện real-time"
                description="Kiểm tra mỗi 3 giây để phát hiện thanh toán nhanh nhất"
                type="warning"
                showIcon
                icon={<ThunderboltOutlined />}
              />
            </Col>
            <Col span={12}>
              <Alert
                message="Thông báo tức thì"
                description="Socket.IO thông báo ngay lập tức khi thanh toán thành công"
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            </Col>
          </Row>
        </Card>

        {/* Recent Transactions */}
        <Card title="Giao dịch gần đây">
          <Table
            columns={columns}
            dataSource={recentTransactions}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} giao dịch`
            }}
          />
        </Card>
      </Card>
    </div>
  );
};

export default UltraAccuratePaymentDetection;


