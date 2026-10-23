require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Room = require('../models/Room');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Doctor.deleteMany({}),
      Appointment.deleteMany({}),
      Review.deleteMany({})
    ]);

    console.log('[Seed] Creating 10 Consultation Rooms...');
    const roomDefs = [
      { roomNumber: "Room 101", type: "Cardiology Suite A", supportedSpecialties: ["Cardiology"] },
      { roomNumber: "Room 102", type: "Dermatology Laser Room", supportedSpecialties: ["Dermatology"] },
      { roomNumber: "Room 103", type: "Orthopedics Exam Suite", supportedSpecialties: ["Orthopedics"] },
      { roomNumber: "Room 104", type: "Neurology Diagnostics Room", supportedSpecialties: ["Neurology"] },
      { roomNumber: "Room 105", type: "Pediatric Wellness Room", supportedSpecialties: ["Pediatrics"] },
      { roomNumber: "Room 106", type: "General OPD Room 1", supportedSpecialties: ["General Medicine"] },
      { roomNumber: "Room 107", type: "Cardiology Suite B", supportedSpecialties: ["Cardiology"] },
      { roomNumber: "Room 108", type: "Dermatology Suite B", supportedSpecialties: ["Dermatology"] },
      { roomNumber: "Room 109", type: "Neurology Suite B", supportedSpecialties: ["Neurology"] },
      { roomNumber: "Room 110", type: "General OPD Room 2", supportedSpecialties: ["General Medicine"] }
    ];

    const createdRooms = await Room.insertMany(roomDefs);
    const roomMap = {};
    createdRooms.forEach(r => { roomMap[r.roomNumber] = r._id; });

    console.log('[Seed] Creating Patients and Admin Accounts...');
    const patientPasswordHash = await User.hashPassword('123456');
    const adminPasswordHash = await User.hashPassword('admin123');
    const doctorPasswordHash = await User.hashPassword('doctor123');

    const patient1 = await User.create({
      name: "Sneha Kapadia",
      email: "sneha@example.com",
      passwordHash: patientPasswordHash,
      phone: "9876543210",
      role: "patient"
    });

    const patient2 = await User.create({
      name: "Rahul Verma",
      email: "rahul@example.com",
      passwordHash: patientPasswordHash,
      phone: "9876543211",
      role: "patient"
    });

    await User.create({
      name: "Clinic Administrator",
      email: "admin@clinic.com",
      passwordHash: adminPasswordHash,
      phone: "9000000000",
      role: "admin"
    });

    console.log('[Seed] Creating 10 Predefined Doctors...');
    const doctorConfigs = [
      {
        name: "Dr. Ananya Sharma",
        email: "ananya@clinic.com",
        specialty: "Cardiology",
        roomNumber: "Room 101",
        experience: 8,
        phone: "9123456780",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        workingStartTime: "09:00",
        workingEndTime: "17:00",
        bio: "Senior Cardiologist specializing in preventative heart care, ECG diagnostics, and hypertension treatment."
      },
      {
        name: "Dr. Rahul Verma",
        email: "rahul@clinic.com",
        specialty: "Dermatology",
        roomNumber: "Room 102",
        experience: 6,
        phone: "9123456781",
        workingDays: ["Monday", "Tuesday", "Thursday", "Friday"],
        workingStartTime: "10:00",
        workingEndTime: "18:00",
        bio: "Clinical dermatologist focusing on acne therapy, skin allergies, pediatric dermatology, and cosmetic procedures."
      },
      {
        name: "Dr. Priya Singh",
        email: "priya@clinic.com",
        specialty: "Orthopedics",
        roomNumber: "Room 103",
        experience: 10,
        phone: "9123456782",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingStartTime: "08:30",
        workingEndTime: "16:30",
        bio: "Orthopedic surgeon specializing in joint repair, spinal health, and sports injury rehabilitation."
      },
      {
        name: "Dr. Rajesh Kumar",
        email: "rajesh@clinic.com",
        specialty: "Neurology",
        roomNumber: "Room 104",
        experience: 12,
        phone: "9123456783",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingStartTime: "09:00",
        workingEndTime: "17:00",
        bio: "Expert neurologist handling nerve disorders, chronic migraines, epilepsy, and stroke care."
      },
      {
        name: "Dr. Sarah Jenkins",
        email: "sarah@clinic.com",
        specialty: "Pediatrics",
        roomNumber: "Room 105",
        experience: 7,
        phone: "9123456784",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        workingStartTime: "09:00",
        workingEndTime: "15:00",
        bio: "Compassionate pediatrician committed to newborn care, child development, and routine immunizations."
      },
      {
        name: "Dr. Aris Thorne",
        email: "aris@clinic.com",
        specialty: "General Medicine",
        roomNumber: "Room 106",
        experience: 9,
        phone: "9123456785",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        workingStartTime: "08:00",
        workingEndTime: "18:00",
        bio: "Lead primary care physician providing full health screenings, fever care, and preventative wellness."
      },
      {
        name: "Dr. Vikram Mehta",
        email: "vikram@clinic.com",
        specialty: "Cardiology",
        roomNumber: "Room 107",
        experience: 14,
        phone: "9123456786",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingStartTime: "09:30",
        workingEndTime: "17:30",
        bio: "Veteran Interventional Cardiologist with extensive clinical research background."
      },
      {
        name: "Dr. Neha Kapoor",
        email: "neha@clinic.com",
        specialty: "Dermatology",
        roomNumber: "Room 108",
        experience: 5,
        phone: "9123456787",
        workingDays: ["Monday", "Wednesday", "Friday", "Saturday"],
        workingStartTime: "10:00",
        workingEndTime: "16:00",
        bio: "Dermatology specialist offering medical skin therapies and hair-loss treatment plans."
      },
      {
        name: "Dr. Siddharth Rao",
        email: "siddharth@clinic.com",
        specialty: "Neurology",
        roomNumber: "Room 109",
        experience: 11,
        phone: "9123456788",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingStartTime: "09:00",
        workingEndTime: "17:00",
        bio: "Senior consultant neurologist treating memory loss, movement disorders, and spine conditions."
      },
      {
        name: "Dr. Kavita Reddy",
        email: "kavita@clinic.com",
        specialty: "General Medicine",
        roomNumber: "Room 110",
        experience: 15,
        phone: "9123456789",
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingStartTime: "08:30",
        workingEndTime: "17:00",
        bio: "Senior primary physician managing diabetes, metabolic health, and general patient consultations."
      }
    ];

    const createdDoctors = [];
    for (const doc of doctorConfigs) {
      // Create user account for doctor
      const user = await User.create({
        name: doc.name,
        email: doc.email,
        passwordHash: doctorPasswordHash,
        phone: doc.phone,
        role: "doctor"
      });

      const doctorDoc = await Doctor.create({
        user: user._id,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        specialty: doc.specialty,
        experience: doc.experience,
        bio: doc.bio,
        workingDays: doc.workingDays,
        workingStartTime: doc.workingStartTime,
        workingEndTime: doc.workingEndTime,
        slotDuration: 30,
        assignedRoom: roomMap[doc.roomNumber]
      });

      createdDoctors.push(doctorDoc);
    }

    console.log('[Seed] Creating Sample Appointments...');
    const now = new Date();
    const getDateStr = (offset) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };

    const pastDate = getDateStr(-2);
    const todayDate = getDateStr(0);
    const futureDate1 = getDateStr(1);
    const futureDate2 = getDateStr(2);

    const appt1 = await Appointment.create({
      patient: patient1._id,
      doctor: createdDoctors[0]._id, // Dr. Ananya Sharma
      room: createdDoctors[0].assignedRoom, // Room 101
      date: pastDate,
      startTime: "10:00",
      endTime: "10:30",
      duration: 30,
      startDateTime: new Date(`${pastDate}T10:00:00.000Z`),
      endDateTime: new Date(`${pastDate}T10:30:00.000Z`),
      reason: "Annual heart wellness and ECG checkup",
      status: "Completed"
    });

    await Appointment.create({
      patient: patient1._id,
      doctor: createdDoctors[1]._id, // Dr. Rahul Verma
      room: createdDoctors[1].assignedRoom, // Room 102
      date: futureDate1,
      startTime: "11:00",
      endTime: "11:30",
      duration: 30,
      startDateTime: new Date(`${futureDate1}T11:00:00.000Z`),
      endDateTime: new Date(`${futureDate1}T11:30:00.000Z`),
      reason: "Skin allergy consultation & follow-up",
      status: "Approved"
    });

    await Appointment.create({
      patient: patient2._id,
      doctor: createdDoctors[0]._id, // Dr. Ananya Sharma
      room: createdDoctors[0].assignedRoom, // Room 101
      date: futureDate2,
      startTime: "09:30",
      endTime: "10:00",
      duration: 30,
      startDateTime: new Date(`${futureDate2}T09:30:00.000Z`),
      endDateTime: new Date(`${futureDate2}T10:00:00.000Z`),
      reason: "Mild chest tightness evaluation",
      status: "Pending"
    });

    console.log('[Seed] Creating Sample Review for Completed Appointment...');
    await Review.create({
      appointment: appt1._id,
      patient: patient1._id,
      doctor: createdDoctors[0]._id,
      rating: 5,
      comment: "Dr. Ananya was exceptionally thorough and polite. She explained my ECG results clearly and answered all my questions."
    });

    console.log('[Seed] Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
