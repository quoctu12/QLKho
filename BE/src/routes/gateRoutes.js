const express = require("express");

const {
  getAllGates,
  createGate,
  updateGate,
  deleteGate,
} = require("../controllers/gateController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER và STAFF được xem danh sách cổng kho
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllGates
);

// ADMIN và MANAGER được thêm cổng kho
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createGate
);

// ADMIN và MANAGER được cập nhật cổng kho
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateGate
);

// Chỉ ADMIN được xóa cổng kho
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteGate
);

module.exports = router;