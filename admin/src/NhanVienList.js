import React, { useEffect, useState } from 'react';
import { Table, Button, message } from 'antd';
import axios from 'axios';

const NhanVienList = ({ token }) => {
  const [nhanViens, setNhanViens] = useState([]);

  useEffect(() => {
    const fetchNhanViens = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/nhanvien', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNhanViens(res.data);
      } catch (error) {
        message.error(error.response?.data?.error || 'Lỗi khi lấy danh sách nhân viên');
      }
    };
    fetchNhanViens();
  }, [token]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/nhanvien/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNhanViens(nhanViens.filter((nv) => nv.id !== id));
      message.success('Đã xóa nhân viên');
    } catch (error) {
      message.error(error.response?.data?.error || 'Lỗi khi xóa nhân viên');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Họ tên', dataIndex: 'hoTen', key: 'hoTen' },
    { title: 'SĐT', dataIndex: 'soDienThoai', key: 'soDienThoai' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Button type="danger" onClick={() => handleDelete(record.id)}>
          Xóa
        </Button>
      ),
    },
  ];

  return <Table dataSource={nhanViens} columns={columns} rowKey="id" />;
};

export default NhanVienList;