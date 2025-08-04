

```markdown
# 🗂️ Event Platform — Organization Dashboard (React + Vite)

This is the **Admin Dashboard** for our Event Registration Platform.

👉 It is built with **React + Vite** (using Lovable for design & low-code generation)  
👉 It connects directly to **Supabase** for database, auth, and storage  
👉 It handles **all event creation, editing, and management**  
👉 Attendees **never use this dashboard** — they only see the public event link handled by our separate **Next.js** project.

---

## 📌 ✅ What this Dashboard does

This dashboard is the **control panel** for **organizations** (our clients).  
Here, an org can:
- Sign up or log in
- Create a new event
- Add event details (name, date, description)
- Build custom registration forms with a **drag & drop question builder**
- Upload or choose a header/banner image
- Generate a unique public event link
- View, edit, or duplicate existing events
- See high-level stats about responses & check-ins (coming soon)

---

## 📌 ✅ How the system works

**Admins log in → Create Event → Build Form → Choose Banner → Copy Link → Done.**

All event data is stored in **Supabase**, which also handles:
- User authentication (JWT)
- Database storage (Postgres)
- Secure file storage (Supabase Storage)
- Row Level Security (RLS) on all tables to isolate org data

---

## 📌 ✅ 📌 Detailed flow: Step-by-step

### ✅ **1️⃣ Login / Register**

- Organizations create an account or log in.
- Auth handled fully by **Supabase Auth**.
- JWT token stored securely on the client.

---

### ✅ **2️⃣ Dashboard Home**

After login, the org sees:
- A **list of all their events** (table or card view)
- A **“Create New Event”** button
- Basic stats: # of responses, event status, date created

**Empty state:** If no events yet → show illustration + “Create your first event!”

---

### ✅ **3️⃣ Create New Event — Basic Details**

When the org clicks **Create New Event**:
- A form opens for **basic event info**:
  - Event Name
  - Event Date(s)
  - Location (optional)
  - Short Description
  - Category (optional)

✅ When they click `Next`:
- A new `event` row is created in the **Supabase `events` table**:
  - `id` (UUID)
  - `organization_id` (linked to org)
  - `name`
  - `slug` (generated later)
  - `status` = `draft`
  - `created_at`

---

### ✅ **4️⃣ Build the Registration Form — Drag & Drop**

This is the **core feature**.

**Builder page layout:**
```

---

## | \[Left Panel] | \[Center Canvas]      |

```

---

🔹 **Left Panel:**  
**Question Bank** → shows different reusable question types:
- Single choice (Radio)
- Multiple choice (Checkbox)
- Dropdown selector
- Short text
- Long text (Paragraph)
- Tags (Multi-select)
- Industry selector (with pre-filled options)
- Reason to join (pre-filled)
- Consent checkbox

✅ Each question type comes with default text & options.

---

🔹 **Center Canvas:**  
**This is the actual form page the admin is building:**
- Drag a question type from the left → drop it in the center.
- Each dropped question stacks vertically in an array.
- Questions can be re-ordered by drag & drop.
- Each question block shows:
  - Its text
  - Required toggle
  - Edit icon 🖊️
  - Delete icon ❌

✅ **Multi-page support:**
- The form can have multiple pages.
- At the bottom: `Add New Page` button.
- Admin can switch between pages using tabs or a side panel.
- Each page = a list of question configs.

---

🔹 **Editing a question:**
- Clicking `Edit` opens an **overlay modal**.
- Admin can:
  - Change question text
  - Add/remove options (for MCQ, dropdown, tags)
  - Set `required` true/false
  - Add helper/description text

✅ All changes saved in local state first → then committed to Supabase on `Next`.

---

✅ When the form is built:
- Click `Next` → all questions are saved to the **`questions` table**:
  - `id`
  - `event_id` (FK)
  - `type` (radio, checkbox, text, etc.)
  - `text` (question)
  - `options` (JSON)
  - `required` (boolean)
  - `page_number` (int)
  - `order` (int)

---

### ✅ **5️⃣ Upload or Choose Banner**

Next step:
- Upload a custom banner image **or** pick from **pre-set genre templates**.

✅ Example genre templates:
- Tech Expo
- Medical Conference
- Retail Fair
- Auto Show
- Education Summit
- Sustainability Event

✅ When uploaded:
- Banner file is saved to **Supabase Storage**.
- The public `URL` is stored in `events.banner_url`.

---

### ✅ **6️⃣ Generate Unique Link**

Final step:
- The system creates a unique `slug`:
```

{eventNameSlug}-{shortUUID}

```
E.g. `automation-expo-2025-abc123`.

✅ This slug is saved to the `events` table:
- `slug` = unique index
- Status updated → `active`

✅ The final link is shown:
```

[https://ourdomain.com/{slug}](https://ourdomain.com/{slug})

```

✅ CTA: `Copy Link`.

---

### ✅ **7️⃣ Back to Dashboard**

- Admin sees the new event listed on the home page.
- Can click **View/Edit** → re-open the form builder, update questions, replace the banner.
- Can deactivate or duplicate the event.

---

## 📌 ✅ **Data security**

- All direct Supabase requests from the dashboard use **publishable client keys**.
- Access is locked down by **Row Level Security (RLS)**:
- Org only sees/edits its own events.
- Only authenticated org users can create/update events.
- Banners uploaded via Supabase Storage → buckets configured to disallow directory listing.

---

## 📌 ✅ **Supabase integration**

| Feature | How it’s done |
|----------------|-----------------------------|
| Auth | Supabase Auth → JWT stored client-side |
| DB | Direct Supabase client calls (`events`, `questions` tables) |
| Storage | Supabase Storage → bucket for banners |
| Security | RLS policies → all org data isolated |
| Custom logic | Use Supabase Edge Functions if needed for payments, etc. |

---
