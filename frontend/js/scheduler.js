/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Phase 2 Scheduler & Calendar
   Time utilities, Weekly Appointment Calendar Component & Live Conflict Engine
   ========================================================================== */

const SchedulerEngine = {
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  },

  format12Hour(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  },

  /**
   * Weekly Appointment Calendar Class
   * Renders interactive 7-day schedule with prev/next navigation
   */
  WeeklyCalendar: class {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.currentMonday = this.getMonday(new Date());
      this.doctorId = options.doctorId || null;
      this.role = options.role || 'patient';
      this.onSlotClick = options.onSlotClick || null;
      this.appointments = [];
      this.doctorWorkingDays = options.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    }

    getMonday(d) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday;
    }

    setDoctorId(doctorId, workingDays = null) {
      this.doctorId = doctorId;
      if (workingDays) this.doctorWorkingDays = workingDays;
      this.loadWeek();
    }

    setAppointments(appointments) {
      this.appointments = appointments || [];
      this.render();
    }

    prevWeek() {
      this.currentMonday.setDate(this.currentMonday.getDate() - 7);
      this.loadWeek();
    }

    nextWeek() {
      this.currentMonday.setDate(this.currentMonday.getDate() + 7);
      this.loadWeek();
    }

    today() {
      this.currentMonday = this.getMonday(new Date());
      this.loadWeek();
    }

    async loadWeek() {
      if (!this.container) return;

      const startDate = this.currentMonday.toISOString().split('T')[0];
      const sunday = new Date(this.currentMonday);
      sunday.setDate(sunday.getDate() + 6);
      const endDate = sunday.toISOString().split('T')[0];

      if (this.doctorId) {
        try {
          const res = await API.doctors.getAvailability(this.doctorId, null, startDate, endDate);
          if (res.doctor && res.doctor.workingDays) {
            this.doctorWorkingDays = res.doctor.workingDays;
          }
          this.appointments = res.bookedSlots || [];
        } catch (e) {
          console.error('[WeeklyCalendar] Failed to fetch doctor availability:', e);
        }
      } else if (this.role === 'patient') {
        try {
          const res = await API.appointments.getMy();
          this.appointments = res.data || [];
        } catch (e) {
          console.error('[WeeklyCalendar] Failed to fetch patient appointments:', e);
        }
      }

      this.render();
    }

    render() {
      if (!this.container) return;

      const sunday = new Date(this.currentMonday);
      sunday.setDate(sunday.getDate() + 6);

      const weekRangeTitle = `${this.currentMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      let daysHtml = '';
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const todayStr = new Date().toISOString().split('T')[0];

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(this.currentMonday);
        dayDate.setDate(dayDate.getDate() + i);
        const dateIso = dayDate.toISOString().split('T')[0];
        const dayName = dayNames[i];
        const isToday = dateIso === todayStr;
        const isWorkingDay = this.doctorWorkingDays.includes(dayName);

        // Find appointments for this day
        const dayAppts = this.appointments.filter(a => a.date === dateIso && a.status !== 'Cancelled' && a.status !== 'Rejected');

        let apptsHtml = '';
        if (dayAppts.length === 0) {
          apptsHtml = `
            <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
              ${isWorkingDay ? 'No booked appointments' : 'Doctor off duty'}
            </div>
          `;
        } else {
          apptsHtml = dayAppts.map(a => `
            <div class="calendar-slot-badge ${a.status || 'Approved'}" style="margin-bottom: 0.35rem; padding: 0.35rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; background: var(--bg-card-subtle); border-left: 3px solid var(--primary);">
              <div><i class="fas fa-clock" style="font-size: 0.65rem;"></i> ${SchedulerEngine.format12Hour(a.startTime)}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${a.patient?.name || a.doctor?.name || a.roomNumber || a.reason || 'Booked Slot'}</div>
            </div>
          `).join('');
        }

        daysHtml += `
          <div class="calendar-day-col ${isToday ? 'today' : ''} ${!isWorkingDay ? 'off-duty' : ''}" style="background: ${isToday ? 'var(--primary-light)' : 'var(--bg-card)'}; border: 1.5px solid ${isToday ? 'var(--purple-primary)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 0.8rem; display: flex; flex-direction: column; min-height: 140px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem; margin-bottom: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.85rem; color: ${isToday ? 'var(--primary-dark)' : 'var(--text-main)'};">${dayName.slice(0, 3)}</span>
              <span style="font-size: 0.8rem; font-family: var(--font-number); font-weight: 700; background: ${isToday ? 'var(--purple-primary)' : 'var(--bg-card-subtle)'}; color: ${isToday ? 'white' : 'var(--text-muted)'}; padding: 0.1rem 0.45rem; border-radius: 12px;">
                ${dayDate.getDate()}
              </span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column;">
              ${apptsHtml}
            </div>
          </div>
        `;
      }

      this.container.innerHTML = `
        <div class="calendar-wrapper" style="margin-top: 1.5rem;">
          <div class="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.8rem;">
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.1rem;">
                <i class="fas fa-calendar-week" style="color: var(--primary);"></i> Weekly Schedule Overview
              </h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">${weekRangeTitle}</p>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="calPrevBtn"><i class="fas fa-chevron-left"></i> Prev</button>
              <button type="button" class="btn btn-secondary btn-sm" id="calTodayBtn">Today</button>
              <button type="button" class="btn btn-secondary btn-sm" id="calNextBtn">Next <i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
          <div class="calendar-grid-7" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem;">
            ${daysHtml}
          </div>
        </div>
      `;

      // Event listeners for navigation
      document.getElementById('calPrevBtn')?.addEventListener('click', () => this.prevWeek());
      document.getElementById('calNextBtn')?.addEventListener('click', () => this.nextWeek());
      document.getElementById('calTodayBtn')?.addEventListener('click', () => this.today());
    }
  }
};
