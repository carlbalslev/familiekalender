# Carl & Hilda

Minimal dansk familiekalender til iPhone. Next.js, React og Supabase. Åbner i dag (Europe/Copenhagen), indlæser flere dage ved lodret rulning og viser I DAG-knappen, når dagens gruppe forlader visningen.

## Kør lokalt

Node.js 22+ og pnpm 11: `pnpm install`, derefter `pnpm dev`. Åbn http://127.0.0.1:3000.

Uden miljøvariabler vises en tydeligt markeret prøvevisning. Prøvedata gemmes alene i den pågældende browsers localStorage og overføres ikke til den fælles kalender. Med Supabase konfigureret kræves login; der faldes aldrig tilbage til lokale data ved forbindelsesfejl.

## Supabase (dedikeret projekt)

1. Opret eller vælg et dedikeret Supabase-projekt. Kør `supabase/migrations/001_calendar.sql` én gang via migrationsværktøj eller SQL-editor.
2. Indsæt de to godkendte mailadresser i `private.family_allowlist` med henholdsvis person `Carl` og `Hilda`, via en administratorforbindelse. Mailadresser må aldrig indgå i versionsstyrede migrationer. Unikke personværdier begrænser listen til to.
3. Aktivér e-mail-login og behold mailbekræftelse slået til. Appen bruger loginlink uden adgangskode (`shouldCreateUser:true`); en databasetrigger afviser tilmelding fra alle adresser uden for den private liste. Medlemskab oprettes først efter mailbekræftelse. Begge medlemmer kan redigere begge kolonner. Andre brugere og anonyme har ingen kalenderadgang via RLS.
4. Angiv Site URL og tillad den præcise produktionsadresse i Auth Redirect URLs. Tilføj lokal adresse til udvikling. Konfigurér e-maillevering/SMTP før daglig brug. Supabases standardafsender kan kun sende til organisationens teamadresser; øvrige adresser kræver en konfigureret SMTP-afsender.
5. Kopiér `.env.example` til `.env.local` og indsæt projekt-URL og **publishable** key. Samme to `NEXT_PUBLIC_…` variabler skal angives i Vercel. Brug aldrig service_role eller secret key i disse felter.

Realtime er slået til for kalenderen i migrationen. Ved genforbindelse og tilbagevenden til appen hentes de aktuelle data igen. Ved konkurrerende rettelser af samme person/dag afvises den ældre rettelse med en besked; luk og åbn redigeringen igen. En mislykket lagring bevarer kladden. Tomme dage betyder som standard, at begge spiser hjemme.

## GitHub og Vercel

Opret et privat GitHub-repository til mappens indhold (ingen `.env.local`, `node_modules` eller `.next`). Tilslut repository til Vercel som Next.js-projekt, tilføj de to offentlige Supabase-miljøvariabler og deploy. Hovedgrenen bruges til produktion, pull requests til previews. Workflowet i `.github/workflows/check.yml` kontrollerer datoer, produktionsbuild og TypeScript.

Supabase og Vercel skal autoriseres gennem deres almindelige forbindelsesvinduer. Ingen adgangskoder skal deles i chat. Kildekoden er klar lokalt; en fjernudgivelse er ikke dokumenteret, før en verificeret deployment-URL foreligger.

## iPhone

Åbn HTTPS-adressen i Safari → Del → Føj til hjemmeskærm. Manifest, Apple-ikon og service worker med offlinebesked medfølger. Netforbindelse kræves for fælles kalenderdata og lagring. Personlige data caches ikke af service workeren. Hjemkomsttidspunkt vises kun under redigering.

## Før ibrugtagning

Kontrollér på to separate login: ændringer begge veje, samtidige rettelser, afbrudt internet, genforbindelse og afvisning af en tredje bruger. Kontrollér også installation og login fra hjemmeskærmen på en fysisk iPhone. Disse kontroller kræver det tilsluttede projekt og kan ikke erstattes af et lokalt build.

Implementationen følger [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) og [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
