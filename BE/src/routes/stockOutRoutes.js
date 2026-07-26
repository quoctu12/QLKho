const express = require("express");

const {
  getAllStockOuts,
  getStockOutById,
  createStockOut,
} = require("../controllers/stockOutController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN, MANAGER và STAFF đều được xem danh sách phiếu xuất
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllStockOuts
);

// ADMIN, MANAGER và STAFF đều được xem chi tiết phiếu xuất
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getStockOutById
);

// ADMIN, MANAGER và STAFF đều được tạo phiếu xuất
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  createStockOut
);

module.exports = router;