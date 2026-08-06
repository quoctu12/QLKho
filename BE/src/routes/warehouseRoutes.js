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

/*
|--------------------------------------------------------------------------
| Xem danh sách kho
|--------------------------------------------------------------------------
|
| STAFF cần xem kho để lập phiếu nhập, phiếu xuất và tra cứu tồn kho.
|
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllWarehouses
);

/*
|--------------------------------------------------------------------------
| Thêm kho
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createWarehouse
);

/*
|--------------------------------------------------------------------------
| Cập nhật kho
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouse
);

/*
|--------------------------------------------------------------------------
| Xóa kho
|--------------------------------------------------------------------------
|
| ADMIN và MANAGER được thực hiện.
| Controller vẫn phải chặn xóa khi kho đã phát sinh dữ liệu.
|
*/

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  deleteWarehouse
);

module.exports = router;