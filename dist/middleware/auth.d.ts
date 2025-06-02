import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    userId?: number;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auth.d.ts.map