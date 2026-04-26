import jwt, { type JwtPayload } from "jsonwebtoken";

export class AuthError extends Error {
  public readonly code: string;

  constructor(message: string, code = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

interface TokenPayload extends JwtPayload {
  userId: string;
}

const getJwtSecrets = (): { accessSecret: string; refreshSecret: string } => {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret) {
    throw new AuthError("JWT_SECRET is not configured", "JWT_SECRET_MISSING");
  }

  if (!refreshSecret) {
    throw new AuthError(
      "JWT_REFRESH_SECRET is not configured",
      "JWT_REFRESH_SECRET_MISSING",
    );
  }

  return { accessSecret, refreshSecret };
};

export const generateAccessToken = (userId: string): string => {
  try {
    const { accessSecret } = getJwtSecrets();
    return jwt.sign({ userId }, accessSecret, { expiresIn: "15m" });
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(
      "Failed to generate access token",
      "ACCESS_TOKEN_FAILED",
    );
  }
};

export const generateRefreshToken = (userId: string): string => {
  try {
    const { refreshSecret } = getJwtSecrets();
    return jwt.sign({ userId }, refreshSecret, { expiresIn: "30d" });
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(
      "Failed to generate refresh token",
      "REFRESH_TOKEN_FAILED",
    );
  }
};

const verifyToken = (token: string, secret: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (!decoded.userId) {
      throw new AuthError("Token payload is invalid", "TOKEN_INVALID_PAYLOAD");
    }

    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(
      "Token verification failed",
      "TOKEN_VERIFICATION_FAILED",
    );
  }
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const { accessSecret } = getJwtSecrets();
  return verifyToken(token, accessSecret);
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const { refreshSecret } = getJwtSecrets();
  return verifyToken(token, refreshSecret);
};
