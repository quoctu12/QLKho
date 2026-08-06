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

/*
|--------------------------------------------------------------------------
| Xem toàn bộ quy cách đóng gói
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getAllPackaging
);

/*
|--------------------------------------------------------------------------
| Xem quy cách theo sản phẩm
|--------------------------------------------------------------------------
|
| API này được dùng trong màn hình nhập kho và xuất kho.
|
*/

router.get(
  "/product/:productId",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getPackagingByProduct
);

/*
|--------------------------------------------------------------------------
| Thêm quy cách đóng gói
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  createPackaging
);

/*
|--------------------------------------------------------------------------
| Cập nhật quy cách đóng gói
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  updatePackaging
);

/*
|--------------------------------------------------------------------------
| Xóa quy cách đóng gói
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  deletePackaging
);

module.exports = router;