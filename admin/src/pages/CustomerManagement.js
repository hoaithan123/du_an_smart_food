import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, message, Space, Tag, Card, 
  Descriptions, Input, DatePicker, Row, Col, 
  Statistic, Badge, Tooltip, Popconfirm, Switch
} from 'antd';
import {
  EyeOutlined, EditOutlined, SearchOutlined, 
  UserOutlined, PhoneOutlined, MailOutlined,
  CalendarOutlined, EnvironmentOutlined, LockOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [customerStats, setCustomerStats] = useState({});

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllCustomers();
      const customerData = Array.isArray(response.data) ? response.data : [];
      setCustomers(customerData);
      setFilteredCustomers(customerData);
      
      // Tính thống kê
      const stats = {
        total: customerData.length,
        active: customerData.filter(c => c.trang_thai === true).length,
        inactive: customerData.filter(c => c.trang_thai === false).length,
        newThisMonth: customerData.filter(c => {
          const customerDate = dayjs(c.ngay_tao);
          const thisMonth = dayjs().startOf('month');
          return customerDate.isAfter(thisMonth);
        }).length
      };
      setCustomerStats(stats);
    } catch (error) {
      console.error('Fetch customers error:', error);
      message.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Lọc khách hàng
  useEffect(() => {
    let filtered = customers;

    // Lọc theo từ khóa tìm kiếm
    if (searchText) {
      filtered = filtered.filter(customer =>
        customer.ho_ten.toLowerCase().includes(searchText.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchText.toLowerCase()) ||
        (customer.so_dien_thoai && customer.so_dien_thoai.includes(searchText))
      );
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(customer => customer.trang_thai === isActive);
    }

    // Lọc theo ngày
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(customer => {
        const customerDate = dayjs(customer.ngay_tao);
        return customerDate.isAfter(startDate.subtract(1, 'day')) && 
               customerDate.isBefore(endDate.add(1, 'day'));
      });
    }

    setFilteredCustomers(filtered);
  }, [customers, searchText, statusFilter, dateRange]);

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (customerId, newStatus) => {
    try {
      await adminAPI.updateCustomerStatus(customerId, { trang_thai: newStatus });
      message.success('Cập nhật trạng thái khách hàng thành công!');
      fetchCustomers();
    } catch (error) {
      console.error('Update customer status error:', error);
      message.error('Lỗi khi cập nhật trạng thái khách hàng');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: 'Họ tên',
      dataIndex: 'ho_ten',
      key: 'ho_ten',
      render: (text) => (
        <div style={{ fontWeight: 'bold' }}>{text}</div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => (
        <div style={{ fontSize: '12px', color: '#666' }}>{text}</div>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'so_dien_thoai',
      key: 'so_dien_thoai',
      width: 120,
      render: (text) => text || 'Chưa cập nhật'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 100,
      render: (status, record) => (
        <Switch
          checked={status}
          onChange={(checked) => handleStatusChange(record.id, checked)}
          checkedChildren="Hoạt động"
          unCheckedChildren="Khóa"
        />
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
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
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
            <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Quản lý Khách hàng
          </h2>
        </div>

        {/* Thống kê */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Tổng khách hàng" value={customerStats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Đang hoạt động" 
                value={customerStats.active} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Đã khóa" 
                value={customerStats.inactive} 
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic 
                title="Mới tháng này" 
                value={customerStats.newThisMonth} 
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bộ lọc */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} lg={6}>
              <Input.Search
                placeholder="Tìm kiếm khách hàng..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <select
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px'
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã khóa</option>
              </select>
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

        {/* Bảng khách hàng */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredCustomers}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} của ${total} khách hàng`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Modal chi tiết khách hàng */}
        <Modal
          title="Chi tiết khách hàng"
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={null}
          width={700}
        >
          {selectedCustomer && (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="ID" span={2}>
                  {selectedCustomer.id}
                </Descriptions.Item>
                <Descriptions.Item label="Họ tên">
                  {selectedCustomer.ho_ten}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedCustomer.email}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedCustomer.so_dien_thoai || 'Chưa cập nhật'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={selectedCustomer.trang_thai ? 'green' : 'red'}>
                    {selectedCustomer.trang_thai ? 'Hoạt động' : 'Đã khóa'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(selectedCustomer.ngay_tao).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              </Descriptions>

              {/* Địa chỉ */}
              {selectedCustomer.dia_chi && selectedCustomer.dia_chi.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4>Địa chỉ giao hàng:</h4>
                  {selectedCustomer.dia_chi.map((address, index) => (
                    <Card key={index} size="small" style={{ marginBottom: '8px' }}>
                      <div>
                        <strong>{address.ho_ten_nguoi_nhan}</strong>
                        {address.mac_dinh && (
                          <Tag color="blue" style={{ marginLeft: '8px' }}>Mặc định</Tag>
                        )}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        📞 {address.so_dien_thoai}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        📍 {address.dia_chi_chi_tiet}
                        {address.phuong_xa && `, ${address.phuong_xa}`}
                        {address.quan_huyen && `, ${address.quan_huyen}`}
                        {address.tinh_thanh && `, ${address.tinh_thanh}`}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Đơn hàng */}
              {selectedCustomer.don_hang && selectedCustomer.don_hang.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4>Lịch sử đơn hàng:</h4>
                  <Table
                    dataSource={selectedCustomer.don_hang.slice(0, 5)} // Chỉ hiển thị 5 đơn hàng gần nhất
                    columns={[
                      { 
                        title: 'Mã đơn hàng', 
                        dataIndex: 'ma_don_hang', 
                        key: 'ma_don_hang',
                        render: (text) => (
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {text}
                          </span>
                        )
                      },
                      { 
                        title: 'Tổng tiền', 
                        dataIndex: 'tong_tien', 
                        key: 'tong_tien',
                        align: 'right',
                        render: (amount) => (
                          <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(amount)}
                          </span>
                        )
                      },
                      { 
                        title: 'Trạng thái', 
                        dataIndex: 'trang_thai', 
                        key: 'trang_thai',
                        render: (status) => {
                          const colors = {
                            'cho_xac_nhan': 'orange',
                            'da_xac_nhan': 'blue',
                            'dang_giao': 'purple',
                            'da_giao': 'green',
                            'da_huy': 'red'
                          };
                          const texts = {
                            'cho_xac_nhan': 'Chờ xác nhận',
                            'da_xac_nhan': 'Đã xác nhận',
                            'dang_giao': 'Đang giao',
                            'da_giao': 'Đã giao',
                            'da_huy': 'Đã hủy'
                          };
                          return (
                            <Tag color={colors[status]}>
                              {texts[status]}
                            </Tag>
                          );
                        }
                      },
                      { 
                        title: 'Ngày tạo', 
                        dataIndex: 'ngay_tao', 
                        key: 'ngay_tao',
                        render: (date) => dayjs(date).format('DD/MM/YYYY')
                      }
                    ]}
                    pagination={false}
                    size="small"
                  />
                  {selectedCustomer.don_hang.length > 5 && (
                    <div style={{ textAlign: 'center', marginTop: '8px', color: '#666' }}>
                      ... và {selectedCustomer.don_hang.length - 5} đơn hàng khác
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default CustomerManagement;
