import { doc, DocumentReference, getDoc, runTransaction } from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import { z } from 'zod';
import { auth, db } from '../firebase.ts';
import { assertNotNull } from './utils.ts';

export const ViewingConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  distanceCentimeters: z.number(),
});

const ViewingConfigurationsDocSchema = z.object({
  configurations: z.array(ViewingConfigurationSchema),
});

export type ViewingConfiguration = z.infer<typeof ViewingConfigurationSchema>;
type ViewingConfigurationsDoc = z.infer<typeof ViewingConfigurationsDocSchema>;

/**
 * Where every version of the app before KEV-953 kept viewing configurations. localStorage is
 * per-origin, so the move from Firebase Hosting to Vercel left them behind in the old origin.
 * This module only ever reads this key; it never writes or removes it, so it stays a backup.
 */
export const LEGACY_LOCAL_STORAGE_KEY = 'viewingConfigurations';

/**
 * Remembers, per user and per browser, the exact legacy value already imported into the cloud.
 * Importing again only when the legacy value changes is what stops a configuration deleted on
 * another device from being resurrected by this browser's untouched copy.
 */
export const importedMarkerKey = (userId: string): string =>
  `viewingConfigurationsImportedToCloud:${userId}`;

/**
 * Configurations live in their own document, not in `userData`: `EyeDataStorage` rewrites
 * `userData` whole from a Zod-parsed object, which would strip a field it does not know about.
 */
const getDocRef = (userId: string): DocumentReference =>
  doc(db, 'users', userId, 'data', 'viewingConfigurations');

const getUserId = (): string => {
  const userId = auth.currentUser?.uid;
  assertNotNull(userId, 'User ID is null');
  return userId;
};

/** A missing document is an empty list; a malformed one throws, so nothing writes over it. */
const parseCloudConfigurations = (snapshot: DocumentSnapshot): ViewingConfiguration[] => {
  if (!snapshot.exists()) {
    return [];
  }
  return ViewingConfigurationsDocSchema.parse(snapshot.data()).configurations;
};

/**
 * Reads this browser's pre-cloud configurations, dropping entries that do not parse.
 * Returns null when the key is absent or is not a JSON array.
 */
export const readLegacyLocalConfigurations = (): ViewingConfiguration[] | null => {
  const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('Legacy viewing configurations are not valid JSON; leaving them untouched');
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  return parsed.flatMap(entry => {
    const result = ViewingConfigurationSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
};

/** Adds the local entries the cloud lacks, by id. Never removes or replaces a cloud entry. */
export const mergeLocalIntoCloud = (
  cloud: ViewingConfiguration[],
  local: ViewingConfiguration[]
): ViewingConfiguration[] => {
  const cloudIds = new Set(cloud.map(config => config.id));
  const seenLocalIds = new Set<string>();
  const additions = local.filter(config => {
    if (cloudIds.has(config.id) || seenLocalIds.has(config.id)) {
      return false;
    }
    seenLocalIds.add(config.id);
    return true;
  });
  return [...cloud, ...additions];
};

/**
 * Reads the current user's configurations from the cloud, first importing any this browser holds
 * locally that the cloud lacks.
 */
export const loadViewingConfigurations = async (): Promise<ViewingConfiguration[]> => {
  const userId = getUserId();
  const docRef = getDocRef(userId);

  const rawLegacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
  const legacyConfigurations = readLegacyLocalConfigurations();
  const needsImport =
    rawLegacy !== null &&
    legacyConfigurations !== null &&
    localStorage.getItem(importedMarkerKey(userId)) !== rawLegacy;

  if (!needsImport) {
    return parseCloudConfigurations(await getDoc(docRef));
  }

  const merged = await runTransaction(db, async transaction => {
    const cloud = parseCloudConfigurations(await transaction.get(docRef));
    const result = mergeLocalIntoCloud(cloud, legacyConfigurations);
    if (result.length !== cloud.length) {
      const update: ViewingConfigurationsDoc = { configurations: result };
      transaction.set(docRef, update);
    }
    return result;
  });
  // Only after the cloud write has committed, or a failed import would never be retried.
  localStorage.setItem(importedMarkerKey(userId), rawLegacy);
  return merged;
};

/** Read-modify-write inside one transaction, so a change made on another device is kept. */
const updateCloudConfigurations = async (
  update: (current: ViewingConfiguration[]) => ViewingConfiguration[]
): Promise<ViewingConfiguration[]> => {
  const docRef = getDocRef(getUserId());
  return runTransaction(db, async transaction => {
    const current = parseCloudConfigurations(await transaction.get(docRef));
    const next = update(current);
    const newDoc: ViewingConfigurationsDoc = { configurations: next };
    transaction.set(docRef, newDoc);
    return next;
  });
};

export const addViewingConfiguration = (
  configuration: ViewingConfiguration
): Promise<ViewingConfiguration[]> =>
  updateCloudConfigurations(current => [
    ...current,
    ViewingConfigurationSchema.parse(configuration),
  ]);

export const deleteViewingConfiguration = (
  configurationId: string
): Promise<ViewingConfiguration[]> =>
  updateCloudConfigurations(current => current.filter(config => config.id !== configurationId));
