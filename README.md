# 🚀 Social Media Automation Platform

A full-stack **MERN application** for connecting social media accounts, creating content, scheduling posts, publishing across multiple social media platforms, and maintaining a history of published and scheduled posts.

The application uses **Zernio API** as the integration layer between the backend and supported social media platforms.

---

## 📌 Overview

Managing multiple social media accounts separately can be time-consuming.

This project provides a centralized dashboard where users can:

- Create an account and securely log in
- Connect social media accounts
- Create social media posts
- Select one or multiple platforms
- Schedule posts for a future date and time
- Publish content through Zernio
- View connected accounts
- Track scheduled and published posts
- Maintain post history
- Upload and manage media
- Use an AI-assisted content composer

---

## ✨ Features

### 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Protected application routes
- Session handling
- Authentication refresh support

### 🔗 Social Media Account Integration

Users can connect supported social media accounts through the application.

The backend communicates with the **Zernio API**, which acts as the integration layer between this application and external social media platforms.

Depending on the connected Zernio account and platform support, integrations can include platforms such as:

- Facebook
- Instagram
- LinkedIn
- TikTok

### 📅 Post Scheduling

Users can:

1. Create a post
2. Add content
3. Attach media
4. Select social media accounts/platforms
5. Choose a publishing date and time
6. Schedule the post

The backend processes the request and communicates with Zernio for social media publishing.

### 📝 Post History

The application stores information about posts in MongoDB so users can view their activity and post history.

Post information can include:

- Content
- Selected platforms/accounts
- Media
- Scheduled time
- Publishing status
- Creation date
- External post information

### 🖼️ Media Management

The backend contains media handling functionality for content that includes images or other supported media.

### 🤖 AI Composer

The frontend includes an AI Composer interface designed to assist users when preparing social media content.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │        User          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │    Vite + TS/TSX     │
                    │      Port 5173       │
                    └──────────┬───────────┘
                               │
                         REST API Requests
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Express / Node.js    │
                    │ TypeScript Backend   │
                    │      Port 5000       │
                    └──────┬────────┬──────┘
                           │        │
                   Database│        │Social API
                           ▼        ▼
                  ┌────────────┐  ┌──────────────┐
                  │  MongoDB   │  │  Zernio API  │
                  │   Atlas    │  └──────┬───────┘
                  └────────────┘         │
                                  ┌──────┼───────┐
                                  │      │       │
                                  ▼      ▼       ▼
                             Instagram Facebook LinkedIn
                                                │
                                                ▼
                                              TikTok
```

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- HTML
- CSS
- REST API communication

## Backend

- Node.js
- Express.js
- TypeScript
- JWT authentication
- REST API architecture

## Database

- MongoDB
- MongoDB Atlas
- Mongoose

## Social Media Integration

- Zernio API

## Development Tools

- Git
- npm
- Nodemon
- tsx
- VS Code

---

# 📂 Project Structure

```text
social-Automation/
│
├── client/
│   ├── scripts/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home/
│   │   │   ├── Layout.tsx
│   │   │   ├── RequireSession.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useSession.ts
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts
│   │   │
│   │   ├── pages/
│   │   │   ├── Accounts.tsx
│   │   │   ├── AIcomposer.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Sheduler.tsx
│   │   │
│   │   └── App.tsx
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── config/
│   │   ├── auth.ts
│   │   └── zernio.ts
│   │
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── mediaController.ts
│   │   ├── postController.ts
│   │   ├── socialAuthController.ts
│   │   └── webhookController.ts
│   │
│   ├── middleware/
│   │   └── requireAuth.ts
│   │
│   ├── models/
│   │   ├── Account.ts
│   │   ├── Media.ts
│   │   ├── Post.ts
│   │   └── User.ts
│   │
│   ├── routes/
│   │   ├── accountRoutes.ts
│   │   └── postRoutes.ts
│   │
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   │
│   ├── app.ts
│   ├── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── README.md
└── .git/
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone <repository-url>
cd social-Automation
```

---

## 2. Install Frontend Dependencies

```bash
cd client
npm install
```

---

## 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

---

# 🔐 Environment Variables

Environment variables containing credentials should **never be committed to Git**.

Use the provided `.env.example` files as references.

Create:

```text
server/.env
```

Configure the required backend environment variables, for example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

ZERNIO_API_KEY=your_zernio_api_key
```

