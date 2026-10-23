/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Phase 2 Auth Module
   Connects to Express /api/auth endpoints with server-enforced RBAC
   ========================================================================== */

const AuthModule = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  async register(userData) {
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

    try {
      const res = await API.auth.signup({
        name,
        email,
        password,
        confirmPassword,
        phone
      });
      return {
        success: true,
        message: res.message || 'Patient account created successfully! Please log in.',
        user: res.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed.'
      };
    }
  },

  async login(email, password, selectedRole) {
    if (!email || !password || !selectedRole) {
      return { success: false, message: 'Please fill in all required fields.' };
    }

    try {
      const res = await API.auth.login(email, password, selectedRole);
      const user = res.user;

      let redirectUrl = 'patient-dashboard.html';
      if (user.role === 'doctor') {
        redirectUrl = 'doctor-dashboard.html';
      } else if (user.role === 'admin') {
        redirectUrl = 'appointments.html';
      }

      return {
        success: true,
        message: `Welcome, ${user.name}! Redirecting...`,
        user,
        redirectUrl
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed. Invalid credentials.'
      };
    }
  },

  async logout() {
    await API.auth.logout();
  },

  async checkSession() {
    try {
      const res = await API.auth.getMe();
      return res.user;
    } catch (e) {
      return null;
    }
  },

  async enforceGuard(requiredRole = null) {
    try {
      const res = await API.auth.getMe();
      const user = res.user;

      if (!user) {
        window.location.href = 'login.html';
        return null;
      }

      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        if (user.role === 'doctor') {
          window.location.href = 'doctor-dashboard.html';
        } else {
          window.location.href = 'patient-dashboard.html';
        }
        return null;
      }

      return user;
    } catch (error) {
      window.location.href = 'login.html';
      return null;
    }
  }
};
