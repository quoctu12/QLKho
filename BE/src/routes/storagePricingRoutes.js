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

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllStoragePricing
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createStoragePricing
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateStoragePricingStatus
);

module.exports = router;