# n8n Daynote-flow (Sonny-proof)

De app stuurt naar de AI Hub-webhook alleen bij **daynote** exact:

- `type`: `"daynote"`
- `user_id`: uuid van de ingelogde user
- `tasks`: array van open taken (elk met o.a. `title`, `status`, `date`)

De webhook moet antwoorden met alleen: `{ "note": "tekst" }`.

---

## Webhook_AI_Hub: branch daynote

**Route by Type** op `body.type` → waarde `daynote`.

Deze branch mag alleen bevatten:

1. **Webhook** (ontvangt POST)
2. **Generate Daynote** (LLM met prompt op basis van `body.tasks`)
3. **Set node** (veld: `note` = output van de LLM)
4. **Respond to Webhook** (body: `{ "note": "..." }`)

Geen merge nodes, geen Gmail nodes, geen andere side effects in deze branch.  
De prompt moet exact de ontvangen open taken (`body.tasks`) gebruiken.

---

## Debug: verifiëren per user (9 users)

Vóór **Generate Daynote** kun je een **Code**-node toevoegen om te loggen wat elke user stuurt:

```javascript
return [{
  json: {
    user_id: $json.body.user_id,
    task_count: ($json.body.tasks || []).length,
    tasks: $json.body.tasks
  }
}];
```

In de frontend staat tijdelijk:

- `console.log("USER:", session.user.id)`
- `console.log("TASKS SENT:", tasks)`

Zo controleer je dat elke user alleen eigen data stuurt en de dagnotitie alleen eigen open taken bevat.
