const express = require("express");

const {
  getAllPackaging,
  getPackagingByProduct,
  createPackaging,
  updatePackaging,
  deletePackaging,
} = require("../controllers/packagingController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER và STAFFđược xem toàn bộ quy cách đóng gói
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllPackaging
);

// ADMIN, MANAGER và STAFF được lấy quy cách theo sản phẩm
// Route này cần cho màn hình nhập kho và xuất kho
router.get(
  "/product/:productId",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getPackagingByProduct
);

// ADMIN và MANAGER được thêm quy cách đóng gói
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createPackaging
);

// ADMIN và MANAGER được cập nhật quy cách đóng gói
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updatePackaging
);

// Chỉ ADMIN được xóa quy cách đóng gói
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deletePackaging
);

module.exports = router;