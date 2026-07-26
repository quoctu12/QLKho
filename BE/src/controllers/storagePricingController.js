const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Lấy danh sách đơn giá lưu kho
|--------------------------------------------------------------------------
*/

async function getAllStoragePricing(req, res) {
  try {
    const {
      warehouse_id,
      status,
    } = req.query;

    const conditions = [];
    const params = [];

    if (warehouse_id) {
      const warehouseId = Number(warehouse_id);

      if (
        !Number.isInteger(warehouseId) ||
        warehouseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Mã kho không hợp lệ.",
        });
      }

      conditions.push("sp.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (status) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái đơn giá không hợp lệ.",
        });
      }

      conditions.push("sp.status = ?");
      params.push(status);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          sp.id,
          sp.warehouse_id,
          w.name AS warehouse_name,
          sp.price_per_container_per_day,
          sp.effective_from,
          sp.status,
          sp.created_at

        FROM storage_pricing sp

        JOIN warehouses w
          ON sp.warehouse_id = w.id

        ${whereClause}

        ORDER BY
          w.name ASC,
          sp.effective_from DESC,
          sp.id DESC
      `,
      params
    );

    const formattedRows = rows.map((row) => ({
      ...row,
      price_per_container_per_day: Number(
        row.price_per_container_per_day || 0
      ),
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn giá lưu kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách đơn giá lưu kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo đơn giá lưu kho
|--------------------------------------------------------------------------
*/

async function createStoragePricing(req, res) {
  try {
    const {
      warehouse_id,
      price_per_container_per_day,
      effective_from,
      status = "active",
    } = req.body;

    const warehouseId = Number(warehouse_id);
    const price = Number(price_per_container_per_day);

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kho không hợp lệ.",
      });
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Đơn giá lưu kho không hợp lệ.",
      });
    }

    if (!effective_from) {
      return res.status(400).json({
        success: false,
        message: "Ngày hiệu lực là bắt buộc.",
      });
    }

    const parsedEffectiveDate = new Date(effective_from);

    if (Number.isNaN(parsedEffectiveDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày hiệu lực không hợp lệ.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ.",
      });
    }

    const [warehouseRows] = await pool.query(
      `
        SELECT id
        FROM warehouses
        WHERE id = ?
        LIMIT 1
      `,
      [warehouseId]
    );

    if (warehouseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO storage_pricing (
          warehouse_id,
          price_per_container_per_day,
          effective_from,
          status
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        warehouseId,
        price,
        effective_from,
        status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo đơn giá lưu kho thành công.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn giá lưu kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo đơn giá lưu kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Cập nhật trạng thái đơn giá lưu kho
|--------------------------------------------------------------------------
*/

async function updateStoragePricingStatus(req, res) {
  try {
    const pricingId = Number(req.params.id);
    const { status } = req.body;

    if (
      !Number.isInteger(pricingId) ||
      pricingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn giá không hợp lệ.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ.",
      });
    }

    const [result] = await pool.query(
      `
        UPDATE storage_pricing

        SET status = ?

        WHERE id = ?
      `,
      [
        status,
        pricingId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn giá lưu kho.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn giá thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn giá:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái đơn giá.",
    });
  }
}

module.exports = {
  getAllStoragePricing,
  createStoragePricing,
  updateStoragePricingStatus,
};