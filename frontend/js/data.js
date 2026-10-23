/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Phase 2 Data Bridge
   Asynchronous database-backed data cache replacing local storage dependencies
   ========================================================================== */

const DataStore = {
  _cachedDoctors: [],
  _cachedRooms: [],

  async getDoctors(specialty = '') {
    try {
      const res = await API.doctors.getAll(specialty);
      this._cachedDoctors = res.data || [];
      return this._cachedDoctors;
    } catch (e) {
      console.error('[DataStore] Failed to fetch doctors from server:', e);
      return [];
    }
  },

  async getDoctorById(id) {
    try {
      const res = await API.doctors.getById(id);
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async getDoctorRoom(doctorId) {
    const doctor = await this.getDoctorById(doctorId);
    return doctor ? doctor.assignedRoom : null;
  },

  async getAppointments(status = '') {
    try {
      const res = await API.appointments.getMy(status ? { status } : {});
      return res.data || [];
    } catch (e) {
      console.error('[DataStore] Failed to fetch appointments:', e);
      return [];
    }
  },

  async getReviews(doctorId = '') {
    try {
      const res = await API.reviews.getAll(doctorId);
      return res.data || [];
    } catch (e) {
      console.error('[DataStore] Failed to fetch reviews:', e);
      return [];
    }
  },

  getLoggedInUser() {
    try {
      const stored = sessionStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  logoutUser() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('doctorProfile');
  }
};
