import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import api, { adminAPI } from '../utils/api';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await adminAPI.login({
        email: values.tai_khoan,
        password: values.mat_khau,
      });

      const { token, user } = res.data;

      if (!token) throw new Error('Token không tồn tại trong phản hồi');

      localStorage.setItem('token', token);
      localStorage.setItem('role', user?.role || 'ADMIN');
      localStorage.setItem('userName', user?.fullName || user?.username || 'Admin');

      message.success('Đăng nhập thành công');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      message.error(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (values) => {
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        email: values.email,
      });

      message.success('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi');
      setForgotVisible(false);
      forgotForm.resetFields();
    } catch (err) {
      console.error('Forgot password error:', err);
      message.error(err.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', backgroundColor: '#f0f2f5'
    }}>
      <Card title="Đăng nhập hệ thống" style={{ width: 400 }}>
        <Form name="login" onFinish={onFinish}>
          <Form.Item name="tai_khoan" rules={[{ required: true, message: 'Vui lòng nhập tài khoản!' }]}>
            <Input placeholder="Tài khoản" />
          </Form.Item>
          <Form.Item name="mat_khau" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
            <Input.Password placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng nhập
            </Button>
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Button type="link" onClick={() => setForgotVisible(true)}>
                Quên mật khẩu?
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="Quên mật khẩu"
        open={forgotVisible}
        onCancel={() => setForgotVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={forgotForm}
          layout="vertical"
          onFinish={handleForgotSubmit}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="Nhập email tài khoản" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={forgotLoading}
              block
            >
              Gửi yêu cầu đặt lại
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Login;
