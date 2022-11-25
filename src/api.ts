import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';

export class HttpException extends Error {
  status = 500;
  error = 'Internal Server Error';
  constructor(message = 'Internal Server Error') {
    super(message);
  }
}

export class BadRequestException extends HttpException {
  status = 400;
  error = 'Bad Request';
}

export class UnauthorizedException extends HttpException {
  status = 401;
  error = 'Unauthorized';
  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenException extends HttpException {
  status = 403;
  error = 'Forbidden';
}

export class NotFoundException extends HttpException {
  status = 404;
  error = 'Not Found';
  constructor(message = 'Not Found') {
    super(message);
  }
}

export class MethodNotAllowedException extends HttpException {
  status = 405;
  error = 'Method Not Allowed';
}

export class ConflictException extends HttpException {
  status = 409;
  error = 'Conflict';
}

export class UnprocessableEntityException extends HttpException {
  status = 422;
  error = 'Unprocessable Entity';
  constructor(message = 'Unprocessable Entity') {
    super(message);
  }
}

export const apiHandler = (
  ...middlewares: Array<
    (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>
  >
): NextApiHandler => {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Methods',
        'PUT, POST, PATCH, DELETE, GET',
      );
      res.status(200).end();
    } else {
      try {
        for (let i = 0; i < middlewares.length; i++) {
          const data = await middlewares[i](req, res);
          if (i === middlewares.length - 1) {
            if (req.method === 'POST') {
              res.status(201);
            } else {
              res.status(data ? 200 : 204);
            }
            if (typeof data === 'object') {
              res.json(data);
            } else if (data) {
              res.send(data);
            } else {
              res.end();
            }
          }
        }
      } catch (error: unknown) {
        if (process.env.NODE_ENV === 'test') {
          throw error;
        }
        if (error instanceof HttpException) {
          res.status(error.status).json({
            error: error.error,
            message: error.message || error.error,
            status: error.status,
          });
        } else if (error instanceof ZodError) {
          res.status(400).json({
            error: 'BadRequest',
            message: 'Request data type check failed',
            issues: error.issues,
            status: 400,
          });
        } else if (error instanceof Error) {
          console.error(error);
          res.status(500).json({
            error: 'Internal Servier Error',
            message: error.message,
            status: 500,
          });
        } else {
          console.error(error);
          res.status(500).json({
            error: 'Internal Servier Error',
            status: 500,
          });
        }
      }
    }
  };
};
