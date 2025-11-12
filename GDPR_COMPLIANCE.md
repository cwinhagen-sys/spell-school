# GDPR Compliance - Spell School

## Översikt
Detta dokument beskriver hur Spell School hanterar personuppgifter enligt GDPR.

## Soft Delete System

### Vad är Soft Delete?
- Data markeras som "raderad" med `deleted_at` timestamp
- Data syns inte längre i appen för användare
- Data behålls i databasen för 30 dagar (retention period)
- Efter 30 dagar anonymiseras/raderas data automatiskt

### Databasschema
```sql
-- Alla tabeller har deleted_at kolumn
ALTER TABLE classes ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE class_students ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP;
-- ... etc
```

### Användning i Appen
```typescript
// Visa bara icke-raderade data
const { data } = await supabase
  .from('classes')
  .select('*')
  .is('deleted_at', null) // GDPR: Filtrera bort raderade

// Soft delete en post
await supabase
  .from('classes')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', classId)
```

## Automatisk Cleanup

### Processen
1. **Daglig körning**: Cron job körs kl 02:00 varje dag
2. **Identifiera gamla poster**: Hitta poster med `deleted_at` > 30 dagar
3. **Anonymisera/Radera**: 
   - Profiler → Anonymisera (behåll statistik)
   - Klasser → Radera helt
   - Kopplingar → Radera helt

### Logging
Alla raderingar loggas i `deletion_logs` tabellen:
- Vem som raderade
- När det raderades
- Varför det raderades
- Anonymiserad data (för statistik)

## GDPR-rättigheter

### Rätten att bli bortglömd
- Användare kan begära radering via lärare
- Data raderas/anonymiseras inom 30 dagar
- Anonymiserad statistik bevaras

### Transparens
- Alla raderingar loggas
- Processen är dokumenterad
- Användare informeras om datahantering

### Dataminimering
- Endast nödvändig data samlas in
- Data rensas när den inte längre behövs
- Anonymiserad statistik används istället för personuppgifter

## Teknisk Implementation

### Filer
- `src/lib/softDelete.ts` - Soft delete funktioner
- `src/app/api/cleanup/route.ts` - Manual cleanup API
- `src/app/api/cron/cleanup/route.ts` - Automatisk cleanup
- `migrations/add_soft_delete.sql` - Databas migration

### Miljövariabler
```bash
CRON_SECRET=your_secure_cron_secret_here
```

### Vercel Cron
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Övervakning

### Kontrollera Status
```bash
# Hämta cleanup status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/cleanup

# Kör manual cleanup
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/cleanup
```

### Loggar
- Alla raderingar loggas i `deletion_logs`
- Console logs för debugging
- Vercel logs för cron jobs

## Säkerhet

### Åtkomstkontroll
- Endast auktoriserade användare kan radera
- Cron jobs kräver secret token
- Alla operationer loggas

### Datahantering
- Anonymisering istället för hård radering när möjligt
- Säker hantering av personuppgifter
- Automatisk rensning enligt policy

## Support

För frågor om GDPR-compliance, kontakta:
- Teknisk support: [support@spellschool.com]
- Dataskyddsombud: [dpo@spellschool.com]







