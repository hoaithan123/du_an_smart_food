// EmployeeManagement.js - Frontend sửa lỗi

import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Spin, Space,
  Popconfirm, Descriptions, Card, DatePicker
} from 'antd';
import {
  EditOutlined, DeleteOutlined, PlusOutlined,
  InfoCircleOutlined, UserOutlined, SearchOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Option } = Select;

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getEmployees();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách nhân viên');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Hàm tìm kiếm nhân viên theo tên
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee =>
        employee.ho_ten.toLowerCase().includes(value.toLowerCase().trim()) ||
        employee.tai_khoan.toLowerCase().includes(value.toLowerCase().trim()) ||
        (employee.email && employee.email.toLowerCase().includes(value.toLowerCase().trim())) ||
        (employee.so_dien_thoai && employee.so_dien_thoai.includes(value.trim()))
      );
      setFilteredEmployees(filtered);
    }
  };

  // Reset search khi employees thay đổi
  useEffect(() => {
    handleSearch(searchText);
  }, [employees]);

  const handleAdd = () => {
    setEditingEmployee(null);
    setIsEditModalOpen(true);
    form.resetFields();
  };

  const handleEdit = (record) => {
    const { mat_khau, ...rest } = record; // Loại bỏ mat_khau hashed khi set form
    setEditingEmployee(record);
    setIsEditModalOpen(true);
    form.setFieldsValue({
      ...rest,
      ngay_sinh: record.ngay_sinh ? dayjs(record.ngay_sinh) : null,
      ngay_vao_lam: record.ngay_vao_lam ? dayjs(record.ngay_vao_lam) : null,
    });
  };

  const handleViewDetails = (record) => {
    setSelectedEmployee(record);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteEmployee(id);
      message.success('Xóa nhân viên thành công!');
      fetchEmployees();
    } catch (error) {
      message.error(error.response?.data?.error || 'Lỗi khi xóa nhân viên');
    }
  };

  const handleOk = async () => {
    setModalLoading(true);
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format("YYYY-MM-DD") : null,
        ngay_vao_lam: values.ngay_vao_lam ? values.ngay_vao_lam.format("YYYY-MM-DD") : null,
      };

      if (editingEmployee) {
        await adminAPI.updateEmployee(editingEmployee.id, formattedValues);
        message.success('Cập nhật nhân viên thành công!');
      } else {
        await adminAPI.createEmployee(formattedValues);
        message.success('Thêm nhân viên thành công!');
      }

      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error(error);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => message.error(err));
      } else {
        message.error(error.response?.data?.error || 'Lỗi khi lưu nhân viên');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Hàm highlight text tìm kiếm với style đẹp
  const highlightText = (text, searchValue) => {
    if (!searchValue || !text) return text;
    
    const regex = new RegExp(`(${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().split(regex).map((part, index) =>
      regex.test(part) ? (
        <span 
          key={index} 
          style={{ 
            background: 'linear-gradient(135deg, #fff2e6 0%, #ffe7ba 100%)',
            color: '#d46b08',
            fontWeight: 'bold',
            padding: '2px 4px',
            borderRadius: '4px',
            border: '1px solid #ffd591',
            boxShadow: '0 1px 3px rgba(212, 107, 8, 0.2)',
            fontSize: '13px'
          }}
        >
          {part}
        </span>
      ) : part
    );
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { 
      title: 'Họ tên', 
      dataIndex: 'ho_ten', 
      key: 'ho_ten',
      render: (text) => highlightText(text, searchText)
    },
    { 
      title: 'Tài khoản', 
      dataIndex: 'tai_khoan', 
      key: 'tai_khoan',
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Vai trò', dataIndex: 'vai_tro', key: 'vai_tro',
      render: (role) => {
        const color = role === 'quan_ly' ? 'red' : role === 'thu_ngan' ? 'green' : 'blue';
        return <span style={{ color, fontWeight: 'bold' }}>{role}</span>;
      }
    },
    { 
      title: 'Số điện thoại', 
      dataIndex: 'so_dien_thoai', 
      key: 'so_dien_thoai',
      render: (text) => highlightText(text, searchText)
    },
    { 
      title: 'Email', 
      dataIndex: 'email', 
      key: 'email',
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Ngày vào làm',
      dataIndex: 'ngay_vao_lam',
      key: 'ngay_vao_lam',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : 'N/A'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      render: (status) => (
        <span style={{ color: status ==='Dang_lam' ? '#1890ff' : '#ff4d4f', fontWeight: 'bold' }}>
          {status==='Dang_lam' ? 'Đang làm' : 'Đã nghỉ'}
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<InfoCircleOutlined />} onClick={() => handleViewDetails(record)} />
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>Quản lý Nhân viên</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Input.Search
                placeholder="🔍 Tìm kiếm..."
                allowClear
                enterButton={
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    Tìm kiếm
                  </Button>
                }
                size="large"
                style={{ 
                  width: 450,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
                className="custom-search-input"
              />
              {searchText && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #d9d9d9',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#666',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}>
                  💡 <strong>{filteredEmployees.length}</strong> kết quả tìm thấy cho "{searchText}"
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleAdd}
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(82, 196, 26, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.3)';
              }}
            >
              ✨ Thêm Nhân viên
            </Button>
          </div>
        </div>
          
        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f2f5',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)'
        }}>
          {/* Hiển thị thông tin tìm kiếm đẹp */}
          {searchText && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)', 
              borderRadius: '12px',
              border: '1px solid #91d5ff',
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #1890ff 0%, #36cfc9 100%)'
              }} />
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                  }}>
                    <SearchOutlined style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <div style={{ 
                      color: '#1890ff', 
                      fontWeight: 'bold', 
                      fontSize: '15px',
                      marginBottom: '2px'
                    }}>
                      🔍 Tìm kiếm: "{searchText}"
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: filteredEmployees.length > 0 ? '#52c41a' : '#ff4d4f',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {filteredEmployees.length} kết quả
                      </span>
                      <span>trong {employees.length} nhân viên</span>
                    </div>
                  </div>
                </div>
                <Button 
                  type="text"
                  size="small" 
                  onClick={() => handleSearch('')}
                  style={{ 
                    color: '#1890ff',
                    fontWeight: 'bold',
                    border: '1px solid #91d5ff',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    height: 'auto',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(24, 144, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1890ff';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#1890ff';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  ✖️ Xóa bộ lọc
                </Button>
              </Space>
            </div>
          )}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={filteredEmployees}
              rowKey="id"
              bordered
              size="middle"
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showQuickJumper: true,
                showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trên ${total} mục`,
              }}
              locale={{
                emptyText: searchText ? 
                  `Không tìm thấy nhân viên với từ khóa "${searchText}"` : 
                  'Không có dữ liệu'
              }}
            />
          </Spin>
        </Card>
      </div>

      <Modal
        title={editingEmployee ? 'Sửa Nhân viên' : 'Thêm Nhân viên'}
        open={isEditModalOpen}
        onOk={handleOk}
        onCancel={() => setIsEditModalOpen(false)}
        confirmLoading={modalLoading}
        destroyOnHidden
        width={700}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <Form.Item name="ho_ten" label="Họ tên" rules={[{ required: true }]} style={{ flex: '1 1 48%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="tai_khoan" label="Tài khoản" rules={[{ required: true }]} style={{ flex: '1 1 48%' }}>
              <Input disabled={editingEmployee !== null} />
            </Form.Item>
            <Form.Item name="mat_khau" label="Mật khẩu"
              rules={!editingEmployee ? [{ required: true }] : []}
              style={{ flex: '1 1 48%' }}>
              <Input.Password placeholder={editingEmployee ? "Để trống nếu không thay đổi" : ""} />
            </Form.Item>
            <Form.Item name="vai_tro" label="Vai trò" rules={[{ required: true }]} style={{ flex: '1 1 48%' }}>
              <Select placeholder="Chọn vai trò">
                <Option value="quan_ly">Quản lý</Option>
                <Option value="thu_ngan">Thu ngân</Option>
                <Option value="nhan_vien_kho">Nhân viên kho</Option>
              </Select>
            </Form.Item>
            <Form.Item name="so_dien_thoai" label="Số điện thoại" style={{ flex: '1 1 48%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }]} style={{ flex: '1 1 48%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="dia_chi" label="Địa chỉ" style={{ flex: '1 1 100%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="ngay_sinh" label="Ngày sinh" style={{ flex: '1 1 48%' }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ngay_vao_lam" label="Ngày vào làm" style={{ flex: '1 1 48%' }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="trang_thai" label="Trạng thái" rules={[{ required: true }]} style={{ flex: '1 1 48%' }}>
              <Select placeholder="Chọn trạng thái">
                <Option value='Dang_lam'>Đang làm</Option>
                <Option value='Da_nghi'>Đã nghỉ</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Thông tin chi tiết Nhân viên"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedEmployee && (
          <Descriptions bordered column={1} size="middle" style={{ marginTop: '20px', fontSize: '16px' }}>
            <Descriptions.Item label="ID">{selectedEmployee.id}</Descriptions.Item>
            <Descriptions.Item label="Họ tên">{selectedEmployee.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Tài khoản">{selectedEmployee.tai_khoan}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">{selectedEmployee.vai_tro}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{selectedEmployee.trang_thai === 'Dang_lam' ? 'Đang làm' : 'Đã nghỉ'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{selectedEmployee.so_dien_thoai || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{selectedEmployee.dia_chi || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedEmployee.email || 'Chưa cập nhật'}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {selectedEmployee.ngay_sinh ? dayjs(selectedEmployee.ngay_sinh).format('DD/MM/YYYY') : 'Chưa cập nhật'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày vào làm">
              {selectedEmployee.ngay_vao_lam ? dayjs(selectedEmployee.ngay_vao_lam).format('DD/MM/YYYY') : 'Chưa cập nhật'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </MainLayout>
  );
};

export default EmployeeManagement;