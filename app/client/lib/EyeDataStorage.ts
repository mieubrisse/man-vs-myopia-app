export type Eye = 'left' | 'right';

export interface EyeTestResult {
  logMARScore: number;
  correctLetters: number;
  totalLetters: number;
  attemptedLetters: number;
  completedTimestamp: number;
  startedTimestamp: number;
}

export interface VisionTest {
  leftEye: EyeTestResult;
  rightEye: EyeTestResult;
  viewingConfigurationName: string;
  distanceCentimeters: number;
  pixelsPerCm: number;
}

const STORAGE_KEY = 'visionTests';

/**
 * Utility class for managing vision test data in localStorage
 */
export class EyeDataStorage {
  
  /**
   * Get all vision tests from storage, sorted by most recent first
   */
  static getAllTests(): VisionTest[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tests = JSON.parse(stored) as VisionTest[];
        return tests.sort((a, b) => 
          Math.max(b.leftEye.completedTimestamp, b.rightEye.completedTimestamp) - 
          Math.max(a.leftEye.completedTimestamp, a.rightEye.completedTimestamp)
        );
      }
    } catch (error) {
      console.error('Error reading vision test data from localStorage:', error);
    }
    
    return [];
  }

  /**
   * Get all data for a specific eye from all tests, sorted by most recent first
   */
  static getEyeData(eye: Eye): EyeTestResult[] {
    const allTests = this.getAllTests();
    return allTests.map(test => test[eye === 'left' ? 'leftEye' : 'rightEye']);
  }

  /**
   * Save a complete vision test (both eyes)
   */
  static saveTest(test: VisionTest): void {
    try {
      const allTests = this.getAllTests();
      allTests.push(test);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTests));
      
      console.log('Saved vision test:', test);
    } catch (error) {
      console.error('Error saving vision test to localStorage:', error);
    }
  }

  /**
   * Clear all test data
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared all test data');
    } catch (error) {
      console.error('Error clearing all test data:', error);
    }
  }

  /**
   * Get the most recent LogMAR score for a specific eye
   */
  static getLatestLogMAR(eye: Eye): number | null {
    const eyeData = this.getEyeData(eye);
    return eyeData.length > 0 ? eyeData[0].logMARScore : null;
  }
}