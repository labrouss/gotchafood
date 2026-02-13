import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export const checkPermission = (requiredRole: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      throw new AppError('Not authenticated', 401);
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (user.role === 'ADMIN') {
      return next();
    }

    if (user.role === 'STAFF') {
      if (roles.includes('kitchen') && user.routingRole) {
        return next();
      }
    }

    if (user.role === 'STAFF' && user.routingRole === 'delivery') {
      if (roles.includes('delivery')) {
        return next();
      }
    }

    throw new AppError('Permission denied', 403);
  };
};

export const checkStation = (station: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      throw new AppError('Not authenticated', 401);
    }

    if (user.role === 'ADMIN') {
      return next();
    }

    if (user.routingRole === station) {
      return next();
    }

    throw new AppError(`Access denied to ${station} station`, 403);
  };
};
