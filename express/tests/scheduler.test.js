const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../server');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');
const Appointment = require('../models/Appointment');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

describe('Multi-Doctor Appointment Conflict Scheduler - Automated Test Suite', () => {
  let patient1User, patient1Token;
  let patient2User, patient2Token;
  let adminUser, adminToken;
  let testRoom, testRoom2;
  let testDoctor1, testDoctor2;

  // A future date string helper (next Tuesday)
  function getFutureWeekday(daysAhead = 7) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysAhead);
    // If weekend, advance to Monday
    const day = d.getUTCDay();
    if (day === 0) d.setUTCDate(d.getUTCDate() + 1); // Sunday -> Monday
    if (day === 6) d.setUTCDate(d.getUTCDate() + 2); // Saturday -> Monday
    return d.toISOString().split('T')[0];
  }

  const testDate = getFutureWeekday(14); // 2 weeks ahead

  before(async () => {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_scheduler');
    }

    // Clean up previous test artifacts
    await User.deleteMany({ email: { $in: ['test_patient1@clinic.com', 'test_patient2@clinic.com', 'test_admin@clinic.com', 'test_doc1@clinic.com', 'test_doc2@clinic.com', 'test_doc3@clinic.com', 'brand_new_patient@clinic.com', 'login_verify_patient@clinic.com'] } });
    await Doctor.deleteMany({ email: { $in: ['test_doc1@clinic.com', 'test_doc2@clinic.com', 'test_doc3@clinic.com'] } });
    await Room.deleteMany({ roomNumber: { $in: ['Room TEST-901', 'Room TEST-902'] } });

    // Seed test room
    testRoom = await Room.create({
      roomNumber: 'Room TEST-901',
      type: 'General Consultation',
      supportedSpecialties: ['TestCardiology', 'TestNeurology'],
      capacity: 1,
      floor: '9th Floor',
      isActive: true
    });

    testRoom2 = await Room.create({
      roomNumber: 'Room TEST-902',
      type: 'Specialist Consultation',
      supportedSpecialties: ['TestCardiology'],
      capacity: 1,
      floor: '9th Floor',
      isActive: true
    });

    // Seed test patients & admin
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    patient1User = await User.create({
      name: 'Test Patient One',
      email: 'test_patient1@clinic.com',
      passwordHash,
      role: 'patient',
      phone: '+91 9999900001'
    });
    patient1Token = jwt.sign({ id: patient1User._id, role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });

    patient2User = await User.create({
      name: 'Test Patient Two',
      email: 'test_patient2@clinic.com',
      passwordHash,
      role: 'patient',
      phone: '+91 9999900002'
    });
    patient2Token = jwt.sign({ id: patient2User._id, role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });

    adminUser = await User.create({
      name: 'Test Admin',
      email: 'test_admin@clinic.com',
      passwordHash,
      role: 'admin',
      phone: '+91 9999900000'
    });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed test doctor 1 (assigned to testRoom)
    testDoctor1 = await Doctor.create({
      name: 'Dr. Test Cardiologist',
      email: 'test_doc1@clinic.com',
      phone: '+91 9999900003',
      specialty: 'TestCardiology',
      experience: 12,
      bio: 'Test doctor for automated test suite',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingStartTime: '09:00',
      workingEndTime: '17:00',
      slotDuration: 30,
      assignedRoom: testRoom._id,
      isActive: true
    });

    // Seed test doctor 2 (sharing testRoom for cross-doctor room conflict test)
    testDoctor2 = await Doctor.create({
      name: 'Dr. Test Neurologist',
      email: 'test_doc2@clinic.com',
      phone: '+91 9999900004',
      specialty: 'TestNeurology',
      experience: 8,
      bio: 'Test doctor sharing Room TEST-901',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingStartTime: '09:00',
      workingEndTime: '17:00',
      slotDuration: 30,
      assignedRoom: testRoom._id, // Intentionally same room
      isActive: true
    });
  });

  after(async () => {
    // Cleanup created test records
    await Appointment.deleteMany({
      $or: [
        { patient: patient1User._id },
        { patient: patient2User._id },
        { doctor: testDoctor1._id },
        { doctor: testDoctor2._id }
      ]
    });
    await Doctor.deleteMany({ _id: { $in: [testDoctor1._id, testDoctor2._id] } });
    await Room.deleteMany({ _id: { $in: [testRoom._id, testRoom2._id] } });
    await User.deleteMany({ _id: { $in: [patient1User._id, patient2User._id, adminUser._id] } });

    await mongoose.connection.close();
  });

  // Test 1: Successful appointment booking
  it('1. Successfully books a consultation when doctor and room are available', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '10:00',
        duration: 30,
        reason: 'Regular cardiac review'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'Pending');
    assert.strictEqual(res.body.data.startTime, '10:00');
    assert.strictEqual(res.body.data.endTime, '10:30');
    assert.strictEqual(String(res.body.data.room._id || res.body.data.room), String(testRoom._id));
  });

  // Test 2: Doctor conflict detection (same doctor, overlapping time)
  it('2. Rejects booking with 409 Conflict when doctor has an overlapping appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '10:15', // Overlaps with 10:00 - 10:30
        duration: 30,
        reason: 'Second overlapping consultation attempt'
      });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /unavailable/i);
  });

  // Test 3: Room conflict detection (different doctor, same room, overlapping time)
  it('3. Rejects booking with 409 Conflict when assigned room is occupied by another doctor', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor2._id, // Different doctor, but same assigned Room TEST-901
        date: testDate,
        startTime: '10:00', // Exact overlap with Dr. testDoctor1
        duration: 30,
        reason: 'Attempting to book occupied consultation room'
      });

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /room/i);
  });

  // Test 4: Back-to-back appointment validation (10:00-10:30 and 10:30-11:00 should both succeed)
  it('4. Allows back-to-back appointments (10:30 - 11:00) without collision', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '10:30', // Starts exactly when previous slot ends
        duration: 30,
        reason: 'Back-to-back consultation'
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.startTime, '10:30');
    assert.strictEqual(res.body.data.endTime, '11:00');
  });

  // Test 5: Cancelled appointment slot freeing
  it('5. Frees the slot immediately when an appointment is cancelled, allowing re-booking', async () => {
    // First, book an appointment at 11:30 - 12:00
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '11:30',
        duration: 30,
        reason: 'Slot to be cancelled'
      });

    assert.strictEqual(bookRes.statusCode, 201);
    const appointmentId = bookRes.body.data._id;

    // Verify booking duplicate now would conflict
    const conflictRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '11:30',
        duration: 30,
        reason: 'Should conflict before cancellation'
      });
    assert.strictEqual(conflictRes.statusCode, 409);

    // Patient 1 cancels their appointment
    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patient1Token}`);

    assert.strictEqual(cancelRes.statusCode, 200);
    assert.strictEqual(cancelRes.body.data.status, 'Cancelled');

    // Patient 2 now successfully books that exact same 11:30 slot!
    const rebookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '11:30',
        duration: 30,
        reason: 'Rebooking previously cancelled slot'
      });

    assert.strictEqual(rebookRes.statusCode, 201);
    assert.strictEqual(rebookRes.body.success, true);
  });

  // Test 6: Out of working hours booking rejection
  it('6. Rejects booking requests outside doctor working hours or in the past', async () => {
    // Attempt booking at 08:00 AM (doctor starts at 09:00 AM)
    const earlyRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '08:00',
        duration: 30,
        reason: 'Too early'
      });

    assert.strictEqual(earlyRes.statusCode, 400);
    assert.match(earlyRes.body.message, /consultation hours/i);

    // Attempt booking at 17:30 PM (doctor ends at 17:00 PM)
    const lateRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '17:30',
        duration: 30,
        reason: 'Too late'
      });

    assert.strictEqual(lateRes.statusCode, 400);
    assert.match(lateRes.body.message, /consultation hours/i);

    // Attempt booking in the past
    const pastRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: '2020-01-01',
        startTime: '10:00',
        duration: 30,
        reason: 'Historical date'
      });

    assert.strictEqual(pastRes.statusCode, 400);
    assert.match(pastRes.body.message, /future/i);
  });

  // Test 7: Next-available slot search API
  it('7. Returns accurate earliest non-conflicting time via next-available slot API', async () => {
    const res = await request(app)
      .get(`/api/doctors/${testDoctor1._id}/next-available?date=${testDate}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.startTime);
    assert.ok(res.body.data.endTime);
    assert.strictEqual(res.body.data.timezone, 'Asia/Kolkata');
    assert.strictEqual(String(res.body.data.doctor.id), String(testDoctor1._id));
  });

  // Test 8: Unauthorized appointment modification prevention
  it('8. Prevents unauthorized users from modifying or cancelling another patient appointment', async () => {
    // Book an appointment for Patient 1
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '14:00',
        duration: 30,
        reason: 'Private patient consultation'
      });

    assert.strictEqual(bookRes.statusCode, 201);
    const appointmentId = bookRes.body.data._id;

    // Patient 2 attempts to cancel Patient 1's appointment
    const unauthorizedCancel = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patient2Token}`);

    assert.strictEqual(unauthorizedCancel.statusCode, 403);
    assert.strictEqual(unauthorizedCancel.body.success, false);
    assert.match(unauthorizedCancel.body.message, /forbidden|not authorized|permission/i);
  });

  // Test 9: Role-based route protection
  it('9. Enforces role-based route protection against unauthenticated and unauthorized access', async () => {
    // Unauthenticated request to admin endpoints
    const unauthRes = await request(app)
      .get('/api/admin/stats');

    assert.strictEqual(unauthRes.statusCode, 401);
    assert.strictEqual(unauthRes.body.success, false);

    // Patient attempting to access admin endpoints
    const patientForbiddenRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${patient1Token}`);

    assert.strictEqual(patientForbiddenRes.statusCode, 403);
    assert.strictEqual(patientForbiddenRes.body.success, false);
    assert.match(patientForbiddenRes.body.message, /forbidden/i);

    // Admin successfully accessing admin endpoints
    const adminAllowedRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(adminAllowedRes.statusCode, 200);
    assert.strictEqual(adminAllowedRes.body.success, true);
    assert.ok(adminAllowedRes.body.data);
  });

  // Test 10: Signup flow separation (no auto-login, duplicate prevention)
  it('10. Creates user in MongoDB on signup without issuing a token or login cookie, and rejects duplicate email', async () => {
    const newEmail = 'brand_new_patient@clinic.com';
    await User.deleteMany({ email: newEmail });

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Brand New Patient',
        email: newEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        phone: '+91 9888877771'
      });

    assert.strictEqual(signupRes.statusCode, 201);
    assert.strictEqual(signupRes.body.success, true);
    assert.strictEqual(signupRes.body.token, undefined); // Strictly decoupled from authentication
    assert.strictEqual(signupRes.body.data.email, newEmail);
    assert.strictEqual(signupRes.body.data.role, 'patient');

    // Verify cookies do NOT contain an auth session token
    const cookies = signupRes.headers['set-cookie'] || [];
    const hasAuthCookie = cookies.some(c => c.startsWith('token=') && !c.includes('token=;'));
    assert.strictEqual(hasAuthCookie, false);

    // Verify document exists in MongoDB
    const createdUser = await User.findOne({ email: newEmail });
    assert.ok(createdUser);
    assert.strictEqual(createdUser.name, 'Brand New Patient');

    // Verify duplicate registration rejection
    const duplicateRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Brand New Patient 2',
        email: newEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });

    assert.strictEqual(duplicateRes.statusCode, 409);
    assert.strictEqual(duplicateRes.body.success, false);

    // Cleanup
    await User.deleteMany({ email: newEmail });
  });

  // Test 11: Invalid registration inputs
  it('11. Rejects invalid registration inputs with descriptive 400 Bad Request', async () => {
    // Mismatched passwords
    const mismatchRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test',
        email: 'test_mismatch@clinic.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      });
    assert.strictEqual(mismatchRes.statusCode, 400);
    assert.match(mismatchRes.body.message, /passwords do not match/i);

    // Short password
    const shortRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test',
        email: 'test_short@clinic.com',
        password: '123',
        confirmPassword: '123'
      });
    assert.strictEqual(shortRes.statusCode, 400);
    assert.match(shortRes.body.message, /at least 6 characters/i);
  });

  // Test 12: Login with newly created credentials
  it('12. Allows newly registered user to log in with correct credentials, and blocks incorrect password', async () => {
    const testEmail = 'login_verify_patient@clinic.com';
    const testPassword = 'SecurePassword123!';
    await User.deleteMany({ email: testEmail });

    // Register
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Login Verify Patient',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      });

    // Attempt login with wrong password
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
        role: 'patient'
      });
    assert.strictEqual(wrongPassRes.statusCode, 401);
    assert.strictEqual(wrongPassRes.body.success, false);

    // Login with correct password
    const correctLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
        role: 'patient'
      });
    assert.strictEqual(correctLoginRes.statusCode, 200);
    assert.strictEqual(correctLoginRes.body.success, true);
    assert.ok(correctLoginRes.body.token);
    assert.strictEqual(correctLoginRes.body.user.email, testEmail);

    // Cleanup
    await User.deleteMany({ email: testEmail });
  });

  // Test 13: Compatible-room dynamic allocation
  it('13. Automatically allocates an alternative compatible room when doctor default room is occupied', async () => {
    // 1. Dr. testDoctor2 occupies Room TEST-901 at 15:00 - 15:30
    const occupyingAppt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoctor2._id,
        date: testDate,
        startTime: '15:00',
        duration: 30,
        reason: 'Occupying Room TEST-901'
      });
    assert.strictEqual(occupyingAppt.statusCode, 201);
    assert.strictEqual(String(occupyingAppt.body.data.room._id || occupyingAppt.body.data.room), String(testRoom._id));

    // 2. Book Dr. testDoctor1 (Cardiologist, default room Room TEST-901).
    // Room TEST-901 is busy, but Room TEST-902 supports Cardiology and is free.
    const fallbackAppt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: testDoctor1._id,
        date: testDate,
        startTime: '15:00',
        duration: 30,
        reason: 'Should be automatically allocated compatible Room TEST-902'
      });

    assert.strictEqual(fallbackAppt.statusCode, 201);
    assert.strictEqual(fallbackAppt.body.success, true);
    assert.strictEqual(String(fallbackAppt.body.data.room._id || fallbackAppt.body.data.room), String(testRoom2._id));
    assert.strictEqual(fallbackAppt.body.data.room.roomNumber, 'Room TEST-902');
  });

  // Test 14: Reject when ALL compatible rooms are occupied
  it('14. Rejects with 409 Conflict when all compatible rooms for a specialty are occupied simultaneously', async () => {
    const testDoc3 = await Doctor.create({
      name: 'Dr. Test Cardiologist 2',
      email: 'test_doc3@clinic.com',
      specialty: 'TestCardiology',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingStartTime: '09:00',
      workingEndTime: '17:00',
      assignedRoom: testRoom._id,
      isActive: true
    });

    const fullConflictRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: testDoc3._id,
        date: testDate,
        startTime: '15:00',
        duration: 30,
        reason: 'All cardiology compatible rooms are full'
      });

    assert.strictEqual(fullConflictRes.statusCode, 409);
    assert.strictEqual(fullConflictRes.body.success, false);
    assert.match(fullConflictRes.body.message, /occupied/i);

    // Cleanup doc3
    await Doctor.deleteMany({ _id: testDoc3._id });
  });
});
