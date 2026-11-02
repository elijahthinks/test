const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const num = new Intl.NumberFormat("en-GB");

export const formatDate = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatMonth = (iso: string) => monthFmt.format(new Date(`${iso}T00:00:00Z`));
export const formatNumber = (n: number) => num.format(n);
export const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
