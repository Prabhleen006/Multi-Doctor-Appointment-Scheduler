# Medical Appointment Scheduler

A web-based Medical Appointment Scheduler that helps patients book doctor appointments and enables doctors to manage appointment requests. The system supports doctor availability, appointment scheduling, room allocation, and patient reviews.

## Features

### Patient Features
- View available doctors and their specialties.
- Book appointments by selecting a doctor, date, and time.
- View upcoming and previous appointments.
- Cancel or reschedule appointments.
- Track appointment status.
- Submit ratings and reviews after completed consultations.

### Doctor Features
- View appointment requests.
- Approve or reject appointments.
- Manage appointment status.
- View scheduled and completed consultations.

### Admin and Scheduling Features
- Manage doctors, rooms, and appointment records.
- Check doctor availability and scheduling conflicts.
- Support consultation room allocation.
- Suggest available appointment slots.
- Validate appointment requests.

### Reviews
- View patient reviews and ratings.
- Filter reviews by doctor.
- Allow eligible patients to submit feedback after completed consultations.
- Prevent duplicate reviews for the same appointment.

## Technology Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js
- REST APIs

**Database**
- MongoDB
- Mongoose

**Other Tools and Libraries**
- JWT for authentication
- bcryptjs for password hashing
- dotenv for environment variables
- cookie-parser and CORS for request handling

## Project Structure

```text
Medical_appointment/
├── express/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   │   └── seed.js
│   ├── services/
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   └── scheduler.js
│   ├── index.html
│   ├── book-appointment.html
│   ├── appointments.html
│   ├── patient-dashboard.html
│   ├── doctor-dashboard.html
│   └── reviews.html
│
└── README.md
```

*Note: This structure highlights the main project files. Additional files may exist in the repository.*

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB local installation or a MongoDB Atlas database
- Git (optional, for version control)

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Medical_appointment
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Install backend dependencies

```bash
cd express
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `express` folder.

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/medical_scheduler
```

For MongoDB Atlas, replace the local MongoDB URI with your Atlas connection string. Keep credentials private and never commit your `.env` file.

### 4. Start the application

From the `express` folder, run:

```bash
npm start
```

For development with automatic server restarts, run:

```bash
npm run dev
```

### 5. Open the application

Open the following URLs in your browser:

- Website: http://localhost:5000
- API health check: http://localhost:5000/api/health
- Doctors API: http://localhost:5000/api/doctors

The database must be running and the backend must connect successfully before the application can start.

## Sample Data

The project includes a seed script for creating sample rooms, users, doctors, appointments, and reviews.

Run it from the `express` directory:

```bash
npm run seed
```

**Warning:** The seed script clears existing records in several database collections before inserting sample data. Use it only with a disposable development database or after backing up important data.

## Testing

Run the project's automated tests from the `express` directory:

```bash
npm test
```

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend status |
| GET | `/api/doctors` | Retrieve available doctors |
| GET | `/api/doctors/:id` | Retrieve a doctor by ID |
| GET | `/api/doctors/:id/availability` | Check doctor availability |
| GET | `/api/doctors/:id/next-available` | Find a suggested available slot |
| GET | `/api/reviews` | Retrieve patient reviews |
| POST | `/api/reviews` | Submit a patient review |

Appointment and authentication endpoints are also available through their respective route files. Protected endpoints require the appropriate authentication and authorization.

## How It Works

1. The patient opens the website and selects a doctor.
2. The patient chooses a suitable appointment date and time.
3. The backend validates the request and checks scheduling constraints.
4. Valid appointment details are saved in MongoDB.
5. The patient can track the appointment status through the dashboard.
6. The doctor can review and update the appointment request.
7. Eligible patients can submit a review after their consultation is completed.

## Future Enhancements

- Email and SMS appointment reminders.
- Online payment integration.
- Real-time notifications.
- Improved reporting and analytics.
- Additional accessibility and user-experience improvements.

## Contributors

Developed as a collaborative academic project.

## License

This project is intended for educational and demonstration purposes.
