import type { Eye, EyeTestResult, VisionTest } from './EyeDataStorage';

const API_BASE_URL = '';  // Same origin

/**
 * API-based storage service for vision test data using Postgres backend
 */
export class ApiDataStorage {
  
  /**
   * Get all vision tests from API, sorted by most recent first
   */
  static async getAllTests(): Promise<VisionTest[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vision-tests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tests = await response.json() as VisionTest[];
      
      // Sort by most recent first
      return tests.sort((a, b) => 
        Math.max(b.leftEye.completedTimestamp, b.rightEye.completedTimestamp) - 
        Math.max(a.leftEye.completedTimestamp, a.rightEye.completedTimestamp)
      );
    } catch (error) {
      console.error('Error reading vision test data from API:', error);
      return [];
    }
  }

  /**
   * Get all data for a specific eye from all tests, sorted by most recent first
   */
  static async getEyeData(eye: Eye): Promise<EyeTestResult[]> {
    const allTests = await this.getAllTests();
    return allTests.map(test => test[eye === 'left' ? 'leftEye' : 'rightEye']);
  }

  /**
   * Save a complete vision test (both eyes)
   */
  static async saveTest(test: VisionTest): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vision-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Saved vision test to API:', test);
    } catch (error) {
      console.error('Error saving vision test to API:', error);
      throw error;
    }
  }

  /**
   * Clear all test data
   */
  static async clearAllData(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/vision-tests`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Cleared all test data from API');
    } catch (error) {
      console.error('Error clearing all test data from API:', error);
      throw error;
    }
  }

  /**
   * Get the most recent LogMAR score for a specific eye
   */
  static async getLatestLogMAR(eye: Eye): Promise<number | null> {
    const eyeData = await this.getEyeData(eye);
    return eyeData.length > 0 ? eyeData[0].logMARScore : null;
  }
}