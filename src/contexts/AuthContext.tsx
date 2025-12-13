import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  user_type: "individual" | "organization";
  organization_name?: string;
  organization_id?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (data: any) => Promise<{ error?: Error }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      const userData: User = {
        id: data.user.id || data.user.email, 
        name: data.user.name,
        email: data.user.email,
        user_type: data.user.user_type || "individual", 
        organization_name: data.user.organization_name,
        organization_id: data.user.organization_id,
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      
      return {};
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: error as Error };
    }
  };

  const signUp = async (data: any) => {
    try {
      const res = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Signup failed");
      }

      if (result.id) {
        const userData: User = {
          id: result.id,
          name: result.name,
          email: result.email,
          user_type: result.user_type,
          organization_name: result.organization_name,
          organization_id: result.organization_id,
        };
        
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      return {};
    } catch (error) {
      console.error("Sign up error:", error);
      return { error: error as Error };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};