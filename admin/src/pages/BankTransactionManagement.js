import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Input, 
  message, 
  Tag, 
  Space, 
  Card, 
  Upload, 
  Typography,
  Alert,
  Descriptions,
  Divider
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  UploadOutlined, 
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { TextArea } = Input;
const { Title, Text } = Typography;

const BankTransactionManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [statementContent, setStatementContent] = useState('');
  const [uploading, setUploading] = useState(false);

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
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewTransaction(record)}
          >
            Xem
          </Button>
          {record.trang_thai === 'cho_xac_nhan' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => showVerifyModal(record)}
              >
                Xác nhận
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => showRejectModal(record)}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/qr-payment/pending-bank');
      setTransactions(response.data.data || []);
    } catch (error) {
      message.error('Lỗi tải danh sách giao dịch');
      console.error('Load transactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const showVerifyModal = (transaction) => {
    setSelectedTransaction(transaction);
    setVerifyModalVisible(true);
  };

  const showRejectModal = (transaction) => {
    setSelectedTransaction(transaction);
    setRejectModalVisible(true);
  };

  const handleVerify = async () => {
    try {
      await api.post(`/api/qr-payment/verify/${selectedTransaction.ma_giao_dich}`, {
        verifiedBy: 'Admin'
      });
      message.success('Giao dịch đã được xác nhận');
      setVerifyModalVisible(false);
      loadTransactions();
    } catch (error) {
      message.error('Lỗi xác nhận giao dịch');
      console.error('Verify transaction error:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await api.post(`/api/qr-payment/reject/${selectedTransaction.ma_giao_dich}`, {
        reason: rejectReason,
        rejectedBy: 'Admin'
      });
      message.success('Giao dịch đã bị từ chối');
      setRejectModalVisible(false);
      setRejectReason('');
      loadTransactions();
    } catch (error) {
      message.error('Lỗi từ chối giao dịch');
      console.error('Reject transaction error:', error);
    }
  };

  const handleUploadStatement = async () => {
    if (!statementContent.trim()) {
      message.warning('Vui lòng nhập nội dung sao kê');
      return;
    }

    setUploading(true);
    try {
      const response = await api.post('/api/qr-payment/upload-statement', {
        fileContent: statementContent
      });
      
      const { matchedCount, parsedTransactions } = response.data.data;
      message.success(`Đã phân tích ${parsedTransactions.length} giao dịch và khớp ${matchedCount} giao dịch`);
      
      setUploadModalVisible(false);
      setStatementContent('');
      loadTransactions();
    } catch (error) {
      message.error('Lỗi phân tích sao kê');
      console.error('Upload statement error:', error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý giao dịch ngân hàng
          </Title>
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              Upload sao kê
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadTransactions}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        <Alert
          message="Thông tin tài khoản nhận tiền"
          description={
            <div>
              <div><strong>Ngân hàng:</strong> Vietcombank</div>
              <div><strong>Số tài khoản:</strong> 1027077985</div>
              <div><strong>Tên tài khoản:</strong> PHAN HOAI THAN</div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={transactions}
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

      {/* Verify Modal */}
      <Modal
        title="Xác nhận giao dịch"
        open={verifyModalVisible}
        onOk={handleVerify}
        onCancel={() => setVerifyModalVisible(false)}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>Bạn có chắc chắn muốn xác nhận giao dịch này?</p>
        {selectedTransaction && (
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Mã giao dịch">
              {selectedTransaction.ma_giao_dich}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(selectedTransaction.so_tien)}
            </Descriptions.Item>
            <Descriptions.Item label="Mã xác minh">
              {selectedTransaction.ma_xac_minh}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Từ chối giao dịch"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
        }}
        okText="Từ chối"
        cancelText="Hủy"
      >
        <p>Vui lòng nhập lý do từ chối:</p>
        <TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối giao dịch..."
          rows={4}
        />
      </Modal>

      {/* Upload Statement Modal */}
      <Modal
        title="Upload sao kê ngân hàng"
        open={uploadModalVisible}
        onOk={handleUploadStatement}
        onCancel={() => {
          setUploadModalVisible(false);
          setStatementContent('');
        }}
        okText="Phân tích"
        cancelText="Hủy"
        confirmLoading={uploading}
        width={600}
      >
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
          rows={10}
        />
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        title="Chi tiết giao dịch"
        open={!!selectedTransaction && !verifyModalVisible && !rejectModalVisible}
        onCancel={() => setSelectedTransaction(null)}
        footer={null}
        width={600}
      >
        {selectedTransaction && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Mã giao dịch" span={2}>
                {selectedTransaction.ma_giao_dich}
              </Descriptions.Item>
              <Descriptions.Item label="Mã đơn hàng">
                {selectedTransaction.ma_don_hang}
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(selectedTransaction.so_tien)}
              </Descriptions.Item>
              <Descriptions.Item label="Mã xác minh">
                {selectedTransaction.ma_xac_minh}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={
                  selectedTransaction.trang_thai === 'cho_xac_nhan' ? 'orange' :
                  selectedTransaction.trang_thai === 'da_xac_nhan' ? 'green' :
                  selectedTransaction.trang_thai === 'bi_tu_choi' ? 'red' : 'gray'
                }>
                  {selectedTransaction.trang_thai === 'cho_xac_nhan' ? 'Chờ xác nhận' :
                   selectedTransaction.trang_thai === 'da_xac_nhan' ? 'Đã xác nhận' :
                   selectedTransaction.trang_thai === 'bi_tu_choi' ? 'Bị từ chối' : 'Hết hạn'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tạo">
                {new Date(selectedTransaction.thoi_gian_tao).toLocaleString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian hết hạn">
                {new Date(selectedTransaction.thoi_gian_het_han).toLocaleString('vi-VN')}
              </Descriptions.Item>
              {selectedTransaction.thoi_gian_xac_nhan && (
                <Descriptions.Item label="Thời gian xác nhận">
                  {new Date(selectedTransaction.thoi_gian_xac_nhan).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {selectedTransaction.nguoi_xac_nhan && (
                <Descriptions.Item label="Người xác nhận">
                  {selectedTransaction.nguoi_xac_nhan}
                </Descriptions.Item>
              )}
              {selectedTransaction.ly_do_tu_choi && (
                <Descriptions.Item label="Lý do từ chối" span={2}>
                  {selectedTransaction.ly_do_tu_choi}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedTransaction.don_hang && (
              <>
                <Divider>Thông tin đơn hàng</Divider>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Khách hàng">
                    {selectedTransaction.don_hang.khach_hang?.ho_ten}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {selectedTransaction.don_hang.khach_hang?.email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    {selectedTransaction.don_hang.so_dien_thoai}
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                    {selectedTransaction.don_hang.dia_chi_giao_hang}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankTransactionManagement;

