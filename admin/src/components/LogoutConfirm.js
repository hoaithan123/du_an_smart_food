import React from 'react';
import { Modal, Button } from 'antd';
import { LogoutOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const LogoutConfirm = ({ visible, onConfirm, onCancel }) => {
  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          Xác nhận đăng xuất
        </span>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Đăng xuất"
      cancelText="Hủy"
      okButtonProps={{
        icon: <LogoutOutlined />,
        danger: true
      }}
      centered
    >
      <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Sau khi đăng xuất, bạn sẽ cần đăng nhập lại để tiếp tục sử dụng.
      </p>
    </Modal>
  );
};

export default LogoutConfirm;



