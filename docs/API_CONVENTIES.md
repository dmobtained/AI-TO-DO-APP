# API-conventies

## Supabase `.update()` payloads

Bij PATCH-routes die `supabase.from('tabel').update(payload)` aanroepen:

- **Type:** Gebruik `Record<string, unknown>` voor het payload-object, geen expliciet type met `property?: string`. Dan kan TypeScript geen conflict geven met `null`.
- **Stringvelden leegmaken:** Gebruik **lege string `''`**, nooit `null`. Supabase/TypeScript verwacht voor optionele stringvelden `string | undefined`, niet `null`.
- **Veilig patroon** voor een optioneel stringveld uit de body:
  ```ts
  if (body.veldnaam !== undefined) {
    updates.veldnaam = body.veldnaam ? String(body.veldnaam).trim() : ''
  }
  ```
- **Geen** `any` en geen type assertions om dit te omzeilen.

Zie: `app/api/leads/[id]/route.ts`, `app/api/meeting-notes/[id]/route.ts`.
