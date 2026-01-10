import React, { useState, useEffect } from 'react';
import { Table, Input, message, Space, Button, Modal, InputNumber } from 'antd';
import api from '../../utils/api';
import MainLayout from '../../components/MainLayout';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { Search } = Input;

const InventoryReport = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backfillModalVisible, setBackfillModalVisible] = useState(false);
  const [defaultStock, setDefaultStock] = useState(50);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dishes', { params: { limit: 1000, offset: 0 } });
      const dishes = response.data?.dishes || [];
      const mapped = dishes.map(d => ({
        id: d.id,
        ten_san_pham: d.name,
        ma_san_pham: `SP${d.id}`,
        so_luong: d.stock || 0, // Sử dụng field stock từ backend
        gia_ban: d.price,
        is_available: d.is_available
      }));
      setInventory(mapped);
      setFilteredInventory(mapped);
    } catch (error) {
      message.error('Lỗi khi tải báo cáo tồn kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSearch = (value) => {
    const searchTerm = value.toLowerCase().trim();
    if (!searchTerm) {
      setFilteredInventory(inventory);
    } else {
      const filtered = inventory.filter(item => 
        item.ten_san_pham.toLowerCase().includes(searchTerm) ||
        item.ma_san_pham.toLowerCase().includes(searchTerm)
      );
      setFilteredInventory(filtered);
    }
  };

  const handleBackfillStock = async () => {
    setBackfillLoading(true);
    try {
      const response = await api.post('/dishes/admin/backfill-stock', { default_stock: defaultStock });
      message.success(`Đã cập nhật tồn kho cho ${response.data.updated} sản phẩm thành công!`);
      setBackfillModalVisible(false);
      fetchInventory(); // Refresh data
    } catch (error) {
      message.error('Lỗi khi cập nhật tồn kho');
    } finally {
      setBackfillLoading(false);
    }
  };

  const columns = [
    { 
      title: 'Tên sản phẩm', 
      dataIndex: 'ten_san_pham', 
      key: 'ten_san_pham',
      sorter: (a, b) => a.ten_san_pham.localeCompare(b.ten_san_pham),
    },
    { 
      title: 'Mã sản phẩm', 
      dataIndex: 'ma_san_pham', 
      key: 'ma_san_pham',
      width: 120,
    },
    { 
      title: 'Số lượng tồn', 
      dataIndex: 'so_luong', 
      key: 'so_luong',
      width: 120,
      sorter: (a, b) => a.so_luong - b.so_luong,
      render: (value) => (
        <span style={{ 
          color: value === 0 ? '#ff4d4f' : value < 10 ? '#fa8c16' : '#52c41a',
          fontWeight: value === 0 ? 'bold' : 'normal'
        }}>
          {value}
        </span>
      )
    },
    { 
      title: 'Giá bán', 
      dataIndex: 'gia_ban', 
      key: 'gia_ban',
      width: 120,
      sorter: (a, b) => a.gia_ban - b.gia_ban,
      render: (value) => `${value.toLocaleString('vi-VN')}đ`
    },
    {
      title: 'Trạng thái',
      dataIndex: 'so_luong',
      key: 'trang_thai',
      width: 100,
      render: (soLuong) => (
        <span style={{ 
          color: soLuong > 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {soLuong > 0 ? 'Còn hàng' : 'Hết hàng'}
        </span>
      )
    }
  ];

  return (
    <MainLayout>
      <div style={{ marginBottom: 16 }}>
        <h2>Báo cáo Tồn kho</h2>
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="Tìm kiếm theo tên sản phẩm hoặc mã sản phẩm..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 400 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                setFilteredInventory(inventory);
              }
            }}
          />
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={() => setBackfillModalVisible(true)}
            loading={backfillLoading}
          >
            Cập nhật tồn kho
          </Button>
        </Space>
      </div>
      <Table 
        columns={columns} 
        dataSource={filteredInventory} 
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} của ${total} sản phẩm`,
        }}
        scroll={{ x: 800 }}
      />
      
      <Modal
        title="Cập nhật tồn kho hàng loạt"
        open={backfillModalVisible}
        onOk={handleBackfillStock}
        onCancel={() => setBackfillModalVisible(false)}
        confirmLoading={backfillLoading}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <p style={{ marginBottom: 16 }}>
          Thao tác này sẽ cập nhật tồn kho cho tất cả các sản phẩm có số lượng tồn ≤ 0.
        </p>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Số lượng tồn mặc định:</label>
            <InputNumber
              min={1}
              max={9999}
              value={defaultStock}
              onChange={(value) => setDefaultStock(value)}
              style={{ width: '100%' }}
            />
          </div>
        </Space>
      </Modal>
    </MainLayout>
  );
};

export default InventoryReport;