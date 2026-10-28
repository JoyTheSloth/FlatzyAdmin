import React, { useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
  AlertCircle,
  Camera
} from 'lucide-react';
import { uploadImageToCloudinary } from '../services/cloudinaryService';

export default function CloudinaryImageUploader({
  images = [],
  onChange,
  maxImages = 6,
  isDark = true,
  showToast
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showUrlInputs, setShowUrlInputs] = useState(false);

  // Normalize images array to ensure it's clean and maxImages length
  const cleanImages = (images || []).filter(Boolean);

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = maxImages - cleanImages.length;
    if (availableSlots <= 0) {
      if (showToast) showToast(`⚠️ Upload limit reached (Maximum ${maxImages} photos).`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots && showToast) {
      showToast(`ℹ️ ${maxImages}-photo limit applied: Uploading ${filesToUpload.length} of ${files.length} selected photos.`);
    }

    setUploading(true);
    const newlyUploadedUrls = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadProgress(`Uploading photo ${i + 1} of ${filesToUpload.length}...`);

      const result = await uploadImageToCloudinary(file);
      if (result.success && result.url) {
        newlyUploadedUrls.push(result.url);
      } else {
        if (showToast) {
          showToast(`⚠️ ${result.error || 'Failed to upload photo'}`);
        }
      }
    }

    setUploading(false);
    setUploadProgress('');

    if (newlyUploadedUrls.length > 0) {
      const updated = [...cleanImages, ...newlyUploadedUrls].slice(0, maxImages);
      onChange(updated);
      if (showToast) {
        showToast(`📸 ${newlyUploadedUrls.length} photo${newlyUploadedUrls.length > 1 ? 's' : ''} uploaded to Cloudinary CDN!`);
      }
    }

    // Reset file input value
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    const updated = cleanImages.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUrlChange = (index, value) => {
    const current = [...cleanImages];
    if (value.trim()) {
      current[index] = value.trim();
    } else {
      current.splice(index, 1);
    }
    onChange(current.slice(0, maxImages));
  };

  const remainingSlots = Math.max(0, maxImages - cleanImages.length);

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xs">Flat Photos</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-500">
                Limit: {maxImages} Photos
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Cloudinary CDN hosted • Auto WebP compression
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
            cleanImages.length === maxImages
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {cleanImages.length} / {maxImages}
          </span>
        </div>
      </div>

      {/* 6-Slots Visual Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-3">
        {Array.from({ length: maxImages }, (_, i) => i).map((slotIdx) => {
          const photoUrl = cleanImages[slotIdx];
          const isNextAvailableSlot = !photoUrl && slotIdx === cleanImages.length;

          if (photoUrl) {
            // Uploaded Photo Slot
            return (
              <div
                key={slotIdx}
                className="aspect-4/3 rounded-xl overflow-hidden relative group border-2 border-emerald-500/40 bg-black/20 shadow-sm"
              >
                <img
                  src={photoUrl}
                  alt={`Flat Photo ${slotIdx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(slotIdx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                  title="Remove Photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Badge Label */}
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] text-white font-mono font-bold">
                  {slotIdx === 0 ? '★ Cover' : `#${slotIdx + 1}`}
                </div>
              </div>
            );
          }

          if (isNextAvailableSlot) {
            // Active Upload Button Slot
            return (
              <label
                key={slotIdx}
                className={`aspect-4/3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-1.5 text-center transition-all cursor-pointer ${
                  uploading
                    ? 'opacity-60 pointer-events-none border-blue-500 bg-blue-500/5'
                    : isDark
                      ? 'border-blue-500/60 bg-blue-500/5 hover:border-blue-400 hover:bg-blue-500/10 text-blue-400'
                      : 'border-blue-400 bg-blue-50/60 hover:border-blue-600 hover:bg-blue-100/60 text-blue-600'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin mb-1" />
                    <span className="text-[9px] font-bold text-blue-500 leading-tight">
                      {uploadProgress || 'Uploading...'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center mb-0.5 shadow-xs">
                      <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black">Upload</span>
                    <span className="text-[8px] opacity-75 font-semibold">
                      Slot {slotIdx + 1}/{maxImages}
                    </span>
                  </>
                )}
              </label>
            );
          }

          // Inactive / Empty Slot Placeholder
          return (
            <div
              key={slotIdx}
              className={`aspect-4/3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-1.5 text-center select-none ${
                isDark
                  ? 'border-slate-800 text-slate-600'
                  : 'border-slate-200 text-slate-300'
              }`}
            >
              <ImageIcon className="w-4 h-4 mb-0.5 stroke-[1.5] opacity-40" />
              <span className="text-[9px] font-bold opacity-60">#{slotIdx + 1}</span>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Manual URL Toggle */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => setShowUrlInputs(!showUrlInputs)}
          className="text-blue-500 hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlInputs ? 'Hide URL inputs' : 'Or paste image links directly'}</span>
        </button>

        <span className="text-[10px] text-slate-400">
          {remainingSlots > 0 ? `${remainingSlots} slot${remainingSlots > 1 ? 's' : ''} left` : `All ${maxImages} photo slots filled`}
        </span>
      </div>

      {/* Manual URL Input Rows (Expandable) */}
      {showUrlInputs && (
        <div className="mt-2.5 space-y-1.5 pt-1">
          {Array.from({ length: maxImages }, (_, i) => i).map(i => (
            <div key={i} className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 w-5 text-right">
                #{i + 1}
              </span>
              <input
                type="url"
                placeholder={`Photo ${i + 1} URL (https://...)`}
                value={cleanImages[i] || ''}
                onChange={(e) => handleUrlChange(i, e.target.value)}
                className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] outline-none focus:border-blue-500 font-mono"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
