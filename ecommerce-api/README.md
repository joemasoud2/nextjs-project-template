# E-Commerce RESTful API

A complete backend RESTful API for an E-Commerce website built with Node.js, Express.js, and MongoDB. This API provides comprehensive functionality for user authentication, product management, shopping cart operations, and order processing.

## 🚀 Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (User/Admin)
  - Password hashing with bcrypt
  - Token refresh functionality

- **Product Management**
  - CRUD operations for products
  - Category-based filtering
  - Search functionality
  - Stock management
  - Image support

- **Shopping Cart**
  - Add/remove items
  - Update quantities
  - Cart validation
  - Automatic total calculations

- **Order Management**
  - Place orders with payment method selection
  - Order status tracking
  - Order history
  - Admin order management

- **Additional Features**
  - Global error handling
  - Request validation
  - MongoDB integration with Mongoose
  - Environment-based configuration
  - Clean MVC architecture

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce_db
   JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
   NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Product Endpoints

#### Get All Products
```http
GET /api/products?page=1&limit=10&category=Electronics&search=phone
```

#### Get Product by ID
```http
GET /api/products/:id
```

#### Create Product (Admin Only)
```http
POST /api/products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "iPhone 13",
  "description": "Latest iPhone model",
  "price": 999.99,
  "category": "Electronics",
  "stock": 50,
  "brand": "Apple",
  "images": ["image1.jpg", "image2.jpg"]
}
```

#### Update Product (Admin Only)
```http
PUT /api/products/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "iPhone 13 Pro",
  "price": 1099.99,
  "stock": 30
}
```

#### Delete Product (Admin Only)
```http
DELETE /api/products/:id
Authorization: Bearer <admin-token>
```

### Cart Endpoints

#### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

#### Add to Cart
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 2
}
```

#### Update Cart Item
```http
PUT /api/cart/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 3
}
```

#### Remove from Cart
```http
DELETE /api/cart/remove/:productId
Authorization: Bearer <token>
```

#### Clear Cart
```http
DELETE /api/cart/clear
Authorization: Bearer <token>
```

### Order Endpoints

#### Place Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethod": "Online",
  "shippingAddress": {
    "fullName": "John Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "United States",
    "phone": "+1234567890"
  },
  "notes": "Please deliver after 6 PM"
}
```

#### Get User Orders
```http
GET /api/orders/user?page=1&limit=10
Authorization: Bearer <token>
```

#### Get All Orders (Admin Only)
```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <admin-token>
```

#### Get Order by ID
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

#### Update Order Status (Admin Only)
```http
PATCH /api/orders/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "shipped"
}
```

#### Cancel Order
```http
PATCH /api/orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

## 🗂️ Project Structure

```
ecommerce-api/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── productController.js # Product management
│   │   ├── cartController.js    # Cart operations
│   │   └── orderController.js   # Order processing
│   ├── middlewares/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── errorHandler.js     # Global error handling
│   ├── models/
│   │   ├── User.js             # User schema
│   │   ├── Product.js          # Product schema
│   │   ├── Cart.js             # Cart schema
│   │   └── Order.js            # Order schema
│   └── routes/
│       ├── authRoutes.js       # Auth endpoints
│       ├── productRoutes.js    # Product endpoints
│       ├── cartRoutes.js       # Cart endpoints
│       └── orderRoutes.js      # Order endpoints
├── .env                        # Environment variables
├── index.js                    # Application entry point
├── package.json               # Dependencies and scripts
└── README.md                  # Documentation
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **User**: Can manage their own profile, cart, and orders
- **Admin**: Has all user permissions plus product management and order administration

## 📝 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "type": "ErrorType"
  },
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

## 🛡️ Security Features

- Password hashing using bcrypt
- JWT token authentication
- Role-based authorization
- Input validation and sanitization
- MongoDB injection protection
- Error message sanitization

## 🚦 Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## 🧪 Testing

You can test the API using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

## 📦 Dependencies

### Production Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT implementation
- `dotenv` - Environment variables

### Development Dependencies
- `nodemon` - Auto-restart during development

## 🚀 Deployment

1. Set up a MongoDB database (MongoDB Atlas recommended)
2. Update environment variables for production
3. Deploy to your preferred platform (Heroku, AWS, DigitalOcean, etc.)
4. Ensure all environment variables are properly configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support or questions, please contact the development team or create an issue in the repository.

---

**Note**: This is a backend-only API. You'll need to create a frontend application to interact with these endpoints.
