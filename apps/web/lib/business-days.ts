// Business day helpers (Mon–Fri). No holidays; weekend -> previous business day.
export const isWeekend = (d: Date) => {
  const day = d.getDay(); // 0 Sun ... 6 Sat
  return day === 0 || day === 6;
};

export const clone = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const prevBusinessDay = (d: Date) => {
  const x = clone(d);
  while (isWeekend(x)) x.setDate(x.getDate() - 1);
  return x;
};

export const nextBusinessDay = (d: Date) => {
  const x = clone(d);
  while (isWeekend(x)) x.setDate(x.getDate() + 1);
  return x;
};

// Add N business days forward (skips Sat/Sun)
export const addBusinessDays = (d: Date, n: number) => {
  const x = clone(d);
  let added = 0;
  while (added < n) {
    x.setDate(x.getDate() + 1);
    if (!isWeekend(x)) added++;
  }
  return x;
};

// Last business day of a month (Mon–Fri)
export const lastBusinessDayOfMonth = (year: number, monthIndex: number) => {
  const last = new Date(year, monthIndex + 1, 0); // last calendar day
  return prevBusinessDay(last);
};
