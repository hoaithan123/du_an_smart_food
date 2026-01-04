import React, { memo, useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, Form, Input, message, Popconfirm,
  Space, Card, Switch, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';

const CategoryManagement = memo(() => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchCategories = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Bạn cần đăng nhập để xem danh sách danh mục!');
      return;
    }

    setLoading(true);
    try {
      // Lấy tất cả danh mục, kể cả danh mục ẩn
      const response = await adminAPI.getCategories();
      const list = Array.isArray(response.data) ? response.data : [];
      setCategories(list);
      setFilteredCategories(list); // Hiển thị tất cả, không lọc theo isActive
    } catch (error) {
      console.error('Fetch categories error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi tải danh sách danh mục.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearch = useCallback((value) => {
    const v = value || '';
    setSearchText(v);
    
    if (v.trim()) {
      const filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(v.trim().toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [categories]);

  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setIsModalVisible(true);
    form.resetFields();
  }, [form]);

  const handleEdit = useCallback((record) => {
    setEditingCategory(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: record.name,
      isActive: record.isActive !== false
    });
  }, [form]);

  const handleDelete = useCallback(async (id) => {
    try {
      await adminAPI.deleteCategory(id);
      message.success('Xóa danh mục thành công!');
      fetchCategories();
    } catch (error) {
      console.error('Delete category error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi xóa danh mục.');
    }
  }, [fetchCategories]);

  const handleToggleActive = useCallback(async (id, isActive) => {
    // Cập nhật state ngay lập tức để UI phản hồi tức thì
    const updatedCategories = categories.map(cat => 
      cat.id === id ? { ...cat, isActive: !isActive } : cat
    );
    setCategories(updatedCategories);
    setFilteredCategories(
      searchText 
        ? updatedCategories.filter(cat =>
            cat.name.toLowerCase().includes(searchText.trim().toLowerCase())
          )
        : updatedCategories
    );

    const newStatus = !isActive;
    const categoryName = categories.find(cat => cat.id === id)?.name || '';

    try {
      await adminAPI.updateCategory(id, { isActive: newStatus });
      
      if (newStatus) {
        message.success(`✅ Đã kích hoạt danh mục "${categoryName}"`);
      } else {
        message.warning(`👁️‍🗨️ Đã ẩn danh mục "${categoryName}" - vẫn hiển thị cho admin`);
      }
      
      fetchCategories(); // Refresh để đảm bảo dữ liệu đồng bộ
    } catch (error) {
      console.error('Toggle category status error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi cập nhật trạng thái danh mục.');
      // Nếu lỗi, revert lại state cũ
      fetchCategories();
    }
  }, [categories, searchText, fetchCategories]);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      console.log('Form values:', values);
      
      if (editingCategory) {
        console.log('Updating category:', editingCategory.id, values);
        await adminAPI.updateCategory(editingCategory.id, values);
        message.success('Cập nhật danh mục thành công!');
      } else {
        console.log('Creating category with values:', values);
        await adminAPI.createCategory(values);
        message.success('Thêm danh mục thành công!');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      console.error('Save category error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      message.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Lỗi khi lưu danh mục.'
      );
    }
  }, [form, editingCategory, fetchCategories]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingCategory(null);
  }, [form]);

  // Hàm highlight text tìm kiếm
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#666' }}>
          {text}
        </span>
      )
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <span style={{ 
          fontWeight: '500', 
          fontSize: '14px',
          color: record.isActive === false ? '#999' : '#000',
          fontStyle: record.isActive === false ? 'italic' : 'normal'
        }}>
          {record.isActive === false && (
            <span style={{ marginRight: '6px', opacity: 0.5 }}>👁️‍🗨️</span>
          )}
          {highlightText(text, searchText)}
          {record.isActive === false && (
            <Tag 
              color="default" 
              style={{ 
                marginLeft: '8px', 
                fontSize: '11px',
                opacity: 0.7,
                background: '#f5f5f5',
                borderColor: '#d9d9d9'
              }}
            >
              Đã ẩn
            </Tag>
          )}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      align: 'center',
      render: (isActive, record) => (
        <Switch
          checked={isActive !== false}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          checkedChildren="Hiện"
          unCheckedChildren="Ẩn"
          size="small"
        />
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
            title="Xóa danh mục"
            description="Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm trong danh mục này sẽ không bị xóa."
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
        maxWidth: '1200px',
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
            <AppstoreOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
            <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>Quản lý Danh mục</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Input.Search
                placeholder="🔍 Tìm kiếm danh mục..."
                allowClear
                enterButton={
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(114, 46, 209, 0.3)'
                    }}
                  >
                    Tìm kiếm
                  </Button>
                }
                size="large"
                style={{ 
                  width: 350,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
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
                  📁 <strong>{filteredCategories.length}</strong> kết quả tìm thấy cho "{searchText}"
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleAdd}
              style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(114, 46, 209, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(114, 46, 209, 0.3)';
              }}
            >
              ✨ Thêm Danh mục
            </Button>
          </div>
        </div>

        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f2f5',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)'
        }}>
          {/* Hiển thị thông tin tìm kiếm */}
          {searchText && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, #f9f0ff 0%, #f6ffed 100%)', 
              borderRadius: '12px',
              border: '1px solid #d3adf7',
              boxShadow: '0 2px 8px rgba(114, 46, 209, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #722ed1 0%, #9254de 100%)'
              }} />
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(114, 46, 209, 0.3)'
                  }}>
                    <SearchOutlined style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <div style={{ 
                      color: '#722ed1', 
                      fontWeight: 'bold', 
                      fontSize: '15px',
                      marginBottom: '2px'
                    }}>
                      📁 Tìm kiếm: "{searchText}"
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: filteredCategories.length > 0 ? '#52c41a' : '#ff4d4f',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {filteredCategories.length} kết quả
                      </span>
                      <span>trong {categories.length} danh mục</span>
                    </div>
                  </div>
                </div>
                <Button 
                  type="text"
                  size="small" 
                  onClick={() => handleSearch('')}
                  style={{ 
                    color: '#722ed1',
                    fontWeight: 'bold',
                    border: '1px solid #d3adf7',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    height: 'auto',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(114, 46, 209, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#722ed1';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#722ed1';
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
            dataSource={filteredCategories} 
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} danh mục`,
            }}
            locale={{
              emptyText: searchText ? 
                `Không tìm thấy danh mục với từ khóa "${searchText}"` : 
                'Không có dữ liệu'
            }}
            scroll={{ x: 600 }}
          />
        </Card>

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppstoreOutlined />
              {editingCategory ? 'Sửa Danh mục' : 'Thêm Danh mục'}
            </div>
          }
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          width={500}
          okText={editingCategory ? 'Cập nhật' : 'Thêm mới'}
          cancelText="Hủy"
        >
          <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
            <Form.Item 
              name="name" 
              label="Tên danh mục" 
              rules={[
                { required: true, message: 'Vui lòng nhập tên danh mục!' },
                { min: 2, message: 'Tên danh mục phải có ít nhất 2 ký tự!' },
                { max: 50, message: 'Tên danh mục không được quá 50 ký tự!' }
              ]}
            >
              <Input placeholder="Nhập tên danh mục (VD: Món chính, Đồ uống, Tráng miệng...)" />
            </Form.Item>

            <Form.Item 
              name="isActive" 
              label="Trạng thái" 
              valuePropName="checked"
              initialValue={true}
            >
              <Switch 
                checkedChildren="Hiển thị" 
                unCheckedChildren="Ẩn" 
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
});

CategoryManagement.displayName = 'CategoryManagement';
export default CategoryManagement;
