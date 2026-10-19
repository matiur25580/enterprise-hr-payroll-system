<<<<<<< HEAD
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

### Admin dashboard

- Workforce overview with headcount, department mix, current monthly payroll cost and recent joiners.
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
- Bulk employee import from validated CSV files (up to 200 rows per request).
- Candidate pipeline with hiring stages.
- Onboarding checklists, shift scheduling and training records.
- Performance reviews, payroll operations and downloadable offer letters.
- Announcements, support queue, notifications and secure PDF document management.

### Employee dashboard

- Personal profile, payslip history and PDF payslip downloads.
- Downloadable annual payroll/tax summary based on recorded payroll.
- Attendance check-in/out and monthly attendance calendar.
- Team directory, announcements, notifications and helpdesk tickets.
- Personal onboarding, shift and training records.
- Access to company-wide documents and documents assigned to the employee's signed-in email.

The annual payroll/tax summary is informational. It is **not** a statutory Form 16; official tax certificates must be issued and verified through the employer's compliant payroll process.

## Technology stack

- **Frontend:** Preact, TypeScript, Vite, Axios and responsive CSS.
- **Backend:** Node.js and Express.
- **Database:** MongoDB with Mongoose schemas and indexes.
- **Authentication and authorization:** JWT (HS256), bcrypt password hashing, server-side session/version checks and role-based route middleware.
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

## Installation and setup

### Prerequisites

- Node.js 20 or later and npm.
- A MongoDB instance (local or hosted).
- SMTP credentials if email verification or password-reset email delivery is required.

### 1. Install dependencies

From the repository root:

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Set the local values in `server/.env`. Use a newly generated JWT signing secret with at least 32 characters, a restricted MongoDB user, and SMTP credentials from a dedicated account. Never commit this file.

### 3. Configure the client

```bash
cd ../client
cp .env.example .env.local
```

The Vite development proxy forwards `/api` to the local API by default. Set `VITE_API_URL` only when the API uses a different base URL.

### 4. Run the application

Run the API and client in separate terminals from the repository root:

```bash
npm run dev:server
npm run dev:client
```

The development client URL is printed by Vite. To build the client and run backend tests:

```bash
npm run build
npm test
```

Public registration creates employee accounts only. Admin and HR accounts must be provisioned through a trusted process.

### Optional local demo seed

Demo seeding is disabled by default and only runs in `NODE_ENV=development`. To enable it locally, set `ENABLE_DEMO_SEED=true` and provide the three demo email/password pairs listed in the environment-variable section. Each demo password must be unique and at least 16 characters. Do not enable demo seeding against shared or production databases.

## Environment variables

Names only; values belong in ignored local files or a managed secret store.

### Server

- `PORT`
- `NODE_ENV`
- `ENABLE_DEMO_SEED`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_ORIGINS`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_HR_EMAIL`
- `DEMO_HR_PASSWORD`
- `DEMO_EMPLOYEE_EMAIL`
- `DEMO_EMPLOYEE_PASSWORD`

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
=======
# enterprise-hr-payroll-system

## Run locally

Start the API from `server/` with `npm run dev`, then start the client from
`client/` with `npm run dev`. The Vite development server forwards `/api`
requests to `http://localhost:5000`. For a separately hosted API, set
`VITE_API_URL` in the client environment to its base URL.

## Role dashboards

Sign in with an account created through the API. The account's server-assigned
role opens a dedicated workspace:

- **Admin** — organization overview, workforce administration, payroll,
  attendance, leave, performance, offer letters, and the audit trail.
- **HR** — people operations, employee records, attendance, leave, performance,
  offer letters, and payroll tools.
- **Employee** — personal profile, payslips, attendance, and leave self-service.

Employee accounts can only retrieve their own employee record. If an existing
session was created before role-based account details were enabled, sign in
again to refresh it.

In development (`NODE_ENV` is not `production`), the server provisions these
demo accounts at startup. Sign in with the listed ID and password:

| Role | Login ID | Password |
| --- | --- | --- |
| Admin | `ADSA01011980` | `admin123` |
| HR | `HRHM02021985` | `hr123` |
| Employee | `EMEU03031990` | `emp123` |

Choose the matching role on the login form. The server verifies the account
role before signing in and opens that role's workspace. New users can register
with a verified email address; their uneditable login ID is generated as the
role prefix (`AD`, `HR`, or `EM`), first/last name initials and birth date
(`DDMMYYYY`), for example `ADRA29081998`. Employees added by HR/Admin receive
a separate unique `EMP-...` employee ID, and an employee account is linked to
its profile using the work email address. These demo credentials are for local
development only; do not use them in production. If a production-like demo deployment
explicitly needs these accounts, set `ENABLE_DEMO_USERS=true` for the server
or run `npm run seed:demo` from `server/` once after configuring its database
connection. Provisioning these accounts resets their passwords to the demo
values above.

Email verification and password reset require SMTP settings in the server
environment: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS`.
Optionally set `EMAIL_FROM` and set `EMAIL_SECURE=true` when your SMTP server
requires TLS on a port other than 465. Four-digit verification codes expire
after 60 seconds. Do not commit SMTP credentials.

Each role dashboard has a role-specific portal heading and a light/dark mode
toggle; the selected theme is remembered separately for each role. Login,
employee, attendance, leave, payroll, performance, document, and export actions
show success feedback when completed.

Employee directory changes and leave requests/reviews are also recorded as
workplace updates. Admin and HR users can see organization-wide updates, while
employee accounts only see updates related to their own employee record. Open
dashboards refresh updates automatically, and compensation changes are
described without exposing salary amounts in the activity feed. Leave requests
are stored in the database, submitted by the signed-in employee, and reviewable
by HR or Admin. Attendance check-in/out and HR/Admin attendance corrections are
stored per employee and date. HR/Admin can generate monthly payroll snapshots
and mark them paid; employees can only view and download their own saved
payslips. The feed records a payment-status update without exposing salary
amounts.
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
