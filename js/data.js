/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Data Layer
   Predefined 10 Clinic Doctors + LocalStorage Patient Database & Session Control
   ========================================================================== */

const STORAGE_KEYS = {
  USERS: 'mdacs_users',
  ROOMS: 'mdacs_rooms',
  APPOINTMENTS: 'mdacs_appointments',
  REVIEWS: 'mdacs_reviews',
  LOGGED_IN_USER: 'loggedInUser'
};

// Strict Predefined Array of Exactly 10 Clinic Doctors
const PREDEFINED_DOCTORS = [
  {
    id: 1,
    name: "Dr. Ananya Sharma",
    email: "ananya@clinic.com",
    password: "doctor123",
    specialty: "Cardiology",
    roomId: 201,
    experience: 8,
    phone: "9123456780",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    startTime: "09:00",
    endTime: "17:00",
    bio: "Senior Cardiologist specializing in preventative heart care, ECG diagnostics, and hypertension treatment."
  },
  {
    id: 2,
    name: "Dr. Rahul Verma",
    email: "rahul@clinic.com",
    password: "doctor123",
    specialty: "Dermatology",
    roomId: 202,
    experience: 6,
    phone: "9123456781",
    workingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    startTime: "10:00",
    endTime: "18:00",
    bio: "Clinical dermatologist focusing on acne therapy, skin allergies, pediatric dermatology, and cosmetic procedures."
  },
  {
    id: 3,
    name: "Dr. Priya Singh",
    email: "priya@clinic.com",
    password: "doctor123",
    specialty: "Orthopedics",
    roomId: 203,
    experience: 10,
    phone: "9123456782",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "08:30",
    endTime: "16:30",
    bio: "Orthopedic surgeon specializing in joint repair, spinal health, and sports injury rehabilitation."
  },
  {
    id: 4,
    name: "Dr. Rajesh Kumar",
    email: "rajesh@clinic.com",
    password: "doctor123",
    specialty: "Neurology",
    roomId: 204,
    experience: 12,
    phone: "9123456783",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:00",
    endTime: "17:00",
    bio: "Expert neurologist handling nerve disorders, chronic migraines, epilepsy, and stroke care."
  },
  {
    id: 5,
    name: "Dr. Sarah Jenkins",
    email: "sarah@clinic.com",
    password: "doctor123",
    specialty: "Pediatrics",
    roomId: 205,
    experience: 7,
    phone: "9123456784",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    startTime: "09:00",
    endTime: "15:00",
    bio: "Compassionate pediatrician committed to newborn care, child development, and routine immunizations."
  },
  {
    id: 6,
    name: "Dr. Aris Thorne",
    email: "aris@clinic.com",
    password: "doctor123",
    specialty: "General Medicine",
    roomId: 206,
    experience: 9,
    phone: "9123456785",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    startTime: "08:00",
    endTime: "18:00",
    bio: "Lead primary care physician providing full health screenings, fever care, and preventative wellness."
  },
  {
    id: 7,
    name: "Dr. Vikram Mehta",
    email: "vikram@clinic.com",
    password: "doctor123",
    specialty: "Cardiology",
    roomId: 207,
    experience: 14,
    phone: "9123456786",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:30",
    endTime: "17:30",
    bio: "Veteran Interventional Cardiologist with extensive clinical research background."
  },
  {
    id: 8,
    name: "Dr. Neha Kapoor",
    email: "neha@clinic.com",
    password: "doctor123",
    specialty: "Dermatology",
    roomId: 208,
    experience: 5,
    phone: "9123456787",
    workingDays: ["Monday", "Wednesday", "Friday", "Saturday"],
    startTime: "10:00",
    endTime: "16:00",
    bio: "Dermatology specialist offering medical skin therapies and hair-loss treatment plans."
  },
  {
    id: 9,
    name: "Dr. Siddharth Rao",
    email: "siddharth@clinic.com",
    password: "doctor123",
    specialty: "Neurology",
    roomId: 209,
    experience: 11,
    phone: "9123456788",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:00",
    endTime: "17:00",
    bio: "Senior consultant neurologist treating memory loss, movement disorders, and spine conditions."
  },
  {
    id: 10,
    name: "Dr. Kavita Reddy",
    email: "kavita@clinic.com",
    password: "doctor123",
    specialty: "General Medicine",
    roomId: 210,
    experience: 15,
    phone: "9123456789",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "08:30",
    endTime: "17:00",
    bio: "Senior primary physician managing diabetes, metabolic health, and general patient consultations."
  }
];

