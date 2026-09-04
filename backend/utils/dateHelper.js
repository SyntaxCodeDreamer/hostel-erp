/**
 * Utility functions for precise leave date and time calculations
 */

/**
 * Combines a date object or ISO string with a time string (e.g. "09:00", "09:00 AM", "22:30")
 * to produce a local Date object representing the exact start of leave.
 */
const getLeaveStartDateTime = (fromDate, fromTime) => {
  if (!fromDate) return null;
  const d = new Date(fromDate);
  if (isNaN(d.getTime())) return null;

  // Extract year, month, date from UTC (standard for stored ISO date strings)
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  let hours = 0;
  let minutes = 0;

  if (fromTime && typeof fromTime === 'string' && fromTime.trim()) {
    const raw = fromTime.trim();
    const isPM = /pm/i.test(raw);
    const isAM = /am/i.test(raw);
    const parts = raw.replace(/[^\d:]/g, '').split(':');
    if (parts.length >= 1) {
      let h = parseInt(parts[0], 10);
      let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
      if (!isNaN(h)) {
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
      }
      if (!isNaN(m)) minutes = m;
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
};

/**
 * Combines a date object or ISO string with a time string (e.g. "18:00", "06:00 PM", "23:00")
 * to produce a local Date object representing the exact end of leave.
 */
const getLeaveEndDateTime = (toDate, toTime) => {
  if (!toDate) return null;
  const d = new Date(toDate);
  if (isNaN(d.getTime())) return null;

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (toTime && typeof toTime === 'string' && toTime.trim()) {
    const raw = toTime.trim();
    const isPM = /pm/i.test(raw);
    const isAM = /am/i.test(raw);
    const parts = raw.replace(/[^\d:]/g, '').split(':');
    if (parts.length >= 1) {
      let h = parseInt(parts[0], 10);
      let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
      if (!isNaN(h)) {
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
        seconds = 0;
      }
      if (!isNaN(m)) minutes = m;
    }
  }

  return new Date(year, month, day, hours, minutes, seconds, 999);
};

/**
 * Checks whether the given leave request is currently active at the provided time.
 */
const isLeaveCurrentlyActive = (leave, now = new Date()) => {
  if (!leave) return false;
  const status = (leave.status || '').toLowerCase();
  if (status !== 'approved') return false;

  const start = getLeaveStartDateTime(leave.fromDate, leave.fromTime);
  const end = getLeaveEndDateTime(leave.toDate, leave.toTime);

  if (!start || !end) return false;
  return now >= start && now <= end;
};

module.exports = {
  getLeaveStartDateTime,
  getLeaveEndDateTime,
  isLeaveCurrentlyActive
};
