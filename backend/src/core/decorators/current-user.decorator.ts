import { createParamDecorator, ExecutionContext } from "@nestjs/common";

type CurrentUserValue = {
  id: string;
  email: string;
  fullName: string;
  schoolId: string;
  roles: string[];
  isActive: boolean;
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserValue | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUserValue }>();
    return request.user;
  }
);
