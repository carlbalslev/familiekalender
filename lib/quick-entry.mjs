import { addDays } from './dates.mjs';

// Deliberately small, local Danish grammar. Always reviewed before saving.
export function parseQuickEntry(text, today, defaultPerson = 'Carl') {
  let rest = text.trim();
  const personMatch = rest.match(/\b(Carl|Hilda)\b/i);
  const person = personMatch ? (/carl/i.test(personMatch[0]) ? 'Carl' : 'Hilda') : defaultPerson;
  if (personMatch) rest = rest.replace(personMatch[0], '');
  let day = today, dateFound = false;
  const relative = rest.match(/\bi\s+(overmorgen|morgen|dag)\b/i);
  const weekdays = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];
  const weekday = rest.match(/(?:på\s+)?(?:(næste|kommende|på næste)\s+)?(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)/i);
  if (relative) {
    day = addDays(today, relative[1].toLowerCase() === 'morgen' ? 1 : relative[1].toLowerCase() === 'overmorgen' ? 2 : 0);
    rest = rest.replace(relative[0], ''); dateFound = true;
  } else if (weekday) {
    const current = new Date(today + 'T12:00:00Z').getUTCDay();
    let delta = (weekdays.indexOf(weekday[2].toLowerCase()) - current + 7) % 7;
    if (delta === 0 && weekday[1]) delta = 7;
    day = addDays(today, delta); rest = rest.replace(weekday[0], ''); dateFound = true;
  }
  const dinner = rest.match(/(?:og\s+)?(?:jeg\s+)?spiser\s+(ikke\s+hjemme|hjemme|ude)/i);
  const dinner_home = !dinner || dinner[1].toLowerCase() === 'hjemme';
  if (dinner) rest = rest.replace(dinner[0], '');
  const home = rest.match(/(?:og\s+)?(?:(?:jeg\s+)?regner\s+med\s+at\s+være\s+)?(?:er\s+)?hjemme\s*(?:cirka\s*|ca\.?\s*)?(?:klokken\s*|kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?/i);
  let home_time = null;
  let warning = '';
  if (home) {
    const hour = Number(home[1]), minute = Number(home[2] || 0);
    if (hour > 23 || minute > 59) warning = 'Hjemkomsttiden kunne ikke læses. Ret den nedenfor.';
    else home_time = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    rest = rest.replace(home[0], '');
  }
  rest = rest.replace(/^\s*(?:jeg\s+)?(?:skal\s+)?(?:til\s+|spille\s+|på\s+)?/i, '').replace(/^[\s,.;]+|[\s,.;]+$/g, '').replace(/\s+(?:og|på)\s*$/i,'').replace(/\s+/g,' ').trim();
  const activity = rest ? rest[0].toUpperCase() + rest.slice(1) : '';
  if (!dateFound) warning = [warning, 'Ingen dato genkendt — i dag er valgt. Kontrollér datoen.'].filter(Boolean).join(' ');
  return {day, person, activity, home_time, dinner_home, warning};
}
