import { supabase } from './supabaseClient';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

export const uploadBanner = async (file: File, eventId: string): Promise<UploadResult> => {
  try {
    console.log('Starting upload:', { fileName: file.name, fileSize: file.size, eventId });
    
    // Generate unique filename (simpler path structure)
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Upload path:', filePath);

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-banners')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }

    console.log('Upload successful, getting public URL...');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-banners')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData.publicUrl);

    return { url: urlData.publicUrl, error: null };

  } catch (error) {
    console.error('Storage error:', error);
    return { url: null, error: 'Failed to upload banner' };
  }
};

export const deleteBanner = async (url: string): Promise<{ error: string | null }> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('event-banners')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { error: error.message };
    }

    return { error: null };

  } catch (error) {
    console.error('Delete error:', error);
    return { error: 'Failed to delete banner' };
  }
};