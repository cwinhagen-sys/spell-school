# 🔧 Fixa PRO Subscription Tier

Om din PRO-plan har blivit ändrad till 'free', kan du fixa det på två sätt:

## Metod 1: Via Supabase SQL Editor (Snabbast)

1. Gå till Supabase Dashboard → SQL Editor
2. Kör denna query (ersätt med ditt email):

```sql
-- Uppdatera subscription_tier till 'pro' för ditt konto
UPDATE profiles 
SET subscription_tier = 'pro'
WHERE email = 'ditt-email@example.com' 
  AND role = 'teacher';

-- Verifiera att det fungerade
SELECT id, email, role, subscription_tier 
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

Efter att ha uppdaterat:
1. Logga ut från Spell School
2. Logga in igen
3. Din PRO-plan ska nu vara kvar!

---

## Vad jag fixade

Jag har uppdaterat OAuth callback-koden så att den **bevarar** din befintliga `subscription_tier` när du loggar in igen. Detta betyder att:

- ✅ Nya konton får 'free' som standard
- ✅ Befintliga konton behåller sin tier (pro/premium/free)
- ✅ Subscription tier skrivs inte över vid inloggning längre

---

## Testa fixen

1. Uppdatera din subscription_tier till 'pro' via SQL eller Dashboard
2. Logga ut från Spell School
3. Logga in igen
4. Din PRO-plan ska nu vara kvar! 🎉




