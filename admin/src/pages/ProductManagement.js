import React, { memo, useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm,
  Space, Card 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShoppingOutlined, SearchOutlined } from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';

const ProductManagement = memo(() => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm();

  const fetchProducts = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, search = searchText) => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Bạn cần đăng nhập để xem danh sách sản phẩm!');
      return;
    }

    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await adminAPI.getProducts({ limit: pageSize, offset, search });
      const list = Array.isArray(response.data) ? response.data : [];
      setProducts(list);
      setFilteredProducts(list);
      const total = Number(response.total || list.length || 0);
      setPagination((prev) => ({ ...prev, current: page, pageSize, total }));
    } catch (error) {
      console.error('Fetch products error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => {
    fetchProducts(pagination.current, pagination.pageSize, searchText);
  }, [fetchProducts]);

  // Hàm tìm kiếm sản phẩm
  const handleSearch = useCallback((value) => {
    const v = value || '';
    setSearchText(v);
    // Server-side search fetch from page 1
    fetchProducts(1, pagination.pageSize, v.trim());
  }, [fetchProducts, pagination.pageSize]);

  // Không cần reset search phía client khi đã dùng tìm kiếm server-side

  const handleAdd = useCallback(() => {
    setEditingProduct(null);
    setIsModalVisible(true);
    form.resetFields();
  }, [form]);

  const handleEdit = useCallback((record) => {
    setEditingProduct(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      ...record,
      gia_ban: Number(record.gia_ban),
      so_luong: Number(record.so_luong ?? record.stock ?? 0),
    });
  }, [form]);

  const handleDelete = useCallback(async (id) => {
    try {
      await adminAPI.deleteProduct(id);
      message.success('Xóa sản phẩm thành công!');
      fetchProducts(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      console.error('Delete product error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi xóa sản phẩm.');
    }
  }, [fetchProducts, pagination.current, pagination.pageSize, searchText]);

  const handleOk = useCallback(async () => {
    try {
      const raw = await form.validateFields();
      const values = {
        ...raw,
        gia_ban: Number(raw.gia_ban),
        so_luong: typeof raw.so_luong !== 'undefined' && raw.so_luong !== null
          ? parseInt(raw.so_luong, 10)
          : undefined,
      };
      
      if (editingProduct) {
        await adminAPI.updateProduct(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công!');
      } else {
        await adminAPI.createProduct(values);
        message.success('Thêm sản phẩm thành công!');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      fetchProducts(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      console.error('Save product error:', error);
      message.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Lỗi khi lưu sản phẩm.'
      );
    }
  }, [form, editingProduct, fetchProducts, pagination.current, pagination.pageSize, searchText]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingProduct(null);
  }, [form]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }, []);

  // Hàm highlight text tìm kiếm với style đẹp
  const highlightText = useCallback((text, searchValue) => {
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
  }, []);

  const columns = [
    {
      title: 'Mã sản phẩm',
      dataIndex: 'ma_san_pham',
      key: 'ma_san_pham',
      width: 120,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {highlightText(text, searchText)}
        </span>
      )
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'ten_san_pham',
      key: 'ten_san_pham',
      ellipsis: true,
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'don_vi_tinh',
      key: 'don_vi_tinh',
      width: 100,
      align: 'center',
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Giá bán',
      dataIndex: 'gia_ban',
      key: 'gia_ban',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.gia_ban - b.gia_ban,
      render: (price) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(price)}
        </span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'so_luong',
      key: 'so_luong',
      width: 100,
      align: 'center',
      sorter: (a, b) => Number(a.so_luong ?? 0) - Number(b.so_luong ?? 0),
      render: (quantity) => (
        <span style={{ 
          fontWeight: 'bold',
          color: Number(quantity) > 0 ? '#1890ff' : '#ff4d4f' 
        }}>
          {Number(quantity ?? 0)}
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary" 
            ghost 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn có chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
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
            <ShoppingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>Quản lý Sản phẩm</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Input.Search
                placeholder="🛍️ Tìm kiếm..."
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
                  🛍️ <strong>{filteredProducts.length}</strong> kết quả tìm thấy cho "{searchText}"
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
              ✨ Thêm Sản phẩm
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
                      🛍️ Tìm kiếm: "{searchText}"
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: filteredProducts.length > 0 ? '#52c41a' : '#ff4d4f',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {filteredProducts.length} kết quả
                      </span>
                      <span>trong {products.length} sản phẩm</span>
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
          <Table 
            columns={columns} 
            dataSource={filteredProducts} 
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
              onChange: (page, pageSize) => fetchProducts(page, pageSize, searchText),
              onShowSizeChange: (page, pageSize) => fetchProducts(1, pageSize, searchText),
            }}
            locale={{
              emptyText: searchText ? 
                `Không tìm thấy sản phẩm với từ khóa "${searchText}"` : 
                'Không có dữ liệu'
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingOutlined />
              {editingProduct ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm'}
            </div>
          }
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          width={600}
          okText={editingProduct ? 'Cập nhật' : 'Thêm mới'}
          cancelText="Hủy"
        >
          <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
            <Form.Item 
              name="ten_san_pham" 
              label="Tên sản phẩm" 
              rules={[
                { required: true, message: 'Vui lòng nhập tên sản phẩm!' },
                { min: 2, message: 'Tên sản phẩm phải có ít nhất 2 ký tự!' }
              ]}
            >
              <Input placeholder="Nhập tên sản phẩm" />
            </Form.Item>

            <Form.Item 
              name="ma_san_pham" 
              label="Mã sản phẩm" 
              rules={[
                { required: true, message: 'Vui lòng nhập mã sản phẩm!' },
                { pattern: /^[A-Z0-9]+$/, message: 'Mã sản phẩm chỉ được chứa chữ hoa và số!' }
              ]}
            >
              <Input 
                placeholder="VD: SP001" 
                style={{ fontFamily: 'monospace' }}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  form.setFieldValue('ma_san_pham', value);
                }}
              />
            </Form.Item>

            <Form.Item 
              name="don_vi_tinh" 
              label="Đơn vị tính" 
              rules={[{ required: true, message: 'Vui lòng nhập đơn vị tính!' }]}
            >
              <Input placeholder="VD: Cái, Kg, Hộp, ..." />
            </Form.Item>

            <Form.Item 
              name="gia_ban" 
              label="Giá bán (VNĐ)" 
              rules={[
                { required: true, message: 'Vui lòng nhập giá bán!' },
                { type: 'number', min: 1000, message: 'Giá bán phải lớn hơn 1.000 VNĐ!' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Nhập giá bán"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => (value ? value.replace(/\$\s?|(,*)/g, '') : '')}
                min={1000}
                step={1000}
              />
            </Form.Item>

            <Form.Item 
              name="so_luong" 
              label="Số lượng tồn kho" 
              rules={[
                { required: true, message: 'Vui lòng nhập số lượng!' },
                { type: 'number', min: 0, message: 'Số lượng không được âm!' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Nhập số lượng"
                min={0}
                precision={0}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
});

ProductManagement.displayName = 'ProductManagement';
export default ProductManagement;
