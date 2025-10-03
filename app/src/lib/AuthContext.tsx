import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  type User, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { app } from '../firebase';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: true,
    login: async () => {},
    logout: async () => {},
    signup: async () => {},
    loginWithGoogle: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, [auth]);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const signup = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const value = {
        currentUser,
        loading,
        login,
        logout,
        signup,
        loginWithGoogle
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};