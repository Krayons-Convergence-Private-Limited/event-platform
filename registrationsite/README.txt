

```markdown
# 🎉 Event Link Attendee Portal — Next.js

This project is the **Next.js frontend** that powers the **public attendee-facing event pages** for our event registration platform.

---

## 📌 Overview

- **What it does:**  
  This Next.js app handles the **public event link** experience.  
  When an attendee opens an event link (like `https://ourdomain.com/automation-expo-2025-abc123`), this app:
  - Loads the event’s unique details (banner, name, questions)
  - Renders the registration form dynamically
  - Submits attendee responses securely
  - Ensures no sensitive config is exposed to the public

- **What it does *not* do:**  
  This project does *not* handle event creation or dashboard admin tools.  
  The **dashboard** for organisations to create and manage events is built separately in **React + Vite** (Locofy).

---

## 📌 Why Next.js

- **Server-Side Rendering (SSR)** — The event link pages are rendered server-side using `getServerSideProps` so:
  - Event config is fetched securely at request time
  - Attendees only see the final HTML — no direct DB/API calls to fetch private config
  - Great SEO and shareability for public events

- **API routes (if needed)** — We can handle form submissions securely with Next.js API routes or directly use Supabase’s client with Row Level Security.

---

## 📌 How the system works — end-to-end

✅ **Admin flow:**
- The org logs in to the **dashboard (React + Vite)** → creates an event → sets up questions, banner, etc.
- The dashboard saves all event details to **Supabase**:
  - `events` table → stores slug, banner URL, event name, etc.
  - `questions` table → stores form questions for each event
  - Banners are stored in **Supabase Storage**

✅ **Link generation:**
- Each event gets a unique link:
```

[https://ourdomain.com/{eventSlug}-{shortID}](https://ourdomain.com/{eventSlug}-{shortID})

```
Example: `https://ourdomain.com/automation-expo-2025-9fc1e2`

✅ **Attendee flow:**
- Attendee opens the link → this Next.js app loads.
- Uses `getServerSideProps` to:
- Extract the `eventSlug` from the URL
- Fetch event details and questions from Supabase (securely server-side)
- Pre-renders the page with the event banner, title, form
- When the attendee submits:
- Form data is sent to a Next.js **API route** or directly to Supabase
- Supabase’s RLS ensures data is only written where allowed

---

## 📌 How the slug system works

- Every event has a unique **slug + short UUID** for uniqueness.
- Example: `automation-expo-2025-abc123`
- This slug is saved in Supabase’s `events` table.
- The `[eventSlug].tsx` dynamic route uses this to:
- Query Supabase: `select * from events where slug = $slug`
- Load related questions: `select * from questions where event_id = $id`

---

## 📌 Supabase usage

- **Auth:** JWT for secure requests if needed (most public pages are public read-only)
- **Database:** Postgres — tables: `events`, `questions`, `responses`
- **Storage:** Banners and other assets are stored in Supabase Storage
- **Edge Functions:** For any sensitive server-side logic that shouldn’t live in Next.js API routes (optional)
- **RLS:** Strict Row Level Security policies protect all tables — only the right data is returned or written

---

## 📌 Folder structure (core parts)

```

/pages
├── \[eventSlug]/index.tsx   # Handles each event link — SSR
├── api/submitResponse.ts   # API route for form submissions (optional)
/components
├── EventForm.tsx           # Renders dynamic form
/lib
├── supabaseClient.ts       # Supabase client config
├── dbHelpers.ts            # DB query helpers (optional)

````

---

## 📌 How this repo & the dashboard fit together

| Feature | Where it happens |
|----------------|-----------------------------|
| Event creation | Dashboard (React + Vite) |
| Save to Supabase | Dashboard (via Supabase client) |
| Banner upload | Dashboard → Supabase Storage |
| Event link generated | Dashboard generates slug, saves it |
| Event page opens | Attendee uses link → this Next.js app renders it |
| Attendee submits | This Next.js app → saves to Supabase `responses` |

---
