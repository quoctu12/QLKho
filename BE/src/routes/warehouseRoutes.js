const express = require("express");

const {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require("../controllers/warehouseController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER và STAFF được xem danh sách kho
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllWarehouses
);

// ADMIN và MANAGER được thêm kho
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createWarehouse
);

// ADMIN và MANAGER được cập nhật kho
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouse
);

// Chỉ ADMIN được xóa kho
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteWarehouse
);

module.exports = router;