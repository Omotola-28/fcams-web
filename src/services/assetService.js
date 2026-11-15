// src/services/assetService.js
import { supabase } from '../config/supabase';

export const assetService = {
  // Fetch all assets with their joined category and location names
  async getAllAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        categories (name),
        locations (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Fetch only assets marked as available and borrowable
  async getBorrowableAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select(`*, categories(name), locations(name)`)
      .eq('status', 'Available')
      .eq('is_borrowable', true);

    if (error) throw error;
    return data;
  },

  async getCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return data;
  },

  async getLocations() {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw error;
    return data;
  }
};