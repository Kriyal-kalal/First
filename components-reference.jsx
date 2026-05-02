// ─────────────────────────────────────────────────────────────────
// src/components/layout/Layout.jsx
// Root layout wrapper — Navigation + page slot + Footer
// ─────────────────────────────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Plus, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Layout({ children }) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-serif">

      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#F7F5F2]/90 backdrop-blur-md
                      border-b border-[#E4DFD8] px-6 h-16 flex items-center
                      justify-between">
        <Link to="/" className="text-2xl tracking-tight text-stone-800">
          wand<span className="text-[#9B7B4F]">r</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard"
                    className="hidden sm:flex items-center gap-2 text-sm
                               font-sans text-stone-500 hover:text-stone-800
                               transition-colors">
                My Trips
              </Link>

              <button
                onClick={() => navigate('/new')}
                className="flex items-center gap-2 bg-[#9B7B4F] text-white
                           text-sm font-sans font-medium px-4 py-2 rounded-lg
                           hover:bg-[#7D6240] transition-colors">
                <Plus size={15} />
                New Trip
              </button>

              <button
                onClick={signOut}
                title="Sign out"
                className="p-2 text-stone-400 hover:text-stone-700
                           hover:bg-stone-100 rounded-lg transition-colors">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 border border-[#E4DFD8]
                         text-sm font-sans text-stone-600 px-4 py-2 rounded-lg
                         hover:bg-stone-50 transition-colors">
              Sign In with Google
            </button>
          )}
        </div>
      </nav>

      {/* ── PAGE SLOT ──────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-[#E4DFD8] py-8 text-center
                         font-sans text-xs text-stone-400">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Globe size={12} />
          <span>Built with <strong className="text-[#9B7B4F] font-medium">Wandr</strong></span>
        </div>
        <p>React · Tailwind CSS · Firebase · PostgreSQL</p>
      </footer>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// src/components/itinerary/ItineraryCard.jsx
// Dashboard card component for a single trip
// ─────────────────────────────────────────────────────────────────
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Globe, Lock, Trash2 } from 'lucide-react';
import { deleteTrip } from '../../lib/db';
import { formatDateRange, nightsCount, getDestinationEmoji } from '../../lib/utils';

export default function ItineraryCard({ trip, onDelete }) {
  const navigate = useNavigate();
  const totalActivities = trip.days?.reduce((s, d) => s + (d.activities?.length ?? 0), 0) ?? 0;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    await deleteTrip(trip.id);
    onDelete(trip.id);
  }

  return (
    <article
      onClick={() => navigate(`/trip/${trip.id}`)}
      className="bg-white border border-[#E4DFD8] rounded-2xl overflow-hidden
                 cursor-pointer group transition-all duration-200
                 hover:-translate-y-1 hover:shadow-xl hover:border-[#C4A882]
                 shadow-sm">

      {/* Cover */}
      <div className="h-44 relative bg-gradient-to-br from-[#F5EEE4] to-[#F0EDE8]
                      overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center
                         text-6xl opacity-30 select-none">
          {getDestinationEmoji(trip.destination)}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Public badge */}
        {trip.is_public ? (
          <div className="absolute top-3 right-3 flex items-center gap-1.5
                          bg-white/90 rounded-full px-2.5 py-1
                          text-[10px] font-sans font-semibold tracking-wide
                          text-emerald-600 uppercase">
            <Globe size={9} /> Public
          </div>
        ) : (
          <div className="absolute top-3 right-3 flex items-center gap-1.5
                          bg-white/70 rounded-full px-2.5 py-1
                          text-[10px] font-sans font-semibold tracking-wide
                          text-stone-400 uppercase">
            <Lock size={9} /> Private
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="flex items-center gap-1.5 font-sans text-[11px] font-semibold
                      tracking-widest uppercase text-[#9B7B4F] mb-1.5">
          <MapPin size={11} />
          {trip.destination}
        </p>
        <h3 className="text-[1.15rem] tracking-tight text-stone-800 mb-2.5
                       leading-snug">
          {trip.title}
        </h3>
        <p className="flex items-center gap-1.5 font-sans text-[13px] text-stone-400">
          <Calendar size={13} />
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-[#E4DFD8] bg-[#F7F5F2]
                      flex items-center justify-between">
        <div className="flex gap-2">
          <Chip>{nightsCount(trip.start_date, trip.end_date)} nights</Chip>
          <Chip>{totalActivities} activities</Chip>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50
                     rounded-lg transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function Chip({ children }) {
  return (
    <span className="font-sans text-[11px] font-medium px-2.5 py-0.5
                     rounded-full bg-[#F5EEE4] text-[#9B7B4F]">
      {children}
    </span>
  );
}


// ─────────────────────────────────────────────────────────────────
// src/components/itinerary/TripView.jsx
// Full-page trip detail with interactive day timeline
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Clock, Share2, Globe, Lock,
  Plus, Trash2, Plane, Coffee, Hotel, Star, Info,
  ChevronLeft, Copy, Check
} from 'lucide-react';
import { getTripById, updateTrip, addActivity, removeActivity } from '../../lib/db';
import { formatDateRange, nightsCount, formatTime } from '../../lib/utils';
import ActivityModal from './ActivityModal';

const CATEGORY_CONFIG = {
  travel:        { icon: Plane,  colorClass: 'bg-blue-50 text-blue-600'       },
  food:          { icon: Coffee, colorClass: 'bg-orange-50 text-orange-600'   },
  accommodation: { icon: Hotel,  colorClass: 'bg-emerald-50 text-emerald-600' },
  activity:      { icon: Star,   colorClass: 'bg-purple-50 text-purple-600'   },
  general:       { icon: Info,   colorClass: 'bg-stone-100 text-stone-500'    },
};

export default function TripView() {
  const { tripId } = useParams();
  const [trip, setTrip]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modalDay, setModalDay]   = useState(null);   // dayId when modal open
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    getTripById(tripId).then(t => { setTrip(t); setLoading(false); });
  }, [tripId]);

  if (loading) return <LoadingSkeleton />;
  if (!trip)   return <NotFound />;

  /* Toggle public/private and regenerate slug if needed */
  async function togglePublic() {
    const isPublic = !trip.is_public;
    const slug = isPublic && !trip.slug
      ? `${trip.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Math.random().toString(36).slice(2, 7)}`
      : trip.slug;
    const updated = await updateTrip(tripId, { is_public: isPublic, slug });
    setTrip(updated);
  }

  async function handleActivitySave(dayId, activityData) {
    const updated = await addActivity(tripId, dayId, activityData);
    setTrip(updated);
    setModalDay(null);
  }

  async function handleActivityDelete(dayId, activityId) {
    const updated = await removeActivity(tripId, dayId, activityId);
    setTrip(updated);
  }

  function copyShareLink() {
    const url = `${window.location.origin}/t/${trip.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24">

      {/* Back */}
      <Link to="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-sm
                       text-stone-400 hover:text-stone-700 mb-8 transition-colors">
        <ChevronLeft size={15} /> Back to trips
      </Link>

      {/* ── Trip Header ─────────────────────────────────────── */}
      <header className="bg-white border border-[#E4DFD8] rounded-2xl p-6 sm:p-8
                         mb-10 shadow-sm">
        <p className="flex items-center gap-1.5 font-sans text-[11px] font-semibold
                      tracking-widest uppercase text-[#9B7B4F] mb-2">
          <MapPin size={11} /> {trip.destination}
        </p>

        <h1 className="text-3xl sm:text-4xl tracking-tight text-stone-800 mb-4 leading-tight">
          {trip.title}
        </h1>

        <div className="flex flex-wrap gap-5 font-sans text-sm text-stone-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {nightsCount(trip.start_date, trip.end_date)} nights ·{' '}
            {trip.days?.reduce((s, d) => s + d.activities.length, 0)} activities
          </span>
        </div>

        {/* Share pill */}
        {trip.is_public && trip.slug && (
          <div className="flex items-center gap-3 bg-[#F5EEE4]
                          border border-[#C4A882]/30 rounded-xl px-4 py-3 mb-6
                          font-sans text-sm flex-wrap">
            <Globe size={14} className="text-[#9B7B4F] flex-shrink-0" />
            <span className="text-stone-400 text-xs">Public link</span>
            <code className="text-[#9B7B4F] font-mono text-xs font-bold">
              {window.location.origin}/t/{trip.slug}
            </code>
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1 text-xs text-[#9B7B4F]
                         hover:text-[#7D6240] transition-colors ml-auto">
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={togglePublic}
          className="flex items-center gap-2 border border-[#E4DFD8] text-sm
                     font-sans text-stone-500 px-4 py-2 rounded-lg
                     hover:bg-stone-50 transition-colors">
          {trip.is_public ? <><Lock size={14} /> Make Private</> : <><Globe size={14} /> Make Public</>}
        </button>
      </header>

      {/* ── Timeline ────────────────────────────────────────── */}
      <div className="flex flex-col">
        {trip.days?.map((day, idx) => (
          <DayBlock
            key={day.id}
            day={day}
            isLast={idx === trip.days.length - 1}
            onAddActivity={() => setModalDay(day.id)}
            onDeleteActivity={(actId) => handleActivityDelete(day.id, actId)}
          />
        ))}
      </div>

      {/* Activity Modal */}
      {modalDay && (
        <ActivityModal
          onSave={(data) => handleActivitySave(modalDay, data)}
          onClose={() => setModalDay(null)}
        />
      )}
    </div>
  );
}

/* ── Day Block ──────────────────────────────────────────────── */
function DayBlock({ day, isLast, onAddActivity, onDeleteActivity }) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="grid grid-cols-[56px_1fr] gap-x-5">
      {/* Marker column */}
      <div className="flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center
                         flex-shrink-0 z-10 transition-colors
                         ${day.activities.length > 0
                           ? 'border-[#9B7B4F] bg-[#F5EEE4]'
                           : 'border-[#E4DFD8] bg-white'}`}>
          <span className={`font-sans text-xs font-bold
                            ${day.activities.length > 0 ? 'text-[#9B7B4F]' : 'text-stone-300'}`}>
            {day.day_number}
          </span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#E4DFD8] my-1.5" />}
      </div>

      {/* Content column */}
      <div className="pb-10">
        <div className="flex items-center gap-3 pt-2.5 mb-4 flex-wrap">
          <span className="font-sans text-[11px] font-semibold tracking-widest
                           uppercase text-stone-400">
            {fmt(day.day_date)}
          </span>
          {day.title && (
            <span className="text-[1.05rem] tracking-tight text-stone-700">
              {day.title}
            </span>
          )}
          <button
            onClick={onAddActivity}
            className="flex items-center gap-1 font-sans text-xs text-[#9B7B4F]
                       hover:bg-[#F5EEE4] px-2 py-1 rounded-md transition-colors
                       ml-auto">
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Activities */}
        <div className="flex flex-col gap-2.5">
          {day.activities.length === 0 ? (
            <p className="font-sans text-sm text-stone-300 italic py-2">
              No activities yet.
            </p>
          ) : (
            day.activities.map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                onDelete={() => onDeleteActivity(a.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Activity Item ──────────────────────────────────────────── */
function ActivityItem({ activity, onDelete }) {
  const cfg = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG.general;
  const Icon = cfg.icon;

  return (
    <div className="group bg-white border border-[#E4DFD8] rounded-xl p-4
                    flex gap-3.5 items-start shadow-sm
                    hover:border-[#C4A882] hover:shadow-md transition-all">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center
                       flex-shrink-0 ${cfg.colorClass}`}>
        <Icon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        {activity.start_time && (
          <p className="font-sans text-[11px] font-semibold text-[#9B7B4F]
                        tracking-wide mb-0.5">
            {formatTime(activity.start_time)}
          </p>
        )}
        <p className="font-sans font-medium text-stone-800 text-[15px]">
          {activity.title}
        </p>
        {activity.location_name && (
          <p className="flex items-center gap-1 font-sans text-xs text-stone-400 mt-0.5">
            <MapPin size={10} /> {activity.location_name}
          </p>
        )}
        {activity.notes && (
          <p className="font-sans text-xs text-stone-400 mt-2 leading-relaxed
                        bg-[#F7F5F2] rounded-lg px-3 py-2
                        border-l-2 border-[#C4A882]">
            {activity.notes}
          </p>
        )}
        <span className={`inline-flex items-center mt-2 gap-1 font-sans text-[10px]
                          font-semibold tracking-widest uppercase rounded-full
                          px-2.5 py-0.5 ${cfg.colorClass}`}>
          {activity.category}
        </span>
      </div>

      <button
        onClick={onDelete}
        className="p-1.5 text-stone-200 hover:text-red-400 hover:bg-red-50
                   rounded-lg transition-colors opacity-0 group-hover:opacity-100
                   flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-4 w-24 bg-stone-200 rounded mb-8" />
      <div className="bg-white rounded-2xl p-8 mb-8">
        <div className="h-3 w-32 bg-stone-100 rounded mb-3" />
        <div className="h-10 w-3/4 bg-stone-200 rounded mb-4" />
        <div className="h-4 w-48 bg-stone-100 rounded" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]
                    font-sans text-stone-400">
      <p className="text-4xl mb-4">🗺️</p>
      <h2 className="text-xl font-medium text-stone-700 mb-2">Trip not found</h2>
      <Link to="/dashboard" className="text-[#9B7B4F] hover:underline text-sm">
        ← Back to my trips
      </Link>
    </div>
  );
}
