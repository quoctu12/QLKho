const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Tạo lỗi nghiệp vụ có mã HTTP
|--------------------------------------------------------------------------
*/

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;

  return error;
}

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu xuất có tìm kiếm, lọc và phân trang
|--------------------------------------------------------------------------
*/

async function getAllStockOuts(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      keyword,
      warehouse_id,
      export_rule,
      date_from,
      date_to,
      sort_by = "newest",
    } = req.query;

    const currentPage = Number(page);
    const pageLimit = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      currentPage <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(pageLimit) ||
      pageLimit <= 0 ||
      pageLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số dòng mỗi trang phải nằm trong khoảng từ 1 đến 100.",
      });
    }

    const conditions = [];
    const params = [];

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();

      if (normalizedKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      const extractedId = normalizedKeyword
        .replace(/^PX-/i, "")
        .replace(/^0+/, "");

      conditions.push(`
        (
          CAST(so.id AS CHAR) LIKE ?
          OR w.name LIKE ?
          OR wg.name LIKE ?
          OR u.full_name LIKE ?
          ${
            /^\d+$/.test(extractedId)
              ? "OR so.id = ?"
              : ""
          }
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );

      if (/^\d+$/.test(extractedId)) {
        params.push(Number(extractedId));
      }
    }

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

      conditions.push("so.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (export_rule) {
      const normalizedExportRule = String(export_rule)
        .trim()
        .toUpperCase();

      if (!["FIFO", "FEFO"].includes(normalizedExportRule)) {
        return res.status(400).json({
          success: false,
          message: "Quy tắc xuất kho không hợp lệ.",
        });
      }

      conditions.push("so.export_rule = ?");
      params.push(normalizedExportRule);
    }

    if (date_from) {
      const parsedDateFrom = new Date(date_from);

      if (Number.isNaN(parsedDateFrom.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu không hợp lệ.",
        });
      }

      conditions.push("so.export_date >= ?");
      params.push(date_from);
    }

    if (date_to) {
      const parsedDateTo = new Date(date_to);

      if (Number.isNaN(parsedDateTo.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc không hợp lệ.",
        });
      }

      conditions.push("so.export_date <= ?");
      params.push(date_to);
    }

    if (
      date_from &&
      date_to &&
      new Date(date_from) > new Date(date_to)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      });
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const allowedSortOptions = {
      newest: "so.id DESC",
      oldest: "so.id ASC",
      date_desc: "so.export_date DESC, so.id DESC",
      date_asc: "so.export_date ASC, so.id ASC",
      amount_desc: "total_amount DESC, so.id DESC",
      amount_asc: "total_amount ASC, so.id ASC",
    };

    const orderClause =
      allowedSortOptions[sort_by] ||
      allowedSortOptions.newest;

    const [countRows] = await pool.query(
      `
        SELECT
          COUNT(DISTINCT so.id) AS total_items

        FROM stock_out so

        JOIN warehouses w
          ON so.warehouse_id = w.id

        JOIN warehouse_gates wg
          ON so.gate_id = wg.id

        JOIN users u
          ON so.user_id = u.id

        ${whereClause}
      `,
      params
    );

    const totalItems = Number(countRows[0]?.total_items || 0);

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageLimit)
    );

    const safeCurrentPage = Math.min(
      currentPage,
      totalPages
    );

    const offset = (safeCurrentPage - 1) * pageLimit;

    const [rows] = await pool.query(
      `
        SELECT
          so.id,
          so.warehouse_id,
          w.name AS warehouse_name,
          so.gate_id,
          wg.name AS gate_name,
          so.user_id,
          u.full_name AS created_by,
          so.export_date,
          so.export_rule,
          so.note,
          so.created_at,

          COUNT(sod.id) AS total_items,

          COALESCE(
            SUM(sod.container_quantity),
            0
          ) AS total_containers,

          COALESCE(
            SUM(sod.total_storage_amount),
            0
          ) AS total_amount

        FROM stock_out so

        JOIN warehouses w
          ON so.warehouse_id = w.id

        JOIN warehouse_gates wg
          ON so.gate_id = wg.id

        JOIN users u
          ON so.user_id = u.id

        LEFT JOIN stock_out_details sod
          ON so.id = sod.stock_out_id

        ${whereClause}

        GROUP BY
          so.id,
          so.warehouse_id,
          w.name,
          so.gate_id,
          wg.name,
          so.user_id,
          u.full_name,
          so.export_date,
          so.export_rule,
          so.note,
          so.created_at

        ORDER BY ${orderClause}

        LIMIT ?
        OFFSET ?
      `,
      [
        ...params,
        pageLimit,
        offset,
      ]
    );

    const formattedRows = rows.map((row) => ({
      ...row,
      total_items: Number(row.total_items || 0),
      total_containers: Number(row.total_containers || 0),
      total_amount: Number(row.total_amount || 0),
    }));

    return res.status(200).json({
      success: true,

      data: {
        stock_outs: formattedRows,

        pagination: {
          page: safeCurrentPage,
          limit: pageLimit,
          total_items: totalItems,
          total_pages: totalPages,
          has_previous_page: safeCurrentPage > 1,
          has_next_page: safeCurrentPage < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách phiếu xuất:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách phiếu xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu xuất
|--------------------------------------------------------------------------
*/

async function getStockOutById(req, res) {
  try {
    const stockOutId = Number(req.params.id);

    if (
      !Number.isInteger(stockOutId) ||
      stockOutId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã phiếu xuất không hợp lệ.",
      });
    }

    const [stockOutRows] = await pool.query(
      `
        SELECT
          so.id,
          so.warehouse_id,
          w.name AS warehouse_name,
          so.gate_id,
          wg.name AS gate_name,
          so.user_id,
          u.full_name AS created_by,
          so.export_date,
          so.export_rule,
          so.note,
          so.created_at

        FROM stock_out so

        JOIN warehouses w
          ON so.warehouse_id = w.id

        JOIN warehouse_gates wg
          ON so.gate_id = wg.id

        JOIN users u
          ON so.user_id = u.id

        WHERE so.id = ?

        LIMIT 1
      `,
      [stockOutId]
    );

    if (stockOutRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu xuất.",
      });
    }

    const [detailRows] = await pool.query(
      `
        SELECT
          sod.id,
          sod.product_id,
          p.name AS product_name,
          p.sku,
          sod.batch_id,
          ib.batch_code,
          ib.import_date,
          ib.expiry_date,
          ib.location_id,
          wl.location_code,
          wl.location_name,
          sod.quantity,
          sod.container_quantity,
          sod.storage_days,
          sod.storage_unit_price,
          sod.total_storage_amount,
          sod.export_price,
          sod.total_export_amount

        FROM stock_out_details sod

        JOIN products p
          ON sod.product_id = p.id

        JOIN inventory_batches ib
          ON sod.batch_id = ib.id

        LEFT JOIN warehouse_locations wl
          ON ib.location_id = wl.id

        WHERE sod.stock_out_id = ?

        ORDER BY sod.id ASC
      `,
      [stockOutId]
    );

    const formattedDetails = detailRows.map((detail) => ({
      ...detail,
      quantity: Number(detail.quantity || 0),
      container_quantity: Number(detail.container_quantity || 0),
      storage_days: Number(detail.storage_days || 0),
      storage_unit_price: Number(detail.storage_unit_price || 0),
      total_storage_amount: Number(detail.total_storage_amount || 0),
      export_price: Number(detail.export_price || 0),
      total_export_amount: Number(detail.total_export_amount || 0),
    }));

    return res.status(200).json({
      success: true,
      data: {
        ...stockOutRows[0],
        details: formattedDetails,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết phiếu xuất:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết phiếu xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu xuất kho
|--------------------------------------------------------------------------
|
| Theo nghiệp vụ mới:
| - Xuất kho không cần nhập giá xuất.
| - Hệ thống tính phí lưu kho theo container.
| - Phí lưu kho = container xuất × số ngày lưu kho × đơn giá container/ngày.
|
*/

async function createStockOut(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    const {
      warehouse_id,
      gate_id,
      export_date,
      export_rule,
      note,
      details,
    } = req.body;

    const userId = Number(req.user?.id);
    const warehouseId = Number(warehouse_id);
    const gateId = Number(gate_id);

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kho xuất không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(gateId) ||
      gateId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cổng xuất không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    if (!export_date) {
      return res.status(400).json({
        success: false,
        message: "Ngày xuất là bắt buộc.",
      });
    }

    const parsedExportDate = new Date(export_date);

    if (Number.isNaN(parsedExportDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày xuất không hợp lệ.",
      });
    }

    if (!export_rule) {
      return res.status(400).json({
        success: false,
        message: "Quy tắc xuất là bắt buộc.",
      });
    }

    const normalizedExportRule = String(export_rule)
      .trim()
      .toUpperCase();

    if (!["FIFO", "FEFO"].includes(normalizedExportRule)) {
      return res.status(400).json({
        success: false,
        message: "Quy tắc xuất kho không hợp lệ.",
      });
    }

    if (
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Phiếu xuất phải có ít nhất một sản phẩm.",
      });
    }

    const productIds = new Set();

    for (const item of details) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Mã sản phẩm không hợp lệ.",
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Số lượng xuất phải là số nguyên lớn hơn 0.",
        });
      }

      if (productIds.has(productId)) {
        return res.status(400).json({
          success: false,
          message:
            `Sản phẩm ID ${productId} bị nhập trùng trong phiếu xuất.`,
        });
      }

      productIds.add(productId);
    }

    await connection.beginTransaction();
    transactionStarted = true;

    /*
     * Kiểm tra kho.
     */
    const [warehouseRows] = await connection.query(
      `
        SELECT id
        FROM warehouses
        WHERE id = ?
        LIMIT 1
      `,
      [warehouseId]
    );

    if (warehouseRows.length === 0) {
      throw createHttpError(404, "Không tìm thấy kho.");
    }

    /*
     * Lấy đơn giá lưu kho đang áp dụng.
     */
    const [pricingRows] = await connection.query(
      `
        SELECT
          price_per_container_per_day

        FROM storage_pricing

        WHERE warehouse_id = ?
          AND status = 'active'
          AND effective_from <= ?

        ORDER BY effective_from DESC, id DESC

        LIMIT 1
      `,
      [
        warehouseId,
        export_date,
      ]
    );

    if (pricingRows.length === 0) {
      throw createHttpError(
        400,
        "Kho này chưa có đơn giá lưu kho đang áp dụng."
      );
    }

    const storageUnitPrice = Number(
      pricingRows[0].price_per_container_per_day || 0
    );

    if (
      !Number.isFinite(storageUnitPrice) ||
      storageUnitPrice < 0
    ) {
      throw createHttpError(
        400,
        "Đơn giá lưu kho không hợp lệ."
      );
    }

    /*
     * Kiểm tra cổng xuất.
     */
    const [gateRows] = await connection.query(
      `
        SELECT
          id,
          warehouse_id,
          gate_type

        FROM warehouse_gates

        WHERE id = ?

        LIMIT 1
      `,
      [gateId]
    );

    if (gateRows.length === 0) {
      throw createHttpError(404, "Không tìm thấy cổng kho.");
    }

    const gate = gateRows[0];

    if (Number(gate.warehouse_id) !== warehouseId) {
      throw createHttpError(
        400,
        "Cổng kho không thuộc kho đã chọn."
      );
    }

    const normalizedGateType = String(gate.gate_type)
      .trim()
      .toUpperCase();

    if (!["OUT", "BOTH"].includes(normalizedGateType)) {
      throw createHttpError(
        400,
        "Cổng đã chọn không hỗ trợ xuất kho."
      );
    }

    /*
     * Kiểm tra người tạo phiếu.
     */
    const [userRows] = await connection.query(
      `
        SELECT
          id,
          status

        FROM users

        WHERE id = ?

        LIMIT 1
      `,
      [userId]
    );

    if (userRows.length === 0) {
      throw createHttpError(
        404,
        "Không tìm thấy người tạo phiếu."
      );
    }

    if (userRows[0].status !== "active") {
      throw createHttpError(
        403,
        "Tài khoản người tạo phiếu đã bị khóa."
      );
    }

    /*
     * Tạo phiếu xuất.
     */
    const [stockOutResult] = await connection.query(
      `
        INSERT INTO stock_out (
          warehouse_id,
          gate_id,
          user_id,
          export_date,
          export_rule,
          note
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        warehouseId,
        gateId,
        userId,
        export_date,
        normalizedExportRule,
        note?.trim() || null,
      ]
    );

    const stockOutId = stockOutResult.insertId;

    /*
     * Xuất từng sản phẩm theo FIFO hoặc FEFO.
     */
    for (const item of details) {
      const productId = Number(item.product_id);
      const requestedQuantity = Number(item.quantity);

      /*
       * Theo nghiệp vụ mới, giá xuất hàng hóa để 0.
       * Tổng tiền thu chính là phí lưu kho.
       */
      const exportPrice = 0;

      const [productRows] = await connection.query(
        `
          SELECT
            id,
            status

          FROM products

          WHERE id = ?

          LIMIT 1
        `,
        [productId]
      );

      if (productRows.length === 0) {
        throw createHttpError(
          404,
          `Không tìm thấy sản phẩm ID ${productId}.`
        );
      }

      if (productRows[0].status !== "active") {
        throw createHttpError(
          400,
          `Sản phẩm ID ${productId} đã ngừng hoạt động.`
        );
      }

      const orderClause =
        normalizedExportRule === "FEFO"
          ? `
              ORDER BY
                CASE
                  WHEN expiry_date IS NULL
                  THEN 1
                  ELSE 0
                END,
                expiry_date ASC,
                import_date ASC,
                id ASC
            `
          : `
              ORDER BY
                import_date ASC,
                id ASC
            `;

      const [batchRows] = await connection.query(
        `
          SELECT
            id,
            batch_code,
            quantity,
            container_quantity,
            cost_price,
            import_date,
            expiry_date

          FROM inventory_batches

          WHERE product_id = ?
            AND warehouse_id = ?
            AND quantity > 0
            AND (
              expiry_date IS NULL
              OR expiry_date >= CURDATE()
            )

          ${orderClause}

          FOR UPDATE
        `,
        [
          productId,
          warehouseId,
        ]
      );

      const totalAvailable = batchRows.reduce(
        (sum, batch) =>
          sum + Number(batch.quantity || 0),
        0
      );

      if (totalAvailable < requestedQuantity) {
        throw createHttpError(
          400,
          `Sản phẩm ID ${productId} không đủ tồn kho hợp lệ. Tồn có thể xuất: ${totalAvailable}.`
        );
      }

      let remainingQuantity = requestedQuantity;

      for (const batch of batchRows) {
        if (remainingQuantity <= 0) {
          break;
        }

        const availableQuantity = Number(batch.quantity || 0);
        const availableContainers = Number(batch.container_quantity || 0);

        const issuedQuantity = Math.min(
          availableQuantity,
          remainingQuantity
        );

        /*
         * Tính số container xuất theo tỷ lệ số lượng lấy từ lô.
         */
        const issuedContainers =
          availableContainers <= 0
            ? 0
            : Math.min(
                availableContainers,
                Math.ceil(
                  (issuedQuantity / availableQuantity) *
                    availableContainers
                )
              );

        const importDate = new Date(batch.import_date);

        if (Number.isNaN(importDate.getTime())) {
          throw createHttpError(
            400,
            `Ngày nhập của lô ${batch.batch_code} không hợp lệ.`
          );
        }

        const millisecondsPerDay = 24 * 60 * 60 * 1000;

        const storageDays = Math.max(
          1,
          Math.floor(
            (
              parsedExportDate.setHours(0, 0, 0, 0) -
              importDate.setHours(0, 0, 0, 0)
            ) / millisecondsPerDay
          ) + 1
        );

        const totalStorageAmount =
          issuedContainers *
          storageDays *
          storageUnitPrice;

        const totalExportAmount = totalStorageAmount;

        await connection.query(
          `
            INSERT INTO stock_out_details (
              stock_out_id,
              product_id,
              batch_id,
              quantity,
              container_quantity,
              storage_days,
              storage_unit_price,
              total_storage_amount,
              export_price,
              total_export_amount
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            stockOutId,
            productId,
            batch.id,
            issuedQuantity,
            issuedContainers,
            storageDays,
            storageUnitPrice,
            totalStorageAmount,
            exportPrice,
            totalExportAmount,
          ]
        );

        const newContainerQuantity = Math.max(
          availableContainers - issuedContainers,
          0
        );

        const [updateResult] = await connection.query(
          `
            UPDATE inventory_batches

            SET
              quantity = quantity - ?,
              container_quantity = ?

            WHERE id = ?
              AND quantity >= ?
          `,
          [
            issuedQuantity,
            newContainerQuantity,
            batch.id,
            issuedQuantity,
          ]
        );

        if (updateResult.affectedRows === 0) {
          throw createHttpError(
            409,
            `Tồn kho của lô ${batch.batch_code} vừa thay đổi. Vui lòng thử lại.`
          );
        }

        remainingQuantity -= issuedQuantity;
      }

      if (remainingQuantity > 0) {
        throw createHttpError(
          409,
          `Không thể xuất đủ số lượng sản phẩm ID ${productId}. Vui lòng thử lại.`
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Tạo phiếu xuất kho thành công.",
      data: {
        id: stockOutId,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }

    console.error("Lỗi tạo phiếu xuất:", error);

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Không thể tạo phiếu xuất kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  getAllStockOuts,
  getStockOutById,
  createStockOut,
};