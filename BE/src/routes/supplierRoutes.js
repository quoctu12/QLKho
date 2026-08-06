const express = require("express");

const {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Lấy danh sách nhà cung cấp
|--------------------------------------------------------------------------
|
| ADMIN, MANAGER và STAFF đều được xem.
|
*/

router.get(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getAllSuppliers
);

/*
|--------------------------------------------------------------------------
| Thêm nhà cung cấp
|--------------------------------------------------------------------------
|
| STAFF được thêm nhanh nhà cung cấp mới khi lập phiếu nhập.
|
*/

router.post(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  createSupplier
);

/*
|--------------------------------------------------------------------------
| Cập nhật nhà cung cấp
|--------------------------------------------------------------------------
|
| Chỉ ADMIN và MANAGER được sửa.
|
*/

router.put(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  updateSupplier
);

/*
|--------------------------------------------------------------------------
| Xóa nhà cung cấp
|--------------------------------------------------------------------------
|
| ADMIN và MANAGER được xóa.
| STAFF không được xóa.
|
*/

router.delete(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  deleteSupplier
);

module.exports = router;