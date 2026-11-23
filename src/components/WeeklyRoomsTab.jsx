import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  ExternalLink, 
  MapPin, 
  Check, 
  X, 
  AlertCircle,
  Home,
  Clock
} from 'lucide-react';

export default function WeeklyRoomsTab({ isDark }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState({
    title: '',
    price: '',
    price_period: 'per month',
    subtitle: '',
    location: 'New Town',
    image_url: '/properties/shapoorji/living-tv.jpg'
  });

  const fetchRooms = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('weekly_rooms')
          .select('*')
          .eq('status', 'available')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRooms(data);
          setLoading(false);
          return;
        }
      }
      setRooms([]);
    } catch (e) {
      console.error(e);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.title || !newRoom.price) {
      alert('Please enter a title and price.');
      return;
    }
    setSubmitting(true);
    try {
      if (supabase) {
        const { error } = await supabase.from('weekly_rooms').insert([{
          title: newRoom.title,
          price: newRoom.price.startsWith('₹') ? newRoom.price : `₹${newRoom.price}`,
          price_period: newRoom.price_period,
          subtitle: newRoom.subtitle || '1 BHK, semi-furnished, listed today',
          location: newRoom.location || 'New Town',
          image_url: newRoom.image_url || '/properties/shapoorji/living-tv.jpg',
          status: 'available',
          created_at: new Date().toISOString()
        }]);

        if (error) throw error;
      }

      setShowAddModal(false);
      setNewRoom({
        title: '',
        price: '',
        price_period: 'per month',
        subtitle: '',
        location: 'New Town',
        image_url: '/properties/shapoorji/living-tv.jpg'
      });
      fetchRooms();
    } catch (err) {
      alert('Error creating room: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Remove this room from the live website?')) return;
    try {
      if (supabase) {
        await supabase
          .from('weekly_rooms')
          .update({ status: 'archived' })
          .eq('id', id);
      }
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Error removing: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-soft'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Homepage Section</span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-black font-poppins ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Rooms Listed This Week
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Live rooms shown in the dedicated list section of the Flatzy homepage. Syncs automatically with the Telegram Admin Bot (`@flatzyadminbot`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRooms}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Refresh listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Room</span>
          </button>
        </div>
      </div>

      {/* Listings Grid / Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
          Fetching active weekly rooms from Supabase...
        </div>
      ) : rooms.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed ${
          isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          <Home className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No rooms currently listed this week</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You can add one using the "Post New Room" button above or by pasting details in your Telegram Admin Bot.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map(room => (
            <div 
              key={room.id}
              className={`rounded-2xl border p-4 space-y-3 flex flex-col justify-between transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-soft hover:shadow-md'
              }`}
            >
              <div className="flex gap-3.5">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                  <img 
                    src={room.image_url || '/properties/shapoorji/living-tv.jpg'} 
                    alt={room.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {room.price}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      /{room.price_period || 'mo'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {room.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {room.subtitle}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{room.location || 'Kolkata'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live on Homepage
                </span>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer dark:bg-rose-950/50 dark:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 border shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-black font-poppins">Post Room to "Listed This Week"</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Room / Flat Title</label>
                <input
                  type="text"
                  placeholder="e.g. 1 BHK in Shapoorji Sukhobrishti"
                  value={newRoom.title}
                  onChange={e => setNewRoom({...newRoom, title: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Price Amount</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹14,000"
                    value={newRoom.price}
                    onChange={e => setNewRoom({...newRoom, price: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Price Period</label>
                  <select
                    value={newRoom.price_period}
                    onChange={e => setNewRoom({...newRoom, price_period: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                  >
                    <option value="per month">per month</option>
                    <option value="per person, per month">per person, per month</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Subtitle / Quick Details</label>
                <input
                  type="text"
                  placeholder="e.g. 1 BHK, fully furnished, listed today"
                  value={newRoom.subtitle}
                  onChange={e => setNewRoom({...newRoom, subtitle: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. New Town or Shapoorji"
                    value={newRoom.location}
                    onChange={e => setNewRoom({...newRoom, location: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Image URL / Path</label>
                  <input
                    type="text"
                    placeholder="/properties/shapoorji/living-tv.jpg"
                    value={newRoom.image_url}
                    onChange={e => setNewRoom({...newRoom, image_url: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Posting...' : 'Post to Live Website'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

