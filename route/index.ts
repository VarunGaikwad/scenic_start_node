import { Router } from "express";
import { auth, admin } from "../middleware";
import unauthRoutes from "./unauth";
import authRoutes from "./auth";
import adminRouter from "./admin";

const apiRouters = Router();

apiRouters.use("/unauth", unauthRoutes);
apiRouters.use("/auth", auth, authRoutes);
apiRouters.use("/admin", auth, admin, adminRouter);

export default apiRouters;
