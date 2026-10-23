# Multi-Doctor Appointment Conflict Scheduler (Phase 2)

A full-stack healthcare appointment scheduling platform engineered to eliminate double-booking conflicts across medical specialists and consultation rooms. Upgraded to Phase 2 with a Node.js/Express REST API backend and MongoDB (Mongoose) persistence, while preserving an accessible, lightweight vanilla HTML5/CSS3/JavaScript frontend.

---

## 🌟 Key Features

- **Dual-Resource Conflict Prevention Engine**: Mathematically guarantees that neither a doctor nor their consultation room can be booked into overlapping time intervals (`newStart < existingEnd && newEnd > existingStart`).
- **Dynamic Compatible-Room Allocation**: Rather than relying strictly on a single fixed room, the scheduler automatically identifies active rooms compatible with the physician's specialty (`supportedSpecialties`) and selects the first eligible, unoccupied room.
- **Decoupled Signup & Authentication Flow**: New patient registration saves account records directly to MongoDB without issuing an auto-login session. Users are redirected to the login portal with a clear confirmation banner to authenticate with their credentials.
- **Concurrency-Safe Booking Strategy**: Two-phase reservation algorithm combining pre-commit conflict checks, isolated write transactions (on replica sets), and atomic verification rollbacks (on standalone instances) to defeat race conditions under simultaneous load.
- **7-Day Next-Available Slot Finder**: When a preferred slot is occupied, the server scans up to 7 days forward to automatically calculate and present the earliest conflict-free slot for both doctor and compatible room.
- **Interactive Weekly Appointment Calendar**: 7-day responsive calendar view with real-time status color coding, slot selection, and previous/next week navigation.
- **Complete Appointment Lifecycle**: Supports the full consultation journey: `Pending` → `Approved` / `Rejected` → `Completed` or `Cancelled`, with instant resource freeing upon cancellation.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with HttpOnly cookies, bcrypt password hashing (10 rounds), and granular authorization across `patient`, `doctor`, and `admin` roles.
- **10 Predefined Clinic Specialists & Rooms**: Initial clinic roster across Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics, and General Medicine.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern CSS Variables, Flexbox/Grid), Vanilla JavaScript (ES6+ async/await, Fetch API) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM (Compatible with local MongoDB and MongoDB Atlas) |
| **Authentication** | JSON Web Tokens (JWT), bcrypt.js (password hashing), Cookie-Parser |
| **Testing** | Node.js Native Test Runner (`node:test`), Supertest, Node Assert |
| **Design System** | Purple Healthcare Palette (`#6366f1` Primary, `#0d9488` Teal), Manrope & Inter Typography |

---

## 📁 Repository Structure

```
Medical_appointment/
├── frontend/                     # Pure HTML5 / CSS3 / Vanilla JS frontend
│   ├── css/
│   │   └── styles.css            # Centralized theme, components, responsive layout
│   ├── js/
│   │   ├── api.js                # Centralized async REST client for all endpoints
│   │   ├── app.js                # Global layout, dynamic navigation, session sync
│   │   ├── auth.js               # Client session state & route guard utilities
│   │   ├── data.js               # Data access bridge
│   │   └── scheduler.js          # Time math, validation & WeeklyCalendar UI component
│   ├── index.html                # Public landing page with doctor directory
│   ├── login.html                # User authentication with registration banner
│   ├── signup.html               # New patient registration (decoupled from login)
│   ├── forgot-password.html      # Password recovery simulation
│   ├── book-appointment.html     # Real-time booking with calendar & conflict preview
│   ├── appointments.html         # User appointments list with cancellation
│   ├── patient-dashboard.html    # Patient overview, calendar & reschedule modal
│   ├── doctor-dashboard.html     # Doctor agenda, approvals, rejection modal, reviews
│   ├── profile.html              # User profile & consultation history log
│   └── reviews.html              # Verified patient ratings & reviews filter
├── express/                      # Node.js + Express + MongoDB backend
│   ├── config/
│   │   └── db.js                 # Resilient MongoDB Mongoose connection manager
│   ├── controllers/
│   │   ├── authController.js     # Signup (no auto-token), login, logout, getMe
│   │   ├── doctorController.js   # Doctors directory, details, weekly slots, next-available
│   │   ├── appointmentController.js # Create (concurrency safe), cancel, reschedule, status
│   │   ├── reviewController.js   # Submit reviews for completed appointments, read reviews
│   │   └── adminController.js    # Operational statistics, room occupancy metrics
│   ├── middleware/
│   │   ├── authenticate.js       # JWT extraction & user session hydration
│   │   ├── authorize.js          # Role-based route protection
│   │   └── errorHandler.js       # Centralized error response formatter
│   ├── models/
│   │   ├── User.js               # Patients, doctors, administrators
│   │   ├── Room.js               # Consultation rooms with supportedSpecialties
│   │   ├── Doctor.js             # Doctor profiles linked to assigned consultation rooms
│   │   ├── Appointment.js        # Multi-status appointment records with compound indexes
│   │   └── Review.js             # Post-consultation patient ratings and comments
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── adminRoutes.js
│   ├── scripts/
│   │   └── seed.js               # Database population script (rooms, doctors, accounts)
│   ├── services/
│   │   └── schedulerService.js   # Compatible room allocator, conflict engine & search
│   ├── tests/
│   │   └── scheduler.test.js     # 14-scenario automated test suite
│   ├── .env                      # Environment configuration (ignored by git)
│   ├── .env.example              # Sample environment template
│   ├── package.json
│   └── server.js                 # Express application & HTTP server entry point
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **MongoDB**: Local MongoDB instance running on port 27017 OR a free MongoDB Atlas cloud cluster

### 1. Environment Configuration

Inside the `express/` directory, verify or create your `.env` file:

```bash
cd express
cp .env.example .env
```

Configuration in `express/.env`:
```ini
PORT=5000
NODE_ENV=development

