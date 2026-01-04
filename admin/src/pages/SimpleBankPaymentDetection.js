import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Statistic, 
  Row, 
  Col, 
  Typography, 
  Alert, 
  Space,
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
  BankOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

const SimpleBankPaymentDetection = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSystemStatus = async () => {
    try {
      const response = await api.get('/simple-bank-payment-detection/status');
      setSystemStatus(response.data.data);
    } catch (error) {
      message.error('Lỗi tải trạng thái hệ thống');
      console.error('Load system status error:', error);
    }
  };

  const startSystem = async () => {
    setLoading(true);
    try {
      await api.post('/simple-bank-payment-detection/start');
      message.success('Hệ thống phát hiện thanh toán đã được khởi động');
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
      await api.post('/simple-bank-payment-detection/stop');
      message.success('Hệ thống phát hiện thanh toán đã được dừng');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi dừng hệ thống');
      console.error('Stop system error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadSystemStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <Space>
              <BankOutlined style={{ color: '#1890ff' }} />
              Hệ thống phát hiện thanh toán ngân hàng ĐƠN GIẢN
            </Space>
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadSystemStatus}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* System Status */}
        <Card title="Trạng thái hệ thống" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Trạng thái"
                value={systemStatus?.isRunning ? 'Đang chạy' : 'Đã dừng'}
                valueStyle={{ color: systemStatus?.isRunning ? '#3f8600' : '#cf1322' }}
                prefix={systemStatus?.isRunning ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Check Interval"
                value={systemStatus?.checkInterval === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                valueStyle={{ color: systemStatus?.checkInterval === 'active' ? '#3f8600' : '#cf1322' }}
                prefix={<ClockCircleOutlined />}
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

        {/* Instructions */}
        <Card title="Hướng dẫn sử dụng" style={{ marginBottom: 24 }}>
          <Alert
            message="Cách hoạt động"
            description={
              <div>
                <p><strong>1. Khởi động hệ thống:</strong> Click "Khởi động" để bật hệ thống phát hiện</p>
                <p><strong>2. Khách hàng đặt hàng:</strong> Chọn "Chuyển khoản ngân hàng"</p>
                <p><strong>3. Hiển thị QR code:</strong> Hệ thống tạo QR code với thông tin tài khoản</p>
                <p><strong>4. Khách hàng chuyển tiền:</strong> Quét QR code và chuyển tiền</p>
                <p><strong>5. Tự động phát hiện:</strong> Hệ thống kiểm tra mỗi 5 giây</p>
                <p><strong>6. Xác nhận thanh toán:</strong> Tự động cập nhật trạng thái đơn hàng</p>
                <p><strong>7. Thông báo khách hàng:</strong> Hiển thị "Đặt hàng thành công!"</p>
              </div>
            }
            type="info"
            showIcon
            icon={<ThunderboltOutlined />}
          />
        </Card>

        {/* Bank Info */}
        <Card title="Thông tin tài khoản nhận tiền">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Ngân hàng">
              <Badge status="success" text="Vietcombank" />
            </Descriptions.Item>
            <Descriptions.Item label="Số tài khoản">
              <Text code>1027077985</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên tài khoản">
              <Text strong>PHAN HOAI THAN</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              Chi nhánh TP.HCM
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Current Status */}
        {systemStatus?.isRunning && (
          <Card title="Trạng thái hiện tại" style={{ marginTop: 24 }}>
            <Alert
              message="Hệ thống đang hoạt động"
              description="Hệ thống đang kiểm tra thanh toán mỗi 5 giây. Khi khách hàng chuyển tiền thành công, đơn hàng sẽ được xác nhận tự động."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

export default SimpleBankPaymentDetection;


