import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: { user: User } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signInWithToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<{uid: string, email: string, exp?: number}>(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.error("Token expired");
          localStorage.removeItem('token');
        } else {
          setUser({ uid: decoded.uid, email: decoded.email });
        }
      } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const signInWithToken = (token: string) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode<{uid: string, email: string}>(token);
    setUser({ uid: decoded.uid, email: decoded.email });
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signInWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const getAuthToken = async () => {
  return localStorage.getItem('token');
};
