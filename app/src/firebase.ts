import {initializeApp} from 'firebase/app';
import {getAnalytics} from "firebase/analytics";
import {getFirestore, connectFirestoreEmulator} from 'firebase/firestore';
import {getAuth, connectAuthEmulator} from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCO1XR2yqK249cv4he7u9kfKY2yn-23clM",
    authDomain: "myopia-data-streams.firebaseapp.com",
    projectId: "myopia-data-streams",
    storageBucket: "myopia-data-streams.firebasestorage.app",
    messagingSenderId: "546263451191",
    appId: "1:546263451191:web:f3177e1254565e5bdc21b2",
    measurementId: "G-HT81VC67L9"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
analytics.app.automaticDataCollectionEnabled = true;

export const db = getFirestore(app);
export const auth = getAuth(app);

if (process.env.NODE_ENV === 'development') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
}
