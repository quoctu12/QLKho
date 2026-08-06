const express = require("express");

const {
  getAllStoragePricing,
  createStoragePricing,
  updateStoragePricingStatus,
} = require("../controllers/storagePricingController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Xem danh sách đơn giá lưu kho
|--------------------------------------------------------------------------
|
| ADMIN, MANAGER và STAFF đều được xem.
|
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllStoragePricing
);

/*
|--------------------------------------------------------------------------
| Tạo đơn giá lưu kho
|--------------------------------------------------------------------------
|
| Chỉ ADMIN và MANAGER được thực hiện.
|
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createStoragePricing
);

/*
|--------------------------------------------------------------------------
| Thay đổi trạng thái đơn giá
|--------------------------------------------------------------------------
|
| Chỉ ADMIN và MANAGER được khóa hoặc mở khóa.
|
*/

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateStoragePricingStatus
);

module.exports = router;