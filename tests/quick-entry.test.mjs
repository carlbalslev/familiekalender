import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickEntry } from '../lib/quick-entry.mjs';
test('spoken sentence becomes a reviewable plan', () => {
  const result = parseQuickEntry('jeg skal spille padel på næste onsdag, og regner med at være hjemme klokken 19 og jeg spiser hjemme', '2026-11-03', 'Hilda');
  assert.deepEqual(result, {day:'2026-11-04',person:'Hilda',activity:'Padel',home_time:'19:00',dinner_home:true,warning:''});
});
test('person, tomorrow, minutes and dinner out', () => {
  const r = parseQuickEntry('Carl yoga i morgen, hjemme 20.30, spiser ikke hjemme', '2026-12-31', 'Hilda');
  assert.equal(r.day,'2027-01-01'); assert.equal(r.person,'Carl'); assert.equal(r.home_time,'20:30'); assert.equal(r.dinner_home,false); assert.equal(r.activity,'Yoga');
});
test('next same weekday means seven days later', () => {
  assert.equal(parseQuickEntry('Padel næste tirsdag','2026-11-03').day,'2026-11-10');
});
test('missing date warns; invalid time is never silently saved', () => {
  const r = parseQuickEntry('Padel hjemme 29:90','2026-11-03');
  assert.equal(r.home_time,null); assert.match(r.warning,/Ret den/); assert.match(r.warning,/Ingen dato/);
});
