import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">🍽️ SmartFood</h3>
            <p className="text-gray-300">
              Hệ thống đặt đồ ăn thông minh với AI gợi ý cá nhân hóa
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên kết</h4>
            <ul className="space-y-2">
              <li><a href="/menu" className="text-gray-300 hover:text-white">Menu</a></li>
              <li><a href="/orders" className="text-gray-300 hover:text-white">Đơn hàng</a></li>
              <li><a href="/profile" className="text-gray-300 hover:text-white">Hồ sơ</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên hệ</h4>
            <p className="text-gray-300">Email: support@smartfood.com</p>
            <p className="text-gray-300">Hotline: 1900-xxxx</p>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            © 2024 SmartFood. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
