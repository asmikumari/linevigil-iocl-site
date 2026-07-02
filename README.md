# LineVigil - Pipeline ROW Protection System

LineVigil is a GIS-based workflow coordination platform designed to monitor excavation activities near pipeline Right-of-Way (ROW) areas.

## Core Features
- **Role-Based Access**: Admin, Patrol, and Contractor portals.
- **GIS Map**: Interactive mapping with PostGIS risk detection.
- **Risk Analysis**: High (<500m), Medium (500m-1000m), and Low (>1000m) risk classification.
- **Workflow**: Request submission -> Admin assignment -> Patrol verification.

## Setup Instructions

### 1. Database
- Create a PostgreSQL database named `linevigil`.
- Enable PostGIS: `CREATE EXTENSION postgis;`

### 2. Backend
```bash
cd backend
npm install
# Update .env with your DATABASE_URL
npm run init-db # Seed initial data and sample users
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Sample Credentials
- **Admin**: `admin@linevigil.com` / `password123`
- **Patrol**: `patrol@linevigil.com` / `password123`
- **Contractor**: `contractor@linevigil.com` / `password123`
