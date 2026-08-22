/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Auth Module
   Authentication Simulation: Patients via LocalStorage vs Doctors via Fixed 10 Predefined Accounts
   ========================================================================== */

const AuthModule = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Registers a new Patient account into LocalStorage.
   * Strict Rule: Only Patients can register. Doctor accounts are predefined by the system.
   */
  register(userData) {
    const { name, email, password, confirmPassword, phone } = userData;

    if (!name || !email || !password || !phone) {
      return { success: false, message: 'All fields are required.' };
    }

    if (!this.isValidEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    // Check duplicate email against patients database
    const users = DataStore.getUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newPatient = {
      id: Date.now(),
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: "patient" // Strictly patient
    };

    DataStore.saveUser(newPatient);

    return { success: true, message: 'Patient account created successfully! You can now log in.', user: newPatient };
  },

  /**
   * Dual-Source Login Authentication Simulation
   */
  login(email, password, selectedRole) {
    if (!email || !password || !selectedRole) {
      return { success: false, message: 'Please fill in all required fields.' };
    }

    if (selectedRole === 'doctor') {
      // Authenticate strictly against predefined 10 doctors
      const doctor = DataStore.findPredefinedDoctor(email, password);

      if (!doctor) {
        return {
          success: false,
          message: 'Invalid doctor credentials. Only registered clinic doctors can login.'
        };
      }

      const doctorUserSession = {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialty: doctor.specialty,
        role: 'doctor'
      };

      DataStore.setLoggedInUser(doctorUserSession);

      return {
        success: true,
        message: `Welcome, ${doctor.name}! Redirecting to Doctor Dashboard...`,
        user: doctorUserSession,
        redirectUrl: 'doctor-dashboard.html'
      };
    } else {
      // Authenticate Patient against LocalStorage users
      const users = DataStore.getUsers();
      const patient = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!patient) {
        return { success: false, message: 'No patient account found with this email address.' };
      }

      if (patient.password !== password) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const patientSession = {
        ...patient,
        role: 'patient'
      };

      DataStore.setLoggedInUser(patientSession);

      return {
        success: true,
        message: `Welcome back, ${patient.name}! Redirecting to Patient Dashboard...`,
        user: patientSession,
        redirectUrl: 'patient-dashboard.html'
      };
    }
  },

  resetPassword(email, newPassword, confirmPassword) {
    if (!email || !newPassword || !confirmPassword) {
      return { success: false, message: 'All fields are required.' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: 'New passwords do not match.' };
    }

    const updated = DataStore.updateUserPassword(email, newPassword);
    if (updated) {
      return { success: true, message: 'Password successfully updated! Redirecting to login...' };
    }

    return { success: false, message: 'Email address not found in registered patient accounts.' };
  },

  logout() {
    DataStore.logoutUser();
    window.location.href = 'login.html';
  },

  enforceGuard(requiredRole = null) {
    const user = DataStore.getLoggedInUser();

    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      if (user.role === 'doctor') {
        window.location.href = 'doctor-dashboard.html';
      } else {
        window.location.href = 'patient-dashboard.html';
      }
      return null;
    }

    return user;
  }
};
