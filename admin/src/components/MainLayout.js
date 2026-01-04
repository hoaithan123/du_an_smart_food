import React, { useState } from 'react';
import { Layout, Menu, theme, Button, Dropdown, Avatar, Space, Typography } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  GiftOutlined,
  LogoutOutlined,
  SettingOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutConfirm from './LogoutConfirm';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ để biết đường dẫn hiện tại
  const [openKeys, setOpenKeys] = useState(() => {
    // Chỉ kiểm tra một lần khi component mount
    return location.pathname.startsWith('/baocao') ? ['baocao-sub'] : [];
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Lấy thông tin người dùng từ localStorage
  const userInfo = {
    name: localStorage.getItem('userName') || 'Admin',
    role: localStorage.getItem('role') || 'quan_ly'
  };

  // Menu dropdown cho user
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogoutClick,
    },
  ];

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/sanpham', icon: <ShoppingOutlined />, label: 'Quản lý Sản phẩm' },
    { key: '/danh-muc', icon: <AppstoreOutlined />, label: 'Quản lý Danh mục' },
    { key: '/nhanvien', icon: <UserOutlined />, label: 'Quản lý Nhân viên' },
    { key: '/don-hang', icon: <ShoppingCartOutlined />, label: 'Quản lý Đơn hàng' },
    { key: '/khach-hang', icon: <TeamOutlined />, label: 'Quản lý Khách hàng' },
    { key: '/voucher', icon: <GiftOutlined />, label: 'Quản lý Voucher' },
    {
      key: 'baocao-sub',
      icon: <BarChartOutlined />,
      label: 'Báo cáo & Thống kê',
      children: [
        { key: '/baocao/doanhthu', label: 'Doanh thu' },
        { key: '/baocao/tonkho', label: 'Tồn kho' },
        { key: '/baocao/hieusuatnhanvien', label: 'Hiệu suất nhân viên' },
      ],
    },
    { key: '/hoadonban', icon: <FileTextOutlined />, label: 'Hóa đơn bán' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]} // ✅ luôn highlight đúng mục đang mở
          openKeys={openKeys} // ✅ control submenu state
          onOpenChange={(keys) => {
            setOpenKeys(keys);
          }}
          items={menuItems}
          onClick={({ key }) => {
            if (key !== 'baocao-sub') {
              navigate(key);
            }
          }}
        />
      </Sider>
      <Layout>
        <Header 
          style={{ 
            background: colorBgContainer, 
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <div>
            <Text strong style={{ fontSize: '18px' }}>
              Hệ thống quản lý cửa hàng
            </Text>
          </div>
          <Space>
            <Text type="secondary">
              Xin chào, {userInfo.name}
            </Text>
            <Button 
              type="primary" 
              danger 
              icon={<LogoutOutlined />}
              onClick={handleLogoutClick}
              size="small"
            >
              Đăng xuất
            </Button>
            <Dropdown
              menu={{ 
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') {
                    handleLogoutClick();
                  }
                }
              }}
              placement="bottomRight"
              arrow
            >
              <Button type="text" icon={<Avatar icon={<UserOutlined />} />} />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
      <LogoutConfirm
        visible={showLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </Layout>
  );
};

export default MainLayout;
