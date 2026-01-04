import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, 
  Select, message, Card, Space, Tag, Statistic, Row, Col,
  Popconfirm, Tooltip
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined,
  DollarOutlined, PercentageOutlined, CalendarOutlined,
  UserOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';
import './VoucherManagement.css';

const { Option } = Select;
const { TextArea } = Input;

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchVouchers();
    fetchStats();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getVouchers();
      const payload = response.data?.data || response.data?.vouchers || response.data;
      setVouchers(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Fetch vouchers error:', error);
      message.error('Lỗi khi tải danh sách voucher');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getVoucherStats();
      setStats(response.data?.data || response.data || {});
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleCreate = () => {
    setEditingVoucher(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingVoucher(record);
    form.setFieldsValue({
      ...record,
      ngay_bat_dau: record.ngay_bat_dau ? dayjs(record.ngay_bat_dau) : null,
      ngay_ket_thuc: record.ngay_ket_thuc ? dayjs(record.ngay_ket_thuc) : null
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteVoucher(id);
      message.success('Xóa voucher thành công');
      fetchVouchers();
      fetchStats();
    } catch (error) {
      console.error('Delete voucher error:', error);
      message.error('Lỗi khi xóa voucher');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        ngay_bat_dau: values.ngay_bat_dau?.toISOString(),
        ngay_ket_thuc: values.ngay_ket_thuc?.toISOString()
      };

      if (editingVoucher) {
        await adminAPI.updateVoucher(editingVoucher.id, data);
        message.success('Cập nhật voucher thành công');
      } else {
        await adminAPI.createVoucher(data);
        message.success('Tạo voucher thành công');
      }

      setModalVisible(false);
      fetchVouchers();
      fetchStats();
    } catch (error) {
      console.error('Submit voucher error:', error);
      message.error(error.response?.data?.message || 'Lỗi khi lưu voucher');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'hoat_dong': return 'green';
      case 'tam_dung': return 'orange';
      case 'het_han': return 'red';
      case 'het_luong': return 'purple';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'hoat_dong': return 'Hoạt động';
      case 'tam_dung': return 'Tạm dừng';
      case 'het_han': return 'Hết hạn';
      case 'het_luong': return 'Hết lượt';
      default: return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const columns = [
    {
      title: 'Mã voucher',
      dataIndex: 'ma_voucher',
      key: 'ma_voucher',
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {text}
        </span>
      )
    },
    {
      title: 'Tên voucher',
      dataIndex: 'ten_voucher',
      key: 'ten_voucher'
    },
    {
      title: 'Loại giảm giá',
      dataIndex: 'loai_giam_gia',
      key: 'loai_giam_gia',
      render: (type) => (
        <Tag color={type === 'phan_tram' ? 'blue' : 'green'}>
          {type === 'phan_tram' ? (
            <><PercentageOutlined /> Phần trăm</>
          ) : (
            <><DollarOutlined /> Tiền mặt</>
          )}
        </Tag>
      )
    },
    {
      title: 'Giá trị giảm',
      dataIndex: 'gia_tri_giam',
      key: 'gia_tri_giam',
      render: (value, record) => (
        <span style={{ fontWeight: 'bold', color: '#ff6b6b' }}>
          {record.loai_giam_gia === 'phan_tram' 
            ? `${value}%` 
            : formatCurrency(value)
          }
        </span>
      )
    },
    {
      title: 'Số lượng',
      dataIndex: 'so_luong',
      key: 'so_luong',
      render: (total, record) => (
        <span>
          {record.so_luong_da_dung}/{total}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'ngay_ket_thuc',
      key: 'ngay_ket_thuc',
      render: (date) => (
        <span>
          <CalendarOutlined /> {new Date(date).toLocaleDateString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc muốn xóa voucher này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="voucher-management">
        <div className="page-header">
          <div className="header-content">
            <GiftOutlined className="header-icon" />
            <h2>Quản lý Voucher</h2>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreate}
            size="large"
          >
            Tạo voucher mới
          </Button>
        </div>

      {/* Thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng voucher"
              value={stats.tong_so_voucher || 0}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.voucher_dang_hoat_dong || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã sử dụng"
              value={stats.tong_luot_su_dung || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hết hạn"
              value={stats.voucher_het_han || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bảng voucher */}
      <Card>
        <Table
          columns={columns}
          dataSource={vouchers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} voucher`
          }}
        />
      </Card>

      {/* Modal tạo/sửa voucher */}
      <Modal
        title={editingVoucher ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="ma_voucher"
            label="Mã voucher"
            rules={[{ required: true, message: 'Vui lòng nhập mã voucher' }]}
          >
            <Input placeholder="VD: WELCOME10" />
          </Form.Item>

          <Form.Item
            name="ten_voucher"
            label="Tên voucher"
            rules={[{ required: true, message: 'Vui lòng nhập tên voucher' }]}
          >
            <Input placeholder="VD: Chào mừng khách hàng mới" />
          </Form.Item>

          <Form.Item
            name="mo_ta"
            label="Mô tả"
          >
            <TextArea rows={3} placeholder="Mô tả chi tiết về voucher" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="loai_giam_gia"
                label="Loại giảm giá"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="phan_tram">Phần trăm (%)</Option>
                  <Option value="tien_mat">Tiền mặt (VNĐ)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gia_tri_giam"
                label="Giá trị giảm"
                rules={[{ required: true, message: 'Vui lòng nhập giá trị giảm' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="VD: 10 hoặc 50000"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gia_tri_toi_thieu"
                label="Giá trị tối thiểu (VNĐ)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="VD: 100000"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gia_tri_toi_da"
                label="Giá trị tối đa (VNĐ)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="VD: 50000"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="so_luong"
            label="Số lượng"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="VD: 100"
              min={1}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ngay_bat_dau"
                label="Ngày bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
              >
                <DatePicker style={{ width: '100%' }} getPopupContainer={() => document.body} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ngay_ket_thuc"
                label="Ngày kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
              >
                <DatePicker style={{ width: '100%' }} getPopupContainer={() => document.body} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingVoucher ? 'Cập nhật' : 'Tạo voucher'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </MainLayout>
  );
};

export default VoucherManagement;
