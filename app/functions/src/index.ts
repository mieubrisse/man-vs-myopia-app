import { setGlobalOptions } from 'firebase-functions';
setGlobalOptions({ maxInstances: 1 });

import * as functions from 'firebase-functions';

import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;
function getDb() {
  if (!db) {
    admin.initializeApp();
    db = getFirestore();
  }
  return db;
}

// Backed by the Cloud Secret Manager secret of the same name, injected at
// runtime into every function that declares it in its `secrets` option.
//
// This deliberately has no default. This repository is public, so any default
// here is a published credential, and a deploy that fell back to it would
// authenticate real callers against a value anyone can read. With no default,
// a deploy that has not been given the secret fails instead of falling back.
const SHARED_SECRET = functions.params.defineSecret('SHARED_SECRET');

// Utility: check shared secret from header
function verifySharedSecret(req: functions.https.Request): void {
  const providedSecret =
    (req.headers['x-api-key'] as string | undefined) ?? (req.query.secret as string | undefined);

  const expectedSecret = SHARED_SECRET.value();

  if (!expectedSecret) {
    // Misconfiguration on server – don't leak details
    throw new functions.https.HttpsError('internal', 'Server not configured correctly.');
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid API key.');
  }
}

// Example: read a user’s data document by userId
export const getUserDataBySecret = functions.https.onRequest(
  { secrets: [SHARED_SECRET] },
  async (req, res) => {
    const db = getDb();

    try {
      // Only allow GET/POST as you prefer
      if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // Verify shared secret
      try {
        verifySharedSecret(req);
      } catch (err) {
        const e = err as functions.https.HttpsError;
        // A server missing its secret is not a rejected caller. Reporting it as
        // 401 made a broken deploy look like an ordinary bad-key response, so
        // misconfiguration is surfaced as 5xx and only a real key mismatch 401s.
        const isServerMisconfigured = e.code === 'internal';
        res.status(isServerMisconfigured ? 500 : 401).json({ error: e.message });
        return;
      }

      // Input: userId from query or body
      const userId =
        (req.method === 'GET' ? (req.query.userId as string | undefined) : req.body?.userId) ?? '';

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      // Firestore path based on your app’s structure:
      // 'users/{userId}/data/userData'
      const docRef = db.doc(`users/${userId}/data/userData`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        res.status(404).json({ error: 'User data not found' });
        return;
      }

      const data = docSnap.data();

      // Optionally: filter/sanitize fields before returning

      res.status(200).json({ userId, data });
    } catch (error) {
      console.error('Error in getUserDataBySecret:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
