const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Lấy danh sách tồn kho theo lô
|--------------------------------------------------------------------------
|
| Nếu frontend truyền page hoặc limit:
| {
|   batches: [],
|   pagination: {}
| }
|
| Nếu không truyền page và limit:
| trả về mảng trực tiếp để tương thích với các trang cũ.
|
*/

async function getInventoryBatches(req, res) {
  try {
    const {
      page,
      limit,
      warehouse_id,
      product_id,
      keyword,
      expiry_status,
      stock_status,
      sort_by = "priority",
    } = req.query;

    const paginationRequested =
      page !== undefined || limit !== undefined;

    const currentPage = Number(page || 1);
    const pageLimit = Number(limit || 10);

    if (
      paginationRequested &&
      (!Number.isInteger(currentPage) || currentPage <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ.",
      });
    }

    if (
      paginationRequested &&
      (
        !Number.isInteger(pageLimit) ||
        pageLimit <= 0 ||
        pageLimit > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số dòng mỗi trang phải nằm trong khoảng từ 1 đến 100.",
      });
    }

    const conditions = ["ib.quantity > 0"];
    const params = [];

    /*
     * Lọc theo kho.
     */
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

      conditions.push("ib.warehouse_id = ?");
      params.push(warehouseId);
    }

    /*
     * Lọc theo sản phẩm.
     */
    if (product_id) {
      const productId = Number(product_id);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Mã sản phẩm không hợp lệ.",
        });
      }

      conditions.push("ib.product_id = ?");
      params.push(productId);
    }

    /*
     * Tìm kiếm theo tên sản phẩm, SKU, mã lô, kho hoặc vị trí.
     */
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
          p.name LIKE ?
          OR p.sku LIKE ?
          OR ib.batch_code LIKE ?
          OR w.name LIKE ?
          OR wl.location_code LIKE ?
          OR wl.location_name LIKE ?
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    /*
     * Kiểm tra trạng thái hạn sử dụng.
     */
    const allowedExpiryStatuses = [
      "expired",
      "expiring",
      "valid",
      "no_expiry",
    ];

    if (
      expiry_status &&
      !allowedExpiryStatuses.includes(expiry_status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái hạn sử dụng không hợp lệ.",
      });
    }

    if (expiry_status === "expired") {
      conditions.push(`
        ib.expiry_date IS NOT NULL
        AND ib.expiry_date < CURDATE()
      `);
    }

    if (expiry_status === "expiring") {
      conditions.push(`
        ib.expiry_date IS NOT NULL
        AND ib.expiry_date >= CURDATE()
        AND ib.expiry_date <= DATE_ADD(
          CURDATE(),
          INTERVAL 30 DAY
        )
      `);
    }

    if (expiry_status === "valid") {
      conditions.push(`
        ib.expiry_date IS NOT NULL
        AND ib.expiry_date > DATE_ADD(
          CURDATE(),
          INTERVAL 30 DAY
        )
      `);
    }

    if (expiry_status === "no_expiry") {
      conditions.push("ib.expiry_date IS NULL");
    }

    /*
     * Kiểm tra trạng thái tồn kho.
     */
    const allowedStockStatuses = [
      "low_stock",
      "normal",
      "not_configured",
    ];

    if (
      stock_status &&
      !allowedStockStatuses.includes(stock_status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái tồn kho không hợp lệ.",
      });
    }

    if (stock_status === "low_stock") {
      conditions.push(`
        p.minimum_stock > 0
        AND COALESCE(pt.total_quantity, 0) <= p.minimum_stock
      `);
    }

    if (stock_status === "normal") {
      conditions.push(`
        p.minimum_stock > 0
        AND COALESCE(pt.total_quantity, 0) > p.minimum_stock
      `);
    }

    if (stock_status === "not_configured") {
      conditions.push(`
        COALESCE(p.minimum_stock, 0) <= 0
      `);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    /*
     * Chỉ chấp nhận các kiểu sắp xếp cố định.
     */
    const allowedSortOptions = {
      priority: `
        CASE
          WHEN p.minimum_stock > 0
            AND COALESCE(pt.total_quantity, 0) <= p.minimum_stock
            THEN 0
          ELSE 1
        END ASC,

        CASE
          WHEN ib.expiry_date IS NULL
            THEN 1
          ELSE 0
        END ASC,

        ib.expiry_date ASC,
        ib.import_date ASC,
        ib.id ASC
      `,

      expiry_asc: `
        CASE
          WHEN ib.expiry_date IS NULL
            THEN 1
          ELSE 0
        END ASC,

        ib.expiry_date ASC,
        ib.id ASC
      `,

      expiry_desc: `
        CASE
          WHEN ib.expiry_date IS NULL
            THEN 1
          ELSE 0
        END ASC,

        ib.expiry_date DESC,
        ib.id DESC
      `,

      quantity_desc: `
        ib.quantity DESC,
        ib.id DESC
      `,

      quantity_asc: `
        ib.quantity ASC,
        ib.id ASC
      `,

      newest: `
        ib.id DESC
      `,

      oldest: `
        ib.id ASC
      `,
    };

    if (!allowedSortOptions[sort_by]) {
      return res.status(400).json({
        success: false,
        message: "Kiểu sắp xếp không hợp lệ.",
      });
    }

    const orderClause = allowedSortOptions[sort_by];

    /*
     * Phần JOIN dùng chung cho câu đếm và câu lấy dữ liệu.
     */
    const commonFromClause = `
      FROM inventory_batches ib

      JOIN products p
        ON ib.product_id = p.id

      JOIN warehouses w
        ON ib.warehouse_id = w.id

      LEFT JOIN warehouse_locations wl
        ON ib.location_id = wl.id

      LEFT JOIN (
        SELECT
          product_id,

          COALESCE(
            SUM(quantity),
            0
          ) AS total_quantity

        FROM inventory_batches

        WHERE quantity > 0

        GROUP BY product_id
      ) pt
        ON pt.product_id = p.id
    `;

    let totalItems = 0;
    let totalPages = 1;
    let safeCurrentPage = 1;
    let paginationClause = "";
    let queryParams = [...params];

    /*
     * Chỉ đếm và thêm LIMIT/OFFSET khi có yêu cầu phân trang.
     */
    if (paginationRequested) {
      const [countRows] = await pool.query(
        `
          SELECT COUNT(*) AS total_items

          ${commonFromClause}

          ${whereClause}
        `,
        params
      );

      totalItems = Number(countRows[0]?.total_items || 0);

      totalPages = Math.max(
        1,
        Math.ceil(totalItems / pageLimit)
      );

      safeCurrentPage = Math.min(
        currentPage,
        totalPages
      );

      const offset =
        (safeCurrentPage - 1) * pageLimit;

      paginationClause = `
        LIMIT ?
        OFFSET ?
      `;

      queryParams = [
        ...params,
        pageLimit,
        offset,
      ];
    }

    const [rows] = await pool.query(
      `
        SELECT
          ib.id,
          ib.product_id,
          p.name AS product_name,
          p.sku,
          p.minimum_stock,

          COALESCE(
            pt.total_quantity,
            0
          ) AS total_product_quantity,

          CASE
            WHEN COALESCE(p.minimum_stock, 0) <= 0
              THEN 0

            WHEN COALESCE(pt.total_quantity, 0) <= p.minimum_stock
              THEN 1

            ELSE 0
          END AS is_low_stock,

          CASE
            WHEN COALESCE(p.minimum_stock, 0) <= 0
              THEN 'not_configured'

            WHEN COALESCE(pt.total_quantity, 0) <= p.minimum_stock
              THEN 'low_stock'

            ELSE 'normal'
          END AS stock_status,

          ib.warehouse_id,
          w.name AS warehouse_name,

          ib.location_id,
          wl.location_code,
          wl.location_name,
          wl.max_containers AS location_max_containers,
          wl.warning_threshold_percent AS location_warning_threshold_percent,

          ib.batch_code,
          ib.quantity,
          ib.container_quantity,
          ib.import_date,
          ib.expiry_date,
          ib.cost_price,

          COALESCE(
            ib.quantity * ib.cost_price,
            0
          ) AS inventory_value,

          CASE
            WHEN ib.expiry_date IS NULL
              THEN 'no_expiry'

            WHEN ib.expiry_date < CURDATE()
              THEN 'expired'

            WHEN ib.expiry_date <= DATE_ADD(
              CURDATE(),
              INTERVAL 30 DAY
            )
              THEN 'expiring'

            ELSE 'valid'
          END AS expiry_status,

          CASE
            WHEN ib.expiry_date IS NULL
              THEN NULL

            ELSE DATEDIFF(
              ib.expiry_date,
              CURDATE()
            )
          END AS days_until_expiry

        ${commonFromClause}

        ${whereClause}

        ORDER BY ${orderClause}

        ${paginationClause}
      `,
      queryParams
    );

    const formattedRows = rows.map((row) => ({
      ...row,

      minimum_stock: Number(row.minimum_stock || 0),

      total_product_quantity: Number(
        row.total_product_quantity || 0
      ),

      is_low_stock: Boolean(Number(row.is_low_stock)),

      quantity: Number(row.quantity || 0),

      container_quantity: Number(row.container_quantity || 0),

      location_max_containers: Number(
        row.location_max_containers || 0
      ),

      location_warning_threshold_percent: Number(
        row.location_warning_threshold_percent || 0
      ),

      cost_price: Number(row.cost_price || 0),

      inventory_value: Number(row.inventory_value || 0),

      days_until_expiry:
        row.days_until_expiry === null
          ? null
          : Number(row.days_until_expiry),
    }));

    /*
     * Không phân trang: giữ cấu trúc mảng cũ.
     */
    if (!paginationRequested) {
      return res.status(200).json({
        success: true,
        data: formattedRows,
      });
    }

    /*
     * Có phân trang: trả object gồm dữ liệu và thông tin trang.
     */
    return res.status(200).json({
      success: true,

      data: {
        batches: formattedRows,

        pagination: {
          page: safeCurrentPage,
          limit: pageLimit,
          total_items: totalItems,
          total_pages: totalPages,
          has_previous_page:
            safeCurrentPage > 1,
          has_next_page:
            safeCurrentPage < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy tồn kho theo lô:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu tồn kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy tổng quan tồn kho
|--------------------------------------------------------------------------
*/

async function getInventorySummary(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total_batches,

        COUNT(
          DISTINCT ib.product_id
        ) AS total_products,

        COALESCE(
          SUM(ib.quantity),
          0
        ) AS total_quantity,

        COALESCE(
          SUM(ib.container_quantity),
          0
        ) AS total_containers,

        COALESCE(
          SUM(
            ib.quantity *
            COALESCE(ib.cost_price, 0)
          ),
          0
        ) AS total_inventory_value,

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

        (
          SELECT COUNT(*)

          FROM products p

          LEFT JOIN (
            SELECT
              product_id,
              COALESCE(
                SUM(quantity),
                0
              ) AS total_quantity

            FROM inventory_batches

            WHERE quantity > 0

            GROUP BY product_id
          ) product_inventory
            ON product_inventory.product_id = p.id

          WHERE p.status = 'active'
            AND p.minimum_stock > 0
            AND COALESCE(
              product_inventory.total_quantity,
              0
            ) <= p.minimum_stock
        ) AS low_stock_products

      FROM inventory_batches ib

      WHERE ib.quantity > 0
    `);

    const summary = rows[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        total_batches: Number(summary.total_batches || 0),

        total_products: Number(summary.total_products || 0),

        total_quantity: Number(summary.total_quantity || 0),

        total_containers: Number(summary.total_containers || 0),

        total_inventory_value: Number(
          summary.total_inventory_value || 0
        ),

        expired_batches: Number(summary.expired_batches || 0),

        expiring_batches: Number(summary.expiring_batches || 0),

        low_stock_products: Number(
          summary.low_stock_products || 0
        ),
      },
    });
  } catch (error) {
    console.error("Lỗi lấy tổng quan tồn kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy tổng quan tồn kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy tồn kho tổng hợp theo sản phẩm
|--------------------------------------------------------------------------
*/

async function getInventoryByProduct(req, res) {
  try {
    const {
      keyword,
      stock_status,
    } = req.query;

    const conditions = [];
    const params = [];

    /*
     * Tìm theo tên hoặc SKU.
     */
    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();

      if (normalizedKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      conditions.push(`
        (
          p.name LIKE ?
          OR p.sku LIKE ?
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(searchValue, searchValue);
    }

    /*
     * Kiểm tra trạng thái tồn kho.
     */
    const allowedStockStatuses = [
      "low_stock",
      "normal",
      "not_configured",
    ];

    if (
      stock_status &&
      !allowedStockStatuses.includes(stock_status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái tồn kho không hợp lệ.",
      });
    }

    /*
     * Dùng HAVING vì tổng tồn được tính bằng SUM.
     */
    const havingConditions = [];

    if (stock_status === "low_stock") {
      havingConditions.push(`
        p.minimum_stock > 0
        AND COALESCE(SUM(ib.quantity), 0) <= p.minimum_stock
      `);
    }

    if (stock_status === "normal") {
      havingConditions.push(`
        p.minimum_stock > 0
        AND COALESCE(SUM(ib.quantity), 0) > p.minimum_stock
      `);
    }

    if (stock_status === "not_configured") {
      havingConditions.push(`
        COALESCE(p.minimum_stock, 0) <= 0
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
      `
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.sku,
          p.minimum_stock,
          p.status,

          COALESCE(
            SUM(ib.quantity),
            0
          ) AS total_quantity,

          COALESCE(
            SUM(
              ib.quantity *
              COALESCE(ib.cost_price, 0)
            ),
            0
          ) AS total_inventory_value,

          COUNT(ib.id) AS total_batches,

          CASE
            WHEN COALESCE(p.minimum_stock, 0) <= 0
              THEN 0

            WHEN COALESCE(SUM(ib.quantity), 0) <= p.minimum_stock
              THEN 1

            ELSE 0
          END AS is_low_stock,

          CASE
            WHEN COALESCE(p.minimum_stock, 0) <= 0
              THEN 'not_configured'

            WHEN COALESCE(SUM(ib.quantity), 0) <= p.minimum_stock
              THEN 'low_stock'

            ELSE 'normal'
          END AS stock_status

        FROM products p

        LEFT JOIN inventory_batches ib
          ON p.id = ib.product_id
          AND ib.quantity > 0

        ${whereClause}

        GROUP BY
          p.id,
          p.name,
          p.sku,
          p.minimum_stock,
          p.status

        ${havingClause}

        ORDER BY
          CASE
            WHEN p.minimum_stock > 0
              AND COALESCE(SUM(ib.quantity), 0) <= p.minimum_stock
              THEN 0

            ELSE 1
          END,

          p.name ASC,
          p.id ASC
      `,
      params
    );

    const formattedRows = rows.map((row) => ({
      ...row,
      minimum_stock: Number(row.minimum_stock || 0),
      total_quantity: Number(row.total_quantity || 0),
      total_inventory_value: Number(
        row.total_inventory_value || 0
      ),
      total_batches: Number(row.total_batches || 0),
      is_low_stock: Boolean(Number(row.is_low_stock)),
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy tồn kho theo sản phẩm:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu tồn kho theo sản phẩm.",
    });
  }
}

module.exports = {
  getInventoryBatches,
  getInventorySummary,
  getInventoryByProduct,
};