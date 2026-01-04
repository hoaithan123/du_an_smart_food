import React, { useState, useEffect } from 'react';
import { Table, message } from 'antd';
import api from '../../utils/api';
import MainLayout from '../../components/MainLayout';

const InventoryReport = () => {
  const [inventory, setInventory] = useState([]);
  
  const fetchInventory = async () => {
    try {
      const response = await api.get('/dishes', { params: { limit: 1000, offset: 0 } });
      const dishes = response.data?.dishes || [];
      const mapped = dishes.map(d => ({
        id: d.id,
        ten_san_pham: d.name,
        ma_san_pham: `SP${d.id}`,
        so_luong: d.is_available === false ? 0 : (d.total_orders || 0), // không có tồn kho thực, dùng chỉ báo
        gia_ban: d.price
      }));
      setInventory(mapped);
    } catch (error) {
      message.error('Lỗi khi tải báo cáo tồn kho');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const columns = [
    { title: 'Tên sản phẩm', dataIndex: 'ten_san_pham', key: 'ten_san_pham' },
    { title: 'Mã sản phẩm', dataIndex: 'ma_san_pham', key: 'ma_san_pham' },
    { title: 'Số lượng tồn', dataIndex: 'so_luong', key: 'so_luong' },
    { title: 'Giá bán', dataIndex: 'gia_ban', key: 'gia_ban' },
  ];

  return (
    <MainLayout>
      <h2>Báo cáo Tồn kho</h2>
      <Table columns={columns} dataSource={inventory} rowKey="id" />
    </MainLayout>
  );
};

export default InventoryReport;