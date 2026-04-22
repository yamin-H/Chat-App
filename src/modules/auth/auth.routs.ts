import { Router } from "express";
import { authController } from "./auth.controllers";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schema";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(authController.register));
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
router.post("/logout", validate(refreshSchema), asyncHandler(authController.logout));
router.post("/ws-token", authenticate, asyncHandler(authController.wsToken));

export default router;