const express = require("express");

const {
  getStoragePolicies,
  getStoragePolicyById,
  createStoragePolicy,
  updateStoragePolicy,
  activateStoragePolicy,
  deactivateStoragePolicy,
  deleteStoragePolicy,
} = require("../controllers/storagePolicyController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Danh sách chính sách
|--------------------------------------------------------------------------
|
| ADMIN, MANAGER và STAFF đều được xem.
|
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getStoragePolicies
);

/*
|--------------------------------------------------------------------------
| Tạo chính sách
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createStoragePolicy
);

/*
|--------------------------------------------------------------------------
| Xem chi tiết chính sách
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getStoragePolicyById
);

/*
|--------------------------------------------------------------------------
| Cập nhật chính sách
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateStoragePolicy
);

/*
|--------------------------------------------------------------------------
| Kích hoạt chính sách
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/activate",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  activateStoragePolicy
);

/*
|--------------------------------------------------------------------------
| Ngừng áp dụng chính sách
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/deactivate",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  deactivateStoragePolicy
);

/*
|--------------------------------------------------------------------------
| Xóa chính sách nháp
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  deleteStoragePolicy
);

module.exports = router;