// Pre-seeded Initial Patients
const INITIAL_USERS = [
  {
    id: 101,
    name: "Sneha Kapadia",
    email: "sneha@example.com",
    password: "123456",
    phone: "9876543210",
    role: "patient"
  },
  {
    id: 102,
    name: "Rahul Verma",
    email: "rahul@example.com",
    password: "123456",
    phone: "9876543211",
    role: "patient"
  }
];

const INITIAL_ROOMS = [
  { id: 201, roomNumber: "Room 101", type: "Cardiology Suite A", status: "Available" },
  { id: 202, roomNumber: "Room 102", type: "Dermatology Laser Room", status: "Available" },
  { id: 203, roomNumber: "Room 103", type: "Orthopedics Exam Suite", status: "Available" },
  { id: 204, roomNumber: "Room 104", type: "Neurology Diagnostics Room", status: "Available" },
  { id: 205, roomNumber: "Room 105", type: "Pediatric Wellness Room", status: "Available" },
  { id: 206, roomNumber: "Room 106", type: "General OPD Room 1", status: "Available" },
  { id: 207, roomNumber: "Room 107", type: "Cardiology Suite B", status: "Available" },
  { id: 208, roomNumber: "Room 108", type: "Dermatology Suite B", status: "Available" },
  { id: 209, roomNumber: "Room 109", type: "Neurology Suite B", status: "Available" },
  { id: 210, roomNumber: "Room 110", type: "General OPD Room 2", status: "Available" }
];

function getTodayIsoString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const INITIAL_APPOINTMENTS = [
  {
    id: 501,
    patientId: 101,
    patientName: "Sneha Kapadia",
    patientEmail: "sneha@example.com",
    patientPhone: "9876543210",
    doctorId: 1,
    doctorName: "Dr. Ananya Sharma",
    specialty: "Cardiology",
    roomId: 201,
    roomNumber: "Room 101",
    date: getTodayIsoString(1),
    startTime: "10:00",
    endTime: "10:30",
    duration: 30,
    reason: "Annual cardiac checkup & ECG review",
    status: "Approved",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  },
  {
    id: 502,
    patientId: 101,
    patientName: "Sneha Kapadia",
    patientEmail: "sneha@example.com",
    patientPhone: "9876543210",
    doctorId: 2,
    doctorName: "Dr. Rahul Verma",
    specialty: "Dermatology",
    roomId: 202,
    roomNumber: "Room 102",
    date: getTodayIsoString(2),
    startTime: "11:00",
    endTime: "11:30",
    duration: 30,
    reason: "Skin allergy consultation",
    status: "Pending",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  },
  {
    id: 503,
    patientId: 101,
    patientName: "Sneha Kapadia",
    patientEmail: "sneha@example.com",
    patientPhone: "9876543210",
    doctorId: 1,
    doctorName: "Dr. Ananya Sharma",
    specialty: "Cardiology",
    roomId: 201,
    roomNumber: "Room 101",
    date: getTodayIsoString(-3),
    startTime: "09:30",
    endTime: "10:00",
    duration: 30,
    reason: "Initial chest pain screening",
    status: "Completed",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  },
  {
    id: 504,
    patientId: 102,
    patientName: "Rahul Verma",
    patientEmail: "rahul@example.com",
    patientPhone: "9876543211",
    doctorId: 4,
    doctorName: "Dr. Rajesh Kumar",
    specialty: "Neurology",
    roomId: 204,
    roomNumber: "Room 104",
    date: getTodayIsoString(0),
    startTime: "14:00",
    endTime: "14:30",
    duration: 30,
    reason: "Migraine assessment",
    status: "Approved",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  }
];

const INITIAL_REVIEWS = [
  {
    id: 1,
    appointmentId: 503,
    patientId: 101,
    patientName: "Sneha Kapadia",
    doctorId: 1,
    doctorName: "Dr. Ananya Sharma",
    rating: 5,
    comment: "Dr. Ananya was exceptionally thorough and polite. She explained my ECG results clearly and answered all my questions.",
    createdAt: getTodayIsoString(-2)
  }
];

