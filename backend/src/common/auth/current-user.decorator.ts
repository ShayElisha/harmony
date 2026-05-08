import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUser = {
  userId: string;
  email: string;
  role: 'male' | 'female' | 'other';
};

export const CurrentUserData = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as CurrentUser;
  },
);
