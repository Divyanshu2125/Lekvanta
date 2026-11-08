# Lekvanta — Smart Business Management Software

**Simplify Your Business.**

Lekvanta is an all-in-one billing, GST accounting, inventory, and business management platform designed for small and medium-sized shopkeepers in India.

---

## 📁 Repository Structure

```
Lekvanta/
├── frontend/                  # React + Vite + TypeScript + Tailwind CSS UI
│   ├── src/                   # React components, pages, stores, and API client
│   │   ├── components/        # Layout (Sidebar, TopBar) and Dashboard widgets
│   │   ├── pages/             # Route pages (Dashboard, Sales, Purchases, etc.)
│   │   ├── store/             # Zustand stores (auth, UI)
│   │   ├── lib/               # API client, formatting utils, sample data
│   │   └── App.tsx            # Main router
│   ├── public/                # Static assets & icons
│   ├── index.html             # Vite entry HTML
│   ├── vite.config.ts         # Vite config with API proxy to port 4000
│   ├── tailwind.config.js     # Tailwind CSS theme configuration
│   ├── tsconfig.json          # TypeScript frontend config
│   └── package.json           # Frontend dependencies & scripts
│
├── backend/                   # Node.js + Express + TypeScript + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma      # 20 SQLite relational business models
│   │   ├── seed.ts            # Realistic demo database seed
│   │   └── lekvanta.db        # SQLite database file
│   ├── src/
│   │   ├── config/            # Validated environment configuration
│   │   ├── controllers/       # Business logic controllers
│   │   ├── middleware/        # JWT auth, Zod validation, error handler
│   │   ├── routes/            # REST API route modules
│   │   ├── schemas/           # Zod validation schemas
│   │   ├── services/          # Prisma client and audit logging
│   │   └── index.ts           # Express server entry point
│   ├── .env                   # Backend environment variables
│   ├── tsconfig.json          # Backend TypeScript configuration
│   └── package.json           # Backend dependencies & scripts
│
├── package.json               # Root monorepo workspace runner
└── README.md
```

---

## 🚀 Running the Application

### 1. Run Both Frontend & Backend Concurrently
From the root directory:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

### 2. Run Independently
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

### 3. Database Tools (Prisma + SQLite)
```bash
# View and edit database in Prisma Studio GUI
npm run db:studio

# Re-seed the database with realistic business data
npm run db:seed

# Push schema changes to SQLite
npm run db:push
```

---

## 🔑 Demo Login Credentials
- **Admin Email**: `rajesh@sharmaelec.com`
- **Password**: `Password@123`
- **Business**: `Sharma Electronics Pvt. Ltd.` (GSTIN: `27AABCU9603R1ZM`)