const DataStore = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    }
  },

  get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Patients API
  getUsers() { return this.get(STORAGE_KEYS.USERS); },
  saveUser(user) {
    const users = this.getUsers();
    // Enforce patient role strictly
    user.role = 'patient';
    users.push(user);
    this.save(STORAGE_KEYS.USERS, users);
    return user;
  },
  updateUserPassword(email, newPassword) {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex !== -1) {
      users[userIndex].password = newPassword;
      this.save(STORAGE_KEYS.USERS, users);
      return true;
    }
    return false;
  },

  // Doctors API (Predefined Fixed List of Exactly 10 Doctors)
  getDoctors() {
    // Return a shallow copy of predefined 10 doctors
    return PREDEFINED_DOCTORS.map(d => ({ ...d }));
  },
  getDoctorById(id) {
    return PREDEFINED_DOCTORS.find(d => Number(d.id) === Number(id)) || null;
  },
  getDoctorsBySpecialty(specialty) {
    if (!specialty || specialty === "All") return this.getDoctors();
    return PREDEFINED_DOCTORS.filter(d => d.specialty.toLowerCase() === specialty.toLowerCase());
  },
  findPredefinedDoctor(email, password) {
    return PREDEFINED_DOCTORS.find(
      d => d.email.toLowerCase() === email.toLowerCase() && d.password === password
    ) || null;
  },

  // Rooms API
  getRooms() { return this.get(STORAGE_KEYS.ROOMS); },
  getDoctorRoom(doctorId) {
    const doctor = this.getDoctorById(doctorId);
    if (!doctor || !doctor.roomId) return null;
    const rooms = this.getRooms();
    return rooms.find(r => Number(r.id) === Number(doctor.roomId)) || { id: doctor.roomId, roomNumber: `Room ${doctor.roomId}` };
  },

  // Appointments API
  getAppointments() { return this.get(STORAGE_KEYS.APPOINTMENTS); },
  saveAppointment(appointment) {
    const appointments = this.getAppointments();
    appointments.push(appointment);
    this.save(STORAGE_KEYS.APPOINTMENTS, appointments);
    return appointment;
  },
  createAppointmentFromClient(clientPayload) {
    const doctor = this.getDoctorById(clientPayload.doctorId);
    if (!doctor) throw new Error("Selected doctor not found.");

    const room = this.getDoctorRoom(clientPayload.doctorId);
    if (!room) throw new Error("Assigned consultation room for selected doctor not found.");

    const startMin = SchedulerEngine.timeToMinutes(clientPayload.startTime);
    const duration = Number(clientPayload.duration) || 30;
    const endTime = SchedulerEngine.minutesToTime(startMin + duration);

    const newAppt = {
      id: Date.now(),
      patientId: clientPayload.patientId,
      patientName: clientPayload.patientName,
      patientEmail: clientPayload.patientEmail,
      patientPhone: clientPayload.patientPhone || '',
      doctorId: Number(doctor.id),
      doctorName: doctor.name,
      specialty: doctor.specialty,
      roomId: Number(room.id),
      roomNumber: room.roomNumber,
      date: clientPayload.date,
      startTime: clientPayload.startTime,
      endTime,
      duration,
      reason: clientPayload.reason || 'General Consultation',
      status: 'Pending',
      rejectionReason: '',
      createdAt: new Date().toISOString()
    };

    return this.saveAppointment(newAppt);
  },
  updateAppointmentStatus(id, newStatus, rejectionReason = '') {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => Number(a.id) === Number(id));
    if (index !== -1) {
      appointments[index].status = newStatus;
      if (rejectionReason) {
        appointments[index].rejectionReason = rejectionReason;
      }
      this.save(STORAGE_KEYS.APPOINTMENTS, appointments);
      return appointments[index];
    }
    return null;
  },

  // Reviews API
  getReviews() { return this.get(STORAGE_KEYS.REVIEWS); },
  saveReview(review) {
    const reviews = this.getReviews();
    reviews.push(review);
    this.save(STORAGE_KEYS.REVIEWS, reviews);
    return review;
  },
  getDoctorReviews(doctorId) {
    const reviews = this.getReviews();
    return reviews.filter(r => Number(r.doctorId) === Number(doctorId));
  },

  // SessionStorage LoggedInUser API
  getLoggedInUser() {
    const userJson = sessionStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
    return userJson ? JSON.parse(userJson) : null;
  },
  setLoggedInUser(user) {
    sessionStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
  },
  logoutUser() {
    sessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN_USER);
  }
};

// Initialize database on script load
DataStore.init();