# Local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/medical_scheduler

# Or MongoDB Atlas Cloud:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/medical_scheduler?retryWrites=true&w=majority

JWT_SECRET=super_secret_jwt_key_medical_scheduler_2026_phase2
JWT_EXPIRES_IN=7d
CLINIC_TIMEZONE=Asia/Kolkata
```

> **Security Note**: Never commit `.env` or reveal your actual database password or JWT secret. `.env` is excluded in `.gitignore`.

### 2. Install Dependencies

```bash
cd express
npm install
```

### 3. Seed Database

Populates the 10 consultation rooms (Rooms 101–110), 10 medical specialists, sample patient and admin accounts, appointments, and reviews:

```bash
npm run seed
```

### 4. Start the Application

To run with live reloading:
```bash
npm run dev
```

Or for standard execution:
```bash
npm start
```

The Express server serves both the REST API endpoints at `/api/*` and the static frontend at root:
- **Application URL**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## ☁️ MongoDB Atlas Cloud Setup & Verification Guide

To share data across multiple devices (laptops, mobile browsers, or evaluators' machines), connect the backend to a free MongoDB Atlas cloud database:

### Step-by-Step Atlas Configuration:

1. **Create an Atlas Account**:
   - Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and register for a free account.
2. **Deploy a Free Shared Cluster**:
   - Create a free **M0 Sandbox** cluster (choose AWS or GCP in your closest region, e.g., Mumbai `ap-south-1`).
3. **Configure Database Access (User)**:
   - In the Atlas sidebar, navigate to **Security → Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication.
   - Enter a username (e.g., `clinic_admin`) and a secure password.
   - Set user privileges to **Read and write to any database**.
4. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security → Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access From Anywhere** (`0.0.0.0/0`) for development/demonstration, or enter your backend server's specific IP.
5. **Obtain Connection String**:
   - Navigate to **Deployment → Database**.
   - Click **Connect → Drivers** (Node.js).
   - Copy the SRV connection URI:
     `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/medical_scheduler?retryWrites=true&w=majority`
6. **Set Connection String in `.env`**:
   - In `express/.env`, set `MONGODB_URI` to your Atlas string (replace `<password>` with your database user password).
7. **Seed Atlas Database**:
   ```bash
   cd express
   npm run seed
   ```

### Verifying Records in MongoDB Atlas:
1. In the Atlas dashboard, click **Database → Browse Collections**.
2. Select database `medical_scheduler`:
   - `users`: View registered patients, physicians, and administrators with hashed passwords.
   - `rooms`: View consultation rooms with their `supportedSpecialties`.
   - `doctors`: View clinic physicians with references to assigned rooms.
   - `appointments`: View created appointments with references to `patient`, `doctor`, and `room`.

---

## 🧪 Automated Test Suite (14 Tests)

The test suite validates all critical scheduling, room allocation, registration, and security criteria using Node's native test runner and Supertest:

```bash
cd express
npm test
```

### Complete Test Coverage:
1. **Successful Appointment Booking**: Validates slot allocation and room binding.
2. **Doctor Conflict Detection**: Returns `409 Conflict` when doctor is already booked.
3. **Room Conflict Detection**: Returns `409 Conflict` if doctor's room is occupied and no alternative exists.
4. **Back-to-Back Validation**: Proves that `10:00–10:30` and `10:30–11:00` both succeed without false collision.
5. **Immediate Slot Freeing**: Proves that a cancelled appointment immediately frees the slot for other patients.
6. **Schedule Boundary Enforcement**: Blocks out-of-working-hours bookings and historical dates (`400 Bad Request`).
7. **Next-Available Slot Search**: Verifies calculation of the earliest upcoming non-conflicting time slot.
8. **Unauthorized Modification Prevention**: Prevents patient B from modifying or cancelling patient A's appointment (`403 Forbidden`).
9. **Role-Based Access Control**: Blocks unauthenticated requests (`401 Unauthorized`) and patient access to admin endpoints (`403 Forbidden`).
10. **Signup Separation**: Validates that signup creates user document in MongoDB without issuing token/cookie, and rejects duplicates with `409 Conflict`.
11. **Registration Input Validation**: Rejects short or mismatched passwords with `400 Bad Request`.
12. **Login Verification**: Verifies newly registered user can log in with credentials, while invalid passwords are blocked.
13. **Dynamic Compatible-Room Allocation**: Automatically allocates an alternative compatible room when a doctor's default room is occupied.
14. **Full Compatible-Room Rejection**: Rejects with `409 Conflict` when all rooms compatible with a specialty are occupied simultaneously.

---

## 🔑 Default Accounts & Credentials

All seeded accounts use the password: `Password123!`

| Role | Name | Email | Default Access |
|---|---|---|---|
| **Admin** | System Administrator | `admin@clinic.com` | Full administrative metrics, rooms, all appointments |
| **Doctor** | Dr. Amandeep Singh | `amandeep.singh@clinic.com` | Cardiology agenda (Room 101), approve/reject visits |
| **Doctor** | Dr. Simran Kaur | `simran.kaur@clinic.com` | Cardiology agenda (Room 102), approve/reject visits |
| **Doctor** | Dr. Rahul Sharma | `rahul.sharma@clinic.com` | Dermatology agenda (Room 103), approve/reject visits |
| **Patient** | Rajesh Kumar | `patient@clinic.com` | Book consultations, view history, reschedule, reviews |
| **Patient** | Priya Patel | `priya.patel@clinic.com` | Book consultations, view history, reschedule, reviews |

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register a new patient account (returns success message; no auto-login token) | Public |
| `POST` | `/api/auth/login` | Authenticate user, return JWT token & set HttpOnly cookie | Public |
| `POST` | `/api/auth/logout` | Clear authentication token cookie & session | Public |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile | Private |

### Doctors (`/api/doctors`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/doctors` | List active doctors (filter by `?specialty=`) | Public |
| `GET` | `/api/doctors/:id` | Get doctor details & assigned room | Public |
| `GET` | `/api/doctors/:id/availability` | Fetch booked slots for date/week | Public |
| `GET` | `/api/doctors/:id/next-available`| Auto-find earliest conflict-free slot | Public |

### Appointments (`/api/appointments`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/appointments` | Book new consultation (compatible room auto-allocated) | Patient, Admin |
| `GET` | `/api/appointments/my` | List appointments for authenticated user | Private |
| `GET` | `/api/appointments/:id` | View specific appointment details | Owner, Doctor, Admin |
| `PATCH` | `/api/appointments/:id/status` | Approve, reject, or complete consultation | Doctor, Admin |
| `PATCH` | `/api/appointments/:id/cancel` | Cancel consultation and free room/doctor | Owner, Doctor, Admin |
| `PATCH` | `/api/appointments/:id/reschedule` | Reschedule to new date/time with compatible room check | Owner, Admin |

### Reviews (`/api/reviews`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/reviews` | List patient reviews (filter by `?doctorId=`) | Public |
| `POST` | `/api/reviews` | Submit review for completed appointment | Patient |

### Administration (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/stats` | System metrics (total appointments, statuses) | Admin |
| `GET` | `/api/admin/rooms` | All consultation rooms & statuses | Admin |

---

## 🎓 Viva & Architecture Q&A (For Student Presentation)

### 1. How does the Dual-Resource Conflict Algorithm work?
An appointment conflicts if and only if both conditions hold:
$$\text{newStart} < \text{existingEnd} \quad \text{AND} \quad \text{newEnd} > \text{existingStart}$$
This prevents overlapping intervals while allowing back-to-back bookings (e.g. 10:00–10:30 and 10:30–11:00) because $10:30 < 10:30$ evaluates to `false`.

### 2. How does Compatible-Room Allocation work?
1. The patient chooses a doctor and time.
2. The server checks that the doctor is free.
3. The server retrieves all active rooms where `supportedSpecialties` includes the doctor's specialty.
4. It evaluates the candidate rooms: prioritizing the doctor's default room if free, and automatically falling back to any other free room supporting that specialty.
5. If all compatible rooms are occupied, it returns `409 Conflict` and suggests the next available slot.

### 3. What is the difference between Account Retention and JWT Expiration?
- **Account Retention**: User accounts stored in MongoDB remain permanently until explicitly deleted. They do not expire.
- **JWT Session Duration (`JWT_EXPIRES_IN=7d`)**: The cryptographic token proving login identity expires after 7 days. After 7 days, the user must log in again, but their account, appointments, and medical history remain completely intact in MongoDB.

### 4. How are concurrent race conditions prevented?
On MongoDB Replica Sets, multi-document transactions (`session.startTransaction()`) isolate check-and-insert operations. On standalone MongoDB instances, an atomic verification protocol checks for collision immediately after insert and automatically rolls back the document if another concurrent booking raced in.

---

## 📄 License
ISC License © 2026 Multi-Doctor Appointment Conflict Scheduler.
