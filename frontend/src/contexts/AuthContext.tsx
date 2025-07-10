import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  issuerName: string | null;
  login: (token: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [issuerName, setIssuerName] = useState<string | null>(null);

  useEffect(() => {
    // 페이지 로드 시 localStorage에서 토큰과 이름 확인
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('issuerName');
    
    if (token && name) {
      setIsAuthenticated(true);
      setIssuerName(name);
    }
  }, []);

  const login = (token: string, name: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('issuerName', name);
    setIsAuthenticated(true);
    setIssuerName(name);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('issuerName');
    setIsAuthenticated(false);
    setIssuerName(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, issuerName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 