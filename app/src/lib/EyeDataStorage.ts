import { doc, DocumentReference, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { assertNotNull } from './utils.ts';
import { z } from 'zod';

export type Eye = 'left' | 'right';

export const EyeTestResultSchema = z.object({
  logMARScore: z.number(),
  correctLetters: z.number(),
  totalLetters: z.number(),
  attemptedLetters: z.number(),
  completedTimestamp: z.number(),
  startedTimestamp: z.number(),
});

export const VisionTestSchema = z.object({
  leftEye: EyeTestResultSchema,
  rightEye: EyeTestResultSchema,
  viewingConfigurationName: z.string(),
  distanceCentimeters: z.number(),
  pixelsPerCm: z.number(),
});

export const UserDataSchema = z.object({
  userId: z.string(),
  testResults: z.array(VisionTestSchema),
});

export type EyeTestResult = z.infer<typeof EyeTestResultSchema>;
export type VisionTest = z.infer<typeof VisionTestSchema>;
export type UserData = z.infer<typeof UserDataSchema>;

/**
 * Utility class for managing vision test data in firebase storage
 */
export class EyeDataStorage {
  private static async getUserUID(): Promise<string> {
    const userId = auth.currentUser?.uid;
    assertNotNull(userId, 'User ID is null');
    return userId;
  }

  private static async getUserDataDocRef(userId: string): Promise<DocumentReference<UserData>> {
    return doc(db, 'users', userId, 'data', 'userData') as DocumentReference<UserData>;
  }

  private static async storeUserData(userData: UserData): Promise<void> {
    const userDataDocRef = await this.getUserDataDocRef(userData.userId);
    await setDoc(userDataDocRef, userData);
  }

  private static async getCurrentUserData(): Promise<UserData> {
    const userId = await this.getUserUID();
    const userDataDocRef = await this.getUserDataDocRef(userId);
    const userDataDoc = await getDoc(userDataDocRef);
    if (userDataDoc.exists()) {
      return UserDataSchema.parse(userDataDoc.data());
    } else {
      const emptyUserData: UserData = {
        userId,
        testResults: [],
      };
      await this.storeUserData(emptyUserData);
      return emptyUserData;
    }
  }

  /**
   * Get all vision tests from storage, sorted by most recent first
   */
  static async getAllTests(): Promise<VisionTest[]> {
    try {
      const userData = await this.getCurrentUserData();
      return userData.testResults.sort(
        (a, b) =>
          Math.max(b.leftEye.completedTimestamp, b.rightEye.completedTimestamp) -
          Math.max(a.leftEye.completedTimestamp, a.rightEye.completedTimestamp)
      );
    } catch (error) {
      console.error('Error reading vision test data from firebase:', error);
    }

    return [];
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
      const userData = await this.getCurrentUserData();
      userData.testResults.push(test);
      await this.storeUserData(userData);

      console.log('Saved vision test:', test);
    } catch (error) {
      console.error('Error saving vision test to localStorage:', error);
    }
  }

  /**
   * Clear all test data
   */
  static async clearAllData(): Promise<void> {
    try {
      const userId = await this.getUserUID();
      const emptyUserData: UserData = {
        userId,
        testResults: [],
      };
      await this.storeUserData(emptyUserData);
      console.log('Cleared all test data');
    } catch (error) {
      console.error('Error clearing all test data:', error);
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
