/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Scheduler Engine
   Interval Conflict Detection, Next Available Slot & Time Verification
   ========================================================================== */

const SchedulerEngine = {
  /**
   * Fundamental Interval Overlap Check
   * Returns true if two time intervals [newStart, newEnd) and [existingStart, existingEnd) overlap.
   */
  hasConflict(newStart, newEnd, existingStart, existingEnd) {
    return newStart < existingEnd && newEnd > existingStart;
  },

  timeToMinutes(timeStr) {
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

  /**
   * Verifies if the appointment start date/time has passed compared to current system time
   */
  isAppointmentTimePassed(dateStr, startTimeStr) {
    if (!dateStr || !startTimeStr) return false;
    const apptDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const now = new Date();
    return now >= apptDateTime;
  },

  checkDoctorConflict(doctorId, date, newStart, newEnd, excludeAppointmentId = null) {
    const appointments = DataStore.getAppointments();
    const newStartMin = this.timeToMinutes(newStart);
    const newEndMin = this.timeToMinutes(newEnd);

    const doctorAppts = appointments.filter(a => {
      const isSameDoctor = Number(a.doctorId) === Number(doctorId);
      const isSameDate = a.date === date;
      const isActive = a.status === 'Approved' || a.status === 'Pending' || a.status === 'Completed';
      const notExcluded = excludeAppointmentId ? Number(a.id) !== Number(excludeAppointmentId) : true;
      return isSameDoctor && isSameDate && isActive && notExcluded;
    });

    return doctorAppts.some(a => {
      const existingStartMin = this.timeToMinutes(a.startTime);
      const existingEndMin = this.timeToMinutes(a.endTime);
      return this.hasConflict(newStartMin, newEndMin, existingStartMin, existingEndMin);
    });
  },

  checkRoomConflict(roomId, date, newStart, newEnd, excludeAppointmentId = null) {
    const appointments = DataStore.getAppointments();
    const newStartMin = this.timeToMinutes(newStart);
    const newEndMin = this.timeToMinutes(newEnd);

    const roomAppts = appointments.filter(a => {
      const isSameRoom = Number(a.roomId) === Number(roomId);
      const isSameDate = a.date === date;
      const isActive = a.status === 'Approved' || a.status === 'Pending' || a.status === 'Completed';
      const notExcluded = excludeAppointmentId ? Number(a.id) !== Number(excludeAppointmentId) : true;
      return isSameRoom && isSameDate && isActive && notExcluded;
    });

    return roomAppts.some(a => {
      const existingStartMin = this.timeToMinutes(a.startTime);
      const existingEndMin = this.timeToMinutes(a.endTime);
      return this.hasConflict(newStartMin, newEndMin, existingStartMin, existingEndMin);
    });
  },

  checkAvailability(doctorId, roomId, date, newStart, newEnd, excludeAppointmentId = null) {
    let targetRoomId = roomId;
    if (!targetRoomId && doctorId) {
      const assignedRoom = DataStore.getDoctorRoom(doctorId);
      if (assignedRoom) targetRoomId = assignedRoom.id;
    }

    const doctorHasConflict = this.checkDoctorConflict(doctorId, date, newStart, newEnd, excludeAppointmentId);
    const roomHasConflict = targetRoomId ? this.checkRoomConflict(targetRoomId, date, newStart, newEnd, excludeAppointmentId) : false;

    const available = !doctorHasConflict && !roomHasConflict;

    let reason = "Doctor and Assigned Consultation Room are both available!";
    if (doctorHasConflict && roomHasConflict) {
      reason = "Both Doctor and Assigned Consultation Room are unavailable at this slot.";
    } else if (doctorHasConflict) {
      reason = "Doctor is unavailable at the requested time slot.";
    } else if (roomHasConflict) {
      reason = "The assigned consultation room is unavailable at this time.";
    }

    return {
      available,
      doctorConflict: doctorHasConflict,
      roomConflict: roomHasConflict,
      reason
    };
  },

  suggestNextAvailableSlot(doctorId, startDateStr, durationMinutes = 30, optionalRoomId = null) {
    const doctor = DataStore.getDoctorById(doctorId);
    if (!doctor) return null;

    const assignedRoom = DataStore.getDoctorRoom(doctorId);
    const targetRoomId = optionalRoomId || (assignedRoom ? assignedRoom.id : null);
    if (!targetRoomId) return null;

    const startWorkMin = this.timeToMinutes(doctor.startTime || "09:00");
    const endWorkMin = this.timeToMinutes(doctor.endTime || "17:00");

    let currentDate = new Date(startDateStr);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateIso = currentDate.toISOString().split('T')[0];
      const dayOfWeekStr = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

      if (doctor.workingDays.includes(dayOfWeekStr)) {
        for (let currentSlotMin = startWorkMin; currentSlotMin + durationMinutes <= endWorkMin; currentSlotMin += 30) {
          const slotStartStr = this.minutesToTime(currentSlotMin);
          const slotEndStr = this.minutesToTime(currentSlotMin + durationMinutes);

          const now = new Date();
          const isToday = dateIso === now.toISOString().split('T')[0];
          if (isToday) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (currentSlotMin <= nowMinutes) {
              continue;
            }
          }

          const availability = this.checkAvailability(doctorId, targetRoomId, dateIso, slotStartStr, slotEndStr);

          if (availability.available) {
            const room = DataStore.getRooms().find(r => Number(r.id) === Number(targetRoomId));
            return {
              date: dateIso,
              dayOfWeek: dayOfWeekStr,
              startTime: slotStartStr,
              endTime: slotEndStr,
              formattedStart: this.format12Hour(slotStartStr),
              formattedEnd: this.format12Hour(slotEndStr),
              duration: durationMinutes,
              doctorId: doctor.id,
              doctorName: doctor.name,
              roomId: room ? room.id : targetRoomId,
              roomNumber: room ? room.roomNumber : `Room ${targetRoomId}`
            };
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  }
};
