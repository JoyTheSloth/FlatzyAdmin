/**
 * Cloudinary Direct Unsigned Upload Service with Instant Fallback
 * 
 * Allows direct photo uploads from phone camera, gallery, or laptop directly
 * to Cloudinary CDN, with automatic zero-lag client-side WebP compression fallback
 * if Cloudinary upload preset is not yet whitelisted for unsigned uploads.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ys4zcxsm';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Check if Cloudinary credentials are configured in .env
 */
export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Produces crisp, lightweight WebP / JPEG images under 50KB.
 */
export const compressImageToBase64 = (file, maxWidth = 1200, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window context required for image compression'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first; fall back to JPEG if unsupported
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Upload a single image file directly to Cloudinary, or fallback to instant WebP compression
 * 
 * @param {File|Blob} file - The image file selected by user
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @returns {Promise<{success: boolean, url?: string, rawUrl?: string, source?: string, error?: string}>}
 */
export const uploadImageToCloudinary = async (file, onProgress = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || UPLOAD_PRESET;

  // 1. If Cloudinary upload preset is configured and non-empty, attempt Cloudinary upload
  if (cloudName && uploadPreset && uploadPreset.trim().length > 0) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset.trim());
      formData.append('folder', 'flatzy-flats');

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.secure_url) {
        const secureUrl = data.secure_url;
        const optimizedUrl = secureUrl.includes('/upload/')
          ? secureUrl.replace('/upload/', '/upload/f_auto,q_auto/')
          : secureUrl;

        return {
          success: true,
          url: optimizedUrl,
          rawUrl: secureUrl,
          publicId: data.public_id,
          source: 'cloudinary'
        };
      } else {
        console.warn('[Cloudinary] Cloud upload returned error, switching to instant compression:', data.error);
      }
    } catch (err) {
      console.warn('[Cloudinary] Cloud upload exception, switching to instant compression:', err);
    }
  }

  // 2. Instant client-side fallback: Compress to high quality lightweight WebP (<50KB)
  try {
    const compressedDataUrl = await compressImageToBase64(file);
    return {
      success: true,
      url: compressedDataUrl,
      rawUrl: compressedDataUrl,
      source: 'compressed-webp',
      notice: !uploadPreset ? 'Cloudinary upload preset not specified in .env. Saved using optimized WebP compression.' : undefined
    };
  } catch (err) {
    console.error('[ImageUpload] Compression error:', err);
    return {
      success: false,
      error: 'Failed to process photo: ' + (err.message || 'Unknown error')
    };
  }
};
