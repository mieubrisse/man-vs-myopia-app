// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// An in-memory stand-in for Firestore: `cloud` outlives any one browser session, while each
// session's browser storage is jsdom's localStorage, cleared to start a fresh session.
const fake = vi.hoisted(() => {
  const cloud = new Map<string, unknown>();
  const state = {
    currentUser: { uid: 'kevin' } as { uid: string } | null,
    failReads: false,
    writes: 0,
  };
  const snapshot = (path: string) => ({
    exists: () => cloud.has(path),
    data: () => structuredClone(cloud.get(path)),
  });
  const read = (path: string) => {
    if (state.failReads) {
      return Promise.reject(new Error('Firestore unavailable'));
    }
    return Promise.resolve(snapshot(path));
  };
  return { cloud, state, read };
});

vi.mock('../firebase.ts', () => ({
  db: {},
  auth: {
    get currentUser() {
      return fake.state.currentUser;
    },
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  getDoc: (ref: { path: string }) => fake.read(ref.path),
  runTransaction: async (
    _db: unknown,
    body: (transaction: {
      get: (ref: { path: string }) => Promise<unknown>;
      set: (ref: { path: string }, data: unknown) => void;
    }) => Promise<unknown>
  ) => {
    const pending = new Map<string, unknown>();
    const result = await body({
      get: ref => fake.read(ref.path),
      set: (ref, data) => pending.set(ref.path, structuredClone(data)),
    });
    for (const [path, data] of pending) {
      fake.cloud.set(path, data);
      fake.state.writes += 1;
    }
    return result;
  },
}));

import {
  addViewingConfiguration,
  deleteViewingConfiguration,
  importedMarkerKey,
  LEGACY_LOCAL_STORAGE_KEY,
  loadViewingConfigurations,
  mergeLocalIntoCloud,
  readLegacyLocalConfigurations,
  type ViewingConfiguration,
} from './ViewingConfigurationStorage';

const CLOUD_PATH = 'users/kevin/data/viewingConfigurations';
const desk: ViewingConfiguration = { id: 'desk', name: 'Desk', distanceCentimeters: 60 };
const hallway: ViewingConfiguration = { id: 'hall', name: 'Hallway', distanceCentimeters: 300 };
const sofa: ViewingConfiguration = { id: 'sofa', name: 'Sofa', distanceCentimeters: 250 };

const startFreshSession = () => localStorage.clear();

beforeEach(() => {
  fake.cloud.clear();
  fake.state.currentUser = { uid: 'kevin' };
  fake.state.failReads = false;
  fake.state.writes = 0;
  startFreshSession();
});

describe('ViewingConfigurationStorage', () => {
  it('makes a configuration saved in one session readable from a fresh session', async () => {
    await loadViewingConfigurations();
    await addViewingConfiguration(desk);

    startFreshSession();

    expect(await loadViewingConfigurations()).toEqual([desk]);
  });

  it('imports browser-only configurations into an empty cloud and leaves the local copy byte-identical', async () => {
    const legacyRaw = JSON.stringify([desk, hallway]);
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, legacyRaw);

    expect(await loadViewingConfigurations()).toEqual([desk, hallway]);
    expect(fake.cloud.get(CLOUD_PATH)).toEqual({ configurations: [desk, hallway], deletedIds: [] });
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBe(legacyRaw);

    startFreshSession();
    expect(await loadViewingConfigurations()).toEqual([desk, hallway]);
  });

  it('keeps both the cloud configurations and the browser-only ones', async () => {
    fake.cloud.set(CLOUD_PATH, { configurations: [desk] });
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([hallway]));

    expect(await loadViewingConfigurations()).toEqual([desk, hallway]);
    expect(fake.cloud.get(CLOUD_PATH)).toEqual({ configurations: [desk, hallway], deletedIds: [] });
  });

  it('does not let an empty cloud document overwrite browser-only configurations', async () => {
    fake.cloud.set(CLOUD_PATH, { configurations: [] });
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk]));

    expect(await loadViewingConfigurations()).toEqual([desk]);
    expect(fake.cloud.get(CLOUD_PATH)).toEqual({ configurations: [desk], deletedIds: [] });
  });

  it('writes nothing and keeps the local copy when the cloud read fails', async () => {
    const legacyRaw = JSON.stringify([desk]);
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, legacyRaw);
    fake.state.failReads = true;

    await expect(loadViewingConfigurations()).rejects.toThrow('Firestore unavailable');
    expect(fake.state.writes).toBe(0);
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBe(legacyRaw);
    expect(localStorage.getItem(importedMarkerKey('kevin'))).toBeNull();
    expect(readLegacyLocalConfigurations()).toEqual([desk]);

    // The import is retried once the cloud is reachable again.
    fake.state.failReads = false;
    expect(await loadViewingConfigurations()).toEqual([desk]);
  });

  it('refuses to write over a cloud document it cannot parse', async () => {
    const unreadable = { configurations: 'not a list' };
    fake.cloud.set(CLOUD_PATH, unreadable);
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk]));

    await expect(loadViewingConfigurations()).rejects.toThrow();
    await expect(addViewingConfiguration(hallway)).rejects.toThrow();
    expect(fake.cloud.get(CLOUD_PATH)).toEqual(unreadable);
    expect(fake.state.writes).toBe(0);
  });

  it('does not resurrect a configuration deleted on another device', async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk, hallway]));
    await loadViewingConfigurations();
    const thisBrowser = { ...localStorage };

    // Another device deletes Hallway.
    startFreshSession();
    await loadViewingConfigurations();
    await deleteViewingConfiguration(hallway.id);

    // Back on the first browser, whose local copy still lists Hallway.
    startFreshSession();
    for (const [key, value] of Object.entries(thisBrowser)) {
      localStorage.setItem(key, value);
    }
    expect(await loadViewingConfigurations()).toEqual([desk]);
  });

  it('imports again when the legacy local value changes, as after a rollback', async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk]));
    await loadViewingConfigurations();

    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk, sofa]));

    expect(await loadViewingConfigurations()).toEqual([desk, sofa]);
  });

  it('keeps a change made on another device when adding', async () => {
    await addViewingConfiguration(desk);
    // Another device adds Hallway after this page loaded its list.
    fake.cloud.set(CLOUD_PATH, { configurations: [desk, hallway] });

    expect(await addViewingConfiguration(sofa)).toEqual([desk, hallway, sofa]);
  });

  it('keeps each user’s import marker separate', async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk]));
    await loadViewingConfigurations();

    fake.state.currentUser = { uid: 'someone-else' };
    expect(await loadViewingConfigurations()).toEqual([desk]);
    expect(fake.cloud.get('users/someone-else/data/viewingConfigurations')).toEqual({
      configurations: [desk],
      deletedIds: [],
    });
  });

  it('does not let a second browser’s pre-cloud copy resurrect a deleted configuration', async () => {
    const preCloudList = JSON.stringify([desk, hallway]);

    // Browser A imports its copy, then deletes Hallway.
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, preCloudList);
    await loadViewingConfigurations();
    await deleteViewingConfiguration(hallway.id);

    // Browser B holds the same pre-cloud list and has never imported.
    startFreshSession();
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, preCloudList);
    expect(await loadViewingConfigurations()).toEqual([desk]);
  });

  it('keeps a browser-only entry deleted when it was deleted before ever being imported', async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk, hallway]));
    // The page showed the local list after a failed load, and the user deleted Hallway.
    await deleteViewingConfiguration(hallway.id);

    expect(await loadViewingConfigurations()).toEqual([desk]);
  });

  it('never writes or removes the legacy local key when adding or deleting', async () => {
    const legacyRaw = JSON.stringify([desk]);
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, legacyRaw);

    await loadViewingConfigurations();
    await addViewingConfiguration(sofa);
    await deleteViewingConfiguration(desk.id);

    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBe(legacyRaw);
  });

  it('only ever writes the viewing configurations document', async () => {
    const userDataPath = 'users/kevin/data/userData';
    const userData = { userId: 'kevin', testResults: [{ any: 'record' }] };
    fake.cloud.set(userDataPath, userData);
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, JSON.stringify([desk]));

    await loadViewingConfigurations();
    await addViewingConfiguration(sofa);
    await deleteViewingConfiguration(desk.id);

    expect(fake.cloud.get(userDataPath)).toEqual(userData);
    expect([...fake.cloud.keys()].sort()).toEqual([CLOUD_PATH, userDataPath].sort());
  });

  it('refuses to read a malformed cloud document even with nothing to import', async () => {
    fake.cloud.set(CLOUD_PATH, { configurations: 'not a list' });

    await expect(loadViewingConfigurations()).rejects.toThrow();
    expect(fake.state.writes).toBe(0);
  });

  it('leaves unparseable legacy data untouched and imports nothing', async () => {
    localStorage.setItem(LEGACY_LOCAL_STORAGE_KEY, '{not json');

    expect(await loadViewingConfigurations()).toEqual([]);
    expect(fake.state.writes).toBe(0);
    expect(localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)).toBe('{not json');
  });
});

describe('mergeLocalIntoCloud', () => {
  it('keeps the cloud entry when both hold the same id, and drops local duplicates', () => {
    const renamedLocally = { ...desk, name: 'Old desk name' };
    expect(
      mergeLocalIntoCloud({ configurations: [desk], deletedIds: [] }, [
        renamedLocally,
        hallway,
        hallway,
      ])
    ).toEqual({ configurations: [desk, hallway], deletedIds: [] });
  });

  it('skips ids the user has deleted', () => {
    expect(
      mergeLocalIntoCloud({ configurations: [desk], deletedIds: [hallway.id] }, [hallway, sofa])
    ).toEqual({ configurations: [desk, sofa], deletedIds: [hallway.id] });
  });
});

describe('readLegacyLocalConfigurations', () => {
  it('skips malformed entries without discarding the valid ones', () => {
    localStorage.setItem(
      LEGACY_LOCAL_STORAGE_KEY,
      JSON.stringify([desk, { id: 'x', name: 'No distance' }])
    );
    expect(readLegacyLocalConfigurations()).toEqual([desk]);
  });

  it('returns null when nothing was ever stored locally', () => {
    expect(readLegacyLocalConfigurations()).toBeNull();
  });
});
