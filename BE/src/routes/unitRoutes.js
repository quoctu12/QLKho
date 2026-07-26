const express = require("express");

const {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER và STAFF được xem đơn vị tính
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllUnits
);

// ADMIN và MANAGER được thêm đơn vị tính
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createUnit
);

// ADMIN và MANAGER được cập nhật đơn vị tính
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateUnit
);

// Chỉ ADMIN được xóa đơn vị tính
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteUnit
);

module.exports = router;