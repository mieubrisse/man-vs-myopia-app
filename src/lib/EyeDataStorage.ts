export type Eye = 'left' | 'right';

export interface EyeLogMARData {
  logMARScore: number;
  correctLetters: number;
  totalLetters: number;
  attemptedLetters: number;
  timestamp: number;
}

export interface EyeDataRecord {
  left: EyeLogMARData[];
  right: EyeLogMARData[];
}

const STORAGE_KEY = 'eyeLogMARData';

/**
 * Utility class for managing left/right eye LogMAR data in localStorage
 */
export class EyeDataStorage {
  
  /**
   * Get all eye data from storage
   */
  static getAllEyeData(): EyeDataRecord {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading eye data from localStorage:', error);
    }
    
    return { left: [], right: [] };
  }

  /**
   * Get all data for a specific eye, sorted by most recent first
   */
  static getEyeData(eye: Eye): EyeLogMARData[] {
    const allData = this.getAllEyeData();
    return allData[eye].sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  /**
   * Save new LogMAR data for a specific eye
   */
  static saveEyeData(eye: Eye, data: EyeLogMARData): void {
    try {
      const allData = this.getAllEyeData();
      allData[eye].push(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      
      console.log(`Saved ${eye} eye LogMAR data:`, data);
    } catch (error) {
      console.error(`Error saving ${eye} eye data to localStorage:`, error);
    }
  }

  /**
   * Clear all eye data
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared all eye data');
    } catch (error) {
      console.error('Error clearing all eye data:', error);
    }
  }
}