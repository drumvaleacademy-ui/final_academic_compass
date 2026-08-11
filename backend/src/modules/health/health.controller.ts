import { Controller, Get } from "@nestjs/common";

@Controller()
export class RootController {
  @Get()
  root() {
    return { status: "ok", service: "Academic Compass API", docs: "/api/healthz" };
  }
}

@Controller("api")
export class HealthController {
  @Get("healthz")
  health() {
    return { status: "ok" };
  }
}