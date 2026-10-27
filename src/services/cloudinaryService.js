/**
 * Cloudinary Direct Unsigned Upload Service
 * 
 * Allows direct photo uploads from phone camera, gallery, or laptop directly
 * to Cloudinary CDN without using Supabase storage or exposing secret keys.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Check if Cloudinary credentials are configured in .env
 */
export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Upload a single image file (Blob/File) directly to Cloudinary
 * 
 * @param {File|Blob} file - The image file selected by user
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToCloudinary = async (file, onProgress = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || UPLOAD_PRESET || 'ml_default';

  if (!cloudName) {
    return {
      success: false,
      error: 'Cloudinary Cloud Name is not configured in .env'
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'flatzy-flats'); // Organizes photos into flatzy-flats folder

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[Cloudinary] Upload failed:', data.error);
      return {
        success: false,
        error: data.error?.message || 'Failed to upload photo to Cloudinary'
      };
    }

    // Return the high-speed HTTPS CDN URL with automatic format and compression tags
    const secureUrl = data.secure_url;
    // Format optimized URL (auto-format WebP, auto-quality)
    const optimizedUrl = secureUrl.includes('/upload/')
      ? secureUrl.replace('/upload/', '/upload/f_auto,q_auto/')
      : secureUrl;

    return {
      success: true,
      url: optimizedUrl,
      rawUrl: secureUrl,
      publicId: data.public_id
    };
  } catch (err) {
    console.error('[Cloudinary] Upload exception:', err);
    return {
      success: false,
      error: err.message || 'Network error while uploading photo'
    };
  }
};
