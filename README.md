# MR Restaurant - Food Ordering System

A full-stack restaurant ordering application with admin panel, payment integration, and order tracking.

## Features

- 🍔 Dynamic menu with category filtering
- 🛒 Shopping cart with quantity management
- 💳 Multiple payment options (COD & Online via Razorpay)
- 📦 Real-time order tracking
- 👨‍💼 Admin panel for menu & order management
- 📱 Responsive design for all devices
- 🔔 WhatsApp integration for customer support

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Atlas)
- **Payment**: Razorpay
- **File Upload**: Multer

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   MONGO_URI=your_mongodb_connection_string
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   PORT=5000
   ```

4. Start the server:
   ```bash
   npm start
   ```
   Or for development:
   ```bash
   npm run dev
   ```

## Admin Access

- URL: `/admin-login.html`
- Default credentials are set in `server/server.js`

## Project Structure

```
├── client/
│   ├── css/           # Stylesheets
│   ├── js/            # Client-side JavaScript
│   ├── images/        # Static images
│   ├── uploads/       # User uploaded files
│   ├── index.html     # Main page
│   ├── admin.html     # Admin dashboard
│   └── admin-login.html
├── server/
│   ├── models/        # MongoDB models
│   └── server.js      # Express server
└── package.json
```

## API Endpoints

### Public
- `GET /items` - Get all menu items
- `POST /order` - Place new order
- `POST /track-order` - Track order status
- `POST /create-razorpay-order` - Create payment order

### Admin
- `POST /admin/login` - Admin authentication
- `POST /add-item` - Add menu item
- `PUT /update-item/:id` - Update menu item
- `DELETE /delete-item/:id` - Delete menu item
- `GET /orders` - Get all orders
- `PUT /order-status/:id` - Update order status
- `GET /admin/stats` - Get dashboard statistics

## License

ISC
