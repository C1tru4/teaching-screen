// 功能：时间与节次相关的工具函数。
// 自包含类型（不再依赖 ./types）。
export type PeriodIndex = 1|2|3|4|5|6|7|8;
export interface PeriodTime { p: PeriodIndex; start: string; end: string; }

/** 夏令时：5/1–10/7（含） */
export function isSummer(date: Date): boolean {
  const y = date.getFullYear();
  const start = new Date(y, 4, 1);
  const end = new Date(y, 9, 7, 23, 59, 59, 999);
  return date >= start && date <= end;
}

/** 返回 P1..P8 的时间表（仅时间段，Asia/Shanghai）
 * 每节课50分钟，小课间10分钟，大课间20分钟
 * 冬令时下午14:00开始，夏令时下午14:30开始
 */
export function periodRange(date: Date): PeriodTime[] {
  const summer = isSummer(date);
  const am: PeriodTime[] = [
    { p: 1, start: '08:00', end: '08:50' },
    { p: 2, start: '09:00', end: '09:50' },
    { p: 3, start: '10:10', end: '11:00' },
    { p: 4, start: '11:10', end: '12:00' }
  ];
  const pm: PeriodTime[] = summer
    ? [
        { p: 5, start: '14:30', end: '15:20' },
        { p: 6, start: '15:30', end: '16:20' },
        { p: 7, start: '16:40', end: '17:30' },
        { p: 8, start: '17:40', end: '18:30' }
      ]
    : [
        { p: 5, start: '14:00', end: '14:50' },
        { p: 6, start: '15:00', end: '15:50' },
        { p: 7, start: '16:10', end: '17:00' },
        { p: 8, start: '17:10', end: '18:00' }
      ];
  return [...am, ...pm];
}

/** 解析 YYYY-MM-DD 为本地时间日期 */
export function parseDate(dateStr?: string): Date {
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

/** 获取一周区间（周一 00:00:00 ~ 周日 23:59:59） */
export function weekRange(date: Date): { monday: Date; sunday: Date } {
  const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

/** 学期周号（从 1 开始；先对齐到周一再算） */
export function weekNoOf(date: Date, semesterStartMonday: Date): number {
  const ms = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = ms(date) - ms(semesterStartMonday);
  if (diff < 0) return 0;
  return Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1;
}

/** 学期所属年份：取学期起始所在年 */
export function semesterYear(semesterStartMonday: Date): number {
  return semesterStartMonday.getFullYear();
}

/** 某天某节的“HH:mm-HH:mm”文案 */
export function periodLabelOf(date: Date, period: PeriodIndex): string {
  const pr = periodRange(date).find(x => x.p === period)!;
  return `${pr.start}-${pr.end}`;
}

/** 是否工作日（默认周一到周五） */
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
