import { IncomingMessage } from "http";
import { NextApiRequest } from "next";
import { ForbiddenException } from ".";
import { MethodNotAllowedException, UnauthorizedException } from "./api";
import { Method } from "./types";

export const allowMethods = (...methods: string[]) => {
  return async (req: NextApiRequest): Promise<void> => {
    if (!req.method) {
      throw new Error("req.method is missing");
    }
    if (
      req.method !== "OPTIONS" &&
      !methods.map((method) => method.toUpperCase()).includes(req.method)
    ) {
      throw new MethodNotAllowedException();
    }
  };
};

declare module "http" {
  interface IncomingMessage {
    auth: string;
  }
}

export const buildRequireAuth =
  (getUserIdFromReq: (req: IncomingMessage) => Promise<string>) =>
  async (req: IncomingMessage): Promise<void> => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    try {
      req.auth = await getUserIdFromReq(req);
    } catch {
      throw new UnauthorizedException();
    }
  };

const getRequiredScope = <T>(
  reqMethod: Method,
  scope?: T,
  method?: Method,
  scope2?: T,
  method2?: Method,
  scope3?: T,
  method3?: Method
): T | undefined => {
  if (!method) {
    return scope;
  }
  if (reqMethod === method) {
    return scope;
  }
  if (reqMethod === method2) {
    if (!scope2) {
      throw new Error("Unexpected require scope params.");
    }
    return scope2;
  }
  if (reqMethod === method3) {
    if (!scope3) {
      throw new Error("Unexpected require scope params.");
    }
    return scope3;
  }
};

export const buildRequireScope =
  <T>(getUserScopes: (userId: string) => Promise<T[]>) =>
  (
    scope?: T,
    method?: Method,
    scope2?: T,
    method2?: Method,
    scope3?: T,
    method3?: Method
  ) => {
    return async (req: IncomingMessage): Promise<void> => {
      if (process.env.NODE_ENV === "test") {
        return;
      }
      if (!req.method?.toUpperCase()) {
        throw new Error("Unexpected undefined method");
      }
      const requiredScope = getRequiredScope<T>(
        req.method?.toUpperCase() as Method,
        scope,
        method,
        scope2,
        method2,
        scope3,
        method3
      );
      if (!requiredScope) {
        return;
      }
      const scopes = await getUserScopes(req.auth);
      if (!scopes.includes(requiredScope)) {
        throw new ForbiddenException();
      }
    };
  };
