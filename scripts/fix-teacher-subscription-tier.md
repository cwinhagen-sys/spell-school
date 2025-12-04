# 🔧 Fixa Teacher Subscription Tier

Om ditt lärarkonto har fel subscription tier, kan du fixa det på två sätt:

## Metod 1: Via Supabase SQL Editor (Snabbast)

1. Gå till Supabase Dashboard → SQL Editor
2. Kör denna query (ersätt med ditt email):

```sql
-- Uppdatera subscription_tier för ditt konto
UPDATE profiles 
SET subscription_tier = 'pro'
WHERE email = 'ditt-email@example.com' 
  AND role = 'teacher';

-- Verifiera att det fungerade
SELECT id, email, role, subscription_tier, tier 
FROM profiles 
WHERE email = 'ditt-email@example.com';
```

## Metod 2: Via Supabase Dashboard UI

1. Gå till Supabase Dashboard → Table Editor → `profiles`
2. Hitta din rad (sök på ditt email)
3. Redigera `subscription_tier` kolumnen
4. Sätt den till `pro`
5. Spara

## Verifiera att det fungerade

Efter att ha uppdaterat, testa att lägga till elever igen. Det borde nu fungera utan begränsningar.


