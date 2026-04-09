import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Save, Youtube, Instagram, Facebook, Globe, Linkedin, ArrowLeft, Megaphone, Trash2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [socials, setSocials] = useState({
    youtube: '',
    instagram: '',
    facebook: '',
    website: '',
    linkedin: ''
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const socialRef = doc(db, 'settings', 'social');
        const socialSnap = await getDoc(socialRef);
        if (socialSnap.exists()) {
          setSocials(socialSnap.data() as any);
        }

        const announceRef = doc(db, 'settings', 'announcement');
        const announceSnap = await getDoc(announceRef);
        if (announceSnap.exists()) {
          setAnnouncementMessage(announceSnap.data().message || '');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'social'), socials);
      toast.success('Social links updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!announcementMessage.trim()) {
      toast.error('Please enter a message to broadcast');
      return;
    }
    setBroadcasting(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        id: Math.random().toString(36).substr(2, 9),
        message: announcementMessage,
        active: true,
        timestamp: Date.now()
      });
      toast.success('Announcement broadcasted to all users!');
    } catch (error) {
      console.error('Error broadcasting:', error);
      toast.error('Failed to broadcast announcement');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleClearAnnouncement = async () => {
    setBroadcasting(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        active: false,
        message: '',
        id: 'cleared'
      });
      setAnnouncementMessage('');
      toast.success('Announcement cleared');
    } catch (error) {
      console.error('Error clearing:', error);
      toast.error('Failed to clear announcement');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Admin Settings</h1>
          <p className="text-slate-500 font-medium">Configure global application settings.</p>
        </div>
      </div>

      {/* Announcement Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-red-50/50">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-red" />
            Global Announcement
          </h2>
          <p className="text-sm text-slate-500">Send a real-time popup notification to all users.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Message</label>
            <textarea
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="Enter message to show to all users..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-black uppercase tracking-widest rounded-xl hover:bg-brand-red/90 transition-all disabled:opacity-50 shadow-lg shadow-brand-red/20"
            >
              {broadcasting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Broadcast Now
            </button>
            <button
              onClick={handleClearAnnouncement}
              disabled={broadcasting}
              className="px-6 py-3 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
              title="Clear current announcement"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-red" />
            Social Media Links
          </h2>
          <p className="text-sm text-slate-500">These links will appear in the floating sidebar on the home page.</p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <SocialInput 
              label="YouTube URL" 
              icon={Youtube} 
              value={socials.youtube} 
              onChange={(val) => setSocials(s => ({ ...s, youtube: val }))}
              placeholder="https://youtube.com/..."
            />
            <SocialInput 
              label="Instagram URL" 
              icon={Instagram} 
              value={socials.instagram} 
              onChange={(val) => setSocials(s => ({ ...s, instagram: val }))}
              placeholder="https://instagram.com/..."
            />
            <SocialInput 
              label="Facebook URL" 
              icon={Facebook} 
              value={socials.facebook} 
              onChange={(val) => setSocials(s => ({ ...s, facebook: val }))}
              placeholder="https://facebook.com/..."
            />
            <SocialInput 
              label="Website URL" 
              icon={Globe} 
              value={socials.website} 
              onChange={(val) => setSocials(s => ({ ...s, website: val }))}
              placeholder="https://..."
            />
            <SocialInput 
              label="LinkedIn URL" 
              icon={Linkedin} 
              value={socials.linkedin} 
              onChange={(val) => setSocials(s => ({ ...s, linkedin: val }))}
              placeholder="https://linkedin.com/..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-black uppercase tracking-widest rounded-xl hover:bg-brand-red/90 transition-all disabled:opacity-50 shadow-lg shadow-brand-red/20"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Social Links
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SocialInput({ label, icon: Icon, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className="w-5 h-5 text-slate-400 group-focus-within:text-brand-red transition-colors" />
        </div>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all text-sm font-medium"
        />
      </div>
    </div>
  );
}
