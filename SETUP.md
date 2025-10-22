# To-Do App - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory with the following content:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/todoapp
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRE=7d
```

**Important**: Change the `JWT_SECRET` to a secure random string in production!

### 3. Database Setup

Make sure MongoDB is running on your system:
- **Local MongoDB**: Start MongoDB service
- **MongoDB Atlas**: Use your connection string in `MONGODB_URI`

### 4. Run the Application

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them separately:
# Backend (Terminal 1)
npm run server

# Frontend (Terminal 2)
npm run client
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📁 Project Structure

```
todo-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema
│   │   └── Task.js          # Task schema
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── tasks.js         # Task CRUD routes
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── server.js            # Express server setup
│   └── config.example       # Environment configuration example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── Login.js
│   │   │   │   └── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── TaskCard.js
│   │   │   └── ProtectedRoute.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   └── TaskContext.js
│   │   ├── App.js
│   │   └── index.js
│   └── public/
│       └── index.html
├── package.json
└── README.md
```

## 🔧 Features Implemented

### ✅ Core Features (MVP)
- **User Authentication**: Register, Login, Logout with JWT
- **Task Management**: Full CRUD operations
- **3-Day View**: Today, Tomorrow, Day After Tomorrow cards
- **Auto Rollover**: Automatic date handling with day.js
- **Responsive Design**: Material UI with mobile support
- **Real-time Updates**: Context API for state management

### 🎨 UI/UX Features
- **Material UI Components**: Modern, clean interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Task Status**: Visual indicators for completed/pending tasks
- **Floating Action Button**: Quick task creation
- **Date Picker**: Easy date selection
- **Form Validation**: Client and server-side validation

### 🔒 Security Features
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Protected Routes**: Authentication required for dashboard
- **Input Validation**: Server-side validation for all inputs

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Tasks
- `GET /api/tasks` - Get tasks for 3-day window
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## 🗄️ Database Schema

### User Collection
```javascript
{
  name: String (required),
  email: String (required, unique),
  passwordHash: String (required),
  createdAt: Date
}
```

### Task Collection
```javascript
{
  userId: ObjectId (required, ref: User),
  title: String (required),
  description: String,
  date: String (required, YYYY-MM-DD format),
  status: String (enum: ['Pending', 'Completed']),
  createdAt: Date
}
```

## 🚀 Deployment Notes

### Production Checklist
1. Change `JWT_SECRET` to a secure random string
2. Use environment variables for all sensitive data
3. Set up MongoDB Atlas or production MongoDB instance
4. Configure CORS for your domain
5. Use HTTPS in production
6. Set up proper error logging

### Environment Variables
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRE`: Token expiration time

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection Error**: Ensure MongoDB is running
2. **Port Already in Use**: Change PORT in .env file
3. **CORS Issues**: Check backend CORS configuration
4. **Authentication Errors**: Verify JWT_SECRET is set

### Development Tips
- Use MongoDB Compass for database visualization
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Use Postman for API testing

## 📝 Next Steps (Future Versions)

- **Version 2**: Categories, priorities, due times
- **Version 3**: Team collaboration, sharing
- **Version 4**: Mobile app, notifications
- **Version 5**: Advanced analytics, reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and development!
