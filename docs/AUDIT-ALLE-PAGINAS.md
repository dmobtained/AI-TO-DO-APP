# Audit: alle pagina’s en secties

Volledige doorloop: wat **werkt en is in te vullen**, wat **placeholder/demo** is, en wat **afhankelijk van config** is.  
Laatste update: na implementatie Vaste lasten.

---

## 1. Dashboard (`/dashboard`)

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Salaris / netto vrij / % over | ✅ Werkt | Uit `finance_entries` (income/expense). |
| Weer | ✅ Werkt | Open Meteo; bij fout: toast "Weer niet beschikbaar". |
| Snelle uitgave | ✅ Werkt | Schrijft naar `finance_entries`. |
| Weekbudget | ✅ Werkt | Berekend uit entries. |
| Open taken vandaag | ✅ Werkt | Uit `tasks`. |
| Top 3 prioriteiten | ✅ Werkt | Uit `tasks`. |
| Dagnotitie (AI) | ⚙️ Config | Werkt alleen als `N8N_AI_HUB_WEBHOOK` staat; anders melding "niet geconfigureerd". |
| Open taken-lijst | ✅ Werkt | CRUD via `tasks`. |
| Business pipeline-widget | ✅ Werkt | Uit `leads`. |
| Cashflow / waarschuwingen / productiviteit | ✅ Werkt | Berekend uit data. |
| Beslissingslogboek | ✅ Werkt | Opgeslagen in `tasks` met `[DECISION]`. |

---

## 2. Taken (`/dashboard/taken`)

| Onderdeel | Status |
|-----------|--------|
| Stat cards (open, vandaag, overdue) | ✅ Werkt |
| Nieuwe taak toevoegen | ✅ Werkt |
| Afvinken / verwijderen | ✅ Werkt |
| Lege staat | ✅ "Geen taken. Klik op Nieuwe taak…" |

---

## 3. Agenda (`/dashboard/agenda`)

| Onderdeel | Status |
|-----------|--------|
| Events ophalen / toevoegen / bewerken / verwijderen | ✅ Werkt |
| Import (datum;titel) | ✅ Werkt |
| Empty state | ✅ Duidelijke tekst |

---

## 4. Financiën

### Overzicht (`/dashboard/financien`)

| Onderdeel | Status |
|-----------|--------|
| Stat cards (salaris, vaste lasten, vrij bedrag) | ✅ Werkt |
| Secties (Abonnementen, Huur, Verzekeringen, …) | ✅ Werkt – items uit `finance_entries` per category, toevoegen/verwijderen |
| Snel naar Bank / Lasten / Schulden / Beleggen | ✅ Links |

### Bank (`/dashboard/financien/bank`)

| Onderdeel | Status |
|-----------|--------|
| Entries laden / toevoegen | ✅ Werkt |
| Nieuws (AI) | ⚙️ Alleen als `NEXT_PUBLIC_N8N_FINANCE_NEWS_WEBHOOK` staat |
| Chatbot | ⚙️ Alleen als `NEXT_PUBLIC_N8N_FINANCE_CHAT_WEBHOOK` staat; anders toast "Chatbot nog niet gekoppeld" |

### Vaste lasten (`/dashboard/financien/lasten`)

| Onderdeel | Status |
|-----------|--------|
| Vaste lasten beheren | ✅ **Nu volledig** – CRUD op `recurring_expenses` (titel, bedrag, dag 1–31, actief/pauze, verwijderen) |

### Schulden (`/dashboard/financien/schulden`)

| Onderdeel | Status |
|-----------|--------|
| Schulden laden / toevoegen / verwijderen | ✅ Werkt |
| Scenario’s 1–3 | ✅ Echte data of "Voeg schulden toe…" |
| AI-optimalisatie | ✅ Werkt (app-logica; optioneel n8n voor rijkere tekst) |

### Beleggen (`/dashboard/financien/beleggen`)

