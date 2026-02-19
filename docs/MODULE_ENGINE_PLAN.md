# Module Engine – Plan & File Tree

## Doel
Herbruikbare pipeline voor alle modules: CRUD + audit + module_locks + RBAC. Single source of truth: `public.profiles.role`. Geen UI-only; alle writes viazelfde flow.

## Principes (hard)
1. **Roles:** Alleen `public.profiles.role` (admin/user).
2. **Write pipeline:** authenticated → check module lock (locked + !admin ⇒ read-only) → validate (zod) → DB write → audit (`${module}.${operation}`).
3. **Module pages:** Zelfde layout (Header + StatCards + Actions + DataTable/List + Detail/Editor).
4. **Geen duplicatie:** Common logic in `lib/modules/*` en `components/modules/*`.

---

## File tree (nieuw/gewijzigd)

```
lib/
  modules/
    access.ts        # isAdmin(userId), isLocked(slug), canWrite(slug, userId)
    audit.ts         # logModuleAction(module, operation, entityId, metadata)
    crud.ts          # withModuleWrite(slug, handler): auth + lock + run
    types.ts         # shared types

components/
  modules/
    ModulePageLayout.tsx   # Header + optional StatCards + actions + children
    ModuleStatCards.tsx    # grid of stat cards from config
    LockedBanner.tsx       # read-only melding
    ConfirmDeleteDialog.tsx
    ModuleTable.tsx        # (optional) sort/filter/search wrapper
    ModuleEditorPanel.tsx  # (optional) create/edit panel wrapper

app/
  api/
    audit/
      route.ts             # (bestaand) blijft centrale audit endpoint
    notes/
      route.ts             # GET list, POST create
      [id]/
        route.ts           # GET one, PATCH update, DELETE
  (app)/
    notities/
      page.tsx             # ModulePageLayout + grid + editor + debounced autosave

supabase/
  migrations/
    20250220000000_module_locks.sql
    20250220000001_notes.sql
```

---

## Migrations (ready to paste)

### 1) module_locks

```sql
-- module_locks: admin-only write; authenticated read.
CREATE TABLE IF NOT EXISTS public.module_locks (
  slug text PRIMARY KEY,
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_module_locks_locked ON public.module_locks (locked) WHERE locked = true;

ALTER TABLE public.module_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_locks_select_authenticated"
  ON public.module_locks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "module_locks_update_admin"
  ON public.module_locks FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

INSERT INTO public.module_locks (slug, locked) VALUES ('notities', false) ON CONFLICT (slug) DO NOTHING;
```

### 2) notes

```sql
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes (user_id, pinned) WHERE pinned = true;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own_or_admin"
  ON public.notes FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "notes_insert_own"
  ON public.notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update_own_or_admin"
  ON public.notes FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "notes_delete_own_or_admin"
  ON public.notes FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin_user());

COMMENT ON TABLE public.notes IS 'User notes; module notities.';
```

---

## Module Engine – A) Access

- **isAdmin(userId):** server-side: fetch `profiles.role` for userId (or use session). We use existing RLS; server reads profiles with createClient() so we need a small helper that gets role for current user from profiles.
- **isLocked(slug):** SELECT from module_locks WHERE slug = ? AND locked = true.
- **canWrite(slug, userId):** isAdmin(userId) OR !isLocked(slug).

Implementatie: server-only helpers in `lib/modules/access.ts` die createClient() gebruiken.

---

## Module Engine – B) Audit

- Format: `action = ${module}.${operation}` (e.g. `notes.create`), entity_type = module slug, entity_id = uuid, metadata = diff/fields.
- Blijft POST naar bestaande `/api/audit` (server-side kan direct activity_log insert doen voor minder roundtrips; user vroeg expliciet "every write logs audit via /api/audit", dus we kunnen server-side een interne audit helper hebben die direct insert doet met dezelfde velden).

We doen: server-side helper die direct naar `activity_log` insert (zelfde sessie), zodat elke API-route geen extra HTTP call hoeft. Dat voldoet aan "every write logs audit": de write gaat door de pipeline en de pipeline roept audit aan.

---

## Module Engine – C) CRUD pipeline

Per module-route (e.g. POST /api/notes):
1. createClient(); getUser(); if (!user) 401.
2. canWrite('notities', user.id) → if false, 403 (read-only).
3. Parse body; zod validate.
4. Insert/Update/Delete in DB.
5. logModuleAction('notes', 'create', id, metadata).
6. return JSON.

---

## Notities – spec

- **Table:** notes (id, user_id, title, content, pinned, created_at, updated_at).
- **API:** GET /api/notes (list), POST /api/notes (create), GET /api/notes/[id], PATCH /api/notes/[id], DELETE /api/notes/[id]. Alle writes via pipeline (lock check + zod + audit).
- **UI:** ModulePageLayout, grid cards, search; editor panel with title + content; debounced autosave 500ms; optimistic state; LockedBanner when canWrite false.

---

## Volgende modules (na Notities)

Zelfde patroon: migratie → API (zod + access + audit) → pagina met ModulePageLayout + specifieke forms/tables. Volgorde: Auto, Vergaderingen, Valuta, Business, Persoonlijke info, Goud, Dashboard-widgets, Financiën sidebar nested.

---

## Smoke test – Notities

1. **Laden:** Ga naar /notities → zie "Notities", stat cards (0 Notities, 0 Gepind), grid leeg of met bestaande notities.
2. **Create:** Klik "Nieuwe notitie" → nieuwe kaart verschijnt, editor opent, titel "Nieuwe notitie".
3. **Edit:** Wijzig titel of inhoud → na 500 ms zie "Opslaan…", daarna verdwijnt; ververs pagina → wijziging blijft.
4. **Pinnen:** Open een notitie, klik pin-icoon → kaart toont pin, lijst sorteert gepind bovenaan.
5. **Verwijderen:** Open notitie, klik prullenbak → bevestigingsdialoog → Verwijderen → notitie verdwijnt, editor sluit.
6. **Read-only:** Zet in DB `module_locks` voor slug `notities` op `locked = true`, herlaad /notities → zie LockedBanner, geen knop "Nieuwe notitie", editor velden disabled. Zet locked weer op false.
7. **Audit:** Controleer `activity_log`: acties `notes.create`, `notes.update`, `notes.delete` met entity_type `notes` en entity_id.
