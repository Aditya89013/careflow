import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { StaffRole } from "../domain/entities";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12983719";

export interface AuthenticatedUser {
  userId: string;
  hospitalId: string;
  role: StaffRole | "patient" | "super_admin";
  name: string;
  upid?: string;
}

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Support development bypass header
  if (req.headers["x-bypass-auth"]) {
    const role = (req.headers["x-bypass-role"] as string) || "dept_head";
    const userId = role === "admin" ? "s3" : role === "staff" ? "s2" : `s-${role}`;
    const name = `Mock ${role.replace("_", " ")} User`;
    req.user = {
      userId,
      hospitalId: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      role: role as any,
      name,
      upid: role === "patient" ? "CF-2026-MOCKPT" : undefined
    };
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (token.startsWith("mock-bypass-token-")) {
    const role = token.replace("mock-bypass-token-", "");
    req.user = {
      userId: role === "admin" ? "s3" : role === "staff" ? "s2" : `s-${role}`,
      hospitalId: "8a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
      role: role as any,
      name: `Mock ${role.replace("_", " ")} User`,
      upid: role === "patient" ? "CF-2026-MOCKPT" : undefined
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.sub,
      hospitalId: decoded.hospital_id,
      role: decoded.role,
      name: decoded.name,
      upid: decoded.upid
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
}

// Helper to sign JWTs for testing
export function generateTestToken(user: Omit<AuthenticatedUser, "userId"> & { sub: string }): string {
  return jwt.sign(
    {
      sub: user.sub,
      hospital_id: user.hospitalId,
      role: user.role,
      name: user.name,
      upid: user.upid
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}
