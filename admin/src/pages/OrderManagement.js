import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, message, Space, Tag, Card, 
  Descriptions, Select, Input, DatePicker, Row, Col, 
  Statistic, Badge, Tooltip, Popconfirm
} from 'antd';
import {
  EyeOutlined, EditOutlined, SearchOutlined, 
  ShoppingCartOutlined, UserOutlined, CalendarOutlined,
  DollarOutlined, PhoneOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [orderStats, setOrderStats] = useState({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllOrders();
      setOrders(response.data);
      setFilteredOrders(response.data);
      
      // Tính thống kê
      const stats = {
        total: response.data.length,
        pending: response.data.filter(o => o.trang_thai === 'cho_xac_nhan').length,
        confirmed: response.data.filter(o => o.trang_thai === 'da_xac_nhan').length,
        delivering: response.data.filter(o => o.trang_thai === 'dang_giao').length,
        delivered: response.data.filter(o => o.trang_thai === 'da_giao').length,
        cancelled: response.data.filter(o => o.trang_thai === 'da_huy').length,
        totalRevenue: response.data.reduce((sum, o) => sum + parseFloat(o.tong_tien || 0), 0)
      };
      setOrderStats(stats);
    } catch (error) {
      console.error('Fetch orders error:', error);
      message.error('Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Lọc đơn hàng
  useEffect(() => {
    let filtered = orders;

    // Lọc theo từ khóa tìm kiếm
    if (searchText) {
      filtered = filtered.filter(order =>
        order.ma_don_hang.toLowerCase().includes(searchText.toLowerCase()) ||
        order.ho_ten_nguoi_nhan.toLowerCase().includes(searchText.toLowerCase()) ||
        order.so_dien_thoai.includes(searchText) ||
        order.khach_hang?.ho_ten.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.trang_thai === statusFilter);
    }

    // Lọc theo ngày
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(order => {
        const orderDate = dayjs(order.ngay_tao);
        return orderDate.isAfter(startDate.subtract(1, 'day')) && 
               orderDate.isBefore(endDate.add(1, 'day'));
      });
    }

    setFilteredOrders(filtered);
  }, [orders, searchText, statusFilter, dateRange]);

  const handleViewDetails = async (order) => {
    try {
      const res = await adminAPI.getOrderDetail(order.id);
      const detail = res?.data || {};
      setSelectedOrder({ ...order, ...detail });
    } catch (e) {
      console.error('Fetch order detail error:', e);
      setSelectedOrder(order);
    } finally {
      setIsDetailModalOpen(true);
    }
  };

  const handleStatusChange = (order) => {
    setSelectedOrder(order);
    setIsStatusModalOpen(true);
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      await adminAPI.updateOrderStatus(selectedOrder.id, { trang_thai: newStatus });
      message.success('Cập nhật trạng thái đơn hàng thành công!');
      setIsStatusModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Update order status error:', error);
      message.error('Lỗi khi cập nhật trạng thái đơn hàng');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'cho_xac_nhan': 'orange',
      'da_xac_nhan': 'blue',
      'dang_giao': 'purple',
      'da_giao': 'green',
      'da_huy': 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'cho_xac_nhan': 'Chờ xác nhận',
      'da_xac_nhan': 'Đã xác nhận',
      'dang_giao': 'Đang giao',
      'da_giao': 'Đã giao',
      'da_huy': 'Đã hủy'
    };
    return texts[status] || status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'ma_don_hang',
      key: 'ma_don_hang',
      width: 120,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1890ff' }}>
          {text}
        </span>
      )
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.ho_ten_nguoi_nhan}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.khach_hang?.ho_ten || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'so_dien_thoai',
      key: 'so_dien_thoai',
      width: 120
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'tong_tien',
      key: 'tong_tien',
      width: 120,
      align: 'right',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Thanh toán',
      dataIndex: 'trang_thai_thanh_toan',
      key: 'trang_thai_thanh_toan',
      width: 100,
      render: (paid) => (
        <Tag color={paid ? 'green' : 'red'}>
          {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
        </Tag>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'ngay_tao',
      key: 'ngay_tao',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Cập nhật trạng thái">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              type="primary"
              onClick={() => handleStatusChange(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>
            <ShoppingCartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Quản lý Đơn hàng
          </h2>
        </div>

        {/* Thống kê */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic title="Tổng đơn hàng" value={orderStats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic 
                title="Chờ xác nhận" 
                value={orderStats.pending} 
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic 
                title="Đã xác nhận" 
                value={orderStats.confirmed} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic 
                title="Đang giao" 
                value={orderStats.delivering} 
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic 
                title="Đã giao" 
                value={orderStats.delivered} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic 
                title="Tổng doanh thu" 
                value={formatCurrency(orderStats.totalRevenue)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bộ lọc */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} lg={6}>
              <Input.Search
                placeholder="Tìm kiếm đơn hàng..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <Select
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Lọc theo trạng thái"
              >
                <Option value="all">Tất cả trạng thái</Option>
                <Option value="cho_xac_nhan">Chờ xác nhận</Option>
                <Option value="da_xac_nhan">Đã xác nhận</Option>
                <Option value="dang_giao">Đang giao</Option>
                <Option value="da_giao">Đã giao</Option>
                <Option value="da_huy">Đã hủy</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={setDateRange}
                placeholder={['Từ ngày', 'Đến ngày']}
              />
            </Col>
            <Col xs={24} sm={24} lg={6}>
              <Button 
                onClick={() => {
                  setSearchText('');
                  setStatusFilter('all');
                  setDateRange(null);
                }}
                style={{ width: '100%' }}
              >
                Xóa bộ lọc
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Bảng đơn hàng */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} của ${total} đơn hàng`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Modal chi tiết đơn hàng */}
        <Modal
          title="Chi tiết đơn hàng"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Mã đơn hàng" span={2}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {selectedOrder.ma_don_hang}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Khách hàng">
                  {selectedOrder.khach_hang?.ho_ten || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Người nhận">
                  {selectedOrder.ho_ten_nguoi_nhan}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedOrder.so_dien_thoai}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng tiền">
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                    {formatCurrency(selectedOrder.tong_tien)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={getStatusColor(selectedOrder.trang_thai)}>
                    {getStatusText(selectedOrder.trang_thai)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Thanh toán">
                  <Tag color={selectedOrder.trang_thai_thanh_toan ? 'green' : 'red'}>
                    {selectedOrder.trang_thai_thanh_toan ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Phương thức thanh toán">
                  {selectedOrder.phuong_thuc_thanh_toan}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(selectedOrder.ngay_tao).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                  {selectedOrder.dia_chi_giao_hang}
                </Descriptions.Item>
                {selectedOrder.ghi_chu && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    {selectedOrder.ghi_chu}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {selectedOrder.chi_tiet_don_hang && selectedOrder.chi_tiet_don_hang.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4>Sản phẩm trong đơn hàng:</h4>
                  <Table
                    dataSource={selectedOrder.chi_tiet_don_hang}
                    columns={[
                      { title: 'Tên sản phẩm', dataIndex: 'ten_san_pham', key: 'ten_san_pham' },
                      { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong', align: 'center' },
                      { 
                        title: 'Đơn giá', 
                        dataIndex: 'don_gia', 
                        key: 'don_gia', 
                        align: 'right',
                        render: (price) => formatCurrency(price)
                      },
                      { 
                        title: 'Thành tiền', 
                        key: 'total',
                        align: 'right',
                        render: (_, record) => formatCurrency(record.so_luong * record.don_gia)
                      }
                    ]}
                    pagination={false}
                    size="small"
                  />
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Modal cập nhật trạng thái */}
        <Modal
          title="Cập nhật trạng thái đơn hàng"
          open={isStatusModalOpen}
          onCancel={() => setIsStatusModalOpen(false)}
          footer={null}
        >
          {selectedOrder && (
            <div>
              <p>Đơn hàng: <strong>{selectedOrder.ma_don_hang}</strong></p>
              <p>Trạng thái hiện tại: 
                <Tag color={getStatusColor(selectedOrder.trang_thai)} style={{ marginLeft: '8px' }}>
                  {getStatusText(selectedOrder.trang_thai)}
                </Tag>
              </p>
              
              <div style={{ marginTop: '16px' }}>
                <p>Chọn trạng thái mới:</p>
                <Space wrap>
                  {['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy'].map(status => (
                    <Button
                      key={status}
                      type={status === selectedOrder.trang_thai ? 'primary' : 'default'}
                      onClick={() => updateOrderStatus(status)}
                      disabled={status === selectedOrder.trang_thai}
                    >
                      {getStatusText(status)}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default OrderManagement;
