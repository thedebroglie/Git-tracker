# 🚀 GitTracker: MITS Student contribution Leaderboard

GitTracker is a high-fidelity platform designed to track, rank, and visualize GitHub contributions for MITS students. Built with a stunning **Liquid Glass** aesthetic, it provides real-time data synchronization and deep analytics into student coding activity.

![GitTracker Banner](https://img.shields.io/badge/Design-Liquid_Glass-blue?style=for-the-badge&logo=glass)
![Tech Stack](https://img.shields.io/badge/Stack-MERN-green?style=for-the-badge)

## ✨ Key Features

- **🏆 Real-time Leaderboard**: Dynamic ranking of students based on commits, PRs, and repository activity.
- **🔐 Dual OAuth Integration**: Secure sign-in via Google and student ownership verification via GitHub.
- **🔄 Scalable Sync Pipeline**: Background synchronization using BullMQ and Redis to handle thousands of events without blocking the UI.
- **💎 Premium UI**: A state-of-the-art "Liquid Glass" design system (Aether Glass) for a premium user experience.
- **📊 Activity Analytics**: Deep dive into individual student contributions with explainability metrics.

## 🛠️ Technology Stack

### Frontend
- **React 19 + Vite**: Modern, high-performance UI framework.
- **Aether Glass**: Custom "Liquid Glass" design system.
- **Tailwind CSS**: Utility-first styling for layout precision.

### Backend
- **Node.js + Express**: Robust and scalable API layer.
- **MongoDB**: NoSQL database for flexible student and event storage.
- **Redis + BullMQ**: Distributed task queue for reliable background data ingestion.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)
- Redis instance (optional for local dev, uses in-memory fallback)

### 2. Environment Setup
Create a `.env` file in the `backend/` directory based on the `.env.example` provided:

```env
PORT=5001
MONGO_URI=your_mongodb_uri
REDIS_URL=redis://your_redis_host:port
GOOGLE_CLIENT_ID=...
GITHUB_APP_ID=...
```

### 3. Installation
```bash
# Clone the repository
git clone https://github.com/thedebroglie/Git-tracker.git

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 4. Running the Project
```bash
# Start Backend (from /backend)
npm run dev

# Start Frontend (from /frontend)
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🎨 Design System: Liquid Glass
The UI follows the **Liquid Glass** philosophy:
- **Translucency**: Glassmorphism effects with backdrop blurs.
- **Fluidity**: Smooth micro-animations and HSL-tailored color palettes.
- **Depth**: Layered shadows and vibrant gradients.

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

Developed with ❤️ by the **GitTracker Team**.
