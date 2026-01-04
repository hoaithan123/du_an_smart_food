// File: src/utils/auth.js

/**
 * Kiểm tra vai trò của người dùng hiện tại
 * @param {Array<string>} requiredRoles - Mảng các vai trò được phép truy cập
 * @returns {boolean} - true nếu người dùng có quyền, ngược lại là false
 */
export const checkRole = (requiredRoles) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Kiểm tra xem token và vai trò có tồn tại không
  if (!token || !userRole) {
    return false;
  }
  
  // Chấp nhận ADMIN (từ backend SmartFood) như quyền quản trị đầy đủ
  if (userRole === 'ADMIN') {
    return true;
  }

  // Kiểm tra xem vai trò của người dùng có nằm trong mảng các vai trò được phép không
  return requiredRoles.includes(userRole);
};