const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Lấy danh sách vị trí kho
|--------------------------------------------------------------------------
*/

async function getAllWarehouseLocations(req, res) {
  try {
    const {
      warehouse_id,
      keyword,
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

      conditions.push("wl.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();

      if (normalizedKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      conditions.push(`
        (
          wl.location_code LIKE ?
          OR wl.location_name LIKE ?
          OR w.name LIKE ?
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (status) {
      const normalizedStatus = String(status)
        .trim()
        .toLowerCase();

      if (
        !["active", "inactive"].includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái vị trí không hợp lệ.",
        });
      }

      conditions.push("wl.status = ?");
      params.push(normalizedStatus);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          wl.id,
          wl.warehouse_id,
          w.name AS warehouse_name,
          wl.location_code,
          wl.location_name,
          wl.max_containers,
          wl.warning_threshold_percent,
          wl.status,
          wl.created_at,

          COALESCE(
            SUM(ib.container_quantity),
            0
          ) AS used_containers,

          GREATEST(
            wl.max_containers - COALESCE(
              SUM(ib.container_quantity),
              0
            ),
            0
          ) AS available_containers,

          CASE
            WHEN wl.max_containers <= 0
              THEN 0

            ELSE ROUND(
              COALESCE(
                SUM(ib.container_quantity),
                0
              ) / wl.max_containers * 100,
              2
            )
          END AS used_percent,

          CASE
            WHEN wl.max_containers <= 0
              THEN 'not_configured'

            WHEN COALESCE(
              SUM(ib.container_quantity),
              0
            ) >= wl.max_containers
              THEN 'full'

            WHEN COALESCE(
              SUM(ib.container_quantity),
              0
            ) >= (
              wl.max_containers *
              wl.warning_threshold_percent / 100
            )
              THEN 'warning'

            ELSE 'normal'
          END AS capacity_status

        FROM warehouse_locations wl

        JOIN warehouses w
          ON wl.warehouse_id = w.id

        LEFT JOIN inventory_batches ib
          ON wl.id = ib.location_id
          AND ib.quantity > 0

        ${whereClause}

        GROUP BY
          wl.id,
          wl.warehouse_id,
          w.name,
          wl.location_code,
          wl.location_name,
          wl.max_containers,
          wl.warning_threshold_percent,
          wl.status,
          wl.created_at

        ORDER BY
          w.name ASC,
          wl.location_code ASC,
          wl.id ASC
      `,
      params
    );

    const formattedRows = rows.map((row) => ({
      ...row,
      max_containers: Number(row.max_containers || 0),
      warning_threshold_percent: Number(
        row.warning_threshold_percent || 0
      ),
      used_containers: Number(row.used_containers || 0),
      available_containers: Number(
        row.available_containers || 0
      ),
      used_percent: Number(row.used_percent || 0),
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách vị trí kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách vị trí kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết vị trí kho
|--------------------------------------------------------------------------
*/

async function getWarehouseLocationById(req, res) {
  try {
    const locationId = Number(req.params.id);

    if (
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã vị trí kho không hợp lệ.",
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          wl.id,
          wl.warehouse_id,
          w.name AS warehouse_name,
          wl.location_code,
          wl.location_name,
          wl.max_containers,
          wl.warning_threshold_percent,
          wl.status,
          wl.created_at,

          COALESCE(
            SUM(ib.container_quantity),
            0
          ) AS used_containers,

          GREATEST(
            wl.max_containers - COALESCE(
              SUM(ib.container_quantity),
              0
            ),
            0
          ) AS available_containers,

          CASE
            WHEN wl.max_containers <= 0
              THEN 0

            ELSE ROUND(
              COALESCE(
                SUM(ib.container_quantity),
                0
              ) / wl.max_containers * 100,
              2
            )
          END AS used_percent,

          CASE
            WHEN wl.max_containers <= 0
              THEN 'not_configured'

            WHEN COALESCE(
              SUM(ib.container_quantity),
              0
            ) >= wl.max_containers
              THEN 'full'

            WHEN COALESCE(
              SUM(ib.container_quantity),
              0
            ) >= (
              wl.max_containers *
              wl.warning_threshold_percent / 100
            )
              THEN 'warning'

            ELSE 'normal'
          END AS capacity_status

        FROM warehouse_locations wl

        JOIN warehouses w
          ON wl.warehouse_id = w.id

        LEFT JOIN inventory_batches ib
          ON wl.id = ib.location_id
          AND ib.quantity > 0

        WHERE wl.id = ?

        GROUP BY
          wl.id,
          wl.warehouse_id,
          w.name,
          wl.location_code,
          wl.location_name,
          wl.max_containers,
          wl.warning_threshold_percent,
          wl.status,
          wl.created_at

        LIMIT 1
      `,
      [locationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho.",
      });
    }

    const location = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        ...location,
        max_containers: Number(
          location.max_containers || 0
        ),
        warning_threshold_percent: Number(
          location.warning_threshold_percent || 0
        ),
        used_containers: Number(
          location.used_containers || 0
        ),
        available_containers: Number(
          location.available_containers || 0
        ),
        used_percent: Number(
          location.used_percent || 0
        ),
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy chi tiết vị trí kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy chi tiết vị trí kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo vị trí kho
|--------------------------------------------------------------------------
*/

async function createWarehouseLocation(req, res) {
  try {
    const {
      warehouse_id,
      location_code,
      location_name,
      max_containers,
      warning_threshold_percent,
      status = "active",
    } = req.body;

    const warehouseId = Number(warehouse_id);
    const maxContainers = Number(max_containers);
    const warningThresholdPercent = Number(
      warning_threshold_percent ?? 80
    );

    const normalizedLocationCode =
      location_code?.trim();

    const normalizedLocationName =
      location_name?.trim();

    const normalizedStatus = String(status)
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kho không hợp lệ.",
      });
    }

    if (!normalizedLocationCode) {
      return res.status(400).json({
        success: false,
        message: "Mã vị trí không được để trống.",
      });
    }

    if (normalizedLocationCode.length > 50) {
      return res.status(400).json({
        success: false,
        message:
          "Mã vị trí không được vượt quá 50 ký tự.",
      });
    }

    if (!normalizedLocationName) {
      return res.status(400).json({
        success: false,
        message: "Tên vị trí không được để trống.",
      });
    }

    if (normalizedLocationName.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Tên vị trí không được vượt quá 100 ký tự.",
      });
    }

    if (
      !Number.isInteger(maxContainers) ||
      maxContainers < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sức chứa tối đa phải là số nguyên không âm.",
      });
    }

    if (
      !Number.isInteger(warningThresholdPercent) ||
      warningThresholdPercent < 1 ||
      warningThresholdPercent > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ngưỡng cảnh báo phải nằm trong khoảng từ 1 đến 100.",
      });
    }

    if (
      !["active", "inactive"].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái vị trí không hợp lệ.",
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

    const [duplicateRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_locations
        WHERE warehouse_id = ?
          AND location_code = ?
        LIMIT 1
      `,
      [
        warehouseId,
        normalizedLocationCode,
      ]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Mã vị trí đã tồn tại trong kho này.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO warehouse_locations (
          warehouse_id,
          location_code,
          location_name,
          max_containers,
          warning_threshold_percent,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        warehouseId,
        normalizedLocationCode,
        normalizedLocationName,
        maxContainers,
        warningThresholdPercent,
        normalizedStatus,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo vị trí kho thành công.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo vị trí kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo vị trí kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Cập nhật vị trí kho
|--------------------------------------------------------------------------
*/

async function updateWarehouseLocation(req, res) {
  try {
    const locationId = Number(req.params.id);

    const {
      warehouse_id,
      location_code,
      location_name,
      max_containers,
      warning_threshold_percent,
      status,
    } = req.body;

    if (
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã vị trí kho không hợp lệ.",
      });
    }

    const warehouseId = Number(warehouse_id);
    const maxContainers = Number(max_containers);
    const warningThresholdPercent = Number(
      warning_threshold_percent
    );

    const normalizedLocationCode =
      location_code?.trim();

    const normalizedLocationName =
      location_name?.trim();

    const normalizedStatus = String(status)
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kho không hợp lệ.",
      });
    }

    if (!normalizedLocationCode) {
      return res.status(400).json({
        success: false,
        message: "Mã vị trí không được để trống.",
      });
    }

    if (!normalizedLocationName) {
      return res.status(400).json({
        success: false,
        message: "Tên vị trí không được để trống.",
      });
    }

    if (
      !Number.isInteger(maxContainers) ||
      maxContainers < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sức chứa tối đa phải là số nguyên không âm.",
      });
    }

    if (
      !Number.isInteger(warningThresholdPercent) ||
      warningThresholdPercent < 1 ||
      warningThresholdPercent > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ngưỡng cảnh báo phải nằm trong khoảng từ 1 đến 100.",
      });
    }

    if (
      !["active", "inactive"].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái vị trí không hợp lệ.",
      });
    }

    const [locationRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_locations
        WHERE id = ?
        LIMIT 1
      `,
      [locationId]
    );

    if (locationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho.",
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

    const [duplicateRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_locations
        WHERE warehouse_id = ?
          AND location_code = ?
          AND id <> ?
        LIMIT 1
      `,
      [
        warehouseId,
        normalizedLocationCode,
        locationId,
      ]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Mã vị trí đã tồn tại trong kho này.",
      });
    }

    /*
     * Không cho giảm sức chứa nhỏ hơn số container đang dùng.
     */
    const [usedRows] = await pool.query(
      `
        SELECT
          COALESCE(
            SUM(container_quantity),
            0
          ) AS used_containers

        FROM inventory_batches

        WHERE location_id = ?
          AND quantity > 0
      `,
      [locationId]
    );

    const usedContainers = Number(
      usedRows[0]?.used_containers || 0
    );

    if (
      maxContainers > 0 &&
      usedContainers > maxContainers
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Không thể đặt sức chứa nhỏ hơn số container đang dùng (${usedContainers}).`,
      });
    }

    await pool.query(
      `
        UPDATE warehouse_locations

        SET
          warehouse_id = ?,
          location_code = ?,
          location_name = ?,
          max_containers = ?,
          warning_threshold_percent = ?,
          status = ?

        WHERE id = ?
      `,
      [
        warehouseId,
        normalizedLocationCode,
        normalizedLocationName,
        maxContainers,
        warningThresholdPercent,
        normalizedStatus,
        locationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật vị trí kho thành công.",
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật vị trí kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể cập nhật vị trí kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Khóa / mở khóa vị trí kho
|--------------------------------------------------------------------------
*/

async function updateWarehouseLocationStatus(req, res) {
  try {
    const locationId = Number(req.params.id);

    const normalizedStatus = String(req.body.status)
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã vị trí kho không hợp lệ.",
      });
    }

    if (
      !["active", "inactive"].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái vị trí không hợp lệ.",
      });
    }

    const [locationRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_locations
        WHERE id = ?
        LIMIT 1
      `,
      [locationId]
    );

    if (locationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí kho.",
      });
    }

    await pool.query(
      `
        UPDATE warehouse_locations
        SET status = ?
        WHERE id = ?
      `,
      [
        normalizedStatus,
        locationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        normalizedStatus === "active"
          ? "Mở khóa vị trí kho thành công."
          : "Khóa vị trí kho thành công.",
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật trạng thái vị trí kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể cập nhật trạng thái vị trí kho.",
    });
  }
}

module.exports = {
  getAllWarehouseLocations,
  getWarehouseLocationById,
  createWarehouseLocation,
  updateWarehouseLocation,
  updateWarehouseLocationStatus,
};