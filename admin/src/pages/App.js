import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import ProductManagement from './ProductManagement';
import CategoryManagement from './CategoryManagement';
import EmployeeManagement from './EmployeeManagement';
import RevenueReport from './reports/RevenueReport';
import InventoryReport from './reports/InventoryReport';
import EmployeePerformanceReport from './reports/EmployeePerformanceReport';
import PrivateRoute from '../utils/PrivateRoute';
import Hoadonban from './Hoadonban';
import Dashboard from './Dashboard';
import UltraAccuratePaymentDetection from './UltraAccuratePaymentDetection';
import SimpleBankPaymentDetection from './SimpleBankPaymentDetection';
import SimplePaymentManager from './SimplePaymentManager';
import FullyAutoPaymentDetection from './FullyAutoPaymentDetection';
import SecurePaymentDetection from './SecurePaymentDetection';
import OrderManagement from './OrderManagement';
import CustomerManagement from './CustomerManagement';
import VoucherManagement from './VoucherManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute roles={['quan_ly', 'thu_ngan', 'nhan_vien_kho']}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Các route báo cáo */}
        <Route
          path="/baocao"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <RevenueReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/doanhthu"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <RevenueReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/tonkho"
          element={
            <PrivateRoute roles={['quan_ly', 'nhan_vien_kho']}>
              <InventoryReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/baocao/hieusuatnhanvien"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <EmployeePerformanceReport />
            </PrivateRoute>
          }
        />

        {/* Quản lý sản phẩm */}
        <Route
          path="/sanpham"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <ProductManagement />
            </PrivateRoute>
          }
        />

        {/* Quản lý danh mục */}
        <Route
          path="/danh-muc"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <CategoryManagement />
            </PrivateRoute>
          }
        />

        {/* Quản lý nhân viên */}
        <Route
          path="/nhanvien"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <EmployeeManagement />
            </PrivateRoute>
          }
        />

        {/* Hóa đơn bán */}
        <Route
          path="/hoadonban"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <Hoadonban />
            </PrivateRoute>
          }
        />

        {/* Hệ thống phát hiện thanh toán siêu chính xác */}
        <Route
          path="/ultra-accurate-payment-detection"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <UltraAccuratePaymentDetection />
            </PrivateRoute>
          }
        />

        {/* Hệ thống phát hiện thanh toán đơn giản */}
        <Route
          path="/simple-bank-payment-detection"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <SimpleBankPaymentDetection />
            </PrivateRoute>
          }
        />

        {/* Quản lý thanh toán đơn giản */}
        <Route
          path="/simple-payment-manager"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <SimplePaymentManager />
            </PrivateRoute>
          }
        />

        {/* Hệ thống TỰ ĐỘNG HOÀN TOÀN */}
        <Route
          path="/fully-auto-payment-detection"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <FullyAutoPaymentDetection />
            </PrivateRoute>
          }
        />

        {/* Hệ thống AN TOÀN 100% */}
        <Route
          path="/secure-payment-detection"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <SecurePaymentDetection />
            </PrivateRoute>
          }
        />

        {/* Quản lý đơn hàng */}
        <Route
          path="/don-hang"
          element={
            <PrivateRoute roles={['quan_ly', 'thu_ngan']}>
              <OrderManagement />
            </PrivateRoute>
          }
        />

        {/* Quản lý khách hàng */}
        <Route
          path="/khach-hang"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <CustomerManagement />
            </PrivateRoute>
          }
        />

        {/* Quản lý voucher */}
        <Route
          path="/voucher"
          element={
            <PrivateRoute roles={['quan_ly']}>
              <VoucherManagement />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;