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
- Persistent leave requests with employee self-service and HR/Admin approval tools.
- Monthly attendance registers with employee check-in/out and a personal attendance calendar.
- HR salary breakdown previews with editable Basic, HRA, DA, PF and Tax components.

### Admin dashboard

- Workforce overview with headcount, department mix, current monthly payroll cost and recent joiners.
- Company-wide leave requests with Approve/Reject actions.
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
- Leave application by type and date range, with a personal request history and status.
- Downloadable annual payroll/tax summary based on recorded payroll.
- Attendance check-in/out and monthly attendance calendar.
- Team directory, announcements, notifications and helpdesk tickets.
- Personal onboarding, shift and training records.
- Access to company-wide documents and documents assigned to the employee's signed-in email.

The annual payroll/tax summary is informational. It is **not** a statutory Form 16; official tax certificates must be issued and verified through the employer's compliant payroll process.

## Enterprise API workflows

Protected endpoints require `Authorization: Bearer <token>`.

- **Leave:** `POST /api/leaves` accepts `{ "type": "annual", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "reason": "..." }`; `GET /api/leaves` returns the signed-in employee's own requests or all requests for HR/Admin; HR/Admin review with `PUT /api/leaves/:id/approve` or `PUT /api/leaves/:id/reject`.
- **Attendance:** Employees use `POST /api/attendance/checkin` and `POST /api/attendance/checkout`. `GET /api/attendance?month=YYYY-MM` returns the monthly register to HR/Admin and only the signed-in employee's records to an employee account. Omitting `month` returns today's records.
- **Payslips:** `GET /api/payroll/:employeeId/payslip?month=YYYY-MM` returns a PDF for an existing payroll record. Employees can download only their own; HR/Admin can download employee payslips.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Preact (React-compatible), TypeScript, Vite, Axios |
| Backend | Node.js and Express |
| Database | MongoDB (including MongoDB Atlas) with Mongoose |
| Authentication | JWT (HS256), bcrypt password hashing and role-based authorization |

The client uses Preact rather than React; it is React-compatible and runs with Vite.

Additional project tooling and capabilities:

- **Email:** Nodemailer with Gmail app-password authentication for account-registration and password-reset OTP delivery, plus employee welcome messages.
- **Documents and exports:** Protected PDF download endpoints, server-generated PDFKit payslips, jsPDF reports and CSV exports that open in spreadsheet tools.
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

## Account setup

The application does not include demo accounts or seed data. Visitors can register Admin, HR, or Employee accounts from `/signup` after verifying a six-digit email OTP. Registration stores a hashed password and a role-based Unique ID in MongoDB.

## Installation and setup

### Prerequisites

- Node.js 20 or later and npm.
- A MongoDB instance (local or hosted).
- A Gmail account and app password for registration OTPs, password-reset OTPs, and employee welcome messages.

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

Set `MONGO_URI` and `JWT_SECRET` in `server/.env`. Use a newly generated JWT signing secret with at least 32 characters and a restricted MongoDB user. Configure `EMAIL_USER` and `EMAIL_PASS` with a Gmail account and app password in `server/.env` for registration OTP, password-reset OTP, and employee welcome email delivery. Never commit this file.

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

### Account signup

Open `/signup` to register with a full name, unique email and contact number, date of birth, role, and password of at least eight characters. A six-digit OTP is sent to the email address before the account is created. The resulting Unique ID uses the role prefix (`AD`, `HR`, or `EM`), the first and last initials, and the date of birth in `DDMMYYYY` format. Sign in at `/login` using either the email address or Unique ID, password, and matching account role. Use **Forgot password?** to verify the Unique ID/email pair, receive an OTP, and set a new password.

## Environment variables

Names only; values belong in ignored local files or a managed secret store.

### Server

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
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
