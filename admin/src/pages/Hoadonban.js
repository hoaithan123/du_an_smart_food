import React, { useState, useEffect, useCallback } from 'react';
import { Table, message, Spin, Button, Modal, Descriptions, Card, DatePicker, Space } from 'antd';
import { FileTextOutlined, UnorderedListOutlined, SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { adminAPI } from '../utils/api';
import MainLayout from '../components/MainLayout';

dayjs.locale('vi');

const Hoadonban = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchDate, setSearchDate] = useState(null);

  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllOrders({ limit: 200, offset: 0 });
      const data = response.data || [];
      // Chuẩn hóa cho UI hiện tại
      const mapped = data.map((o) => ({
        id: o.id,
        ngay_ban: o.ngay_tao,
        nhan_vien: { ho_ten: o.khach_hang?.ho_ten || o.ho_ten_nguoi_nhan || 'Khách hàng' },
        tong_tien: o.tong_tien,
        raw: o,
      }));
      setBills(mapped);
      setFilteredBills(mapped);
    } catch (error) {
      console.error('Lỗi khi tải danh sách hóa đơn:', error);
      message.error('Lỗi khi tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    setDetailLoading(true);
    try {
      const response = await adminAPI.getOrderDetail(billId);
      const order = response.data;
      const items = order?.chi_tiet_don_hang || [];
      setBillDetails(items);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết hóa đơn:', error);
      message.error('Lỗi khi tải chi tiết hóa đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (record) => {
    setSelectedBill(record);
    setIsDetailModalOpen(true);
    fetchBillDetails(record.id);
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Hàm tìm kiếm theo ngày bán
  const handleDateSearch = useCallback((date) => {
    setSearchDate(date);
    
    if (!date) {
      setFilteredBills(bills);
      return;
    }
    
    const selectedDate = dayjs(date).format('YYYY-MM-DD');
    const filtered = bills.filter(bill => {
      const billDate = dayjs(bill.ngay_ban).format('YYYY-MM-DD');
      return billDate === selectedDate;
    });
    
    setFilteredBills(filtered);
  }, [bills]);

  // Reset search khi bills thay đổi
  useEffect(() => {
    if (!searchDate) {
      setFilteredBills(bills);
    } else {
      handleDateSearch(searchDate);
    }
  }, [bills, searchDate, handleDateSearch]);

  const columns = [
    { title: 'ID Hóa đơn', dataIndex: 'id', key: 'id' },
    {
      title: 'Ngày bán',
      dataIndex: 'ngay_ban',
      key: 'ngay_ban',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Nhân viên',
      dataIndex: ['nhan_vien', 'ho_ten'],
      key: 'nhan_vien',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'tong_tien',
      key: 'tong_tien',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </span>
      ),
      align: 'right',
    },
    {
      title: '',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<UnorderedListOutlined />}
          size="small"
          onClick={() => handleViewDetails(record)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)';
          }}
        >
          📋 Chi tiết
        </Button>
      ),
    },
  ];

  // Columns cho bảng chi tiết sản phẩm
  const detailColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_, __, index) => index + 1,
      align: 'center',
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'ten_san_pham',
      key: 'ten_san_pham',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Số lượng',
      dataIndex: 'so_luong',
      key: 'so_luong',
      align: 'center',
      render: (quantity) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {quantity || 0}
        </span>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'don_gia',
      key: 'don_gia',
      align: 'right',
      render: (price) => (
        <span style={{ color: '#52c41a' }}>
          {formatCurrency(price)}
        </span>
      ),
    },
    {
      title: 'Thành tiền',
      key: 'thanh_tien',
      align: 'right',
      render: (_, record) => {
        const thanhTien = (record.so_luong || 0) * (record.don_gia || 0);
        return (
          <span style={{ fontWeight: 'bold', color: '#f5222d' }}>
            {formatCurrency(thanhTien)}
          </span>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>Quản lý Hóa đơn Bán</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <DatePicker
                placeholder="📅 Tìm kiếm theo ngày bán..."
                onChange={handleDateSearch}
                format="DD/MM/YYYY"
                size="large"
                style={{ 
                  width: 250,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }}
                allowClear
                suffixIcon={
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                }
              />
              {searchDate && (
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
                  📅 <strong>{filteredBills.length}</strong> hóa đơn tìm thấy cho ngày {dayjs(searchDate).format('DD/MM/YYYY')}
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              size="large"
              onClick={() => handleDateSearch(null)}
              disabled={!searchDate}
              style={{
                background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (searchDate) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(24, 144, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (searchDate) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)';
                }
              }}
            >
              🔍 Xóa bộ lọc
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
          {searchDate && (
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
                    <CalendarOutlined style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <div style={{ 
                      color: '#1890ff', 
                      fontWeight: 'bold', 
                      fontSize: '15px',
                      marginBottom: '2px'
                    }}>
                      📅 Tìm kiếm theo ngày: {dayjs(searchDate).format('DD/MM/YYYY')}
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: filteredBills.length > 0 ? '#52c41a' : '#ff4d4f',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {filteredBills.length} hóa đơn
                      </span>
                      <span>trong {bills.length} hóa đơn tổng cộng</span>
                    </div>
                  </div>
                </div>
                <Button 
                  type="text"
                  size="small" 
                  onClick={() => handleDateSearch(null)}
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
              dataSource={filteredBills} 
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} của ${total} hóa đơn`,
              }}
              locale={{
                emptyText: searchDate ? 
                  `Không tìm thấy hóa đơn nào cho ngày ${dayjs(searchDate).format('DD/MM/YYYY')}` : 
                  'Không có dữ liệu'
              }}
              scroll={{ x: 800 }}
            />
          </Spin>
        </Card>

        {/* Modal chi tiết hóa đơn */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextOutlined />
              Chi tiết Hóa đơn #{selectedBill?.id}
            </div>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={null}
          width={1000}
          destroyOnHidden
        >
          {selectedBill && (
            <div>
              {/* Thông tin hóa đơn */}
              <Card 
                title="Thông tin hóa đơn" 
                style={{ marginBottom: '16px' }}
                size="small"
              >
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Mã hóa đơn">
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      HD{String(selectedBill.id).padStart(6, '0')}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày bán">
                    {dayjs(selectedBill.ngay_ban).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nhân viên bán hàng">
                    {selectedBill.nhan_vien?.ho_ten || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tiền">
                    <span style={{ fontWeight: 'bold', color: '#f5222d', fontSize: '16px' }}>
                      {formatCurrency(selectedBill.tong_tien)}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Danh sách sản phẩm */}
              <Card title="Danh sách sản phẩm" size="small">
                <Spin spinning={detailLoading}>
                  <Table
                    columns={detailColumns}
                    dataSource={billDetails}
                    rowKey={(r, idx) => r.id || idx}
                    pagination={false}
                    size="small"
                    summary={(pageData) => {
                      const totalQuantity = pageData.reduce((sum, record) => sum + (record.so_luong || 0), 0);
                      const totalAmount = pageData.reduce((sum, record) => {
                        const thanhTien = (record.so_luong || 0) * (record.don_gia || 0);
                        return sum + thanhTien;
                      }, 0);
                      
                      return (
                        <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                          <Table.Summary.Cell index={0} colSpan={4}>
                            <span style={{ fontWeight: 'bold' }}>Tổng cộng</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="center">
                            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                              {totalQuantity}
                            </span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2}></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <span style={{ fontWeight: 'bold', color: '#f5222d', fontSize: '16px' }}>
                              {formatCurrency(totalAmount)}
                            </span>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Spin>
              </Card>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default Hoadonban;