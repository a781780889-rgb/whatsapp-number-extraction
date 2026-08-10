import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../../../shared/middleware/auth.middleware.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import * as c from "../controllers/publishing.controller.js";
import {
  createAccountSchema,
  embeddedSignupSchema,
  createCampaignSchema,
  deliveriesQuerySchema,
  idParamSchema,
} from "../validators/schemas.js";
export const privatePublishingRouter = Router();
privatePublishingRouter.use(requireAuth);
privatePublishingRouter.get("/overview", c.overview);
privatePublishingRouter.get("/health", c.health);
privatePublishingRouter.get("/accounts", c.listAccounts);
privatePublishingRouter.get("/embedded-signup/config", c.embeddedSignupConfig);
privatePublishingRouter.post(
  "/accounts/embedded-signup",
  requireRole("admin", "operator"),
  validate({ body: embeddedSignupSchema }),
  c.completeEmbeddedSignup,
);
privatePublishingRouter.post(
  "/accounts",
  requireRole("admin", "operator"),
  validate({ body: createAccountSchema }),
  c.createAccount,
);
privatePublishingRouter.get("/templates", c.listTemplates);
privatePublishingRouter.get("/campaigns", c.listCampaigns);
privatePublishingRouter.post(
  "/campaigns",
  requireRole("admin", "operator"),
  validate({ body: createCampaignSchema }),
  c.createCampaign,
);
for (const action of ["start", "pause", "resume", "stop"] as const)
  privatePublishingRouter.post(
    `/campaigns/:id/${action}`,
    requireRole("admin", "operator"),
    validate({ params: idParamSchema }),
    c.controlCampaign,
  );
privatePublishingRouter.get(
  "/deliveries",
  validate({ query: deliveriesQuerySchema }),
  c.listDeliveries,
);
