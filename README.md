# Smart HR & Payroll Management System

**A role-based people operations platform for workforce administration, payroll, attendance and employee self-service.**

![MERN-compatible architecture](https://img.shields.io/badge/architecture-MERN--compatible-3c873a)
![JWT authentication](https://img.shields.io/badge/auth-JWT-blue)
![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248)

> The client uses Preact with a React-compatible component model, not React itself. The backend uses Express and MongoDB.

## About

Smart HR & Payroll is a responsive web application for organizations that need a shared workspace for administrators, HR teams and employees. Admin and HR users manage workforce and people operations; employees use role-restricted self-service tools for payroll documents, attendance, time off, team information and support.

The project includes a TypeScript/Preact single-page client, a Node.js/Express JSON API and MongoDB persistence through Mongoose. Authentication uses signed JWTs and bcrypt password hashing. API access is checked on the server for every protected role.

## Key features

- Role-based Admin, HR and Employee workspaces, with role-specific routes at `/admin`, `/hr` and `/employee`.
- Tab-scoped authentication that survives refreshes and is cleared on sign-out or when the browser tab closes.
- Employee payslip PDF downloads and payroll reports.
- Leave management with employee requests, an Admin approval-table preview and HR review tools.
- HR salary breakdown previews with editable Basic, HRA, DA, PF and Tax components.

### Admin dashboard

- Workforce overview with headcount, department mix, current monthly payroll cost and recent joiners.
- Leave approval table with mock employee requests and interactive Approve/Reject statuses.
- Workforce analytics with department headcount/payroll and a 12-month trend of audited employee-record removals.
- Department creation and deletion, with deletion blocked while employees remain assigned.
- Employee directory and role-protected employee administration.
- Payroll generation, payment status, payslip PDFs, payroll PDF reports and Excel-compatible CSV exports.
- Administrative audit trail, announcements and support queue.
- Secure PDF document library for company-wide or employee-assigned files.
- Performance reviews, candidate pipeline and onboarding operations.

The exit trend is based on employee records removed from the directory. It is not a verified or statutory attrition rate.

### HR dashboard

- Employee directory, attendance and leave administration.
- Editable salary breakdown previews for Basic, HRA (40%), DA (10%), PF (12%) and Tax (5%). Preview edits do not update employee records or payroll.
- Bulk employee import from validated CSV files (up to 200 rows per request).
- Candidate pipeline with hiring stages.
- Onboarding checklists, shift scheduling and training records.
- Performance reviews, payroll operations and downloadable offer letters.
- Announcements, support queue, notifications and secure PDF document management.

### Employee dashboard

- Personal profile, payslip history and PDF payslip downloads.
- A quick leave-request form with date range and reason, plus submission feedback.
- Downloadable annual payroll/tax summary based on recorded payroll.
- Attendance check-in/out and monthly attendance calendar.
- Team directory, announcements, notifications and helpdesk tickets.
- Personal onboarding, shift and training records.
- Access to company-wide documents and documents assigned to the employee's signed-in email.

The annual payroll/tax summary is informational. It is **not** a statutory Form 16; official tax certificates must be issued and verified through the employer's compliant payroll process.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Preact (React-compatible), TypeScript, Vite, Axios |
| Backend | Node.js and Express |
| Database | MongoDB (including MongoDB Atlas) with Mongoose |
| Authentication | JWT (HS256), bcrypt password hashing and role-based authorization |

The client uses Preact rather than React; it is React-compatible and runs with Vite.

Additional project tooling and capabilities:

- **Email:** Nodemailer with environment-configured SMTP for email verification and password-reset OTP delivery.
- **Documents and exports:** Protected PDF download endpoints, jsPDF reports/payslips and CSV exports that open in spreadsheet tools.
- **Deployment:** No production hosting configuration is included. Configure HTTPS, environment secrets, MongoDB access controls, backups, monitoring and an approved deployment platform before launch.

## Screenshots

Replace these placeholders with sanitized screenshots. Never use real employee, candidate, customer or payroll data.

| Screen | Image |
| --- | --- |
| Login | `screenshots/login.png` |
| Signup | `screenshots/signup.png` |
| Admin dashboard | `screenshots/admin-dashboard.png` |
| HR dashboard | `screenshots/hr-dashboard.png` |
| Employee dashboard | `screenshots/employee-dashboard.png` |

## Demo accounts

These are example email addresses, not pre-seeded credentials. Provision matching users in your own database before signing in; the project does not ship with shared demo passwords.

| Role | Example email | Provisioning |
| --- | --- | --- |
| Admin | `admin@example.com` | Create the first administrator with the provisioning script below. |
| HR | `hr@example.com` | Create an HR account from the Admin workspace. |
| Employee | `employee@example.com` | Register an Employee account or create one from the Admin workspace. |

## Installation and setup

### Prerequisites

- Node.js 20 or later and npm.
- A MongoDB instance (local or hosted).
- SMTP credentials if email verification or password-reset email delivery is required.

### 1. Clone the repository

```bash
git clone <repository-url>
cd enterprise-hr-payroll-system
```

### 2. Configure and run the server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Set `MONGO_URI` and `JWT_SECRET` in `server/.env`. Use a newly generated JWT signing secret with at least 32 characters and a restricted MongoDB user. Configure SMTP variables in `server/.env` if email verification or password-reset delivery is needed. Never commit this file.

### 3. Configure and run the client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Run the client and server in separate terminals. For local development, leave `VITE_API_URL` empty in `client/.env` so the Vite development proxy forwards `/api` to the local API. The checked-in client example contains a Render URL placeholder for deployment; replace it with your deployed backend URL in Vercel project settings.

The development client URL is printed by Vite. From the repository root, build the client and run backend tests with:

```bash
npm run build
npm test
```

## Deploy to Vercel and Render

1. Create a Render Web Service from the repository with the root directory set to `server`, build command `npm install`, and start command `npm start`. Configure `MONGO_URI`, a strong `JWT_SECRET` (at least 32 characters), and `CLIENT_URL` with the deployed Vercel origin (for example, `https://your-app.vercel.app`). Render supplies `PORT`.
2. Create a Vercel project from the same repository with the root directory set to `client`, build command `npm run build`, and output directory `dist`.
3. In Vercel project settings, add `VITE_API_URL` with the Render API URL ending in `/api` (for example, `https://your-backend.onrender.com/api`) and redeploy. The client-side Vercel rewrite supports the app's role routes.

The server defaults CORS to `*` when `CLIENT_URL` is unset. Set `CLIENT_URL` to the exact deployed frontend origin in production.

### Provisioning the first Admin

Public registration creates employee accounts only. Provision the first Admin from a trusted terminal after configuring `server/.env` with the target `MONGO_URI`:

```bash
node server/scripts/createAdmin.js
```

The CLI securely prompts for the Admin's name, email address and password (password entry is masked). Use a password of 14–72 characters (at most 72 UTF-8 bytes) with uppercase and lowercase letters, a number and a symbol, and no spaces. The password is hashed with bcrypt before the user is saved. Provisioning is refused if an Admin account already exists. The script uses a MongoDB transaction and a unique provisioning claim to ensure only one first Admin can be created; the target MongoDB deployment must support transactions (MongoDB Atlas or a replica set).

## Environment variables

Names only; values belong in ignored local files or a managed secret store.

### Server

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

### Client

- `VITE_API_URL`

## Security notes

- `.env`, `.env.local`, `.env.*`, `node_modules`, generated builds and `.DS_Store` are excluded by `.gitignore`; placeholder `.env.example` files are retained.
- Never commit MongoDB URIs, SMTP/app passwords, JWT signing keys, OTP material, local data exports or real HR/payroll documents.
- Credentials found in local environment files were removed from this working tree, and earlier commits contain `.env` files. Rotate any MongoDB, SMTP and JWT credentials that were present before using this project again. Do not push existing Git history until those historical files have been purged; deleting current files does not remove historical copies.
- Admin analytics and audit endpoints are role-protected. Document files are limited to PDF uploads, stored in MongoDB, downloadable only through authenticated endpoints, and restricted to the assigned employee when applicable.
- Use TLS, least-privilege database credentials, secure deployment secrets, backups, dependency updates and production monitoring before exposing the application.
- Payroll calculations and annual summaries are simplified application estimates, not jurisdiction-specific tax or legal advice.

## Roadmap

- Statutory payroll and tax-document generation with jurisdiction-specific validation and professional review.
- Historical workforce snapshots and verified attrition reporting.
- Richer analytics filters and scheduled exports.
- External object storage, malware scanning, retention controls and document access expiry.
- Configurable approvals, granular permissions and SSO/MFA.
- Production deployment automation, centralized logging, monitoring and backup/restore exercises.
- Accessibility and cross-browser review.
