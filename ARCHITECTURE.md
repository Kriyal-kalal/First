# Wandr — Full Deployment & Architecture Guide
## Firebase Hosting + PostgreSQL (Supabase) + Next.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 1 — FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

wandr/
├── public/                         # Static assets
│   └── favicon.svg
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── Layout.jsx          # ← Nav + Footer wrapper (see reference file)
│   │   ├── itinerary/
│   │   │   ├── ItineraryCard.jsx   # ← Dashboard card (see reference file)
│   │   │   ├── TripView.jsx        # ← Full timeline page (see reference file)
│   │   │   ├── DayBlock.jsx        # Day row in timeline
│   │   │   ├── ActivityItem.jsx    # Single activity chip
│   │   │   └── ActivityModal.jsx   # Add/edit activity drawer
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── Toggle.jsx
│   │       └── Toast.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Firebase Auth context
│   │   ├── useTrips.js             # Trip CRUD + real-time state
│   │   └── useToast.js             # Global notification system
│   │
│   ├── lib/
│   │   ├── firebase.js             # Firebase init (Auth + Hosting)
│   │   ├── supabase.js             # Supabase client (PostgreSQL)
│   │   ├── db.js                   # All DB queries (trips, activities)
│   │   └── utils.js                # Date helpers, slug gen, emoji map
│   │
│   ├── pages/                      # (or app/ if using Next.js App Router)
│   │   ├── index.jsx               # Hero / landing
│   │   ├── dashboard.jsx           # "My Itineraries" grid
│   │   ├── trip/[tripId].jsx       # TripView — private authenticated
│   │   └── t/[slug].jsx            # Public share view (no auth required)
│   │
│   └── styles/
│       └── globals.css             # Tailwind base + CSS token overrides
│
├── firebase-functions/             # Cloud Functions (optional API layer)
│   ├── src/
│   │   ├── index.ts
│   │   ├── trips.ts                # CRUD endpoints
│   │   └── share.ts                # Slug resolution
│   └── package.json
│
├── schema.sql                      # ← Full PostgreSQL schema (see schema.sql)
├── firebase.json                   # Firebase Hosting config
├── .firebaserc                     # Project alias
├── tailwind.config.js
├── next.config.js
└── package.json


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 2 — FIREBASE CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### firebase.json
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css|svg|png|jpg|woff2)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
      }
    ]
  }
}
```

### src/lib/firebase.js
```javascript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signOut };
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 3 — POSTGRESQL VIA SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Why Supabase (not Google Cloud SQL)?
Supabase gives you:
  • Managed PostgreSQL (free tier: 500MB, 2 projects)
  • Row Level Security (RLS) — perfect for per-user data isolation
  • REST + Realtime WebSocket API out of the box
  • Auth that can bridge with Firebase UID
  • No Cloud Function needed for basic CRUD

### src/lib/supabase.js
```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### src/lib/db.js — Core query functions
```javascript
import { supabase } from './supabase';

/* Sync Firebase user → Supabase users table on login */
export async function upsertUser({ firebaseUid, email, displayName, avatarUrl }) {
  const { data } = await supabase
    .from('users')
    .upsert({ firebase_uid: firebaseUid, email, display_name: displayName, avatar_url: avatarUrl },
            { onConflict: 'firebase_uid' })
    .select()
    .single();
  return data;
}

/* Fetch all trips for logged-in user */
export async function getUserTrips(firebaseUid) {
  const { data } = await supabase
    .from('trips')
    .select(`*, days(*, activities(*))`)
    .eq('users.firebase_uid', firebaseUid)   // via join
    .order('created_at', { ascending: false });
  return data ?? [];
}

/* Fetch single trip by ID (includes days + activities) */
export async function getTripById(tripId) {
  const { data } = await supabase
    .from('trips')
    .select(`*, days(*, activities(*))`)
    .eq('id', tripId)
    .single();
  return data;
}

/* Fetch public trip by slug (no auth) */
export async function getTripBySlug(slug) {
  const { data } = await supabase
    .from('trips')
    .select(`*, days(*, activities(*))`)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();
  return data;
}

/* Create a new trip (auto-generates day rows) */
export async function createTrip({ userId, title, destination, startDate, endDate, description, isPublic }) {
  const slug = isPublic
    ? `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Math.random().toString(36).slice(2, 7)}`
    : null;

  const { data: trip } = await supabase
    .from('trips')
    .insert({ user_id: userId, title, destination, start_date: startDate, end_date: endDate,
              description, is_public: isPublic, slug })
    .select()
    .single();

  // Auto-generate day rows
  const days = [];
  let cur = new Date(startDate); let num = 1;
  while (cur <= new Date(endDate)) {
    days.push({ trip_id: trip.id, day_date: cur.toISOString().split('T')[0], day_number: num++ });
    cur.setDate(cur.getDate() + 1);
  }
  await supabase.from('days').insert(days);
  return trip;
}

