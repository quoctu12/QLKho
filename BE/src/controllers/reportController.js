const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Kiểm tra ngày YYYY-MM-DD
|--------------------------------------------------------------------------
*/

function isValidDate(value) {
  if (!value) {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

/*
|--------------------------------------------------------------------------
| Kiểm tra ID nguyên dương
|--------------------------------------------------------------------------
*/

function isValidPositiveInteger(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  const numberValue = Number(value);

  return (
    Number.isInteger(numberValue) &&
    numberValue > 0
  );
}

/*
|--------------------------------------------------------------------------
| Kiểm tra bộ lọc chung
|--------------------------------------------------------------------------
*/

function validateReportFilters(query) {
  const {
    from_date,
    to_date,
    warehouse_id,
    product_id,
  } = query;

  if (from_date && !isValidDate(from_date)) {
    return "Ngày bắt đầu không hợp lệ. Định dạng đúng là YYYY-MM-DD.";
  }

  if (to_date && !isValidDate(to_date)) {
    return "Ngày kết thúc không hợp lệ. Định dạng đúng là YYYY-MM-DD.";
  }

  if (
    from_date &&
    to_date &&
    from_date > to_date
  ) {
    return "Ngày bắt đầu không được lớn hơn ngày kết thúc.";
  }

  if (!isValidPositiveInteger(warehouse_id)) {
    return "Kho được chọn không hợp lệ.";
  }

  if (!isValidPositiveInteger(product_id)) {
    return "Sản phẩm được chọn không hợp lệ.";
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| Tổng quan Dashboard
|--------------------------------------------------------------------------
*/

async function getDashboardSummary(req, res) {
  try {
    const [
      [productRows],
      [warehouseRows],
      [inventoryRows],
      [stockInRows],
      [stockOutRows],
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_products
        FROM products
        WHERE status = 'active'
      `),

      pool.query(`
        SELECT
          COUNT(*) AS total_warehouses
        FROM warehouses
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(quantity), 0) AS total_quantity,

          COALESCE(
            SUM(container_quantity),
            0
          ) AS total_containers,

          COUNT(
            CASE
              WHEN quantity > 0
              THEN id
            END
          ) AS total_batches,

          COUNT(
            DISTINCT CASE
              WHEN quantity > 0
              THEN product_id
            END
          ) AS total_products_in_stock,

          COALESCE(
            SUM(
              CASE
                WHEN expiry_date IS NOT NULL
                  AND expiry_date < CURDATE()
                  AND quantity > 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expired_batches,

          COALESCE(
            SUM(
              CASE
                WHEN expiry_date IS NOT NULL
                  AND expiry_date >= CURDATE()
                  AND expiry_date <= DATE_ADD(
                    CURDATE(),
                    INTERVAL 30 DAY
                  )
                  AND quantity > 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expiring_batches,

          COALESCE(
            SUM(
              CASE
                WHEN quantity > 0
                  AND storage_due_date IS NOT NULL
                  AND storage_due_date < CURDATE()
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS overdue_storage_batches,

          COALESCE(
            SUM(
              CASE
                WHEN quantity > 0
                  AND storage_due_date IS NOT NULL
                  AND storage_due_date >= CURDATE()
                  AND storage_due_date <= DATE_ADD(
                    CURDATE(),
                    INTERVAL COALESCE(
                      warning_days,
                      0
                    ) DAY
                  )
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS storage_warning_batches,

          COALESCE(
            SUM(
              CASE
                WHEN quantity > 0
                  AND (
                    storage_policy_id IS NULL
                    OR storage_due_date IS NULL
                  )
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS no_storage_policy_batches

        FROM inventory_batches

        WHERE quantity > 0
      `),

      pool.query(`
        SELECT
          COUNT(
            DISTINCT si.id
          ) AS total_stock_ins,

          COALESCE(
            SUM(sid.quantity),
            0
          ) AS total_import_quantity,

          COALESCE(
            SUM(sid.container_quantity),
            0
          ) AS total_import_containers

        FROM stock_in si

        LEFT JOIN stock_in_details sid
          ON si.id = sid.stock_in_id
      `),

      pool.query(`
        SELECT
          COUNT(
            DISTINCT so.id
          ) AS total_stock_outs,

          COALESCE(
            SUM(sod.quantity),
            0
          ) AS total_export_quantity,

          COALESCE(
            SUM(sod.container_quantity),
            0
          ) AS total_export_containers,

          COALESCE(
            SUM(sod.regular_storage_amount),
            0
          ) AS total_regular_storage_fee,

          COALESCE(
            SUM(sod.overdue_storage_amount),
            0
          ) AS total_overdue_storage_fee,

          COALESCE(
            SUM(sod.total_storage_amount),
            0
          ) AS total_storage_fee

        FROM stock_out so

        LEFT JOIN stock_out_details sod
          ON so.id = sod.stock_out_id
      `),
    ]);

    const productSummary = productRows[0] || {};
    const warehouseSummary = warehouseRows[0] || {};
    const inventorySummary = inventoryRows[0] || {};
    const stockInSummary = stockInRows[0] || {};
    const stockOutSummary = stockOutRows[0] || {};

    return res.status(200).json({
      success: true,

      data: {
        total_products: Number(
          productSummary.total_products || 0
        ),

        total_warehouses: Number(
          warehouseSummary.total_warehouses || 0
        ),

        total_quantity: Number(
          inventorySummary.total_quantity || 0
        ),

        total_containers: Number(
          inventorySummary.total_containers || 0
        ),

        total_batches: Number(
          inventorySummary.total_batches || 0
        ),

        total_products_in_stock: Number(
          inventorySummary.total_products_in_stock || 0
        ),

        total_stock_ins: Number(
          stockInSummary.total_stock_ins || 0
        ),

        total_import_quantity: Number(
          stockInSummary.total_import_quantity || 0
        ),

        total_import_containers: Number(
          stockInSummary.total_import_containers || 0
        ),

        total_stock_outs: Number(
          stockOutSummary.total_stock_outs || 0
        ),

        total_export_quantity: Number(
          stockOutSummary.total_export_quantity || 0
        ),

        total_export_containers: Number(
          stockOutSummary.total_export_containers || 0
        ),

        total_regular_storage_fee: Number(
          stockOutSummary.total_regular_storage_fee || 0
        ),

        total_overdue_storage_fee: Number(
          stockOutSummary.total_overdue_storage_fee || 0
        ),

        total_storage_fee: Number(
          stockOutSummary.total_storage_fee || 0
        ),

        expired_batches: Number(
          inventorySummary.expired_batches || 0
        ),

        expiring_batches: Number(
          inventorySummary.expiring_batches || 0
        ),

        overdue_storage_batches: Number(
          inventorySummary.overdue_storage_batches || 0
        ),

        storage_warning_batches: Number(
          inventorySummary.storage_warning_batches || 0
        ),

        no_storage_policy_batches: Number(
          inventorySummary.no_storage_policy_batches || 0
        ),
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy báo cáo tổng quan:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy báo cáo tổng quan.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Báo cáo nhập xuất theo ngày
|--------------------------------------------------------------------------
*/

async function getStockMovementReport(req, res) {
  try {
    const validationMessage =
      validateReportFilters(req.query);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const {
      from_date,
      to_date,
      warehouse_id,
      product_id,
    } = req.query;

    const conditionsIn = [];
    const conditionsOut = [];

    const paramsIn = [];
    const paramsOut = [];

    if (from_date) {
      conditionsIn.push(
        "si.import_date >= ?"
      );

      conditionsOut.push(
        "so.export_date >= ?"
      );

      paramsIn.push(from_date);
      paramsOut.push(from_date);
    }

    if (to_date) {
      conditionsIn.push(
        "si.import_date <= ?"
      );

      conditionsOut.push(
        "so.export_date <= ?"
      );

      paramsIn.push(to_date);
      paramsOut.push(to_date);
    }

    if (warehouse_id) {
      conditionsIn.push(
        "si.warehouse_id = ?"
      );

      conditionsOut.push(
        "so.warehouse_id = ?"
      );

      paramsIn.push(Number(warehouse_id));
      paramsOut.push(Number(warehouse_id));
    }

    if (product_id) {
      conditionsIn.push(
        "sid.product_id = ?"
      );

      conditionsOut.push(
        "sod.product_id = ?"
      );

      paramsIn.push(Number(product_id));
      paramsOut.push(Number(product_id));
    }

    const whereIn =
      conditionsIn.length > 0
        ? `WHERE ${conditionsIn.join(" AND ")}`
        : "";

    const whereOut =
      conditionsOut.length > 0
        ? `WHERE ${conditionsOut.join(" AND ")}`
        : "";

    const [
      [stockInRows],
      [stockOutRows],
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            si.import_date AS report_date,

            COUNT(
              DISTINCT si.id
            ) AS total_documents,

            COALESCE(
              SUM(sid.quantity),
              0
            ) AS total_quantity,

            COALESCE(
              SUM(sid.container_quantity),
              0
            ) AS total_containers,

            0 AS total_amount

          FROM stock_in si

          LEFT JOIN stock_in_details sid
            ON si.id = sid.stock_in_id

          ${whereIn}

          GROUP BY si.import_date

          ORDER BY si.import_date ASC
        `,
        paramsIn
      ),

      pool.query(
        `
          SELECT
            so.export_date AS report_date,

            COUNT(
              DISTINCT so.id
            ) AS total_documents,

            COALESCE(
              SUM(sod.quantity),
              0
            ) AS total_quantity,

            COALESCE(
              SUM(sod.container_quantity),
              0
            ) AS total_containers,

            COALESCE(
              SUM(sod.regular_storage_amount),
              0
            ) AS total_regular_storage_fee,

            COALESCE(
              SUM(sod.overdue_storage_amount),
              0
            ) AS total_overdue_storage_fee,

            COALESCE(
              SUM(sod.total_storage_amount),
              0
            ) AS total_storage_fee,

            COALESCE(
              SUM(sod.total_storage_amount),
              0
            ) AS total_amount

          FROM stock_out so

          LEFT JOIN stock_out_details sod
            ON so.id = sod.stock_out_id

          ${whereOut}

          GROUP BY so.export_date

          ORDER BY so.export_date ASC
        `,
        paramsOut
      ),
    ]);

    const normalizedStockInRows =
      stockInRows.map((item) => ({
        ...item,

        total_documents: Number(
          item.total_documents || 0
        ),

        total_quantity: Number(
          item.total_quantity || 0
        ),

        total_containers: Number(
          item.total_containers || 0
        ),

        total_amount: 0,
      }));

    const normalizedStockOutRows =
      stockOutRows.map((item) => ({
        ...item,

        total_documents: Number(
          item.total_documents || 0
        ),

        total_quantity: Number(
          item.total_quantity || 0
        ),

        total_containers: Number(
          item.total_containers || 0
        ),

        total_regular_storage_fee: Number(
          item.total_regular_storage_fee || 0
        ),

        total_overdue_storage_fee: Number(
          item.total_overdue_storage_fee || 0
        ),

        total_storage_fee: Number(
          item.total_storage_fee || 0
        ),

        total_amount: Number(
          item.total_amount || 0
        ),
      }));

    return res.status(200).json({
      success: true,

      data: {
        stock_in: normalizedStockInRows,
        stock_out: normalizedStockOutRows,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy báo cáo nhập xuất:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy báo cáo nhập xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Báo cáo tồn kho theo kho
|--------------------------------------------------------------------------
*/

async function getInventoryByWarehouse(req, res) {
  try {
    const validationMessage =
      validateReportFilters(req.query);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const {
      warehouse_id,
      product_id,
    } = req.query;

    const joinConditions = [
      "w.id = ib.warehouse_id",
      "ib.quantity > 0",
    ];

    const whereConditions = [];
    const params = [];

    if (product_id) {
      joinConditions.push(
        "ib.product_id = ?"
      );

      params.push(Number(product_id));
    }

    if (warehouse_id) {
      whereConditions.push(
        "w.id = ?"
      );

      params.push(Number(warehouse_id));
    }

    const whereSql =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          w.id AS warehouse_id,
          w.name AS warehouse_name,

          COALESCE(
            SUM(ib.quantity),
            0
          ) AS total_quantity,

          COALESCE(
            SUM(ib.container_quantity),
            0
          ) AS total_containers,

          COUNT(
            ib.id
          ) AS total_batches,

          COUNT(
            DISTINCT ib.product_id
          ) AS total_products,

          COALESCE(
            SUM(
              CASE
                WHEN ib.expiry_date IS NOT NULL
                  AND ib.expiry_date < CURDATE()
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expired_batches,

          COALESCE(
            SUM(
              CASE
                WHEN ib.expiry_date IS NOT NULL
                  AND ib.expiry_date >= CURDATE()
                  AND ib.expiry_date <= DATE_ADD(
                    CURDATE(),
                    INTERVAL 30 DAY
                  )
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expiring_batches,

          COALESCE(
            SUM(
              CASE
                WHEN ib.storage_due_date IS NOT NULL
                  AND ib.storage_due_date < CURDATE()
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS overdue_storage_batches,

          COALESCE(
            SUM(
              CASE
                WHEN ib.storage_due_date IS NOT NULL
                  AND ib.storage_due_date >= CURDATE()
                  AND ib.storage_due_date <= DATE_ADD(
                    CURDATE(),
                    INTERVAL COALESCE(
                      ib.warning_days,
                      0
                    ) DAY
                  )
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS storage_warning_batches,

          COALESCE(
            SUM(
              CASE
                WHEN ib.storage_policy_id IS NULL
                  OR ib.storage_due_date IS NULL
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS no_storage_policy_batches

        FROM warehouses w

        LEFT JOIN inventory_batches ib
          ON ${joinConditions.join(" AND ")}

        ${whereSql}

        GROUP BY
          w.id,
          w.name

        ORDER BY
          total_containers DESC,
          total_quantity DESC,
          w.name ASC
      `,
      params
    );

    const normalizedRows = rows.map((item) => ({
      ...item,

      warehouse_id: Number(
        item.warehouse_id
      ),

      total_quantity: Number(
        item.total_quantity || 0
      ),

      total_containers: Number(
        item.total_containers || 0
      ),

      total_batches: Number(
        item.total_batches || 0
      ),

      total_products: Number(
        item.total_products || 0
      ),

      expired_batches: Number(
        item.expired_batches || 0
      ),

      expiring_batches: Number(
        item.expiring_batches || 0
      ),

      overdue_storage_batches: Number(
        item.overdue_storage_batches || 0
      ),

      storage_warning_batches: Number(
        item.storage_warning_batches || 0
      ),

      no_storage_policy_batches: Number(
        item.no_storage_policy_batches || 0
      ),
    }));

    return res.status(200).json({
      success: true,
      data: normalizedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy tồn kho theo kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy tồn kho theo kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Báo cáo cảnh báo tồn kho
|--------------------------------------------------------------------------
*/

async function getInventoryAlertReport(req, res) {
  try {
    const validationMessage =
      validateReportFilters(req.query);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const {
      warehouse_id,
      product_id,
    } = req.query;

    const conditions = [
      "ib.quantity > 0",
    ];

    const params = [];

    if (warehouse_id) {
      conditions.push(
        "ib.warehouse_id = ?"
      );

      params.push(Number(warehouse_id));
    }

    if (product_id) {
      conditions.push(
        "ib.product_id = ?"
      );

      params.push(Number(product_id));
    }

    const [rows] = await pool.query(
      `
        SELECT
          ib.id,
          ib.batch_code,
          ib.quantity,
          ib.container_quantity,
          ib.import_date,
          ib.expiry_date,

          ib.storage_policy_id,
          ib.max_storage_days,
          ib.warning_days,
          ib.overdue_multiplier,
          ib.storage_due_date,
          ib.allow_overdue_export,
          ib.require_overdue_note,

          p.id AS product_id,
          p.sku,
          p.name AS product_name,

          w.id AS warehouse_id,
          w.name AS warehouse_name,

          DATEDIFF(
            ib.expiry_date,
            CURDATE()
          ) AS days_until_expiry,

          DATEDIFF(
            ib.storage_due_date,
            CURDATE()
          ) AS days_until_storage_due,

          GREATEST(
            DATEDIFF(
              CURDATE(),
              ib.storage_due_date
            ),
            0
          ) AS overdue_storage_days,

          CASE
            WHEN ib.storage_policy_id IS NULL
              OR ib.storage_due_date IS NULL
            THEN 'no_policy'

            WHEN ib.storage_due_date < CURDATE()
            THEN 'overdue'

            WHEN ib.storage_due_date <= DATE_ADD(
              CURDATE(),
              INTERVAL COALESCE(
                ib.warning_days,
                0
              ) DAY
            )
            THEN 'warning'

            ELSE 'normal'
          END AS storage_status

        FROM inventory_batches ib

        INNER JOIN products p
          ON ib.product_id = p.id

        INNER JOIN warehouses w
          ON ib.warehouse_id = w.id

        WHERE
          ${conditions.join(" AND ")}

          AND (
            (
              ib.expiry_date IS NOT NULL
              AND ib.expiry_date <= DATE_ADD(
                CURDATE(),
                INTERVAL 30 DAY
              )
            )

            OR ib.storage_policy_id IS NULL
            OR ib.storage_due_date IS NULL

            OR (
              ib.storage_due_date <= DATE_ADD(
                CURDATE(),
                INTERVAL COALESCE(
                  ib.warning_days,
                  0
                ) DAY
              )
            )
          )

        ORDER BY
          CASE
            WHEN ib.storage_due_date < CURDATE()
            THEN 1

            WHEN ib.expiry_date < CURDATE()
            THEN 2

            WHEN ib.storage_due_date IS NULL
            THEN 3

            WHEN ib.storage_due_date <= DATE_ADD(
              CURDATE(),
              INTERVAL COALESCE(
                ib.warning_days,
                0
              ) DAY
            )
            THEN 4

            ELSE 5
          END ASC,

          ib.storage_due_date ASC,
          ib.expiry_date ASC,
          ib.id ASC

        LIMIT 200
      `,
      params
    );

    const normalizedRows = rows.map((item) => ({
      ...item,

      id: Number(item.id),

      product_id: Number(item.product_id),

      warehouse_id: Number(item.warehouse_id),

      quantity: Number(item.quantity || 0),

      container_quantity: Number(
        item.container_quantity || 0
      ),

      max_storage_days:
        item.max_storage_days === null
          ? null
          : Number(item.max_storage_days),

      warning_days:
        item.warning_days === null
          ? null
          : Number(item.warning_days),

      overdue_multiplier: Number(
        item.overdue_multiplier || 1
      ),

      days_until_expiry:
        item.days_until_expiry === null
          ? null
          : Number(item.days_until_expiry),

      days_until_storage_due:
        item.days_until_storage_due === null
          ? null
          : Number(item.days_until_storage_due),

      overdue_storage_days: Number(
        item.overdue_storage_days || 0
      ),

      allow_overdue_export:
        Number(item.allow_overdue_export) === 1,

      require_overdue_note:
        Number(item.require_overdue_note) === 1,
    }));

    const expiryAlerts =
      normalizedRows.filter((item) => {
        return (
          item.expiry_date &&
          item.days_until_expiry !== null &&
          item.days_until_expiry <= 30
        );
      });

    const storageAlerts =
      normalizedRows.filter((item) => {
        return [
          "warning",
          "overdue",
          "no_policy",
        ].includes(item.storage_status);
      });

    return res.status(200).json({
      success: true,

      data: {
        expiry_alerts: expiryAlerts,
        storage_alerts: storageAlerts,

        summary: {
          expired_batches: expiryAlerts.filter(
            (item) =>
              item.days_until_expiry < 0
          ).length,

          expiring_batches: expiryAlerts.filter(
            (item) =>
              item.days_until_expiry >= 0
          ).length,

          overdue_storage_batches:
            storageAlerts.filter(
              (item) =>
                item.storage_status === "overdue"
            ).length,

          storage_warning_batches:
            storageAlerts.filter(
              (item) =>
                item.storage_status === "warning"
            ).length,

          no_storage_policy_batches:
            storageAlerts.filter(
              (item) =>
                item.storage_status === "no_policy"
            ).length,
        },
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy báo cáo cảnh báo tồn kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy báo cáo cảnh báo tồn kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Dữ liệu bộ lọc
|--------------------------------------------------------------------------
*/

async function getReportFilterOptions(req, res) {
  try {
    const [
      [warehouseRows],
      [productRows],
    ] = await Promise.all([
      pool.query(`
        SELECT
          id,
          name
        FROM warehouses
        ORDER BY name ASC
      `),

      pool.query(`
        SELECT
          id,
          sku,
          name
        FROM products
        WHERE status = 'active'
        ORDER BY name ASC
      `),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        warehouses: warehouseRows.map(
          (item) => ({
            id: Number(item.id),
            name: item.name,
          })
        ),

        products: productRows.map(
          (item) => ({
            id: Number(item.id),
            sku: item.sku,
            name: item.name,
          })
        ),
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy dữ liệu bộ lọc báo cáo:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy dữ liệu bộ lọc báo cáo.",
    });
  }
}

module.exports = {
  getDashboardSummary,
  getStockMovementReport,
  getInventoryByWarehouse,
  getInventoryAlertReport,
  getReportFilterOptions,
};