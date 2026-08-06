const pool = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isValidDate(value) {
  if (!value) return false;

  return !Number.isNaN(
    new Date(value).getTime()
  );
}

function toUtcDateOnlyTimestamp(value) {
  if (typeof value === "string") {
    const matchedDate = value.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (matchedDate) {
      return Date.UTC(
        Number(matchedDate[1]),
        Number(matchedDate[2]) - 1,
        Number(matchedDate[3])
      );
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu xuất
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

    /*
    |--------------------------------------------------------------------------
    | Tìm kiếm
    |--------------------------------------------------------------------------
    */

    if (keyword?.trim()) {
      const normalizedKeyword =
        keyword.trim();

      if (
        normalizedKeyword.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      const extractedId =
        normalizedKeyword
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

      const searchValue =
        `%${normalizedKeyword}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );

      if (/^\d+$/.test(extractedId)) {
        params.push(
          Number(extractedId)
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Lọc theo kho
    |--------------------------------------------------------------------------
    */

    if (warehouse_id) {
      const warehouseId =
        Number(warehouse_id);

      if (
        !Number.isInteger(warehouseId) ||
        warehouseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mã kho không hợp lệ.",
        });
      }

      conditions.push(
        "so.warehouse_id = ?"
      );

      params.push(warehouseId);
    }

    /*
    |--------------------------------------------------------------------------
    | Lọc theo quy tắc xuất
    |--------------------------------------------------------------------------
    */

    if (export_rule) {
      const normalizedExportRule =
        String(export_rule)
          .trim()
          .toUpperCase();

      if (
        !["FIFO", "FEFO"].includes(
          normalizedExportRule
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quy tắc xuất kho không hợp lệ.",
        });
      }

      conditions.push(
        "so.export_rule = ?"
      );

      params.push(
        normalizedExportRule
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Lọc theo ngày
    |--------------------------------------------------------------------------
    */

    if (date_from) {
      if (!isValidDate(date_from)) {
        return res.status(400).json({
          success: false,
          message:
            "Ngày bắt đầu không hợp lệ.",
        });
      }

      conditions.push(
        "so.export_date >= ?"
      );

      params.push(date_from);
    }

    if (date_to) {
      if (!isValidDate(date_to)) {
        return res.status(400).json({
          success: false,
          message:
            "Ngày kết thúc không hợp lệ.",
        });
      }

      conditions.push(
        "so.export_date <= ?"
      );

      params.push(date_to);
    }

    if (
      date_from &&
      date_to &&
      new Date(date_from) >
        new Date(date_to)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      });
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    /*
    |--------------------------------------------------------------------------
    | Sắp xếp
    |--------------------------------------------------------------------------
    */

    const allowedSortOptions = {
      newest:
        "so.id DESC",

      oldest:
        "so.id ASC",

      date_desc:
        "so.export_date DESC, so.id DESC",

      date_asc:
        "so.export_date ASC, so.id ASC",

      amount_desc:
        "total_amount DESC, so.id DESC",

      amount_asc:
        "total_amount ASC, so.id ASC",
    };

    const orderClause =
      allowedSortOptions[sort_by] ||
      allowedSortOptions.newest;

    /*
    |--------------------------------------------------------------------------
    | Đếm tổng số phiếu xuất
    |--------------------------------------------------------------------------
    */

    const [countRows] =
      await pool.query(
        `
          SELECT
            COUNT(DISTINCT so.id)
              AS total_items

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

    const totalItems = Number(
      countRows[0]?.total_items || 0
    );

    const totalPages = Math.max(
      1,
      Math.ceil(
        totalItems / pageLimit
      )
    );

    const safeCurrentPage = Math.min(
      currentPage,
      totalPages
    );

    const offset =
      (safeCurrentPage - 1) *
      pageLimit;

    /*
    |--------------------------------------------------------------------------
    | Lấy danh sách phiếu xuất
    |--------------------------------------------------------------------------
    */

    const [rows] =
      await pool.query(
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

            COUNT(sod.id)
              AS total_items,

            COALESCE(
              SUM(
                sod.container_quantity
              ),
              0
            ) AS total_containers,

            COALESCE(
              SUM(
                sod.regular_storage_amount
              ),
              0
            ) AS total_regular_amount,

            COALESCE(
              SUM(
                sod.overdue_storage_amount
              ),
              0
            ) AS total_overdue_amount,

            COALESCE(
              SUM(
                sod.total_storage_amount
              ),
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
            ON so.id =
              sod.stock_out_id

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

    const formattedRows =
      rows.map((row) => ({
        ...row,

        total_items: Number(
          row.total_items || 0
        ),

        total_containers: Number(
          row.total_containers || 0
        ),

        total_regular_amount: Number(
          row.total_regular_amount || 0
        ),

        total_overdue_amount: Number(
          row.total_overdue_amount || 0
        ),

        total_amount: Number(
          row.total_amount || 0
        ),
      }));

    return res.status(200).json({
      success: true,

      data: {
        stock_outs:
          formattedRows,

        pagination: {
          page: safeCurrentPage,
          limit: pageLimit,
          total_items: totalItems,
          total_pages: totalPages,

          has_previous_page:
            safeCurrentPage > 1,

          has_next_page:
            safeCurrentPage <
            totalPages,
        },
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách phiếu xuất:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy danh sách phiếu xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu xuất
|--------------------------------------------------------------------------
*/

async function getStockOutById(
  req,
  res
) {
  try {
    const stockOutId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(stockOutId) ||
      stockOutId <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Mã phiếu xuất không hợp lệ.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Lấy thông tin chung
    |--------------------------------------------------------------------------
    */

    const [stockOutRows] =
      await pool.query(
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

    if (
      stockOutRows.length === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy phiếu xuất.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Lấy chi tiết phiếu xuất
    |--------------------------------------------------------------------------
    */

    const [detailRows] =
      await pool.query(
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

            ib.base_quantity_per_container,

            ib.storage_policy_id,
            ib.max_storage_days,
            ib.storage_due_date,

            sod.quantity,
            sod.container_quantity,

            sod.storage_days,
            sod.regular_storage_days,
            sod.overdue_storage_days,
            sod.overdue_multiplier,

            sod.storage_unit_price,

            sod.regular_storage_amount,
            sod.overdue_storage_amount,
            sod.total_storage_amount

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

    const formattedDetails =
      detailRows.map((detail) => ({
        ...detail,

        quantity: Number(
          detail.quantity || 0
        ),

        container_quantity: Number(
          detail.container_quantity || 0
        ),

        base_quantity_per_container:
          Number(
            detail
              .base_quantity_per_container ||
            0
          ),

        storage_policy_id:
          detail.storage_policy_id ===
            null ||
          detail.storage_policy_id ===
            undefined
            ? null
            : Number(
                detail.storage_policy_id
              ),

        max_storage_days: Number(
          detail.max_storage_days || 0
        ),

        storage_days: Number(
          detail.storage_days || 0
        ),

        regular_storage_days: Number(
          detail.regular_storage_days || 0
        ),

        overdue_storage_days: Number(
          detail.overdue_storage_days || 0
        ),

        overdue_multiplier: Number(
          detail.overdue_multiplier || 1
        ),

        storage_unit_price: Number(
          detail.storage_unit_price || 0
        ),

        regular_storage_amount: Number(
          detail.regular_storage_amount ||
          0
        ),

        overdue_storage_amount: Number(
          detail.overdue_storage_amount ||
          0
        ),

        total_storage_amount: Number(
          detail.total_storage_amount || 0
        ),
      }));

    return res.status(200).json({
      success: true,

      data: {
        ...stockOutRows[0],
        details: formattedDetails,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy chi tiết phiếu xuất:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Không thể lấy chi tiết phiếu xuất.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu xuất kho
|--------------------------------------------------------------------------
|
| Nghiệp vụ:
| - Xuất theo FIFO hoặc FEFO.
| - Dùng đơn giá và chính sách đã chốt trong từng lô.
| - Chỉ quyết toán số container thực sự được giải phóng.
| - Tách phí trong hạn và phí quá hạn.
|
*/

async function createStockOut(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    connection =
      await pool.getConnection();

    const {
      warehouse_id,
      gate_id,
      export_date,
      export_rule,
      note,
      details,
    } = req.body;

    const userId = Number(
      req.user?.id
    );

    const warehouseId = Number(
      warehouse_id
    );

    const gateId = Number(
      gate_id
    );

    const normalizedNote =
      note?.trim() || null;

    /*
    |--------------------------------------------------------------------------
    | 1. Kiểm tra thông tin chung
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Kho xuất không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(gateId) ||
      gateId <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Cổng xuất không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,

        message:
          "Bạn chưa đăng nhập.",
      });
    }

    if (!export_date) {
      return res.status(400).json({
        success: false,

        message:
          "Ngày xuất là bắt buộc.",
      });
    }

    if (!isValidDate(export_date)) {
      return res.status(400).json({
        success: false,

        message:
          "Ngày xuất không hợp lệ.",
      });
    }

    const exportDateTimestamp =
      toUtcDateOnlyTimestamp(
        export_date
      );

    if (
      exportDateTimestamp === null
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Ngày xuất không hợp lệ.",
      });
    }

    if (!export_rule) {
      return res.status(400).json({
        success: false,

        message:
          "Quy tắc xuất là bắt buộc.",
      });
    }

    const normalizedExportRule =
      String(export_rule)
        .trim()
        .toUpperCase();

    if (
      !["FIFO", "FEFO"].includes(
        normalizedExportRule
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Quy tắc xuất kho không hợp lệ.",
      });
    }

    if (
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Phiếu xuất phải có ít nhất một sản phẩm.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Kiểm tra chi tiết sản phẩm
    |--------------------------------------------------------------------------
    */

    const productIds = new Set();
    const normalizedDetails = [];

    for (const item of details) {
      const productId = Number(
        item.product_id
      );

      const quantity = Number(
        item.quantity
      );

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Mã sản phẩm không hợp lệ.",
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Số lượng xuất phải là số nguyên lớn hơn 0.",
        });
      }

      if (
        productIds.has(productId)
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Sản phẩm ID ${productId} bị nhập trùng trong phiếu xuất.`,
        });
      }

      productIds.add(productId);

      normalizedDetails.push({
        productId,
        quantity,
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    /*
    |--------------------------------------------------------------------------
    | 3. Kiểm tra kho
    |--------------------------------------------------------------------------
    */

    const [warehouseRows] =
      await connection.query(
        `
          SELECT id

          FROM warehouses

          WHERE id = ?

          LIMIT 1
        `,
        [warehouseId]
      );

    if (
      warehouseRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Kiểm tra cổng xuất
    |--------------------------------------------------------------------------
    */

    const [gateRows] =
      await connection.query(
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

    if (
      gateRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy cổng kho."
      );
    }

    const gate =
      gateRows[0];

    if (
      Number(
        gate.warehouse_id
      ) !== warehouseId
    ) {
      throw createHttpError(
        400,
        "Cổng kho không thuộc kho đã chọn."
      );
    }

    const normalizedGateType =
      String(gate.gate_type)
        .trim()
        .toUpperCase();

    if (
      !["OUT", "BOTH"].includes(
        normalizedGateType
      )
    ) {
      throw createHttpError(
        400,
        "Cổng đã chọn không hỗ trợ xuất kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Kiểm tra người tạo phiếu
    |--------------------------------------------------------------------------
    */

    const [userRows] =
      await connection.query(
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

    if (
      userRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy người tạo phiếu."
      );
    }

    if (
      userRows[0].status !==
      "active"
    ) {
      throw createHttpError(
        403,
        "Tài khoản người tạo phiếu đã bị khóa."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Tạo phiếu xuất
    |--------------------------------------------------------------------------
    */

    const [stockOutResult] =
      await connection.query(
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
          normalizedNote,
        ]
      );

    const stockOutId =
      stockOutResult.insertId;

    const createdDetails = [];

    /*
    |--------------------------------------------------------------------------
    | 7. Xuất từng sản phẩm
    |--------------------------------------------------------------------------
    */

    for (
      const item of normalizedDetails
    ) {
      const {
        productId,
        quantity: requestedQuantity,
      } = item;

      /*
       * Kiểm tra sản phẩm.
       */
      const [productRows] =
        await connection.query(
          `
            SELECT
              id,
              name,
              status

            FROM products

            WHERE id = ?

            LIMIT 1
          `,
          [productId]
        );

      if (
        productRows.length === 0
      ) {
        throw createHttpError(
          404,
          `Không tìm thấy sản phẩm ID ${productId}.`
        );
      }

      const product =
        productRows[0];

      if (
        product.status !== "active"
      ) {
        throw createHttpError(
          400,
          `Sản phẩm ${product.name} đã ngừng hoạt động.`
        );
      }

      /*
       * Quy tắc chọn lô.
       */
      const batchOrderClause =
        normalizedExportRule ===
        "FEFO"
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

      /*
       * Lấy các lô có thể xuất.
       */
      const [batchRows] =
        await connection.query(
          `
            SELECT
              id,
              batch_code,
              quantity,
              container_quantity,
              base_quantity_per_container,

              storage_pricing_id,
              storage_unit_price,

              storage_policy_id,
              max_storage_days,
              warning_days,
              overdue_multiplier,
              storage_due_date,
              allow_overdue_export,
              require_overdue_note,

              import_date,
              expiry_date

            FROM inventory_batches

            WHERE product_id = ?
              AND warehouse_id = ?
              AND quantity > 0
              AND import_date <= ?
              AND (
                expiry_date IS NULL
                OR expiry_date >= ?
              )

            ${batchOrderClause}

            FOR UPDATE
          `,
          [
            productId,
            warehouseId,
            export_date,
            export_date,
          ]
        );

      const totalAvailable =
        batchRows.reduce(
          (sum, batch) =>
            sum +
            Number(
              batch.quantity || 0
            ),
          0
        );

      if (
        totalAvailable <
        requestedQuantity
      ) {
        throw createHttpError(
          400,
          `Sản phẩm ${product.name} không đủ tồn kho hợp lệ. Tồn có thể xuất: ${totalAvailable}.`
        );
      }

      let remainingQuantity =
        requestedQuantity;

      /*
       * Trừ tồn theo từng lô.
       */
      for (const batch of batchRows) {
        if (
          remainingQuantity <= 0
        ) {
          break;
        }

        const availableQuantity =
          Number(
            batch.quantity || 0
          );

        const storedContainerQuantity =
          Number(
            batch.container_quantity ||
            0
          );

        const baseQuantityPerContainer =
          Number(
            batch
              .base_quantity_per_container
          );

        const batchStorageUnitPrice =
          Number(
            batch.storage_unit_price
          );

        const storagePolicyId =
          Number(
            batch.storage_policy_id
          );

        const maxStorageDays =
          Number(
            batch.max_storage_days
          );

        const overdueMultiplier =
          Number(
            batch.overdue_multiplier
          );

        const allowOverdueExport =
          Boolean(
            Number(
              batch.allow_overdue_export
            )
          );

        const requireOverdueNote =
          Boolean(
            Number(
              batch.require_overdue_note
            )
          );

        /*
         * Kiểm tra dữ liệu đã chốt.
         */
        if (
          !Number.isInteger(
            baseQuantityPerContainer
          ) ||
          baseQuantityPerContainer <= 0
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} chưa có sức chứa container hợp lệ.`
          );
        }

        if (
          !Number.isFinite(
            batchStorageUnitPrice
          ) ||
          batchStorageUnitPrice <= 0
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} chưa có đơn giá lưu kho đã chốt hợp lệ.`
          );
        }

        if (
          !Number.isInteger(
            storagePolicyId
          ) ||
          storagePolicyId <= 0
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} chưa có chính sách lưu kho đã chốt hợp lệ.`
          );
        }

        if (
          !Number.isInteger(
            maxStorageDays
          ) ||
          maxStorageDays <= 0
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} chưa có thời hạn lưu kho hợp lệ.`
          );
        }

        if (
          !Number.isFinite(
            overdueMultiplier
          ) ||
          overdueMultiplier < 1
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} chưa có hệ số phí quá hạn hợp lệ.`
          );
        }

        /*
         * Kiểm tra container hiện tại.
         */
        const expectedCurrentContainers =
          Math.ceil(
            availableQuantity /
              baseQuantityPerContainer
          );

        if (
          storedContainerQuantity !==
          expectedCurrentContainers
        ) {
          throw createHttpError(
            409,
            `Số container của lô ${batch.batch_code} không khớp với số lượng tồn. Vui lòng kiểm tra lại dữ liệu lô.`
          );
        }

        /*
         * Số lượng xuất từ lô này.
         */
        const issuedQuantity =
          Math.min(
            availableQuantity,
            remainingQuantity
          );

        /*
         * Số lượng còn lại sau xuất.
         */
        const remainingBatchQuantity =
          availableQuantity -
          issuedQuantity;

        /*
         * Tính lại container còn chiếm chỗ.
         */
        const newContainerQuantity =
          remainingBatchQuantity <= 0
            ? 0
            : Math.ceil(
                remainingBatchQuantity /
                  baseQuantityPerContainer
              );

        /*
         * Container thực sự được giải phóng.
         */
        const issuedContainers =
          Math.max(
            storedContainerQuantity -
              newContainerQuantity,
            0
          );

        /*
         * Tính tổng số ngày lưu.
         */
        const importDateTimestamp =
          toUtcDateOnlyTimestamp(
            batch.import_date
          );

        if (
          importDateTimestamp === null
        ) {
          throw createHttpError(
            400,
            `Ngày nhập của lô ${batch.batch_code} không hợp lệ.`
          );
        }

        if (
          exportDateTimestamp <
          importDateTimestamp
        ) {
          throw createHttpError(
            400,
            `Ngày xuất không được nhỏ hơn ngày nhập của lô ${batch.batch_code}.`
          );
        }

        const millisecondsPerDay =
          24 * 60 * 60 * 1000;

        const storageDays =
          Math.max(
            1,

            Math.floor(
              (
                exportDateTimestamp -
                importDateTimestamp
              ) /
                millisecondsPerDay
            ) + 1
          );

        /*
         * Chia số ngày lưu thành:
         * - ngày trong hạn;
         * - ngày quá hạn.
         */
        const regularStorageDays =
          Math.min(
            storageDays,
            maxStorageDays
          );

        const overdueStorageDays =
          Math.max(
            storageDays -
              maxStorageDays,
            0
          );

        const isOverdue =
          overdueStorageDays > 0;

        /*
         * Kiểm tra quyền xuất quá hạn.
         */
        if (
          isOverdue &&
          !allowOverdueExport
        ) {
          throw createHttpError(
            400,
            `Lô ${batch.batch_code} đã quá thời hạn lưu kho và chính sách không cho phép xuất quá hạn.`
          );
        }

        /*
         * Bắt buộc ghi chú khi xuất quá hạn.
         */
        if (
          isOverdue &&
          requireOverdueNote &&
          !normalizedNote
        ) {
          throw createHttpError(
            400,
            `Phiếu xuất có lô ${batch.batch_code} quá thời hạn lưu kho. Vui lòng nhập ghi chú lý do xuất quá hạn.`
          );
        }

        /*
         * Tính phí trong hạn.
         */
        const regularStorageAmount =
          issuedContainers *
          regularStorageDays *
          batchStorageUnitPrice;

        /*
         * Tính phí quá hạn.
         */
        const overdueStorageAmount =
          issuedContainers *
          overdueStorageDays *
          batchStorageUnitPrice *
          overdueMultiplier;

        /*
         * Tổng phí lưu kho.
         */
        const totalStorageAmount =
          regularStorageAmount +
          overdueStorageAmount;

        /*
         * Lưu chi tiết phiếu xuất.
         */
        const [detailResult] =
          await connection.query(
            `
              INSERT INTO stock_out_details (
                stock_out_id,
                product_id,
                batch_id,
                quantity,
                container_quantity,
                storage_days,
                regular_storage_days,
                overdue_storage_days,
                overdue_multiplier,
                storage_unit_price,
                regular_storage_amount,
                overdue_storage_amount,
                total_storage_amount
              )
              VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?
              )
            `,
            [
              stockOutId,
              productId,
              batch.id,
              issuedQuantity,
              issuedContainers,
              storageDays,
              regularStorageDays,
              overdueStorageDays,
              overdueMultiplier,
              batchStorageUnitPrice,
              regularStorageAmount,
              overdueStorageAmount,
              totalStorageAmount,
            ]
          );

        /*
         * Cập nhật tồn kho.
         */
        const [updateResult] =
          await connection.query(
            `
              UPDATE inventory_batches

              SET
                quantity = ?,
                container_quantity = ?

              WHERE id = ?
                AND quantity = ?
                AND container_quantity = ?
            `,
            [
              remainingBatchQuantity,
              newContainerQuantity,
              batch.id,
              availableQuantity,
              storedContainerQuantity,
            ]
          );

        if (
          updateResult.affectedRows ===
          0
        ) {
          throw createHttpError(
            409,
            `Tồn kho của lô ${batch.batch_code} vừa thay đổi. Vui lòng thử lại.`
          );
        }

        /*
         * Lưu dữ liệu trả về.
         */
        createdDetails.push({
          stock_out_detail_id:
            detailResult.insertId,

          product_id:
            productId,

          product_name:
            product.name,

          batch_id:
            Number(batch.id),

          batch_code:
            batch.batch_code,

          issued_quantity:
            issuedQuantity,

          issued_containers:
            issuedContainers,

          remaining_quantity:
            remainingBatchQuantity,

          remaining_containers:
            newContainerQuantity,

          base_quantity_per_container:
            baseQuantityPerContainer,

          storage_policy_id:
            storagePolicyId,

          max_storage_days:
            maxStorageDays,

          storage_due_date:
            batch.storage_due_date,

          storage_days:
            storageDays,

          regular_storage_days:
            regularStorageDays,

          overdue_storage_days:
            overdueStorageDays,

          overdue_multiplier:
            overdueMultiplier,

          is_overdue:
            isOverdue,

          storage_unit_price:
            batchStorageUnitPrice,

          regular_storage_amount:
            regularStorageAmount,

          overdue_storage_amount:
            overdueStorageAmount,

          total_storage_amount:
            totalStorageAmount,
        });

        remainingQuantity -=
          issuedQuantity;
      }

      if (
        remainingQuantity > 0
      ) {
        throw createHttpError(
          409,
          `Không thể xuất đủ số lượng sản phẩm ${product.name}. Vui lòng thử lại.`
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 8. Hoàn tất giao dịch
    |--------------------------------------------------------------------------
    */

    await connection.commit();
    transactionStarted = false;

    const totalContainers =
      createdDetails.reduce(
        (sum, detail) =>
          sum +
          Number(
            detail.issued_containers ||
            0
          ),
        0
      );

    const totalRegularStorageAmount =
      createdDetails.reduce(
        (sum, detail) =>
          sum +
          Number(
            detail
              .regular_storage_amount ||
            0
          ),
        0
      );

    const totalOverdueStorageAmount =
      createdDetails.reduce(
        (sum, detail) =>
          sum +
          Number(
            detail
              .overdue_storage_amount ||
            0
          ),
        0
      );

    const totalStorageAmount =
      createdDetails.reduce(
        (sum, detail) =>
          sum +
          Number(
            detail
              .total_storage_amount ||
            0
          ),
        0
      );

    return res.status(201).json({
      success: true,

      message:
        "Tạo phiếu xuất kho thành công.",

      data: {
        id: stockOutId,

        total_containers:
          totalContainers,

        total_regular_storage_amount:
          totalRegularStorageAmount,

        total_overdue_storage_amount:
          totalOverdueStorageAmount,

        total_storage_amount:
          totalStorageAmount,

        details:
          createdDetails,
      },
    });
  } catch (error) {
    if (
      connection &&
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Lỗi rollback phiếu xuất:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi tạo phiếu xuất:",
      error
    );

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