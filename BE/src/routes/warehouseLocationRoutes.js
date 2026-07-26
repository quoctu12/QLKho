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
| Routes vị trí kho
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllWarehouseLocations
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getWarehouseLocationById
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createWarehouseLocation
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouseLocation
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateWarehouseLocationStatus
);

module.exports = router;