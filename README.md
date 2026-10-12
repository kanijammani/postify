# Instagram Clone

A production-ready full-stack Instagram clone built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- **User Authentication**: JWT-based login, register, and protected routes.
- **Feed**: View posts from users you follow.
- **Explore**: Discover new posts in a masonry grid.
- **Create Post**: Upload images/videos with captions.
- **Profile**: View user profiles, follow/unfollow users, see their posts.
- **Likes & Comments**: Interact with posts.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Axios, React Router, React Icons.
- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT, Multer, Cloudinary.

## Prerequisites

- Node.js installed
- MongoDB installed and running locally (or a MongoDB Atlas URI)
- Cloudinary Account (for image uploads)

## Setup & Installation

### 1. Clone the repository

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/instagram_clone
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run the backend:
```bash
npm start
```

### 3. Frontend Setup

Create a `.env` file in the `frontend` directory:

```env
VITE_BACKEND_URL=http://localhost:5001/api
```

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

## Architecture

- `backend/models`: Mongoose schemas (User, Post).
- `backend/controllers`: Request logic (Auth, User, Post).
- `backend/routes`: API endpoints.
- `backend/middleware`: Auth protection and file upload.
- `frontend/src/pages`: Main application screens.
- `frontend/src/components`: Reusable UI components.
- `frontend/src/context`: Global state (Auth).

## License

MIT
