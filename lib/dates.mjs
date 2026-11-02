export function todayKey(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(key, amount) { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0,10); }
export function blankEntry(day, person) { return {day,person,activity:'',home_time:null,dinner_home:true}; }
