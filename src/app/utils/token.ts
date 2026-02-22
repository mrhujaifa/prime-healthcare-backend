/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import { envVars } from "../../config/env";
import { Response } from "express";
import { CookieUtils } from "./cookie";

const getAccessToken = (payload: JwtPayload): string => {
  const accessToken = jwtUtils.createToken(
    payload,
    envVars.ACCESS_TOKEN_SECRET,
    {
      expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN,
    } as SignOptions,
  );
  return accessToken;
};

const getRefreshToken = (payload: JwtPayload): string => {
  const refreshToken = jwtUtils.createToken(
    payload,
    envVars.REFRESH_TOKEN_SECRET,
    {
      expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions,
  );
  return refreshToken;
};

// set Access token
const setAccessTokenCookie = (res: any, accessToken: string) => {
  CookieUtils.setCookie(res, "accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
    // 1 day
    maxAge: 60 * 60 * 60 * 24,
  });
};

// set refresh Token on cookie
const setRefreshTokenCookie = (res: any, refreshToken: string) => {
  CookieUtils.setCookie(res, "refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    // 7 days
    maxAge: 60 * 60 * 60 * 24 * 7,
  });
};

// betterAuthSessionCookie setup
const betterAuthSessionCookie = (res: Response, token: string) => {
  CookieUtils.setCookie(res, "better-auth.session_token", token, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
    // 1 day
    maxAge: 60 * 60 * 60 * 24,
  });
};

export const tokenUtils = {
  getAccessToken,
  getRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  betterAuthSessionCookie,
};
