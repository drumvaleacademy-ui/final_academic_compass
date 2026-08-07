import { Router } from "express";
import authRoutes from "./auth";
import markEntriesRoutes from "./mark-entries";
import timetableSlotsRoutes from "./timetable-slots";
import conflictsRoutes from "./conflicts";
import syncRoutes from "./sync";
import importsRoutes from "./imports";
import healthRoutes from "./health";

const router = Router();

router.use("/auth", authRoutes);
router.use("/mark-entries", markEntriesRoutes);
router.use("/timetable-slots", timetableSlotsRoutes);
router.use("/conflicts", conflictsRoutes);
router.use("/sync", syncRoutes);
router.use("/imports", importsRoutes);
router.use("/healthz", healthRoutes);

export default router;
