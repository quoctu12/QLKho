const express = require("express");

const {
  getAllStockIns,
  getStockInById,
  createStockIn,
  updateStockInDetailPrice,
} = require("../controllers/stockInController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN, MANAGER và STAFF đều được xem danh sách phiếu nhập
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllStockIns
);

// ADMIN, MANAGER và STAFF đều được xem chi tiết phiếu nhập
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getStockInById
);

// ADMIN, MANAGER và STAFF đều được tạo phiếu nhập kho
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  createStockIn
);

// Chỉ ADMIN và MANAGER được sửa giá nhập
router.put(
  "/:stockInId/details/:detailId/price",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateStockInDetailPrice
);

module.exports = router;