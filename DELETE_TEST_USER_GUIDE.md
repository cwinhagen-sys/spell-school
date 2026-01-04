# Guide: Radera Test-användare i Supabase

## Metod 1: Via Supabase Dashboard (Enklast)

1. **Gå till Supabase Dashboard**
   - Logga in på [supabase.com](https://supabase.com)
   - Välj ditt projekt

2. **Gå till Authentication → Users**
   - I vänstermenyn: **Authentication** → **Users**
   - Du ser en lista över alla användare

3. **Hitta användaren du vill radera**
   - Sök efter email-adressen i listan
   - Klicka på användaren för att se detaljer

4. **Radera användaren**
   - Klicka på **"Delete user"** eller **trash-ikonen**
   - Bekräfta borttagningen

**Notera:** Detta raderar automatiskt användaren från både `auth.users` och `profiles` tabellen.

---

## Metod 2: Via SQL Editor (Mer kontroll)

1. **Gå till SQL Editor**
   - I Supabase Dashboard: **SQL Editor** → **New query**

2. **Kör SQL-kommando**

   **För att radera en specifik användare:**
   ```sql
   -- Ersätt 'test@example.com' med email du vill radera
   DO $$
   DECLARE
     user_id_to_delete uuid;
   BEGIN
     SELECT id INTO user_id_to_delete
     FROM auth.users
     WHERE email = 'test@example.com';
     
     IF user_id_to_delete IS NOT NULL THEN
       DELETE FROM public.profiles WHERE id = user_id_to_delete;
       DELETE FROM auth.users WHERE id = user_id_to_delete;
       RAISE NOTICE 'User deleted: %', user_id_to_delete;
     ELSE
       RAISE NOTICE 'User not found';
     END IF;
   END $$;
   ```

3. **Klicka "Run"** för att köra kommandot

---

## Metod 3: Radera alla test-användare (För development)

Om du vill radera ALLA användare (använd endast för development/testing):

```sql
-- ⚠️ VARNING: Detta raderar ALLA användare!
-- Använd endast för development/testing

DELETE FROM public.profiles;
DELETE FROM auth.users;
```

---

## Viktigt att veta:

1. **Cascade Delete:** När du raderar från `auth.users` raderas automatiskt relaterad data (profiles, sessions, etc.)

2. **Kan inte ångras:** Radering är permanent - se till att du verkligen vill radera användaren

3. **Relaterad data:** Om du har data i andra tabeller (classes, word_sets, etc.) som refererar till användaren, kan du behöva radera den först eller uppdatera foreign keys

4. **Email kan återanvändas:** Efter radering kan du registrera en ny användare med samma email

---

## Snabbtest efter radering:

1. Radera användaren (enligt metod 1 eller 2 ovan)
2. Försök registrera dig igen med samma email
3. Du bör kunna skapa ett nytt konto utan problem

---

## Felsökning:

**Problem: "User not found"**
- Kontrollera att email-adressen är korrekt
- Kolla i Authentication → Users att användaren finns

**Problem: "Foreign key constraint violation"**
- Användaren har data i andra tabeller
- Du behöver radera eller uppdatera relaterad data först
- Kolla vilka tabeller som refererar till användaren







## Metod 1: Via Supabase Dashboard (Enklast)

1. **Gå till Supabase Dashboard**
   - Logga in på [supabase.com](https://supabase.com)
   - Välj ditt projekt

2. **Gå till Authentication → Users**
   - I vänstermenyn: **Authentication** → **Users**
   - Du ser en lista över alla användare

3. **Hitta användaren du vill radera**
   - Sök efter email-adressen i listan
   - Klicka på användaren för att se detaljer

4. **Radera användaren**
   - Klicka på **"Delete user"** eller **trash-ikonen**
   - Bekräfta borttagningen

**Notera:** Detta raderar automatiskt användaren från både `auth.users` och `profiles` tabellen.

---

## Metod 2: Via SQL Editor (Mer kontroll)

1. **Gå till SQL Editor**
   - I Supabase Dashboard: **SQL Editor** → **New query**

2. **Kör SQL-kommando**

   **För att radera en specifik användare:**
   ```sql
   -- Ersätt 'test@example.com' med email du vill radera
   DO $$
   DECLARE
     user_id_to_delete uuid;
   BEGIN
     SELECT id INTO user_id_to_delete
     FROM auth.users
     WHERE email = 'test@example.com';
     
     IF user_id_to_delete IS NOT NULL THEN
       DELETE FROM public.profiles WHERE id = user_id_to_delete;
       DELETE FROM auth.users WHERE id = user_id_to_delete;
       RAISE NOTICE 'User deleted: %', user_id_to_delete;
     ELSE
       RAISE NOTICE 'User not found';
     END IF;
   END $$;
   ```

3. **Klicka "Run"** för att köra kommandot

---

## Metod 3: Radera alla test-användare (För development)

Om du vill radera ALLA användare (använd endast för development/testing):

```sql
-- ⚠️ VARNING: Detta raderar ALLA användare!
-- Använd endast för development/testing

DELETE FROM public.profiles;
DELETE FROM auth.users;
```

---

## Viktigt att veta:

1. **Cascade Delete:** När du raderar från `auth.users` raderas automatiskt relaterad data (profiles, sessions, etc.)

2. **Kan inte ångras:** Radering är permanent - se till att du verkligen vill radera användaren

3. **Relaterad data:** Om du har data i andra tabeller (classes, word_sets, etc.) som refererar till användaren, kan du behöva radera den först eller uppdatera foreign keys

4. **Email kan återanvändas:** Efter radering kan du registrera en ny användare med samma email

---

## Snabbtest efter radering:

1. Radera användaren (enligt metod 1 eller 2 ovan)
2. Försök registrera dig igen med samma email
3. Du bör kunna skapa ett nytt konto utan problem

---

## Felsökning:

**Problem: "User not found"**
- Kontrollera att email-adressen är korrekt
- Kolla i Authentication → Users att användaren finns

**Problem: "Foreign key constraint violation"**
- Användaren har data i andra tabeller
- Du behöver radera eller uppdatera relaterad data först
- Kolla vilka tabeller som refererar till användaren








