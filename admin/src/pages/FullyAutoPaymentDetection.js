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
  Badge,
  Progress,
  Descriptions
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  BankOutlined,
  RobotOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

const FullyAutoPaymentDetection = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSystemStatus = async () => {
    try {
      const response = await api.get('/api/fully-auto-payment-detection/status');
      setSystemStatus(response.data.data);
    } catch (error) {
      message.error('Lỗi tải trạng thái hệ thống');
      console.error('Load system status error:', error);
    }
  };

  const startSystem = async () => {
    setLoading(true);
    try {
      await api.post('/api/fully-auto-payment-detection/start');
      message.success('Hệ thống TỰ ĐỘNG HOÀN TOÀN đã được khởi động! Khách hàng chuyển tiền xong là TỰ ĐỘNG báo thành công!');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi khởi động hệ thống TỰ ĐỘNG HOÀN TOÀN');
      console.error('Start system error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopSystem = async () => {
    setLoading(true);
    try {
      await api.post('/api/fully-auto-payment-detection/stop');
      message.success('Hệ thống TỰ ĐỘNG HOÀN TOÀN đã được dừng');
      loadSystemStatus();
    } catch (error) {
      message.error('Lỗi dừng hệ thống TỰ ĐỘNG HOÀN TOÀN');
      console.error('Stop system error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    
    // Refresh every 3 seconds
    const interval = setInterval(() => {
      loadSystemStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <Space>
              <RobotOutlined style={{ color: '#52c41a' }} />
              Hệ thống TỰ ĐỘNG HOÀN TOÀN - 100% TỰ ĐỘNG
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
                title="Tự động"
                value="100%"
                suffix="TỰ ĐỘNG"
                valueStyle={{ color: '#52c41a' }}
                prefix={<RobotOutlined />}
              />
            </Col>
          </Row>
          
          <div style={{ marginTop: 16 }}>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startSystem}
                loading={loading}
                disabled={systemStatus?.isRunning}
              >
                Khởi động TỰ ĐỘNG HOÀN TOÀN
              </Button>
              <Button
                danger
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={stopSystem}
                loading={loading}
                disabled={!systemStatus?.isRunning}
              >
                Dừng hệ thống
              </Button>
            </Space>
          </div>
        </Card>

        {/* Description */}
        <Card title="Mô tả hệ thống" style={{ marginBottom: 24 }}>
          <Alert
            message="TỰ ĐỘNG HOÀN TOÀN - KHÔNG CẦN LÀM GÌ THÊM!"
            description={
              <div>
                <p><strong>🎯 Mục tiêu:</strong> Khách hàng chuyển tiền xong là TỰ ĐỘNG báo "Đặt hàng thành công!"</p>
                <p><strong>⚡ Cách hoạt động:</strong></p>
                <ul>
                  <li>Khách hàng đặt hàng → Chọn "Chuyển khoản ngân hàng"</li>
                  <li>Hiển thị QR code → Khách hàng quét và chuyển tiền</li>
                  <li>Hệ thống TỰ ĐỘNG kiểm tra mỗi 2 giây</li>
                  <li>Phát hiện thanh toán → TỰ ĐỘNG xác nhận</li>
                  <li>Khách hàng nhận thông báo: "Đặt hàng thành công!"</li>
                </ul>
                <p><strong>✅ Kết quả:</strong> KHÔNG CẦN làm gì thêm, hoàn toàn TỰ ĐỘNG!</p>
              </div>
            }
            type="success"
            showIcon
            icon={<RobotOutlined />}
          />
        </Card>

        {/* Bank Info */}
        <Card title="Thông tin tài khoản nhận tiền">
          <Row gutter={16}>
            <Col span={12}>
              <Descriptions bordered column={1}>
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
            </Col>
            <Col span={12}>
              <Alert
                message="Hướng dẫn cho khách hàng"
                description={
                  <div>
                    <p><strong>1. Quét QR code</strong> hoặc chuyển tiền thủ công</p>
                    <p><strong>2. Ghi đúng nội dung:</strong> Mã đơn hàng</p>
                    <p><strong>3. Chờ thông báo:</strong> "Đặt hàng thành công!"</p>
                    <p><strong>4. Hoàn tất:</strong> Không cần làm gì thêm!</p>
                  </div>
                }
                type="info"
                showIcon
                icon={<BankOutlined />}
              />
            </Col>
          </Row>
        </Card>

        {/* Current Status */}
        {systemStatus?.isRunning && (
          <Card title="Trạng thái hiện tại" style={{ marginTop: 24 }}>
            <Alert
              message="Hệ thống TỰ ĐỘNG HOÀN TOÀN đang hoạt động"
              description={
                <div>
                  <p>✅ Hệ thống đang kiểm tra thanh toán mỗi 2 giây</p>
                  <p>✅ Khi khách hàng chuyển tiền thành công, đơn hàng sẽ được xác nhận TỰ ĐỘNG</p>
                  <p>✅ Khách hàng sẽ nhận thông báo "Đặt hàng thành công!" ngay lập tức</p>
                  <p>✅ KHÔNG CẦN làm gì thêm - hoàn toàn TỰ ĐỘNG!</p>
                </div>
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <Progress 
                percent={100} 
                status="active" 
                strokeColor="#52c41a"
                format={() => 'TỰ ĐỘNG HOÀN TOÀN'}
              />
            </div>
          </Card>
        )}

        {/* Integration Info */}
        <Card title="Tích hợp thật (Tùy chọn)" style={{ marginTop: 24 }}>
          <Alert
            message="Để phát hiện thanh toán thật 100%"
            description={
              <div>
                <p><strong>Hiện tại:</strong> Hệ thống đang chạy với dữ liệu giả lập để test</p>
                <p><strong>Để tích hợp thật:</strong></p>
                <ul>
                  <li>📱 SMS Banking API: Tích hợp với Vietcombank SMS</li>
                  <li>📧 Email Banking API: Tích hợp với Vietcombank Email</li>
                  <li>🔌 Vietcombank API: Tích hợp trực tiếp với ngân hàng</li>
                  <li>🔗 Webhook: Nhận thông báo từ ngân hàng</li>
                </ul>
                <p><strong>Kết quả:</strong> Phát hiện thanh toán thật 100% chính xác!</p>
              </div>
            }
            type="warning"
            showIcon
            icon={<ThunderboltOutlined />}
          />
        </Card>
      </Card>
    </div>
  );
};

export default FullyAutoPaymentDetection;







