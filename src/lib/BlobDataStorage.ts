import { put, list, del } from '@vercel/blob';
import type { Eye, EyeTestResult, VisionTest } from './EyeDataStorage';

const VISION_TESTS_KEY = 'vision-tests.json';

/**
 * Utility class for managing vision test data in Vercel Blob Storage
 */
export class BlobDataStorage {
  
  /**
   * Get all vision tests from blob storage, sorted by most recent first
   */
  static async getAllTests(): Promise<VisionTest[]> {
    try {
      // List all blobs to find our vision tests file
      const { blobs } = await list({
        prefix: VISION_TESTS_KEY,
        limit: 1,
      });

      if (blobs.length === 0) {
        return [];
      }

      // Fetch the blob content
      const response = await fetch(blobs[0].url);
      if (!response.ok) {
        throw new Error(`Failed to fetch vision tests: ${response.statusText}`);
      }

      const tests = await response.json() as VisionTest[];
      
      // Sort by most recent first
      return tests.sort((a, b) => 
        Math.max(b.leftEye.completedTimestamp, b.rightEye.completedTimestamp) - 
        Math.max(a.leftEye.completedTimestamp, a.rightEye.completedTimestamp)
      );
    } catch (error) {
      console.error('Error reading vision test data from blob storage:', error);
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
      // Get existing tests
      const allTests = await this.getAllTests();
      
      // Add the new test
      allTests.push(test);
      
      // Convert to JSON string for storage
      const jsonData = JSON.stringify(allTests, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Save to blob storage
      await put(VISION_TESTS_KEY, blob, {
        access: 'public', // Only public access is currently available in Vercel blob storage
      });
      
      console.log('Saved vision test to blob storage:', test);
    } catch (error) {
      console.error('Error saving vision test to blob storage:', error);
      throw error;
    }
  }

  /**
   * Clear all test data
   */
  static async clearAllData(): Promise<void> {
    try {
      // List all blobs with our vision tests key
      const { blobs } = await list({
        prefix: VISION_TESTS_KEY,
      });
      
      // Delete all matching blobs
      for (const blob of blobs) {
        await del(blob.url);
      }
      
      console.log('Cleared all test data from blob storage');
    } catch (error) {
      console.error('Error clearing all test data from blob storage:', error);
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