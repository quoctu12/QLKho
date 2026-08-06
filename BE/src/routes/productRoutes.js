const express = require("express");

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
} = require("../controllers/productController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const uploadProductImage = require(
  "../middlewares/uploadProductImage"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Lấy danh sách sản phẩm
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
  getAllProducts
);

/*
|--------------------------------------------------------------------------
| Lấy chi tiết sản phẩm
|--------------------------------------------------------------------------
|
| ADMIN, MANAGER và STAFF đều được xem.
|
*/

router.get(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getProductById
);

/*
|--------------------------------------------------------------------------
| Tạo sản phẩm
|--------------------------------------------------------------------------
|
| STAFF được thêm nhanh sản phẩm mới để tiếp tục lập phiếu nhập.
| STAFF không được sửa hoặc ngừng hoạt động sản phẩm.
|
| Tên field ảnh phía frontend:
| requestData.append("image", selectedImage)
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
  uploadProductImage.single("image"),
  createProduct
);

/*
|--------------------------------------------------------------------------
| Cập nhật sản phẩm
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
  uploadProductImage.single("image"),
  updateProduct
);

/*
|--------------------------------------------------------------------------
| Ngừng hoạt động sản phẩm
|--------------------------------------------------------------------------
|
| ADMIN và MANAGER được ngừng hoạt động.
| STAFF không được thực hiện.
|
*/

router.patch(
  "/:id/deactivate",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  deactivateProduct
);

module.exports = router;