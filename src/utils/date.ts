const DAY = 24 * 60 * 60 * 1000;
export { DAY };

export const startOfDay = (t: number | Date = Date.now()): number => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Arabic school week starts on Sunday. */
export const startOfWeek = (t: number | Date = Date.now()): number => {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
};

export const startOfMonth = (t: number | Date = Date.now()): number => {
  const d = new Date(startOfDay(t));
  d.setDate(1);
  return d.getTime();
};

export const dayKey = (t: number | Date = Date.now()): string => {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const timeFmt = new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('ar', { weekday: 'short' });
const monthFmt = new Intl.DateTimeFormat('ar', { month: 'long' });

export const formatTime = (t: number) => timeFmt.format(t);
export const formatDate = (t: number) => dateFmt.format(t);
export const formatShortDate = (t: number) => shortDateFmt.format(t);
export const formatWeekday = (t: number) => weekdayFmt.format(t);
export const formatMonth = (t: number) => monthFmt.format(t);

/** "اليوم 9:20" / "أمس 10:15" / "12 مارس 9:00" */
export function formatRelative(t: number): string {
  const today = startOfDay();
  if (t >= today) return `اليوم ${formatTime(t)}`;
  if (t >= today - DAY) return `أمس ${formatTime(t)}`;
  return `${formatShortDate(t)} ${formatTime(t)}`;
}
