import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Upload, 
  message, 
  Typography, 
  Alert, 
  Space,
  Descriptions,
  Table,
  Tag
} from 'antd';
import { 
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BankOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const { TextArea } = require('antd/lib/input');

const SimplePaymentManager = () => {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statementContent, setStatementContent] = useState('');

  const columns = [
    {
      title: 'Mã giao dịch',
      dataIndex: 'ma_giao_dich',
      key: 'ma_giao_dich',
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'ma_don_hang',
      key: 'ma_don_hang',
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
      title: 'Mã xác minh',
      dataIndex: 'ma_xac_minh',
      key: 'ma_xac_minh',
      render: (code) => (
        <Text code style={{ fontSize: 12 }}>
          {code}
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
      title: 'Thời gian tạo',
      dataIndex: 'thoi_gian_tao',
      key: 'thoi_gian_tao',
      render: (time) => new Date(time).toLocaleString('vi-VN'),
    },
  ];

  const loadPendingTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/qr-payment/pending-bank');
      setPendingTransactions(response.data.data || []);
    } catch (error) {
      message.error('Lỗi tải danh sách giao dịch');
      console.error('Load pending transactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadStatement = async () => {
    if (!statementContent.trim()) {
      message.warning('Vui lòng nhập nội dung sao kê');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/qr-payment/upload-statement', {
        fileContent: statementContent
      });
      
      const { matchedCount, parsedTransactions } = response.data.data;
      message.success(`Đã phân tích ${parsedTransactions.length} giao dịch và khớp ${matchedCount} giao dịch`);
      
      setStatementContent('');
      loadPendingTransactions();
    } catch (error) {
      message.error('Lỗi phân tích sao kê');
      console.error('Upload statement error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTransactions();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadPendingTransactions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <Space>
              <BankOutlined style={{ color: '#1890ff' }} />
              Quản lý thanh toán ngân hàng ĐƠN GIẢN
            </Space>
          </Title>
          <Space>
            <Button
              icon={<ClockCircleOutlined />}
              onClick={loadPendingTransactions}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* Bank Info */}
        <Alert
          message="Thông tin tài khoản nhận tiền"
          description={
            <div>
              <div><strong>Ngân hàng:</strong> Vietcombank</div>
              <div><strong>Số tài khoản:</strong> 1027077985</div>
              <div><strong>Tên tài khoản:</strong> PHAN HOAI THAN</div>
              <div><strong>Chi nhánh:</strong> Chi nhánh TP.HCM</div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Upload Statement */}
        <Card title="Upload sao kê ngân hàng" style={{ marginBottom: 24 }}>
          <Alert
            message="Hướng dẫn"
            description="Dán nội dung sao kê ngân hàng vào ô bên dưới. Hệ thống sẽ tự động phân tích và khớp các giao dịch."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <TextArea
            value={statementContent}
            onChange={(e) => setStatementContent(e.target.value)}
            placeholder="Dán nội dung sao kê ngân hàng vào đây..."
            rows={6}
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUploadStatement}
            loading={loading}
            disabled={!statementContent.trim()}
          >
            Phân tích sao kê
          </Button>
        </Card>

        {/* Pending Transactions */}
        <Card title="Giao dịch chờ xác nhận">
          <Table
            columns={columns}
            dataSource={pendingTransactions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} giao dịch`
            }}
          />
        </Card>

        {/* Instructions */}
        <Card title="Cách sử dụng" style={{ marginTop: 24 }}>
          <Alert
            message="Quy trình đơn giản"
            description={
              <div>
                <p><strong>1. Khách hàng đặt hàng:</strong> Chọn "Chuyển khoản ngân hàng"</p>
                <p><strong>2. Hiển thị QR code:</strong> Hệ thống tạo QR code với thông tin tài khoản</p>
                <p><strong>3. Khách hàng chuyển tiền:</strong> Quét QR code và chuyển tiền vào tài khoản PHAN HOAI THAN</p>
                <p><strong>4. Bạn upload sao kê:</strong> Copy nội dung sao kê ngân hàng và dán vào ô trên</p>
                <p><strong>5. Hệ thống tự động xác nhận:</strong> Click "Phân tích sao kê" để xác nhận thanh toán</p>
                <p><strong>6. Khách hàng nhận thông báo:</strong> "Đặt hàng thành công!"</p>
              </div>
            }
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        </Card>
      </Card>
    </div>
  );
};

export default SimplePaymentManager;







