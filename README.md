# Smart HR & Payroll Management System

**A responsive, role-based people operations workspace for managing employee records, attendance, leave, performance and payroll.**

![MERN](https://img.shields.io/badge/stack-MERN-3c873a)
![JWT](https://img.shields.io/badge/auth-JWT-blue)
![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248)

## Overview

Smart HR & Payroll is a web application for small and mid-sized organizations. It gives administrators, HR teams and employees separate workspaces for day-to-day workforce management and self-service. The application has a Preact/TypeScript client, an Express API and MongoDB persistence.

## Role dashboards

### Admin

- Review workforce and payroll summaries.
- Manage employee records, attendance, leave, offer letters and performance reviews.
- Review payroll reports and salary distribution.
- Track talent candidates through recruiting stages and oversee onboarding tasks.
- Publish organization announcements.
- Review an administrative audit trail and support queue.

### HR

- Manage employee records, attendance, leave, offers and payroll operations.
- Import employees from validated CSV files.
- Track a candidate pipeline and assign employee onboarding checklists.
- Create and review quarterly performance records.
- Triage employee support requests and view company announcements.

### Employee

- View personal profile and saved payslips.
- Review attendance and submit leave requests.
- Browse the team directory and company announcements.
- Raise and follow up on HR/helpdesk support requests.
- Review notifications, assigned onboarding, shift and training records.

## Key features

- Role-aware dashboards and server-enforced API authorization.
- Employee directory, search, CSV export and bulk import.
- Attendance check-in/out and calendar views.
- Leave request and review workflow.
- Monthly payroll snapshots and employee payslip downloads.
- Quarterly performance reviews.
- Hiring pipeline and onboarding task tracking.
- Admin audit events, announcements and employee support tickets.
- Employee notifications inbox and annual payroll tax summaries based on recorded pay data.
- Responsive layouts, loading/empty/error states and a consistent dark theme.

Annual payroll tax summaries are informational exports of saved payroll records, not
statutory Form 16 certificates.

## Technology

- **Frontend:** Preact, TypeScript, Vite, Axios and CSS.
- **Backend:** Node.js and Express.
- **Database:** MongoDB with Mongoose.
- **Authentication:** JSON Web Tokens and bcrypt password hashing.
- **Email:** Nodemailer with configurable SMTP for verification and password reset.
- **Deployment:** Configure the client and API for your hosting provider; production deployment and monitoring are not included in this repository.

## Screenshots and demo

Add screenshots or hosted image links here. Do not include real employee or payroll data.

| View | Screenshot |
| --- | --- |
| Login | `screenshots/login.png` |
| Signup | `screenshots/signup.png` |
| Admin dashboard | `screenshots/admin-dashboard.png` |
| HR dashboard | `screenshots/hr-dashboard.png` |
| Employee dashboard | `screenshots/employee-dashboard.png` |

**Demo video:** [Add a demo video link](https://example.com/)

## Installation and setup

### Prerequisites

- Node.js 20 or later and npm.
- MongoDB, local or hosted.
- SMTP credentials for account verification and password reset (optional for local development).

### 1. Configure the server

```bash
cd server
npm install
cp .env.example .env
```

Set the required values in `server/.env`; use your own local database and newly generated development credentials.

### 2. Configure the client

```bash
cd ../client
npm install
cp .env.example .env
```

The development client proxies `/api` to `http://localhost:5000`. Set `VITE_API_URL` only when the API is hosted at a different base URL.

### 3. Start the application

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

The Vite terminal prints the local client URL. Public registration creates employee accounts only; administrator and HR roles must be provisioned through a trusted server-side process.

### Development demo accounts

Demo accounts are disabled by default. To provision them for local development, set
`ENABLE_DEMO_SEED=true` in `server/.env` while `NODE_ENV=development`, then
restart the server. Do not enable this for shared or production databases.

| Role | Login ID | Password |
| --- | --- | --- |
| Admin | `ADSA01011980` | `admin123` |
| HR | `HRHM02021985` | `hr123` |
| Employee | `EMEU03031990` | `emp123` |

These public demo credentials are for local development and must never be used in production.

## Environment variables

Variable names only; configure values locally and never commit them.

### Server

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_ORIGINS`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `EMAIL_SECURE`

### Client

- `VITE_API_URL`

## Security notes

- `.env`, `.env.local`, dependency folders and generated build output are ignored by Git.
- `.env.example` files contain placeholders only. Replace placeholders locally.
- Never commit MongoDB credentials, SMTP/app passwords, JWT signing keys, OTP material or production data.
- Rotate credentials immediately if they have ever been committed. Removing a file from the latest revision does not remove it from earlier Git history; clean history and coordinate any remote history rewrite before pushing.
- Keep this repository private if it contains internal code. Do not expose production user or payroll data in screenshots or demo environments.

## Payroll limitations

Payroll figures are simplified application estimates and are not a jurisdiction-specific statutory payroll or tax calculation. Validate all deductions, tax documents and payslips with qualified payroll professionals before using them operationally.

## Roadmap

- Recruitment pipeline and candidate tracking.
- Onboarding checklists, shift/rota planning and training records.
- A controlled production workflow for provisioning administrator and HR accounts.
- Department management and historical headcount/attrition analytics.
- Jurisdiction-specific payroll, tax documents and secure document storage.
- XLSX/PDF reporting, configurable approval workflows and centralized rate limiting.
- Production deployment automation, backups, monitoring and accessibility review.
