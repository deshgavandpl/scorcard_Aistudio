import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Save, Youtube, Instagram, Facebook, Globe, Linkedin, ArrowLeft, Megaphone, Trash2, Send, Plus, Twitter, Github, MessageCircle, Shield, Upload, Image as ImageIcon, X, ShoppingBag, Sparkles } from 'lucide-react';
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
  const { isAdminMode, login } = useAdmin();
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(adminId, adminPass)) {
      toast.success('Admin Mode Unlocked');
    } else {
      setLoginError('Invalid ID or PIN');
      toast.error('Invalid credentials');
    }
  };

  if (!isAdminMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 mx-auto rotate-3">
              <Shield className="w-10 h-10 text-brand-red" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Admin Section</h1>
            <p className="text-slate-500 font-medium">Enter credentials to access admin tools.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Admin ID</label>
              <input 
                type="text" 
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all"
                placeholder="Enter ID"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN / Password</label>
              <input 
                type="password" 
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all"
                placeholder="Enter PIN"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-brand-red text-[10px] font-black uppercase tracking-widest text-center animate-bounce">
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full py-5 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 active:scale-95"
            >
              Unlock Access
            </button>
          </form>

          <div className="pt-4 text-center">
            <Link 
              to="/"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
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

  // Product Advertisement States
  const [adActive, setAdActive] = useState(false);
  const [adProductName, setAdProductName] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adTargetUrl, setAdTargetUrl] = useState('');
  const [adCtaText, setAdCtaText] = useState('Buy Now');
  const [adDisplayType, setAdDisplayType] = useState<'marquee' | 'popup' | 'both'>('both');
  const [isAdUploading, setIsAdUploading] = useState(false);
  const [savingAd, setSavingAd] = useState(false);

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

        const adRef = doc(db, 'settings', 'advertisement');
        const adSnap = await getDoc(adRef);
        if (adSnap.exists()) {
          const data = adSnap.data();
          setAdActive(data.active || false);
          setAdProductName(data.productName || '');
          setAdDescription(data.description || '');
          setAdImageUrl(data.imageUrl || '');
          setAdTargetUrl(data.targetUrl || '');
          setAdCtaText(data.ctaText || 'Buy Now');
          setAdDisplayType(data.displayType || 'both');
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

  const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error('Image is too large. Please select an image under 800KB.');
      return;
    }

    setIsAdUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAdImageUrl(reader.result as string);
      setIsAdUploading(false);
      toast.success('Product image uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsAdUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAd = async () => {
    if (!adProductName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!adDescription.trim()) {
      toast.error('Please enter a description / promo tagline');
      return;
    }

    setSavingAd(true);
    try {
      await setDoc(doc(db, 'settings', 'advertisement'), {
        active: adActive,
        productName: adProductName,
        description: adDescription,
        imageUrl: adImageUrl,
        targetUrl: adTargetUrl,
        ctaText: adCtaText || 'Buy Now',
        displayType: adDisplayType,
        timestamp: Date.now()
      });
      toast.success('Product advertisement settings updated successfully!');
    } catch (error) {
      console.error('Error saving ad settings:', error);
      toast.error('Failed to save advertisement settings');
    } finally {
      setSavingAd(false);
    }
  };

  const handleClearAd = async () => {
    setSavingAd(true);
    try {
      await setDoc(doc(db, 'settings', 'advertisement'), {
        active: false,
        productName: '',
        description: '',
        imageUrl: '',
        targetUrl: '',
        ctaText: 'Buy Now',
        displayType: 'both',
        timestamp: Date.now()
      });
      setAdActive(false);
      setAdProductName('');
      setAdDescription('');
      setAdImageUrl('');
      setAdTargetUrl('');
      setAdCtaText('Buy Now');
      setAdDisplayType('both');
      toast.success('Advertisement cleared successfully');
    } catch (error) {
      console.error('Error clearing ad:', error);
      toast.error('Failed to clear advertisement');
    } finally {
      setSavingAd(false);
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

      {/* Product Advertisement Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" id="admin-product-ad-form">
        <div className="p-6 border-b border-slate-100 bg-amber-50/50">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-amber-700">
            <ShoppingBag className="w-5 h-5 text-amber-600 shrink-0" />
            Live Page Advertisement
          </h2>
          <p className="text-sm text-slate-500">Configure promotional products, discounts, or alerts shown in real-time on live matches.</p>
        </div>

        <div className="p-6 space-y-5 text-left">
          {/* Active status & display types inline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Status</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdActive(true)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase transition-all border cursor-pointer",
                    adActive 
                      ? "bg-slate-950 border-slate-950 text-amber-400 font-extrabold shadow-sm" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  🟢 Enabled
                </button>
                <button
                  type="button"
                  onClick={() => setAdActive(false)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase transition-all border cursor-pointer",
                    !adActive 
                      ? "bg-slate-950 border-slate-950 text-slate-400 font-extrabold shadow-sm" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  🔴 Disabled
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Display Style</span>
              <select
                value={adDisplayType}
                onChange={(e) => setAdDisplayType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-xs font-black text-slate-700 uppercase tracking-wider h-[46px]"
              >
                <option value="both">Both (Ticker + Popup)</option>
                <option value="marquee">Top Scrolling Ticker Only</option>
                <option value="popup">Interactive Popup Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Product Title</span>
              <input
                type="text"
                value={adProductName}
                onChange={(e) => setAdProductName(e.target.value)}
                placeholder="e.g. Apna Cricket Pro Bat"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-sm font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">CTA Button Text</span>
              <input
                type="text"
                value={adCtaText}
                onChange={(e) => setAdCtaText(e.target.value)}
                placeholder="e.g. Shop Now, Get 25% Off"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-sm font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Promo Description Tagline</span>
            <textarea
              value={adDescription}
              onChange={(e) => setAdDescription(e.target.value)}
              placeholder="e.g. Selected English willow, extreme power stroke, order yours today and get a free trial ball!"
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Action Location URL</span>
            <input
              type="url"
              value={adTargetUrl}
              onChange={(e) => setAdTargetUrl(e.target.value)}
              placeholder="e.g. https://wa.me/91XXXXXXXXXX or storefront link"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Showcase Product Image</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">Upload Product File</span>
                <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-brand-red focus:outline-none group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-red transition-colors mb-2" />
                    <p className="text-xs text-slate-500 font-medium select-none">
                      {isAdUploading ? 'Reading file...' : 'Choose illustration'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Max size: 800KB</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAdImageUpload}
                    disabled={isAdUploading}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">Or Paste URL link</span>
                <input
                  type="url"
                  value={adImageUrl.startsWith('data:') ? '' : adImageUrl}
                  onChange={(e) => setAdImageUrl(e.target.value)}
                  placeholder="https://example.com/cricket-bat.png"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none transition-all text-sm font-medium h-32"
                />
              </div>
            </div>

            {adImageUrl && (
              <div className="mt-4 relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 p-2 flex items-center justify-center group">
                <img 
                  src={adImageUrl} 
                  alt="Product Ad Showcase" 
                  className="max-h-full max-w-full object-contain mx-auto block rounded-lg text-xs"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setAdImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-brand-red transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-black/60 text-white text-[9px] font-mono font-bold rounded uppercase tracking-widest shadow-sm">
                  {adImageUrl.startsWith('data:') ? 'Uploaded File' : 'External URL'}
                </div>
              </div>
            )}
          </div>

          {/* Real-time Simulator / Preview Panel */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-current animate-pulse" />
                  Live Sponsorship System Simulator
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Real-time preview of how the ad will render to active users</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('ad_dismissed_time');
                  localStorage.removeItem('last_ad_id');
                  toast.success('Your browser dismissal cache has been reset! Ad popups will now display again for you on live matches & scores page.');
                }}
                className="text-[10px] bg-white hover:bg-slate-100 text-slate-700 font-black px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
              >
                🔄 Reset My Browser Dismissal Cache
              </button>
            </div>

            {/* Display Locations */}
            <div className="text-[10px] font-bold text-slate-500 flex flex-wrap gap-x-4 gap-y-1 bg-white px-3 py-2 rounded-xl border border-slate-150">
              <span className="text-slate-700 uppercase font-extrabold tracking-wider">Active Live On:</span>
              <Link to="/" className="text-brand-red hover:underline uppercase flex items-center gap-1">🏡 Home Page</Link>
              <Link to="/live" className="text-brand-red hover:underline uppercase flex items-center gap-1">🏏 Live Scores</Link>
              <span className="text-slate-400 uppercase">📈 Match Detail Pages</span>
            </div>

            <div className="space-y-4">
              {/* Type 1: Ticker marquee preview */}
              {(adDisplayType === 'both' || adDisplayType === 'marquee') && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">1. Top Scrolling Ticker Preview</span>
                  <div className="bg-slate-900 text-amber-300 py-2 border border-slate-950 font-mono text-[10px] font-black uppercase tracking-wider overflow-hidden rounded-xl relative group">
                    <div className="whitespace-nowrap flex animate-marquee-custom">
                      <span className="inline-block shrink-0 px-4">
                        🏏 MATCH DAY SPECIAL: {adProductName ? adProductName.toUpperCase() : 'YOUR PRODUCT NAME'} — {adDescription ? adDescription.toUpperCase() : 'PROMO TAGLINE DESCRIPTION'} {adCtaText ? `[ 👉 ${adCtaText.toUpperCase()} NOW ]` : ''} 🏏
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Type 2: Popup Card preview */}
              {(adDisplayType === 'both' || adDisplayType === 'popup') && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">2. Pop-up Interactive Card Preview</span>
                  <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-4 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-slate-900 text-amber-400 font-mono font-black text-[7px] tracking-wider px-2 py-1 rounded-br-xl uppercase">
                      Featured Ad
                    </div>
                    
                    <div className="pt-3 flex gap-3">
                      {adImageUrl ? (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={adImageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}

                      <div className="text-left flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs tracking-tight truncate uppercase">
                          {adProductName || 'Your Awesome Product'}
                        </h5>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                          {adDescription || 'Your promotional campaign description will show right here in this field! Add attractive discount codes or free delivery offers.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase cursor-not-allowed">
                        Later
                      </span>
                      <span className="px-3 py-1.5 bg-brand-red text-white rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-not-allowed">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {adCtaText || 'Get Deal'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={handleSaveAd}
              disabled={savingAd || isAdUploading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-600/15 cursor-pointer"
            >
              {savingAd ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Advertisement
            </button>
            <button
              onClick={handleClearAd}
              disabled={savingAd}
              className="px-6 py-3.5 bg-slate-100 text-slate-600 font-bold uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 cursor-pointer"
              title="Deactivate and Clear Ad Fields"
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
