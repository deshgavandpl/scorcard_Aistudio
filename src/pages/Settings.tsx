import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Save, Youtube, Instagram, Facebook, Globe, Linkedin, ArrowLeft, Megaphone, Trash2, Send, Plus, Twitter, Github, MessageCircle, Shield, Upload, Image as ImageIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

import { useAdmin } from '../context/AdminContext';

const AVAILABLE_ICONS = [
  { name: 'Youtube', icon: Youtube },
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
  { name: 'Globe', icon: Globe },
  { name: 'Linkedin', icon: Linkedin },
  { name: 'Twitter', icon: Twitter },
  { name: 'Github', icon: Github },
  { name: 'MessageCircle', icon: MessageCircle },
  { name: 'Send', icon: Send }
];

export default function Settings() {
  const { isAdminMode } = useAdmin();

  if (!isAdminMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-brand-red" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Admin Access Required</h1>
        <p className="text-slate-500 max-w-md mb-8 font-medium">
          You need to be in Admin Mode to access these settings. Please use the Admin Login in the footer.
        </p>
        <Link 
          to="/"
          className="px-8 py-3 bg-brand-red text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementImage, setAnnouncementImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdminMode) return;
    async function fetchSettings() {
      try {
        const socialRef = doc(db, 'settings', 'social');
        const socialSnap = await getDoc(socialRef);
        if (socialSnap.exists()) {
          const data = socialSnap.data();
          if (Array.isArray(data.links)) {
            setSocialLinks(data.links);
          } else {
            // Convert legacy to new format
            const legacy = [
              { id: 'youtube', iconName: 'Youtube', label: 'YouTube', url: data.youtube || '', color: 'bg-[#FF0000]' },
              { id: 'instagram', iconName: 'Instagram', label: 'Instagram', url: data.instagram || '', color: 'bg-[#E4405F]' },
              { id: 'facebook', iconName: 'Facebook', label: 'Facebook', url: data.facebook || '', color: 'bg-[#1877F2]' },
              { id: 'website', iconName: 'Globe', label: 'Website', url: data.website || '', color: 'bg-[#00AEEF]' },
              { id: 'linkedin', iconName: 'Linkedin', label: 'LinkedIn', url: data.linkedin || '', color: 'bg-[#0077B5]' },
            ].filter(l => l.url);
            setSocialLinks(legacy);
          }
        }

        const announceRef = doc(db, 'settings', 'announcement');
        const announceSnap = await getDoc(announceRef);
        if (announceSnap.exists()) {
          const data = announceSnap.data();
          setAnnouncementMessage(data.message || '');
          setAnnouncementImage(data.imageUrl || '');
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

  const handleSaveSocials = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'social'), { links: socialLinks });
      toast.success('Social links updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addSocialLink = () => {
    const newLink = {
      id: Math.random().toString(36).substr(2, 9),
      iconName: 'Globe',
      label: 'New Link',
      url: '',
      color: 'bg-slate-500'
    };
    setSocialLinks([...socialLinks, newLink]);
  };

  const updateSocialLink = (id: string, updates: any) => {
    setSocialLinks(socialLinks.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteSocialLink = (id: string) => {
    setSocialLinks(socialLinks.filter(l => l.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 800KB for Firestore)
    if (file.size > 800 * 1024) {
      toast.error('Image is too large. Please select an image under 800KB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAnnouncementImage(reader.result as string);
      setIsUploading(false);
      toast.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
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
        imageUrl: announcementImage,
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

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Announcement Image</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Upload from device</p>
                <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-brand-red focus:outline-none group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-red transition-colors mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      {isUploading ? 'Reading file...' : 'Click to upload image'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Max size: 800KB</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Or use Image URL</p>
                <input
                  type="url"
                  value={announcementImage.startsWith('data:') ? '' : announcementImage}
                  onChange={(e) => setAnnouncementImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all text-sm font-medium h-[128px]"
                />
              </div>
            </div>

            {announcementImage && (
              <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 group">
                <img 
                  src={announcementImage} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (!announcementImage.startsWith('data:')) {
                      toast.error('Invalid image URL');
                    }
                  }}
                />
                <button
                  onClick={() => setAnnouncementImage('')}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] font-bold rounded uppercase tracking-widest">
                  {announcementImage.startsWith('data:') ? 'Uploaded File' : 'External URL'}
                </div>
              </div>
            )}
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

      {/* Social Links Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-red" />
              Social Media Links
            </h2>
            <p className="text-sm text-slate-500">Manage icons in the home page sidebar.</p>
          </div>
          <button
            onClick={addSocialLink}
            className="p-2 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-all shadow-md"
            title="Add New Link"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {socialLinks.map((link) => (
              <div key={link.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4 relative group">
                <button
                  onClick={() => deleteSocialLink(link.id)}
                  className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateSocialLink(link.id, { label: e.target.value })}
                      placeholder="e.g. YouTube"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {AVAILABLE_ICONS.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => updateSocialLink(link.id, { iconName: item.name })}
                          className={cn(
                            "p-2 rounded-lg border transition-all",
                            link.iconName === item.name ? "bg-brand-red border-brand-red text-white" : "bg-white border-slate-200 text-slate-400 hover:border-brand-red"
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL</label>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateSocialLink(link.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color Class (Tailwind)</label>
                  <input
                    type="text"
                    value={link.color}
                    onChange={(e) => updateSocialLink(link.id, { color: e.target.value })}
                    placeholder="e.g. bg-[#FF0000]"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          {socialLinks.length > 0 && (
            <div className="pt-4">
              <button
                onClick={handleSaveSocials}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-black uppercase tracking-widest rounded-xl hover:bg-brand-red/90 transition-all disabled:opacity-50 shadow-lg shadow-brand-red/20"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save All Social Links
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
