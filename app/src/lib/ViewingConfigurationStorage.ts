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
  // Ids deleted by the user. A browser still holding a pre-cloud copy must not bring them back.
  deletedIds: z.array(z.string()).default([]),
});

export type ViewingConfiguration = z.infer<typeof ViewingConfigurationSchema>;
export type ViewingConfigurationsDoc = z.infer<typeof ViewingConfigurationsDocSchema>;

/**
 * Where every version of the app before KEV-953 kept viewing configurations. localStorage is
 * per-origin, so the move from Firebase Hosting to Vercel left them behind in the old origin.
 * This module only ever reads this key; it never writes or removes it, so it stays a backup.
 */
export const LEGACY_LOCAL_STORAGE_KEY = 'viewingConfigurations';

/**
 * Remembers, per user and per browser, the exact legacy value already imported into the cloud,
 * so an unchanged legacy value is not re-read on every load. Deletions are guarded separately,
 * by `deletedIds` in the cloud document, which every browser sees.
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

/** A missing document is an empty one; a malformed one throws, so nothing writes over it. */
const parseCloudDoc = (snapshot: DocumentSnapshot): ViewingConfigurationsDoc => {
  if (!snapshot.exists()) {
    return { configurations: [], deletedIds: [] };
  }
  return ViewingConfigurationsDocSchema.parse(snapshot.data());
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

/**
 * Adds the local entries the cloud lacks, by id, skipping any the user has deleted.
 * Never removes or replaces a cloud entry.
 */
export const mergeLocalIntoCloud = (
  cloud: ViewingConfigurationsDoc,
  local: ViewingConfiguration[]
): ViewingConfigurationsDoc => {
  const skipIds = new Set([...cloud.configurations.map(config => config.id), ...cloud.deletedIds]);
  const additions = local.filter(config => {
    if (skipIds.has(config.id)) {
      return false;
    }
    skipIds.add(config.id);
    return true;
  });
  return { ...cloud, configurations: [...cloud.configurations, ...additions] };
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
    return parseCloudDoc(await getDoc(docRef)).configurations;
  }

  const merged = await runTransaction(db, async transaction => {
    const cloud = parseCloudDoc(await transaction.get(docRef));
    const result = mergeLocalIntoCloud(cloud, legacyConfigurations);
    if (result.configurations.length !== cloud.configurations.length) {
      transaction.set(docRef, result);
    }
    return result.configurations;
  });
  // Only after the cloud write has committed, or a failed import would never be retried.
  try {
    localStorage.setItem(importedMarkerKey(userId), rawLegacy);
  } catch (e) {
    // The import succeeded; without the marker it is merely re-checked on the next load.
    console.error('Could not record the viewing configuration import marker:', e);
  }
  return merged;
};

/** Read-modify-write inside one transaction, so a change made on another device is kept. */
const updateCloudDoc = async (
  update: (current: ViewingConfigurationsDoc) => ViewingConfigurationsDoc
): Promise<ViewingConfiguration[]> => {
  const docRef = getDocRef(getUserId());
  return runTransaction(db, async transaction => {
    const next = update(parseCloudDoc(await transaction.get(docRef)));
    transaction.set(docRef, next);
    return next.configurations;
  });
};

export const addViewingConfiguration = (
  configuration: ViewingConfiguration
): Promise<ViewingConfiguration[]> =>
  updateCloudDoc(current => ({
    ...current,
    configurations: [...current.configurations, ViewingConfigurationSchema.parse(configuration)],
  }));

/**
 * Records the id as deleted even when the cloud never held it (a browser-only entry shown while
 * the cloud was unreachable), so no browser's legacy copy can import it again.
 */
export const deleteViewingConfiguration = (
  configurationId: string
): Promise<ViewingConfiguration[]> =>
  updateCloudDoc(current => ({
    configurations: current.configurations.filter(config => config.id !== configurationId),
    deletedIds: current.deletedIds.includes(configurationId)
      ? current.deletedIds
      : [...current.deletedIds, configurationId],
  }));