Depending on the final configuration of the project, additional Zernio/authentication variables may be required.

For the frontend, create:

```text
client/.env
```

using:

```text
client/.env.example
```

as the template.

> ⚠️ Never expose the Zernio API key, MongoDB credentials, or JWT secret in frontend code.

Sensitive API calls should be made through the Express backend.

---

# ▶️ Running the Application

The frontend and backend should run simultaneously.

## Terminal 1 — Backend

```bash
cd server
npm run server
```

Expected output:

```text
MongoDB connected
Server is running on port 5000
```

The backend runs at:

```text
http://localhost:5000
```

---

## Terminal 2 — Frontend

```bash
cd client
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Vite proxies `/api` requests from the frontend to the Express backend during development.

---

# 🔄 Application Flow

A typical post scheduling operation follows this flow:

```text
User
  │
  ▼
Create Post
  │
  ▼
Select Social Accounts
  │
  ▼
Choose Date & Time
  │
  ▼
React Frontend
  │
  │ POST /api/...
  ▼
Express Backend
  │
  ├──────────────► MongoDB
  │                Store application data
  │
  ▼
Zernio API
  │
  ▼
Selected Social Platforms
  │
  ├── Facebook
  ├── Instagram
  ├── LinkedIn
  └── TikTok
```

---

# 🗄️ Database Models

The backend currently includes models for:

### User

Stores application user information and authentication-related data.

### Account

Stores information associated with connected social media accounts.

### Post

Stores scheduled/published post information.

### Media

Stores information associated with uploaded media.

A post may conceptually contain information such as:

```json
{
  "content": "New post from Social Media Automation!",
  "platforms": [
    "facebook",
    "instagram",
    "linkedin"
  ],
  "scheduledAt": "2026-10-05T10:00:00Z",
  "status": "scheduled"
}
```

---

# 🔌 Zernio Integration

Zernio acts as the unified social media integration layer.

Instead of implementing and maintaining separate APIs for every platform:

```text
Backend ──► Facebook API
Backend ──► Instagram API
Backend ──► LinkedIn API
Backend ──► TikTok API
```

the application can use:

```text
Backend
   │
   ▼
Zernio API
   │
   ├──► Facebook
   ├──► Instagram
   ├──► LinkedIn
   └──► TikTok
```

This reduces the amount of platform-specific integration code required by the application.

---

# 🔒 Security

The project follows several important security practices:

- API keys are stored in environment variables.
- `.env` files should not be committed.
- Passwords should be securely hashed.
- JWTs are used for authentication.
- Protected routes require authentication.
- Zernio credentials remain on the backend.
- MongoDB credentials remain on the backend.
- Frontend requests communicate with the application's own API rather than exposing secret third-party credentials.

Recommended `.gitignore` entries include:

```gitignore
node_modules/
.env
dist/
```

---

# 📡 Example API Architecture

```text
/api/auth
    ├── register
    ├── login
    └── refresh

/api/accounts
    └── Social account operations

/api/posts
    └── Post creation/scheduling operations
```

Additional endpoints may be available depending on the current implementation.

---

# 🚧 Future Improvements

Possible future improvements include:

- Advanced scheduling
- Recurring posts
- Calendar-based post management
- Drag-and-drop scheduling
- Post editing
- Post cancellation
- Multiple media attachments
- Improved AI-generated captions
- Hashtag recommendations
- Social media analytics
- Engagement statistics
- Notifications
- Failed-post retry mechanisms
- Team/workspace support
- Role-based access control
- Improved webhook processing

---

# 🎯 Project Goal

The main goal of **Social Media Automation** is to provide a centralized system where users can manage content across multiple social media platforms without manually publishing the same content on each platform.

The project demonstrates practical implementation of:

- Full-stack MERN development
- REST API development
- Third-party API integration
- Authentication and authorization
- MongoDB database design
- Social media automation
- Post scheduling
- Webhooks
- Secure environment configuration

---

# 👨‍💻 Development

During local development, three terminals can be useful:

```text
Terminal 1
client/
npm run dev

Terminal 2
server/
npm run server

Terminal 3
social-Automation/
git status
git add .
git commit
git push
```

---

## 📄 License

This project is currently intended for educational and development purposes.

---

## ⭐ Social Media Automation

**Create once. Schedule once. Publish everywhere.**
