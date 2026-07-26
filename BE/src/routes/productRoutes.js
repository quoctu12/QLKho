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
| Tên field ảnh phía frontend:
| requestData.append("image", selectedImage)
|
*/

router.post(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  uploadProductImage.single("image"),
  createProduct
);

/*
|--------------------------------------------------------------------------
| Cập nhật sản phẩm
|--------------------------------------------------------------------------
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
*/

router.patch(
  "/:id/deactivate",
  authenticate,
  authorize("ADMIN"),
  deactivateProduct
);

module.exports = router;