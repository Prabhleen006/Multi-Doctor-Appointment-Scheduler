/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Phase 2 API Client
   Centralized asynchronous REST communication with Express backend
   ========================================================================== */

const API_BASE = '/api';

const API = {
  async request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    // If a token exists in sessionStorage, pass it as Authorization header as well
    const token = sessionStorage.getItem('authToken');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      credentials: 'include', // sends and receives HttpOnly cookies
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.details = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  },

  // Authentication Endpoints
  auth: {
    async signup(userData) {
      const res = await API.request('/auth/signup', {
        method: 'POST',
        body: userData
      });
      // Signup does not authenticate the user; keep signup and login strictly decoupled
      return res;
    },

    async login(email, password, role) {
      const res = await API.request('/auth/login', {
        method: 'POST',
        body: { email, password, role }
      });
      if (res.token) {
        sessionStorage.setItem('authToken', res.token);
      }
      if (res.user) {
        sessionStorage.setItem('currentUser', JSON.stringify(res.user));
      }
      if (res.doctor) {
        sessionStorage.setItem('doctorProfile', JSON.stringify(res.doctor));
      }
      return res;
    },

    async getMe() {
      try {
        const res = await API.request('/auth/me');
        if (res.user) {
          sessionStorage.setItem('currentUser', JSON.stringify(res.user));
        }
        if (res.doctor) {
          sessionStorage.setItem('doctorProfile', JSON.stringify(res.doctor));
        }
        return res;
      } catch (err) {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('doctorProfile');
        throw err;
      }
    },

    async logout() {
      try {
        await API.request('/auth/logout', { method: 'POST' });
      } finally {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('doctorProfile');
        window.location.href = 'login.html';
      }
    }
  },

  // Doctors Endpoints
  doctors: {
    async getAll(specialty = '') {
      const query = specialty && specialty !== 'All' ? `?specialty=${encodeURIComponent(specialty)}` : '';
      return API.request(`/doctors${query}`);
    },

    async getById(id) {
      return API.request(`/doctors/${id}`);
    },

    async getAvailability(id, date, startDate, endDate) {
      let query = '';
      if (date) query = `?date=${encodeURIComponent(date)}`;
      else if (startDate && endDate) query = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      return API.request(`/doctors/${id}/availability${query}`);
    },

    async getNextAvailable(id, startDate, duration = 30) {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (duration) params.append('duration', duration);
      return API.request(`/doctors/${id}/next-available?${params.toString()}`);
    }
  },

  // Appointments Endpoints
  appointments: {
    async create(appointmentData) {
      return API.request('/appointments', {
        method: 'POST',
        body: appointmentData
      });
    },

    async getMy(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.request(`/appointments/my${query ? `?${query}` : ''}`);
    },

    async getById(id) {
      return API.request(`/appointments/${id}`);
    },

    async updateStatus(id, status, rejectionReason = '') {
      return API.request(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: { status, rejectionReason }
      });
    },

    async cancel(id) {
      return API.request(`/appointments/${id}/cancel`, {
        method: 'PATCH'
      });
    },

    async reschedule(id, rescheduleData) {
      return API.request(`/appointments/${id}/reschedule`, {
        method: 'PATCH',
        body: rescheduleData
      });
    }
  },

  // Reviews Endpoints
  reviews: {
    async getAll(doctorId = '') {
      const query = doctorId && doctorId !== 'All' ? `?doctorId=${encodeURIComponent(doctorId)}` : '';
      return API.request(`/reviews${query}`);
    },

    async create(reviewData) {
      return API.request('/reviews', {
        method: 'POST',
        body: reviewData
      });
    }
  }
};
