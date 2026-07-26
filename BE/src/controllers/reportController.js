const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Kiểm tra định dạng ngày YYYY-MM-DD
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
| Lấy báo cáo tổng quan Dashboard
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
      [expiryRows],
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
          COALESCE(SUM(container_quantity), 0) AS total_containers,
          COUNT(CASE WHEN quantity > 0 THEN id END) AS total_batches,
          COUNT(DISTINCT CASE WHEN quantity > 0 THEN product_id END) AS total_products_in_stock
        FROM inventory_batches
        WHERE quantity > 0
      `),

      pool.query(`
        SELECT
          COUNT(DISTINCT si.id) AS total_stock_ins,
          COALESCE(SUM(sid.quantity), 0) AS total_import_quantity,
          COALESCE(SUM(sid.container_quantity), 0) AS total_import_containers
        FROM stock_in si
        LEFT JOIN stock_in_details sid
          ON si.id = sid.stock_in_id
      `),

      pool.query(`
        SELECT
          COUNT(DISTINCT so.id) AS total_stock_outs,
          COALESCE(SUM(sod.quantity), 0) AS total_export_quantity,
          COALESCE(SUM(sod.container_quantity), 0) AS total_export_containers,
          COALESCE(SUM(sod.total_storage_amount), 0) AS total_storage_fee
        FROM stock_out so
        LEFT JOIN stock_out_details sod
          ON so.id = sod.stock_out_id
      `),

      pool.query(`
        SELECT
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
                  AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                  AND quantity > 0
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS expiring_batches
        FROM inventory_batches
      `),
    ]);

    const productSummary = productRows[0] || {};
    const warehouseSummary = warehouseRows[0] || {};
    const inventorySummary = inventoryRows[0] || {};
    const stockInSummary = stockInRows[0] || {};
    const stockOutSummary = stockOutRows[0] || {};
    const expirySummary = expiryRows[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        total_products: Number(productSummary.total_products || 0),
        total_warehouses: Number(warehouseSummary.total_warehouses || 0),

        total_quantity: Number(inventorySummary.total_quantity || 0),
        total_containers: Number(inventorySummary.total_containers || 0),
        total_batches: Number(inventorySummary.total_batches || 0),
        total_products_in_stock: Number(inventorySummary.total_products_in_stock || 0),

        total_stock_ins: Number(stockInSummary.total_stock_ins || 0),
        total_import_quantity: Number(stockInSummary.total_import_quantity || 0),
        total_import_containers: Number(stockInSummary.total_import_containers || 0),

        total_stock_outs: Number(stockOutSummary.total_stock_outs || 0),
        total_export_quantity: Number(stockOutSummary.total_export_quantity || 0),
        total_export_containers: Number(stockOutSummary.total_export_containers || 0),
        total_storage_fee: Number(stockOutSummary.total_storage_fee || 0),

        expired_batches: Number(expirySummary.expired_batches || 0),
        expiring_batches: Number(expirySummary.expiring_batches || 0),

        total_inventory_value: 0,
        total_import_amount: 0,
        total_export_amount: Number(stockOutSummary.total_storage_fee || 0),
      },
    });
  } catch (error) {
    console.error("Lỗi lấy báo cáo tổng quan:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy báo cáo tổng quan.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy báo cáo nhập xuất theo ngày
|--------------------------------------------------------------------------
*/

async function getStockMovementReport(req, res) {
  try {
    const { from_date, to_date } = req.query;

    if (from_date && !isValidDate(from_date)) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không hợp lệ. Định dạng đúng là YYYY-MM-DD.",
      });
    }

    if (to_date && !isValidDate(to_date)) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không hợp lệ. Định dạng đúng là YYYY-MM-DD.",
      });
    }

    if (from_date && to_date && from_date > to_date) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      });
    }

    const conditionsIn = [];
    const conditionsOut = [];

    const paramsIn = [];
    const paramsOut = [];

    if (from_date) {
      conditionsIn.push("si.import_date >= ?");
      conditionsOut.push("so.export_date >= ?");
      paramsIn.push(from_date);
      paramsOut.push(from_date);
    }

    if (to_date) {
      conditionsIn.push("si.import_date <= ?");
      conditionsOut.push("so.export_date <= ?");
      paramsIn.push(to_date);
      paramsOut.push(to_date);
    }

    const whereIn = conditionsIn.length > 0 ? `WHERE ${conditionsIn.join(" AND ")}` : "";
    const whereOut = conditionsOut.length > 0 ? `WHERE ${conditionsOut.join(" AND ")}` : "";

    const [[stockInRows], [stockOutRows]] = await Promise.all([
      pool.query(
        `
          SELECT
            si.import_date AS report_date,
            COUNT(DISTINCT si.id) AS total_documents,
            COALESCE(SUM(sid.quantity), 0) AS total_quantity,
            COALESCE(SUM(sid.container_quantity), 0) AS total_containers,
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
            COUNT(DISTINCT so.id) AS total_documents,
            COALESCE(SUM(sod.quantity), 0) AS total_quantity,
            COALESCE(SUM(sod.container_quantity), 0) AS total_containers,
            COALESCE(SUM(sod.total_storage_amount), 0) AS total_storage_fee,
            COALESCE(SUM(sod.total_storage_amount), 0) AS total_amount
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

    const normalizedStockInRows = stockInRows.map((item) => ({
      ...item,
      total_documents: Number(item.total_documents || 0),
      total_quantity: Number(item.total_quantity || 0),
      total_containers: Number(item.total_containers || 0),
      total_amount: Number(item.total_amount || 0),
    }));

    const normalizedStockOutRows = stockOutRows.map((item) => ({
      ...item,
      total_documents: Number(item.total_documents || 0),
      total_quantity: Number(item.total_quantity || 0),
      total_containers: Number(item.total_containers || 0),
      total_storage_fee: Number(item.total_storage_fee || 0),
      total_amount: Number(item.total_amount || 0),
    }));

    return res.status(200).json({
      success: true,
      data: {
        stock_in: normalizedStockInRows,
        stock_out: normalizedStockOutRows,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy báo cáo nhập xuất:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy báo cáo nhập xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy tồn kho theo kho
|--------------------------------------------------------------------------
*/

async function getInventoryValueByWarehouse(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        w.id AS warehouse_id,
        w.name AS warehouse_name,

        COALESCE(
          SUM(
            CASE
              WHEN ib.quantity > 0
              THEN ib.quantity
              ELSE 0
            END
          ),
          0
        ) AS total_quantity,

        COALESCE(
          SUM(
            CASE
              WHEN ib.quantity > 0
              THEN ib.container_quantity
              ELSE 0
            END
          ),
          0
        ) AS total_containers,

        COUNT(
          CASE
            WHEN ib.quantity > 0
            THEN ib.id
          END
        ) AS total_batches,

        COUNT(
          DISTINCT CASE
            WHEN ib.quantity > 0
            THEN ib.product_id
          END
        ) AS total_products,

        0 AS total_inventory_value

      FROM warehouses w

      LEFT JOIN inventory_batches ib
        ON w.id = ib.warehouse_id

      GROUP BY
        w.id,
        w.name

      ORDER BY
        total_containers DESC,
        total_quantity DESC,
        w.name ASC
    `);

    const normalizedRows = rows.map((item) => ({
      ...item,
      warehouse_id: Number(item.warehouse_id),
      total_quantity: Number(item.total_quantity || 0),
      total_containers: Number(item.total_containers || 0),
      total_batches: Number(item.total_batches || 0),
      total_products: Number(item.total_products || 0),
      total_inventory_value: Number(item.total_inventory_value || 0),
    }));

    return res.status(200).json({
      success: true,
      data: normalizedRows,
    });
  } catch (error) {
    console.error("Lỗi lấy tồn kho theo kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy tồn kho theo kho.",
    });
  }
}

module.exports = {
  getDashboardSummary,
  getStockMovementReport,
  getInventoryValueByWarehouse,
};