/* Update trip fields */
export async function updateTrip(tripId, fields) {
  const { data } = await supabase
    .from('trips')
    .update(fields)
    .eq('id', tripId)
    .select(`*, days(*, activities(*))`)
    .single();
  return data;
}

/* Delete a trip (cascades to days + activities via FK) */
export async function deleteTrip(tripId) {
  await supabase.from('trips').delete().eq('id', tripId);
}

/* Add an activity to a day */
export async function addActivity(tripId, dayId, activity) {
  await supabase.from('activities').insert({ ...activity, day_id: dayId, trip_id: tripId });
  return getTripById(tripId);
}

/* Remove an activity */
export async function removeActivity(tripId, activityId) {
  await supabase.from('activities').delete().eq('id', activityId);
  return getTripById(tripId);
}
```

### Row Level Security (RLS) — apply in Supabase dashboard SQL editor
```sql
-- Enable RLS
ALTER TABLE trips      ENABLE ROW LEVEL SECURITY;
ALTER TABLE days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trips (+ public trips via slug)
CREATE POLICY "owner_access" ON trips
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "public_read" ON trips
  FOR SELECT USING (is_public = TRUE);
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 4 — AUTH HOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### src/hooks/useAuth.js
```javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut as fbSignOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { upsertUser } from '../lib/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [dbUser, setDbUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const db = await upsertUser({
          firebaseUid: firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName,
          avatarUrl:   firebaseUser.photoURL,
        });
        setDbUser(db);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
  const signOut          = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signInWithGoogle, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 5 — ENV VARIABLES (.env.local)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```env
# Firebase (from Firebase Console → Project Settings → Your Apps)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...

# Supabase (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xyzxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 6 — DEPLOYMENT STEPS (Firebase Hosting)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Step 1 — Install & Setup (one-time)
```bash
npm install -g firebase-tools
firebase login
```

### Step 2 — Initialise Firebase in your project root
```bash
firebase init hosting
# → Select your Firebase project
# → Public directory: out          (Next.js static export)
# → Configure as SPA: Yes
# → Overwrite index.html: No
```

### Step 3 — Configure Next.js for static export
```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',       // Generates /out directory
  images: { unoptimized: true },
  trailingSlash: true,
};
module.exports = nextConfig;
```

### Step 4 — Install all dependencies
```bash
npm install next react react-dom tailwindcss lucide-react \
            firebase @supabase/supabase-js react-router-dom
npx tailwindcss init -p
```

### Step 5 — Build & Deploy
```bash
npm run build          # Generates /out directory
firebase deploy        # Uploads to Firebase Hosting
```
→ Your site is live at: https://your-project.web.app

### Step 6 — Add Custom Domain (optional)
Firebase Console → Hosting → Add custom domain → Follow DNS instructions


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 7 — DATABASE SETUP (Supabase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to https://supabase.com → New Project
2. Dashboard → SQL Editor → paste contents of schema.sql → Run
3. Dashboard → Authentication → enable "Firebase" provider (or skip RLS for prototype)
4. Dashboard → Settings → API → copy Project URL + anon key → paste into .env.local
5. Dashboard → Table Editor → verify tables: users, trips, days, activities


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PART 8 — TECH DECISIONS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Layer        | Choice              | Why                                           |
|--------------|---------------------|-----------------------------------------------|
| Frontend     | Next.js + Tailwind  | Static export, SEO, App Router patterns       |
| Icons        | Lucide React        | Thin-stroke, consistent, tree-shakeable       |
| Auth         | Firebase Auth       | Google/GitHub SSO in minutes, free tier       |
| Database     | PostgreSQL (Supabase)| Real SQL, RLS security, free 500MB tier      |
| Hosting      | Firebase Hosting    | Global CDN, free SSL, 10GB/month free         |
| Public Share | Slug in `trips` table| Unique URL per trip, no auth required        |

### Alternative: Google Cloud SQL
If you need the database inside the Firebase ecosystem:
  1. Enable Cloud SQL (PostgreSQL) in Google Cloud Console
  2. Deploy a Firebase Cloud Function (Node/TypeScript) as an API layer
  3. Use `pg` npm package inside the function to query Cloud SQL
  4. Secure with Firebase Auth middleware (verify idToken in function)
  ⚠ Cloud SQL costs ~$7/month minimum — Supabase free tier is better for startups.
