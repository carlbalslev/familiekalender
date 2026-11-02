import {test} from 'node:test';
import assert from 'node:assert/strict';
import {todayKey,addDays,blankEntry} from '../lib/dates.mjs';
test('Copenhagen date includes midnight across UTC date boundary', () => {
  assert.equal(todayKey(new Date('2026-11-02T23:30:00Z')), '2026-11-03');
  assert.equal(todayKey(new Date('2026-07-02T22:30:00Z')), '2026-07-03');
});
test('days remain consecutive across DST, leap day and year boundaries', () => {
  assert.equal(addDays('2026-03-28',2),'2026-03-30');
  assert.equal(addDays('2026-10-24',2),'2026-10-26');
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
});
test('new day has no activity or home time and defaults to dinner home', () => {
  assert.deepEqual(blankEntry('2026-11-02','Carl'),{day:'2026-11-02',person:'Carl',activity:'',home_time:null,dinner_home:true});
});
