export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}

export function localDayRange(value: string): { from: string; to: string } {
  const safe = validLocalDate(value) ? value : localDate();
  const start = new Date(`${safe}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function appointmentTime(date: string, time: string): string {
  if (!validLocalDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a valid date and time.');
  const value = new Date(`${date}T${time}:00`);
  const clock = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (localDate(value) !== date || clock !== time) throw new Error('This local time is unavailable due to the daylight saving change. Select another time.');
  return value.toISOString();
}
