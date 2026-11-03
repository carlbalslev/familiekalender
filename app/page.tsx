'use client';
import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import ThemeToggle from './theme-toggle';
import { parseQuickEntry } from '../lib/quick-entry.mjs';
import { todayKey, addDays, blankEntry } from '../lib/dates.mjs';

type Person = 'Carl' | 'Hilda';
type Entry = { day: string; person: Person; activity: string; home_time: string | null; dinner_home: boolean; revision?: number };
const people: Person[] = ['Carl', 'Hilda'];
const id = (e: Entry) => `${e.day}:${e.person}`;
const demoKey = 'carl-hilda-demo-v1';
export default function Calendar() {
  const [today, setToday] = useState('');
  const [count, setCount] = useState(35);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Entry | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickReview, setQuickReview] = useState(false);
  const [quickWarning, setQuickWarning] = useState('');
  const [myPerson, setMyPerson] = useState<Person>('Carl');
  const [away, setAway] = useState(false);
  const first = useRef<HTMLElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    const tick = () => setToday(todayKey()); tick();
    const timer = setInterval(tick, 30000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!supabase) { try { setEntries(JSON.parse(localStorage.getItem(demoKey) || '{}')); } catch { setError('Lokale prøvedata kunne ikke læses.'); } setLoaded(true); return; }
    const client = supabase;
    client.auth.getSession().then(({ data, error }) => { setSession(data.session); setAuthReady(true); if (error) setError('Login kunne ikke hentes. Prøv igen.'); });
    const { data } = client.auth.onAuthStateChange((_event, next) => { setSession(next); setEntries({}); setLoaded(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !session || !today) return;
    const client = supabase;
    let active = true, request = 0;
    const refresh = async () => {
      const n = ++request;
      const membership = await client.from('family_members').select('person').eq('user_id', session.user.id).maybeSingle();
      if (!active || n !== request) return;
      if (membership.error || !membership.data) {
        setEntries({}); setLoaded(false); setStatus('Ingen adgang');
        setError('Denne konto har ikke adgang til familiekalenderen. Log ud og brug din godkendte mailadresse.');
        return;
      }
      setMyPerson(membership.data.person as Person);
      const { data, error } = await client.from('calendar_entries').select('*').gte('day', today).lte('day', addDays(today, count - 1));
      if (!active || n !== request) return;
      if (error) { setError('Kalenderen kunne ikke hentes. Kontrollér forbindelse og adgang.'); setStatus('Forbindelsesfejl'); return; }
      setEntries(Object.fromEntries((data as Entry[]).map(e => [id(e), e]))); setLoaded(true);
    };
    void refresh();
    const channel = client.channel('family-calendar').on('postgres_changes', {event:'*',schema:'public',table:'calendar_entries'}, () => void refresh()).subscribe(state => {
      if (!active) return;
      if (state === 'SUBSCRIBED') { setStatus('Synkroniseret'); void refresh(); }
      else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') setStatus('Forbindelse afbrudt · prøver igen');
    });
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const offline = () => setStatus('Offline · ændringer kan ikke gemmes');
    window.addEventListener('online', refresh); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', visible);
    return () => { active = false; void client.removeChannel(channel); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', visible); };
  }, [session, today, count]);
  useEffect(() => {
    if (!first.current || !today || !authReady || (supabase && !session)) return;
    const observer = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), {rootMargin:'-115px 0px 0px 0px'});
    observer.observe(first.current); return () => observer.disconnect();
  }, [today, session, authReady]);
  useEffect(() => {
    if (!more.current) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setCount(n => n + 35); }, {rootMargin:'500px'});
    observer.observe(more.current); return () => observer.disconnect();
  }, [today, session, authReady]);
  useEffect(() => { if (draft && !dialog.current?.open) dialog.current?.showModal(); }, [draft]);
  function close() { if (saving.current) return; dialog.current?.close(); setDraft(null); setQuickReview(false); setError(''); opener.current?.focus(); }
  function edit(day: string, person: Person, target: HTMLElement) { opener.current = target; setError(''); setDraft({...entries[`${day}:${person}`] || blankEntry(day, person)}); }
  function previewQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!quickText.trim() || !loaded) return;
    const parsed = parseQuickEntry(quickText, today, myPerson);
    opener.current = document.activeElement as HTMLElement;
    setQuickWarning(parsed.warning); setError(''); setQuickReview(true);
    setDraft({day:parsed.day,person:parsed.person as Person,activity:parsed.activity,home_time:parsed.home_time,dinner_home:parsed.dinner_home,revision:entries[parsed.day+':'+parsed.person]?.revision});
  }
  function changeQuickTarget(day: string, person: Person) {
    if (draft) setDraft({...draft, day, person, revision:entries[day+':'+person]?.revision});
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!draft || saving.current) return;
    const fields = new FormData(e.currentTarget as HTMLFormElement);
    saving.current = true; setBusy(true); setError('');
    try {
      const value = {...draft, activity:String(fields.get('activity') || '').trim(), home_time:String(fields.get('home_time') || '') || null, dinner_home:fields.has('dinner_home')};
      setDraft(value);
      if (supabase) {
        const result = value.revision
          ? await supabase.from('calendar_entries').update({activity:value.activity, home_time:value.home_time, dinner_home:value.dinner_home}).eq('day', value.day).eq('person', value.person).eq('revision', value.revision).select().single()
          : await supabase.from('calendar_entries').insert(value).select().single();
        if (result.error) throw new Error(result.error.code === '23505' || result.error.code === 'PGRST116' ? 'Dagen er ændret på en anden enhed. Luk og åbn den igen for at se den nyeste version.' : 'Kunne ikke gemme. Kontrollér internetforbindelsen og prøv igen.');
        setEntries(old => ({...old, [id(value)]:result.data as Entry}));
      } else {
        const next = {...entries,[id(value)]:value}; localStorage.setItem(demoKey, JSON.stringify(next)); setEntries(next);
      }
      if (quickReview) setQuickText('');
      saving.current = false; close();
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunne ikke gemme.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    const fields = new FormData(e.currentTarget as HTMLFormElement);
    setBusy(true); setError('');
    try {
      const {error} = await supabase!.auth.signInWithPassword({email:email.trim(),password:String(fields.get('password') || '')});
      if (error) throw error;
      setStatus('');
    } catch { setError('Kunne ikke logge ind. Kontrollér mailadresse og adgangskode, og prøv igen.'); } finally { setBusy(false); }
  }
  if (!today || !authReady) return <main className="welcome"><p>Henter kalender…</p></main>;
  if (supabase && !session) return <main className="welcome"><div className="welcome-top"><span className="eyebrow">VORES HVERDAG</span><ThemeToggle /></div><h1>Ude <span>&</span> Hjemme</h1><p>En fælles kalender. Lidt mere overblik.</p>
    <form onSubmit={login} aria-busy={busy}>
      <label htmlFor="email">Din mailadresse</label><input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="password">Adgangskode</label><input id="password" name="password" type="password" autoComplete="current-password" required disabled={busy} aria-describedby="login-help" />
      <button className="primary login-submit" disabled={busy}>{busy ? 'Logger ind…' : 'Log ind'}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    <p id="login-help" className="login-help">Appen husker dit login på denne enhed.</p>
    <details className="password-help"><summary>Glemt adgangskoden?</summary><p>Få hjælp af den, der har sat appen op, til at få en ny adgangskode.</p></details>
  </main>;
  return <>
    <header><div className="heading"><div><span className="eyebrow">FÆLLES KALENDER</span><h1>Ude <span>&</span> Hjemme</h1></div><div className="header-actions"><ThemeToggle />{supabase && <button className="logout" onClick={() => void supabase!.auth.signOut().then(({error}) => { if (error) setError('Kunne ikke logge ud. Prøv igen.'); })}>Log ud</button>}</div></div><div className="columns"><span>Carl</span><span>Hilda</span></div></header>
    <main className="calendar">
      {!supabase && <p className="notice">Prøvevisning · gemmes kun på denne enhed</p>}
      {supabase && <p className="sync" role="status">{status || 'Forbinder…'}</p>}
      {error && !draft && <p className="error" role="alert">{error}</p>}
      {supabase && !loaded && <p>Henter kalender…</p>}
      <form className="quick-entry" onSubmit={previewQuick}>
        <label htmlFor="quick-text">Hurtig indtastning</label>
        <input id="quick-text" name="quick-text" type="text" maxLength={300} placeholder="Padel onsdag, hjemme 19" value={quickText} onChange={e => setQuickText(e.target.value)} aria-describedby="dictation-help" enterKeyHint="go" />
        <p id="dictation-help">Skriv eller brug mikrofonen på iPhone-tastaturet til at diktere.</p>
        <button className="quick-preview" disabled={!loaded || !quickText.trim()}>Vis resultat →</button>
      </form>
      {Array.from({length:count}, (_, i) => {
        const day = addDays(today,i); const date = new Date(day+'T12:00:00Z');
        return <section className={`day ${i===0 ? 'today' : ''}`} key={day} ref={i===0 ? first : undefined} aria-label={day}>
          <div className="day-title"><h2>{date.toLocaleDateString('da-DK',{weekday:'long',day:'numeric',month:'short'})}</h2>{i===0 && <span className="today-label">I DAG</span>}</div>
          <div className="person-grid">{people.map(person => { const entry = entries[`${day}:${person}`] || blankEntry(day,person); return <div className="person" key={person}>
            <div className="activity-row">
              <button disabled={!loaded} className={`box activity ${entry.activity ? 'filled' : ''}`} title={entry.activity || undefined} aria-label={`${person}, ${day}: ${entry.activity || 'Tilføj aktivitet'}`} onClick={e => edit(day,person,e.currentTarget)}>{entry.activity || '—'}</button>
              <button disabled={!loaded} className={`box home-time ${entry.home_time ? 'filled' : ''}`} aria-label={`${person}, ${day}: ${entry.home_time ? `Cirka hjemme ${entry.home_time.slice(0,5)}` : 'Tilføj hjemkomsttidspunkt'}`} onClick={e => edit(day,person,e.currentTarget)}>{entry.home_time?.slice(0,5) || ''}</button>
            </div>
            <button disabled={!loaded} className={`box dinner ${entry.dinner_home ? 'home' : 'out'}`} aria-label={`${person}, ${day}: ${entry.dinner_home ? 'Spiser hjemme' : 'Spiser ude'}. Rediger`} onClick={e => edit(day,person,e.currentTarget)}><span aria-hidden="true">{entry.dinner_home ? '●' : '○'}</span> {entry.dinner_home ? 'Spiser hjemme' : 'Spiser ude'}</button>
          </div>; })}</div>
        </section>;
      })}
      <div ref={more} aria-hidden="true" className="more" />
    </main>
    {away && <button className="today-button" onClick={() => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})}>↑ I DAG</button>}
    <dialog ref={dialog} aria-labelledby="edit-person" onCancel={e => {e.preventDefault();close();}} onClick={e => {if(e.target===e.currentTarget)close();}}>
      {draft && <form onSubmit={save}><div className="edit-heading"><div><span className="eyebrow">{new Date(draft.day+'T12:00:00Z').toLocaleDateString('da-DK',{weekday:'long',day:'numeric',month:'long'})}</span><h2 id="edit-person">{quickReview ? 'Kontrollér og gem' : draft.person}</h2></div><button type="button" className="close" aria-label="Luk" disabled={busy} onClick={close}>×</button></div>
        {quickReview && <>
          {quickWarning && <p className="quick-hint" role="status">{quickWarning}</p>}
          <div className="quick-target"><div><label htmlFor="quick-person">Person</label><select id="quick-person" value={draft.person} onChange={e => changeQuickTarget(draft.day,e.target.value as Person)}>{people.map(person => <option key={person}>{person}</option>)}</select></div><div><label htmlFor="quick-day">Dato</label><input id="quick-day" type="date" required min={today} max={addDays(today,count-1)} value={draft.day} onChange={e => changeQuickTarget(e.target.value,draft.person)} /></div></div>
          {entries[id(draft)] && <p className="quick-hint">Der er allerede en plan for {draft.person} denne dag: {entries[id(draft)].activity || 'Ingen aktivitet'}. Gem erstatter dagens oplysninger.</p>}
          <p className="quick-hint">Ret oplysningerne nedenfor, hvis noget skal ændres. Intet gemmes før du trykker Gem.</p>
        </>}
        <label htmlFor="activity">Aktivitet</label><input id="activity" name="activity" required={quickReview} autoFocus maxLength={160} placeholder="Hvad er planen?" value={draft.activity} onChange={e => setDraft({...draft,activity:e.target.value})} />
        <label htmlFor="home-time">Cirka hjemme <span className="optional">(valgfrit)</span></label><input id="home-time" name="home_time" type="time" value={draft.home_time?.slice(0,5) || ''} onChange={e => setDraft({...draft,home_time:e.target.value || null})} />
        <label className="toggle"><span>Spiser hjemme</span><input name="dinner_home" type="checkbox" checked={draft.dinner_home} onChange={e => setDraft({...draft,dinner_home:e.target.checked})} /></label>
        {error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Gemmer…' : 'Gem'}</button>
      </form>}
    </dialog>
  </>;
}
