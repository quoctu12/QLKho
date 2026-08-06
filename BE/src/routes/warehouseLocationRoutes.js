const express = require("express");

const {
  getAllWarehouseLocations,
  getWarehouseLocationById,
  createWarehouseLocation,
  updateWarehouseLocation,
  updateWarehouseLocationStatus,
} = require("../controllers/warehouseLocationController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Xem danh sách vị trí kho
|--------------------------------------------------------------------------
|
| Cả ba vai trò đều được xem.
|
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllWarehouseLocations
);

/*
|--------------------------------------------------------------------------
| Xem chi tiết vị trí kho
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getWarehouseLocationById
);

/*
|--------------------------------------------------------------------------
| Thêm vị trí kho
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createWarehouseLocation
);

/*
|--------------------------------------------------------------------------
| Cập nhật vị trí kho
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouseLocation
);

/*
|--------------------------------------------------------------------------
| Thay đổi trạng thái vị trí kho
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouseLocationStatus
);

module.exports = router;