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
  Input, 
  Modal,
  message,
  Descriptions,
  Progress
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  PlusOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AutoPaymentDetection = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoHistory, setAutoHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testType, setTestType] = useState('sms');
  const [testContent, setTestContent] = useState('');
  const [testResult, setTestResult] = useState(null);

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
      title: 'Nguồn phát hiện',
      dataIndex: 'nguoi_xac_nhan',
      key: 'nguoi_xac_nhan',
      render: (source) => {
        const sourceConfig = {
          'AUTO_SMS_BANKING': { color: 'blue', text: 'SMS Banking' },
          'AUTO_EMAIL_BANKING': { color: 'green', text: 'Email Banking' },
          'AUTO_API_BANKING': { color: 'purple', text: 'API Banking' }
        };
        const config = sourceConfig[source] || { color: 'default', text: source };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Thời gian xác nhận',
      dataIndex: 'thoi_gian_xac_nhan',
      key: 'thoi_gian_xac_nhan',
      render: (time) => new Date(time).toLocaleString('vi-VN'),
    },
  ];

  const loadSystemStatus = async () => {
    try {
      const response = await api.get('/auto-payment-detection/status');
      setSystemStatus(response.data.data);
    } catch (error) {
      message.error('Lỗi tải trạng thái hệ thống');
      console.error('Load system status error:', error);
    }
  };

  const loadAutoHistory = async () => {
    try {
      const response = await api.get('/auto-payment-detection/history');
      setAutoHistory(response.data.data.transactions || []);
    } catch (error) {
      message.error('Lỗi tải lịch sử giao dịch tự động');
      console.error('Load auto history error:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/auto-payment-detection/stats');
      setStats(response.data.data);
    } catch (error) {
      message.error('Lỗi tải thống kê');
      console.error('Load stats error:', error);
    }
  };

  const startSystem = async () => {
    setLoading(true);
    try {
      await api.post('/auto-payment-detection/start');
      message.success('Hệ thống đã được khởi động');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi khởi động hệ thống');
      console.error('Start system error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopSystem = async () => {
    setLoading(true);
    try {
      await api.post('/auto-payment-detection/stop');
      message.success('Hệ thống đã được dừng');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi dừng hệ thống');
      console.error('Stop system error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMockTransaction = async () => {
    setLoading(true);
    try {
      await api.post('/api/auto-payment-detection/add-mock');
      message.success('Đã thêm giao dịch mẫu để test');
      loadAutoHistory();
    } catch (error) {
      message.error('Lỗi thêm giao dịch mẫu');
      console.error('Add mock transaction error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testParsing = async () => {
    if (!testContent.trim()) {
      message.warning('Vui lòng nhập nội dung để test');
      return;
    }

    setLoading(true);
    try {
      const endpoint = testType === 'sms' 
        ? '/api/auto-payment-detection/test-sms'
        : '/api/auto-payment-detection/test-email';
      
      const response = await api.post(endpoint, {
        [testType === 'sms' ? 'smsContent' : 'emailContent']: testContent
      });
      
      setTestResult(response.data.data);
      message.success('Test parsing thành công');
    } catch (error) {
      message.error('Lỗi test parsing');
      console.error('Test parsing error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    loadAutoHistory();
    loadStats();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Hệ thống tự động phát hiện giao dịch
          </Title>
          <Space>
            <Button
              icon={<ExperimentOutlined />}
              onClick={() => setTestModalVisible(true)}
            >
              Test Parser
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={addMockTransaction}
              loading={loading}
            >
              Thêm giao dịch mẫu
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadSystemStatus();
                loadAutoHistory();
                loadStats();
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
                prefix={<BarChartOutlined />}
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
            </Space>
          </div>
        </Card>

        {/* Statistics */}
        {stats && (
          <Card title="Thống kê" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Hôm nay"
                  value={stats.today?.reduce((sum, item) => sum + item._count.id, 0) || 0}
                  suffix="giao dịch"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Tuần này"
                  value={stats.week?.reduce((sum, item) => sum + item._count.id, 0) || 0}
                  suffix="giao dịch"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Tổng cộng"
                  value={stats.total?.reduce((sum, item) => sum + item._count.id, 0) || 0}
                  suffix="giao dịch"
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Auto Transaction History */}
        <Card title="Lịch sử giao dịch tự động">
          <Table
            columns={columns}
            dataSource={autoHistory}
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

      {/* Test Modal */}
      <Modal
        title="Test Parser"
        open={testModalVisible}
        onOk={testParsing}
        onCancel={() => {
          setTestModalVisible(false);
          setTestContent('');
          setTestResult(null);
        }}
        okText="Test"
        cancelText="Hủy"
        confirmLoading={loading}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Loại test:</Text>
          <div style={{ marginTop: 8 }}>
            <Button
              type={testType === 'sms' ? 'primary' : 'default'}
              onClick={() => setTestType('sms')}
              style={{ marginRight: 8 }}
            >
              SMS Banking
            </Button>
            <Button
              type={testType === 'email' ? 'primary' : 'default'}
              onClick={() => setTestType('email')}
            >
              Email Banking
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Nội dung {testType === 'sms' ? 'SMS' : 'Email'}:</Text>
          <TextArea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            placeholder={`Nhập nội dung ${testType === 'sms' ? 'SMS' : 'email'} để test...`}
            rows={6}
            style={{ marginTop: 8 }}
          />
        </div>

        {testResult && (
          <div>
            <Text strong>Kết quả:</Text>
            <Alert
              message={testResult.parsedInfo ? 'Parse thành công' : 'Không thể parse'}
              type={testResult.parsedInfo ? 'success' : 'warning'}
              style={{ marginTop: 8 }}
              description={
                testResult.parsedInfo ? (
                  <div>
                    <div><strong>Số tiền:</strong> {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(testResult.parsedInfo.amount)}</div>
                    <div><strong>Mã đơn hàng:</strong> {testResult.parsedInfo.orderId}</div>
                    <div><strong>Nguồn:</strong> {testResult.parsedInfo.source}</div>
                  </div>
                ) : 'Không tìm thấy thông tin giao dịch trong nội dung'
              }
            />
          </div>
        )}

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <Text strong>Ví dụ nội dung {testType === 'sms' ? 'SMS' : 'Email'}:</Text>
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            {testType === 'sms' ? (
              <div>
                VCB: +500,000VND tu 0123456789. So du: 5,000,000VND. ND: DH0012345678. 01/01/2024 10:30
              </div>
            ) : (
              <div>
                Giao dịch: +500,000 VND<br/>
                Nội dung: DH0012345678<br/>
                Thời gian: 01/01/2024 10:30
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AutoPaymentDetection;

