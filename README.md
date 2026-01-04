# SmartFood - Hệ Thống Đặt Món Ăn Thông Minh

## Giới thiệu

SmartFood là hệ thống đặt món ăn online với tích hợp trí tuệ nhân tạo để gợi ý món ăn cá nhân hóa. Hệ thống giúp khách hàng dễ dàng lựa chọn món ăn dựa trên thói quen, thời gian và thời tiết.

## Tính năng chính

### 🍽️ Đối với khách hàng
- **Xem menu và đặt món online**
- **Gợi ý món ăn thông minh** dựa trên lịch sử, thời gian, thời tiết
- **Chatbot trợ lý ảo** 24/7
- **Theo dõi đơn hàng** theo thời gian thực
- **Chương trình khách hàng thân thiết** (4 hạng mức)
- **Đánh giá và review** món ăn

### 🏪 Đối với chủ shop
- **Quản lý món ăn** và danh mục
- **Quản lý đơn hàng** và trạng thái
- **Phân tích doanh thu** và báo cáo
- **Quản lý voucher** và khuyến mãi
- **Quản lý khách hàng** và membership

### 🤖 Tính năng AI
- **Gợi ý cá nhân hóa** dựa trên behavior
- **Gợi ý theo thời gian** (sáng/trưa/tối)
- **Gợi ý theo thời tiết** (nóng/lạnh/mưa)
- **Chatbot NLP** hiểu intent khách hàng

## Kiến trúc hệ thống

```
SmartFood/
├── backend/          # Node.js + Express + Prisma API
├── frontend/         # React + TailwindCSS (Customer App)
├── admin/            # React + Ant Design (Admin Panel)
└── hình/            # Hình ảnh và assets
```

## Công nghệ sử dụng

### Backend
- **Node.js** + **Express.js** - RESTful API
- **Prisma ORM** - Database management
- **MySQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend Customer
- **React 18** - UI framework
- **React Router** - Client routing
- **React Query** - State management
- **TailwindCSS** - Styling
- **Axios** - API calls

### Admin Panel
- **React** + **Ant Design** - Admin UI
- **Ant Design Charts** - Data visualization

## Cài đặt

### Yêu cầu
- Node.js 16+
- MySQL 8.0+
- Git

### Các bước thực hiện

1. **Clone repository**
```bash
git clone https://github.com/hoaithan123/du_an_smart_food.git
cd du_an_smart_food
```

2. **Cài đặt dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Admin
cd ../admin
npm install
```

3. **Cấu hình database**
```bash
cd backend
# Tạo file .env với thông tin database
cp .env.example .env
# Chỉnh sửa thông tin kết nối MySQL
```

4. **Setup database**
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. **Chạy ứng dụng**
```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000)
cd ../frontend
npm start

# Admin (port 3001)
cd ../admin
npm start
```

## Tài khoản demo

### Admin
- Email: admin@smartfood.com
- Mật khẩu: admin123

### Customer
- Email: user@smartfood.com
- Mật khẩu: user123

## API Documentation

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/forgot-password` - Quên mật khẩu

### Dishes
- `GET /api/dishes` - Lấy danh sách món
- `GET /api/dishes/:id` - Chi tiết món
- `POST /api/dishes` - Thêm món (Admin)

### Orders
- `GET /api/orders` - Lấy danh sách đơn hàng
- `POST /api/orders` - Tạo đơn hàng mới
- `PUT /api/orders/:id` - Cập nhật trạng thái

### Recommendations
- `GET /api/recommendations/personal` - Gợi ý cá nhân
- `GET /api/recommendations/weather` - Gợi ý theo thời tiết

## Database Schema

### Các bảng chính
- **users** - Thông tin người dùng
- **dishes** - Danh sách món ăn
- **categories** - Danh mục món ăn
- **orders** - Đơn hàng
- **order_items** - Chi tiết đơn hàng
- **reviews** - Đánh giá
- **recommendation_history** - Lịch sử gợi ý
- **weather_data** - Dữ liệu thời tiết
- **chatbot_conversations** - Cuộc trò chuyện chatbot

## Membership Tiers

- **BRONZE** - Mới đăng ký
- **SILVER** - Chi tiêu ≥ 2,000,000 VND
- **GOLD** - Chi tiêu ≥ 5,000,000 VND
- **PLATINUM** - Chi tiêu ≥ 10,000,000 VND

## Điểm nổi bật

1. **AI-powered Recommendations** - Gợi ý thông minh đa yếu tố
2. **Contextual Chatbot** - Hỗ trợ khách hàng 24/7
3. **Dynamic Membership** - Tự động nâng hạng theo chi tiêu
4. **Weather Integration** - Gợi ý phù hợp thời tiết
5. **Real-time Analytics** - Báo cáo doanh thu trực tiếp

## Hướng phát triển

- [ ] Tích hợp thanh toán online (VNPAY, MoMo)
- [ ] Real-time order tracking
- [ ] Mobile app (React Native)
- [ ] Machine Learning cho recommendations
- [ ] Multi-vendor support

## Đóng góp

1. Fork project
2. Tạo branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Pull Request

## License

MIT License - xem file [LICENSE](LICENSE) để biết chi tiết

## Liên hệ

- **Email:** contact@smartfood.com
- **GitHub:** https://github.com/hoaithan123/du_an_smart_food

---

© 2024 SmartFood. All rights reserved.