| Onderdeel | Status |
|-----------|--------|
| Beleggingen toevoegen / verwijderen | ✅ Werkt |
| Empty state | ✅ "Geen beleggingen" |

### Belasting (`/dashboard/financien/belasting`)

| Onderdeel | Status |
|-----------|--------|
| Sectie + finance_entries | ✅ Werkt |

---

## 5. Auto (`/auto`)

| Onderdeel | Status |
|-----------|--------|
| Stat cards (kosten/jaar, per km, aanschaf, waarde) | ✅ Uit `auto_entries` / API |
| Tankbeurten / Onderhoud / Reparaties | ✅ CRUD via `/api/auto` en `auto_entries` |
| Empty states | ✅ "Voeg een tankbeurt/onderhoud/reparatie toe…" |
| Huidige waarde | Alleen "€ —" (geen veld in formulier; optioneel later) |

---

## 6. Mail (`/dashboard/email`, `/mail`)

| Onderdeel | Status |
|-----------|--------|
| Inbox (lijst + detail) | ✅ Uit `emails` |
| AI-antwoord | ⚙️ Alleen als webhook (n8n) geconfigureerd |

---

## 7. Notities (`/notities`)

| Onderdeel | Status |
|-----------|--------|
| CRUD, pinnen | ✅ Werkt |
| Delete/pin foutafhandeling | In doc genoteerd (toast + dialog alleen bij succes) |

---

## 8. Vergaderingen (`/vergaderingen`)

| Onderdeel | Status |
|-----------|--------|
| Notities typen en opslaan | ✅ Werkt (`meeting_notes`) |
| **"AI samenvatten"** | ⚠️ **Demo** – vaste tekst; knop heet "Demo-samenvatting". Echte AI via n8n nog te koppelen. |

---

## 9. Valuta (`/valuta`)

| Onderdeel | Status |
|-----------|--------|
| Koersen / omrekenen | ✅ Werkt (Frankfurter) |
| Bij API-fout | ✅ Waarschuwing: "Offline of API niet bereikbaar… geschatte/cache-koersen" |

---

## 10. Persoonlijke info (`/persoonlijke-info`)

| Onderdeel | Status |
|-----------|--------|
| BSN, IBAN, lengte, gewicht | ✅ Opslaan in `profiles` (als kolommen bestaan) |

---

## 11. Instellingen (`/dashboard/instellingen`)

| Onderdeel | Status |
|-----------|--------|
| E-mail, rol, e-mail koppeling, uitloggen | ✅ Werkt |

---

## 12. Admin (`/admin`)

| Onderdeel | Status |
|-----------|--------|
| Activity-tab | ✅ Werkt |
| Users-tab (rol wijzigen) | ✅ Werkt |
| **System-tab** | ⚠️ **Placeholder** – "Geen extra systeeminstellingen in deze versie." |

---

## 13. Overig

| Onderdeel | Status |
|-----------|--------|
| Business / Leads | ✅ CRUD op `leads` (Lead → Gesprek → Deal) |
| Supabase placeholder URL/key | Alleen in code; bij ontbreken env onduidelijke fouten mogelijk |
| Login / auth | ✅ Supabase Auth |

---

## Samenvatting: wat nog “niet echt” of optioneel is

1. **Vergaderingen – "AI samenvatten"**  
   Nu demo-tekst. Vervangen door echte webhook (n8n) of label explicieter "Demo-samenvatting" laten.

2. **Admin – System-tab**  
   Geen echte instellingen; tekst "Geen extra systeeminstellingen in deze versie."

3. **Dagnotitie / E-mail AI / Bank Nieuws & Chatbot**  
   Werken alleen als de bijbehorende webhook(s) in env staan; geen placeholder-pagina’s meer.

4. **Auto – Huidige waarde**  
   Stat card toont "€ —"; geen invoer in formulier (kan later worden toegevoegd).

Geen enkele pagina toont nog "Deze sectie wordt binnenkort beschikbaar" – **Vaste lasten** is volledig werkend.
