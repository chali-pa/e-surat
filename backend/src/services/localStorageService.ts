import fs from 'fs';
import path from 'path';
import { Surat, SuratKeluar } from '../models/Surat';

const DATA_DIR = path.join(__dirname, '../../data');
const SURATS_FILE = path.join(DATA_DIR, 'surats.json');
const SURAT_KELUAR_FILE = path.join(DATA_DIR, 'surat_keluar.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(SURATS_FILE)) {
  fs.writeFileSync(SURATS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(SURAT_KELUAR_FILE)) {
  fs.writeFileSync(SURAT_KELUAR_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all surats from local storage
 */
export function getAllSurats(): Surat[] {
  try {
    const data = fs.readFileSync(SURATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading surats from local storage:', error);
    return [];
  }
}

/**
 * Save surat to local storage
 */
export function saveSurat(surat: Surat): Surat {
  try {
    const surats = getAllSurats();
    const newId = surats.length > 0 ? Math.max(...surats.map(s => s.id || 0)) + 1 : 1;
    
    const newSurat: Surat = {
      ...surat,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    surats.push(newSurat);
    fs.writeFileSync(SURATS_FILE, JSON.stringify(surats, null, 2));
    
    return newSurat;
  } catch (error) {
    console.error('Error saving surat to local storage:', error);
    throw new Error('Failed to save surat to local storage');
  }
}

/**
 * Get surat by ID from local storage
 */
export function getSuratById(id: number): Surat | null {
  try {
    const surats = getAllSurats();
    return surats.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Error getting surat from local storage:', error);
    return null;
  }
}

/**
 * Update surat in local storage
 */
export function updateSurat(id: number, surat: Surat): Surat | null {
  try {
    const surats = getAllSurats();
    const index = surats.findIndex(s => s.id === id);
    
    if (index === -1) {
      return null;
    }
    
    surats[index] = {
      ...surats[index],
      ...surat,
      id: id,
      updated_at: new Date().toISOString(),
    };
    
    fs.writeFileSync(SURATS_FILE, JSON.stringify(surats, null, 2));
    return surats[index];
  } catch (error) {
    console.error('Error updating surat in local storage:', error);
    throw new Error('Failed to update surat in local storage');
  }
}

/**
 * Delete surat from local storage
 */
export function deleteSurat(id: number): boolean {
  try {
    const surats = getAllSurats();
    const filteredSurats = surats.filter(s => s.id !== id);
    
    if (filteredSurats.length === surats.length) {
      return false;
    }
    
    fs.writeFileSync(SURATS_FILE, JSON.stringify(filteredSurats, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting surat from local storage:', error);
    throw new Error('Failed to delete surat from local storage');
  }
}

/**
 * Get all surat keluar from local storage
 */
export function getAllSuratKeluar(): SuratKeluar[] {
  try {
    const data = fs.readFileSync(SURAT_KELUAR_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading surat keluar from local storage:', error);
    return [];
  }
}

/**
 * Save surat keluar to local storage
 */
export function saveSuratKeluar(suratKeluar: SuratKeluar): SuratKeluar {
  try {
    const suratKeluars = getAllSuratKeluar();
    const newId = suratKeluars.length > 0 ? Math.max(...suratKeluars.map(s => s.id || 0)) + 1 : 1;
    
    const newSuratKeluar: SuratKeluar = {
      ...suratKeluar,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    suratKeluars.push(newSuratKeluar);
    fs.writeFileSync(SURAT_KELUAR_FILE, JSON.stringify(suratKeluars, null, 2));
    
    return newSuratKeluar;
  } catch (error) {
    console.error('Error saving surat keluar to local storage:', error);
    throw new Error('Failed to save surat keluar to local storage');
  }
}

/**
 * Get surat keluar by ID from local storage
 */
export function getSuratKeluarById(id: number): SuratKeluar | null {
  try {
    const suratKeluars = getAllSuratKeluar();
    return suratKeluars.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Error getting surat keluar from local storage:', error);
    return null;
  }
}

/**
 * Update surat keluar in local storage
 */
export function updateSuratKeluar(id: number, suratKeluar: SuratKeluar): SuratKeluar | null {
  try {
    const suratKeluars = getAllSuratKeluar();
    const index = suratKeluars.findIndex(s => s.id === id);
    
    if (index === -1) {
      return null;
    }
    
    suratKeluars[index] = {
      ...suratKeluars[index],
      ...suratKeluar,
      id: id,
      updated_at: new Date().toISOString(),
    };
    
    fs.writeFileSync(SURAT_KELUAR_FILE, JSON.stringify(suratKeluars, null, 2));
    return suratKeluars[index];
  } catch (error) {
    console.error('Error updating surat keluar in local storage:', error);
    throw new Error('Failed to update surat keluar in local storage');
  }
}

/**
 * Delete surat keluar from local storage
 */
export function deleteSuratKeluar(id: number): boolean {
  try {
    const suratKeluars = getAllSuratKeluar();
    const filteredSuratKeluars = suratKeluars.filter(s => s.id !== id);
    
    if (filteredSuratKeluars.length === suratKeluars.length) {
      return false;
    }
    
    fs.writeFileSync(SURAT_KELUAR_FILE, JSON.stringify(filteredSuratKeluars, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting surat keluar from local storage:', error);
    throw new Error('Failed to delete surat keluar from local storage');
  }
}

export default {
  getAllSurats,
  saveSurat,
  getSuratById,
  updateSurat,
  deleteSurat,
  getAllSuratKeluar,
  saveSuratKeluar,
  getSuratKeluarById,
  updateSuratKeluar,
  deleteSuratKeluar,
};
