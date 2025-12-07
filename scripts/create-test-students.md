# 🧪 Skapa Test-Konton för Stress-Test

## Metod 1: Via Spell School UI (Enklast)

### Steg 1: Logga in som lärare
1. Gå till https://www.spellschool.se
2. Logga in med ditt lärarkonto

### Steg 2: Skapa en test-klass
1. Gå till `/teacher/classes`
2. Klicka på "Skapa ny klass"
3. Namnge den t.ex. "Stress Test Class"
4. Spara klass-ID:t (du behöver det senare)

### Steg 3: Skapa test-elever
1. Gå till `/teacher/add-students`
2. Välj din test-klass
3. Skapa 10-30 test-elever med enkla namn och lösenord:

**Exempel:**
```
teststudent1 / password123
teststudent2 / password123
teststudent3 / password123
...
teststudent30 / password123
```

### Steg 4: Skapa credentials-fil
Efter att ha skapat eleverna, skapa en fil `test-credentials.json`:

```json
[
  {
    "username": "teststudent1",
    "password": "password123",
    "classId": "ditt-class-id-här"
  },
  {
    "username": "teststudent2",
    "password": "password123",
    "classId": "ditt-class-id-här"
  }
  // ... fler elever
]
```

---

## Metod 2: Via SQL (Snabbare för många konton)

Om du har tillgång till Supabase SQL Editor kan du köra detta:

```sql
-- 1. Hämta ditt teacher_id (ersätt med ditt email)
SELECT id FROM auth.users WHERE email = 'ditt-email@example.com';

-- 2. Skapa en test-klass (ersätt teacher_id)
INSERT INTO classes (teacher_id, name, created_at)
VALUES ('ditt-teacher-id', 'Stress Test Class', NOW())
RETURNING id;

-- 3. Spara class_id från ovanstående query

-- 4. Skapa test-elever (upprepa för fler)
-- Ersätt class_id med ID:t från steg 2
DO $$
DECLARE
    class_id_var UUID := 'ditt-class-id-här';
    teacher_id_var UUID := 'ditt-teacher-id-här';
    i INTEGER;
    student_id UUID;
    student_email TEXT;
    student_username TEXT;
BEGIN
    FOR i IN 1..30 LOOP
        student_username := 'teststudent' || i;
        student_email := 'teststudent' || i || '@test.spellschool.se';
        
        -- Skapa auth user
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            student_email,
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"username":"' || student_username || '"}',
            false,
            '',
            ''
        ) RETURNING id INTO student_id;
        
        -- Skapa profile
        INSERT INTO profiles (id, email, role, username)
        VALUES (student_id, student_email, 'student', student_username);
        
        -- Lägg till i klass
        INSERT INTO class_students (class_id, student_id, created_at)
        VALUES (class_id_var, student_id, NOW());
        
        RAISE NOTICE 'Created student %: %', i, student_username;
    END LOOP;
END $$;
```

**⚠️ Varning:** Denna metod kräver Supabase admin-access och kan vara komplex. Metod 1 är enklare.

---

## Metod 3: Skapa credentials-fil manuellt

Efter att ha skapat eleverna via UI, skapa `test-credentials.json`:

```json
[
  {
    "username": "teststudent1",
    "password": "password123",
    "classId": "abc123-def456-ghi789"
  },
  {
    "username": "teststudent2",
    "password": "password123",
    "classId": "abc123-def456-ghi789"
  },
  {
    "username": "teststudent3",
    "password": "password123",
    "classId": "abc123-def456-ghi789"
  }
]
```

**Tips:**
- Använd samma lösenord för alla test-elever (enklare)
- Använd konsekventa användarnamn (teststudent1, teststudent2, etc.)
- Spara classId från klassen du skapade

---

## Hitta ditt Class ID

1. Gå till `/teacher/classes`
2. Öppna din test-klass
3. Kolla URL:en - den ser ut så här:
   ```
   /teacher/classes/abc123-def456-ghi789
   ```
4. Det sista delen (`abc123-def456-ghi789`) är ditt class ID

---

## Verifiera att kontona fungerar

Testa att logga in med ett test-konto:

1. Gå till `/login`
2. Logga in med `teststudent1` / `password123`
3. Om det fungerar, är kontot korrekt skapat!

---

## Nästa steg

När du har skapat kontona och `test-credentials.json`:

```bash
# Testa med 5 elever först
node scripts/stress-test-auth.js \
  --students=5 \
  --duration=30 \
  --base-url=https://www.spellschool.se \
  --credentials-file=test-credentials.json
```




