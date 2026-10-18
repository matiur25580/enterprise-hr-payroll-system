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