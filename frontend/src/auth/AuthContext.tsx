import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserSession {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  hospital_id: string;
  hospital_name?: string;
  upid?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserSession | null;
  login: (email: string, password: string) => Promise<boolean>;
  patientLogin: (upid: string, pin: string, email?: string, password?: string) => Promise<boolean>;
  patientRegister: (data: any) => Promise<boolean>;
  hospitalOwnerRegister: (data: any) => Promise<any>;
  hospitalOwnerVerifyOtp: (email: string, otp: string) => Promise<boolean>;
  employeeRegister: (data: any) => Promise<any>;
  employeeConfirmOtp: (email: string, otp: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
  bypassRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("cf_token"));
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("cf_token", token);
      fetchUserProfile();
    } else {
      localStorage.removeItem("cf_token");
      setUser(null);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const patientLogin = async (upid: string, pin: string, email?: string, password?: string): Promise<boolean> => {
    try {
      const body: any = {};
      if (email && password) {
        body.email = email;
        body.password = password;
      } else {
        body.upid = upid;
        body.pin = pin;
      }

      const res = await fetch(`${API_URL}/auth/patient-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const patientRegister = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/patient-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const hospitalOwnerRegister = async (data: any): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/auth/hospital-owner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const hospitalOwnerVerifyOtp = async (email: string, otp: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/hospital-owner/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const employeeRegister = async (data: any): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/auth/employee/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const employeeConfirmOtp = async (email: string, otp: string): Promise<any> => {
    try {
      const res = await fetch(`${API_URL}/auth/employee/confirm-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, otp })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const bypassRole = (role: string) => {
    setToken(`mock-bypass-token-${role}`);
    setUser({
      id: role === "admin" ? "s3" : role === "staff" ? "s2" : `s-${role}`,
      first_name: "Mock",
      last_name: role.toUpperCase(),
      role: role,
      hospital_id: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      hospital_name: "AIIMS New Delhi",
      upid: role === "patient" ? "CF-2026-MOCKPT" : undefined
    });
  };

  return (
    <AuthContext.Provider value={{ 
      token, user, login, patientLogin, patientRegister, 
      hospitalOwnerRegister, hospitalOwnerVerifyOtp, 
      employeeRegister, employeeConfirmOtp, logout, isAuthenticated: !!token, bypassRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
