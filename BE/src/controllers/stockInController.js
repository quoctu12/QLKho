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

function addDaysToDateOnly(
  value,
  daysToAdd
) {
  const match = String(
    value || ""
  ).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) {
    return null;
  }

  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return new Date(
    timestamp +
      Number(daysToAdd) *
        24 *
        60 *
        60 *
        1000
  )
    .toISOString()
    .slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu nhập
|--------------------------------------------------------------------------
*/

async function getAllStockIns(
  req,
  res
) {
  try {
    const {
      page = 1,
      limit = 10,
      keyword,
      warehouse_id,
      supplier_id,
      date_from,
      date_to,
      sort_by = "newest",
    } = req.query;

    const currentPage =
      Number(page);

    const pageLimit =
      Number(limit);

    if (
      !Number.isInteger(
        currentPage
      ) ||
      currentPage <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số trang không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(
        pageLimit
      ) ||
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
        normalizedKeyword.length >
        100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      const extractedId =
        normalizedKeyword
          .replace(/^PN-/i, "")
          .replace(/^0+/, "");

      conditions.push(`
        (
          CAST(si.id AS CHAR) LIKE ?
          OR s.name LIKE ?
          OR w.name LIKE ?
          OR wg.name LIKE ?
          OR u.full_name LIKE ?
          ${
            /^\d+$/.test(
              extractedId
            )
              ? "OR si.id = ?"
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
        searchValue,
        searchValue
      );

      if (
        /^\d+$/.test(
          extractedId
        )
      ) {
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
        !Number.isInteger(
          warehouseId
        ) ||
        warehouseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mã kho không hợp lệ.",
        });
      }

      conditions.push(
        "si.warehouse_id = ?"
      );

      params.push(
        warehouseId
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Lọc theo nhà cung cấp
    |--------------------------------------------------------------------------
    */

    if (supplier_id) {
      const supplierId =
        Number(supplier_id);

      if (
        !Number.isInteger(
          supplierId
        ) ||
        supplierId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mã nhà cung cấp không hợp lệ.",
        });
      }

      conditions.push(
        "si.supplier_id = ?"
      );

      params.push(
        supplierId
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Lọc theo ngày
    |--------------------------------------------------------------------------
    */

    if (date_from) {
      if (
        !isValidDate(
          date_from
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ngày bắt đầu không hợp lệ.",
        });
      }

      conditions.push(
        "si.import_date >= ?"
      );

      params.push(
        date_from
      );
    }

    if (date_to) {
      if (
        !isValidDate(
          date_to
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ngày kết thúc không hợp lệ.",
        });
      }

      conditions.push(
        "si.import_date <= ?"
      );

      params.push(
        date_to
      );
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
        "si.id DESC",

      oldest:
        "si.id ASC",

      date_desc:
        "si.import_date DESC, si.id DESC",

      date_asc:
        "si.import_date ASC, si.id ASC",

      quantity_desc:
        "total_quantity DESC, si.id DESC",

      quantity_asc:
        "total_quantity ASC, si.id ASC",

      container_desc:
        "total_containers DESC, si.id DESC",

      container_asc:
        "total_containers ASC, si.id ASC",
    };

    const orderClause =
      allowedSortOptions[
        sort_by
      ] ||
      allowedSortOptions.newest;

    /*
    |--------------------------------------------------------------------------
    | Đếm tổng phiếu nhập
    |--------------------------------------------------------------------------
    */

    const [countRows] =
      await pool.query(
        `
          SELECT
            COUNT(
              DISTINCT si.id
            ) AS total_items

          FROM stock_in si

          JOIN suppliers s
            ON si.supplier_id =
              s.id

          JOIN warehouses w
            ON si.warehouse_id =
              w.id

          JOIN warehouse_gates wg
            ON si.gate_id =
              wg.id

          JOIN users u
            ON si.user_id =
              u.id

          ${whereClause}
        `,
        params
      );

    const totalItems =
      Number(
        countRows[0]
          ?.total_items || 0
      );

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalItems /
            pageLimit
        )
      );

    const safeCurrentPage =
      Math.min(
        currentPage,
        totalPages
      );

    const offset =
      (
        safeCurrentPage -
        1
      ) * pageLimit;

    /*
    |--------------------------------------------------------------------------
    | Lấy danh sách
    |--------------------------------------------------------------------------
    */

    const [rows] =
      await pool.query(
        `
          SELECT
            si.id,
            si.supplier_id,
            s.name
              AS supplier_name,

            si.warehouse_id,
            w.name
              AS warehouse_name,

            si.gate_id,
            wg.name
              AS gate_name,

            si.user_id,
            u.full_name
              AS created_by,

            si.import_date,
            si.note,
            si.created_at,

            COUNT(
              sid.id
            ) AS total_items,

            COALESCE(
              SUM(
                sid.quantity
              ),
              0
            ) AS total_quantity,

            COALESCE(
              SUM(
                sid.container_quantity
              ),
              0
            ) AS total_containers

          FROM stock_in si

          JOIN suppliers s
            ON si.supplier_id =
              s.id

          JOIN warehouses w
            ON si.warehouse_id =
              w.id

          JOIN warehouse_gates wg
            ON si.gate_id =
              wg.id

          JOIN users u
            ON si.user_id =
              u.id

          LEFT JOIN stock_in_details sid
            ON si.id =
              sid.stock_in_id

          ${whereClause}

          GROUP BY
            si.id,
            si.supplier_id,
            s.name,
            si.warehouse_id,
            w.name,
            si.gate_id,
            wg.name,
            si.user_id,
            u.full_name,
            si.import_date,
            si.note,
            si.created_at

          ORDER BY
            ${orderClause}

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
      rows.map(
        (row) => ({
          ...row,

          total_items:
            Number(
              row.total_items ||
                0
            ),

          total_quantity:
            Number(
              row.total_quantity ||
                0
            ),

          total_containers:
            Number(
              row.total_containers ||
                0
            ),
        })
      );

    return res
      .status(200)
      .json({
        success: true,

        data: {
          stock_ins:
            formattedRows,

          pagination: {
            page:
              safeCurrentPage,

            limit:
              pageLimit,

            total_items:
              totalItems,

            total_pages:
              totalPages,

            has_previous_page:
              safeCurrentPage >
              1,

            has_next_page:
              safeCurrentPage <
              totalPages,
          },
        },
      });
  } catch (error) {
    console.error(
      "Lỗi lấy danh sách phiếu nhập:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Không thể lấy danh sách phiếu nhập.",
      });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu nhập
|--------------------------------------------------------------------------
*/

async function getStockInById(
  req,
  res
) {
  try {
    const stockInId =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        stockInId
      ) ||
      stockInId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Mã phiếu nhập không hợp lệ.",
        });
    }

    const [stockInRows] =
      await pool.query(
        `
          SELECT
            si.id,
            si.supplier_id,
            s.name
              AS supplier_name,

            si.warehouse_id,
            w.name
              AS warehouse_name,

            si.gate_id,
            wg.name
              AS gate_name,

            si.user_id,
            u.full_name
              AS created_by,

            si.import_date,
            si.note,
            si.created_at

          FROM stock_in si

          JOIN suppliers s
            ON si.supplier_id =
              s.id

          JOIN warehouses w
            ON si.warehouse_id =
              w.id

          JOIN warehouse_gates wg
            ON si.gate_id =
              wg.id

          JOIN users u
            ON si.user_id =
              u.id

          WHERE si.id = ?

          LIMIT 1
        `,
        [stockInId]
      );

    if (
      stockInRows.length ===
      0
    ) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Không tìm thấy phiếu nhập.",
        });
    }

    const [detailRows] =
      await pool.query(
        `
          SELECT
            sid.id,
            sid.product_id,

            p.name
              AS product_name,

            p.sku,

            sid.unit_id,

            pu.name
              AS unit_name,

            sid.location_id,

            wl.location_code,
            wl.location_name,

            sid.batch_code,
            sid.quantity,
            sid.container_quantity,
            sid.expiry_date,

            ib.id
              AS inventory_batch_id,

            ib.base_quantity_per_container,

            ib.storage_pricing_id,
            ib.storage_unit_price,

            ib.storage_policy_id,

            wsp.policy_code,
            wsp.policy_name,

            ib.max_storage_days,
            ib.warning_days,
            ib.overdue_multiplier,
            ib.storage_due_date,

            ib.allow_overdue_export,
            ib.require_overdue_note

          FROM stock_in_details sid

          JOIN products p
            ON sid.product_id =
              p.id

          JOIN product_units pu
            ON sid.unit_id =
              pu.id

          LEFT JOIN warehouse_locations wl
            ON sid.location_id =
              wl.id

          LEFT JOIN inventory_batches ib
            ON ib.stock_in_detail_id =
              sid.id

          LEFT JOIN warehouse_storage_policies wsp
            ON wsp.id =
              ib.storage_policy_id

          WHERE sid.stock_in_id = ?

          ORDER BY
            sid.id ASC
        `,
        [stockInId]
      );

    const formattedDetails =
      detailRows.map(
        (detail) => ({
          ...detail,

          quantity:
            Number(
              detail.quantity ||
                0
            ),

          container_quantity:
            Number(
              detail.container_quantity ||
                0
            ),

          inventory_batch_id:
            detail
              .inventory_batch_id ==
            null
              ? null
              : Number(
                  detail
                    .inventory_batch_id
                ),

          base_quantity_per_container:
            detail
              .base_quantity_per_container ==
            null
              ? null
              : Number(
                  detail
                    .base_quantity_per_container
                ),

          storage_pricing_id:
            detail
              .storage_pricing_id ==
            null
              ? null
              : Number(
                  detail
                    .storage_pricing_id
                ),

          storage_unit_price:
            detail
              .storage_unit_price ==
            null
              ? null
              : Number(
                  detail
                    .storage_unit_price
                ),

          storage_policy_id:
            detail
              .storage_policy_id ==
            null
              ? null
              : Number(
                  detail
                    .storage_policy_id
                ),

          max_storage_days:
            detail
              .max_storage_days ==
            null
              ? null
              : Number(
                  detail
                    .max_storage_days
                ),

          warning_days:
            detail
              .warning_days ==
            null
              ? null
              : Number(
                  detail
                    .warning_days
                ),

          overdue_multiplier:
            detail
              .overdue_multiplier ==
            null
              ? null
              : Number(
                  detail
                    .overdue_multiplier
                ),

          allow_overdue_export:
            detail
              .allow_overdue_export ==
            null
              ? null
              : Boolean(
                  Number(
                    detail
                      .allow_overdue_export
                  )
                ),

          require_overdue_note:
            detail
              .require_overdue_note ==
            null
              ? null
              : Boolean(
                  Number(
                    detail
                      .require_overdue_note
                  )
                ),
        })
      );

    return res
      .status(200)
      .json({
        success: true,

        data: {
          ...stockInRows[0],
          details:
            formattedDetails,
        },
      });
  } catch (error) {
    console.error(
      "Lỗi lấy chi tiết phiếu nhập:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Không thể lấy chi tiết phiếu nhập.",
      });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu nhập kho
|--------------------------------------------------------------------------
*/

async function createStockIn(
  req,
  res
) {
  let connection;
  let transactionStarted =
    false;

  try {
    connection =
      await pool.getConnection();

    const {
      warehouse_id,
      gate_id,
      supplier_id,
      import_date,
      note,
      details,
    } = req.body;

    const userId =
      Number(
        req.user?.id
      );

    const warehouseId =
      Number(
        warehouse_id
      );

    const gateId =
      Number(
        gate_id
      );

    const supplierId =
      Number(
        supplier_id
      );

    /*
    |--------------------------------------------------------------------------
    | 1. Kiểm tra dữ liệu chung
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isInteger(
        supplierId
      ) ||
      supplierId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Nhà cung cấp không hợp lệ.",
        });
    }

    if (
      !Number.isInteger(
        warehouseId
      ) ||
      warehouseId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Kho nhập không hợp lệ.",
        });
    }

    if (
      !Number.isInteger(
        gateId
      ) ||
      gateId <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Cổng nhập không hợp lệ.",
        });
    }

    if (
      !Number.isInteger(
        userId
      ) ||
      userId <= 0
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Bạn chưa đăng nhập.",
        });
    }

    if (!import_date) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Ngày nhập là bắt buộc.",
        });
    }

    if (
      !isValidDate(
        import_date
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Ngày nhập không hợp lệ.",
        });
    }

    if (
      !Array.isArray(
        details
      ) ||
      details.length === 0
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Phiếu nhập phải có ít nhất một sản phẩm.",
        });
    }

    const parsedImportDate =
      new Date(
        import_date
      );

    /*
    |--------------------------------------------------------------------------
    | 2. Kiểm tra từng dòng sản phẩm
    |--------------------------------------------------------------------------
    */

    const detailKeys =
      new Set();

    const normalizedDetails =
      [];

    for (
      const item of details
    ) {
      const productId =
        Number(
          item.product_id
        );

      const unitId =
        Number(
          item.unit_id
        );

      const locationId =
        Number(
          item.location_id
        );

      const quantity =
        Number(
          item.quantity
        );

      const batchCode =
        item.batch_code
          ?.trim();

      if (
        !Number.isInteger(
          productId
        ) ||
        productId <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Mã sản phẩm không hợp lệ.",
          });
      }

      if (
        !Number.isInteger(
          unitId
        ) ||
        unitId <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Đơn vị tính không hợp lệ.",
          });
      }

      if (
        !Number.isInteger(
          locationId
        ) ||
        locationId <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vị trí lưu trữ không hợp lệ.",
          });
      }

      if (!batchCode) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Mã lô không được để trống.",
          });
      }

      if (
        batchCode.length >
        50
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Mã lô không được vượt quá 50 ký tự.",
          });
      }

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Số lượng nhập phải là số nguyên lớn hơn 0.",
          });
      }

      let expiryDate =
        null;

      if (
        item.expiry_date
      ) {
        if (
          !isValidDate(
            item.expiry_date
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                `Hạn sử dụng của lô ${batchCode} không hợp lệ.`,
            });
        }

        if (
          new Date(
            item.expiry_date
          ) <
          parsedImportDate
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                `Hạn sử dụng của lô ${batchCode} không được nhỏ hơn ngày nhập.`,
            });
        }

        expiryDate =
          item.expiry_date;
      }

      const detailKey =
        `${productId}:${batchCode.toLowerCase()}`;

      if (
        detailKeys.has(
          detailKey
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              `Sản phẩm ID ${productId} với mã lô ${batchCode} bị nhập trùng trong phiếu.`,
          });
      }

      detailKeys.add(
        detailKey
      );

      normalizedDetails.push({
        productId,
        unitId,
        locationId,
        quantity,
        batchCode,
        expiryDate,
      });
    }

    await connection
      .beginTransaction();

    transactionStarted =
      true;

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
      warehouseRows.length ===
      0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Chốt đơn giá lưu kho
    |--------------------------------------------------------------------------
    */

    const [pricingRows] =
      await connection.query(
        `
          SELECT
            id,
            price_per_container_per_day,
            effective_from

          FROM storage_pricing

          WHERE warehouse_id = ?
            AND effective_from <= ?

          ORDER BY
            effective_from DESC,
            id DESC

          LIMIT 1
        `,
        [
          warehouseId,
          import_date,
        ]
      );

    if (
      pricingRows.length ===
      0
    ) {
      throw createHttpError(
        400,
        "Kho chưa có bảng giá lưu kho có hiệu lực tại ngày nhập."
      );
    }

    const storagePricingId =
      Number(
        pricingRows[0].id
      );

    const storageUnitPrice =
      Number(
        pricingRows[0]
          .price_per_container_per_day
      );

    if (
      !Number.isInteger(
        storagePricingId
      ) ||
      storagePricingId <= 0
    ) {
      throw createHttpError(
        400,
        "Mã bảng giá lưu kho không hợp lệ."
      );
    }

    if (
      !Number.isFinite(
        storageUnitPrice
      ) ||
      storageUnitPrice <= 0
    ) {
      throw createHttpError(
        400,
        "Đơn giá lưu kho phải lớn hơn 0."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Chốt chính sách lưu kho
    |--------------------------------------------------------------------------
    */

    const [policyRows] =
      await connection.query(
        `
          SELECT
            id,
            policy_code,
            policy_name,
            max_storage_days,
            warning_days,
            apply_overdue_fee,
            overdue_multiplier,
            allow_overdue_export,
            require_overdue_note,
            effective_from

          FROM warehouse_storage_policies

          WHERE warehouse_id = ?
            AND effective_from <= ?
            AND status IN (
              'active',
              'inactive'
            )

          ORDER BY
            effective_from DESC,
            id DESC

          LIMIT 1
        `,
        [
          warehouseId,
          import_date,
        ]
      );

    if (
      policyRows.length ===
      0
    ) {
      throw createHttpError(
        400,
        "Kho chưa có chính sách lưu kho có hiệu lực tại ngày nhập."
      );
    }

    const selectedPolicy =
      policyRows[0];

    const storagePolicyId =
      Number(
        selectedPolicy.id
      );

    const maxStorageDays =
      Number(
        selectedPolicy
          .max_storage_days
      );

    const warningDays =
      Number(
        selectedPolicy
          .warning_days
      );

    const applyOverdueFee =
      Number(
        selectedPolicy
          .apply_overdue_fee
      ) === 1;

    const configuredOverdueMultiplier =
      Number(
        selectedPolicy
          .overdue_multiplier
      );

    const overdueMultiplier =
      applyOverdueFee
        ? configuredOverdueMultiplier
        : 1;

    const allowOverdueExportValue =
      Number(
        selectedPolicy
          .allow_overdue_export
      );

    const requireOverdueNoteValue =
      Number(
        selectedPolicy
          .require_overdue_note
      );

    if (
      !Number.isInteger(
        storagePolicyId
      ) ||
      storagePolicyId <= 0
    ) {
      throw createHttpError(
        400,
        "Mã chính sách lưu kho không hợp lệ."
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
        "Thời hạn lưu tối đa phải là số nguyên lớn hơn 0."
      );
    }

    if (
      !Number.isInteger(
        warningDays
      ) ||
      warningDays < 0 ||
      warningDays >=
        maxStorageDays
    ) {
      throw createHttpError(
        400,
        "Số ngày cảnh báo phải từ 0 đến nhỏ hơn thời hạn lưu tối đa."
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
        "Hệ số phí quá hạn phải lớn hơn hoặc bằng 1."
      );
    }

    if (
      ![0, 1].includes(
        allowOverdueExportValue
      )
    ) {
      throw createHttpError(
        400,
        "Quy định cho phép xuất hàng quá hạn không hợp lệ."
      );
    }

    if (
      ![0, 1].includes(
        requireOverdueNoteValue
      )
    ) {
      throw createHttpError(
        400,
        "Quy định bắt buộc ghi chú khi xuất quá hạn không hợp lệ."
      );
    }

    const allowOverdueExport =
      allowOverdueExportValue ===
      1;

    const requireOverdueNote =
      requireOverdueNoteValue ===
      1;

    const storageDueDate =
      addDaysToDateOnly(
        import_date,
        maxStorageDays - 1
      );

    if (!storageDueDate) {
      throw createHttpError(
        400,
        "Không thể tính ngày hết thời hạn lưu kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Kiểm tra cổng nhập
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
      gateRows.length ===
      0
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
      String(
        gate.gate_type
      )
        .trim()
        .toUpperCase();

    if (
      ![
        "IN",
        "BOTH",
      ].includes(
        normalizedGateType
      )
    ) {
      throw createHttpError(
        400,
        "Cổng đã chọn không hỗ trợ nhập kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 7. Kiểm tra nhà cung cấp
    |--------------------------------------------------------------------------
    */

    const [supplierRows] =
      await connection.query(
        `
          SELECT id

          FROM suppliers

          WHERE id = ?

          LIMIT 1
        `,
        [supplierId]
      );

    if (
      supplierRows.length ===
      0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy nhà cung cấp."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 8. Kiểm tra người dùng
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
      userRows.length ===
      0
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
    | 9. Quy đổi số lượng và container
    |--------------------------------------------------------------------------
    */

    const preparedDetails =
      [];

    const locationContainerMap =
      new Map();

    for (
      const item of normalizedDetails
    ) {
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
          [item.productId]
        );

      if (
        productRows.length ===
        0
      ) {
        throw createHttpError(
          404,
          `Không tìm thấy sản phẩm ID ${item.productId}.`
        );
      }

      const product =
        productRows[0];

      if (
        product.status !==
        "active"
      ) {
        throw createHttpError(
          400,
          `Sản phẩm ${product.name} đã ngừng hoạt động.`
        );
      }

      const [packagingRows] =
        await connection.query(
          `
            SELECT
              pp.quantity_per_unit,
              pp.units_per_container,
              pu.name
                AS unit_name

            FROM product_packaging pp

            JOIN product_units pu
              ON pp.unit_id =
                pu.id

            WHERE pp.product_id = ?
              AND pp.unit_id = ?

            LIMIT 1
          `,
          [
            item.productId,
            item.unitId,
          ]
        );

      if (
        packagingRows.length ===
        0
      ) {
        throw createHttpError(
          400,
          `Sản phẩm ${product.name} chưa có quy cách đóng gói cho đơn vị đã chọn.`
        );
      }

      const packaging =
        packagingRows[0];

      const quantityPerUnit =
        Number(
          packaging
            .quantity_per_unit
        );

      const unitsPerContainer =
        Number(
          packaging
            .units_per_container
        );

      if (
        !Number.isInteger(
          quantityPerUnit
        ) ||
        quantityPerUnit <= 0
      ) {
        throw createHttpError(
          400,
          `Tỷ lệ quy đổi của sản phẩm ${product.name} không hợp lệ.`
        );
      }

      if (
        !Number.isInteger(
          unitsPerContainer
        ) ||
        unitsPerContainer <= 0
      ) {
        throw createHttpError(
          400,
          `Quy cách của sản phẩm ${product.name} chưa có sức chứa container hợp lệ.`
        );
      }

      const inventoryQuantity =
        item.quantity *
        quantityPerUnit;

      const baseQuantityPerContainer =
        quantityPerUnit *
        unitsPerContainer;

      const containerQuantity =
        Math.ceil(
          inventoryQuantity /
            baseQuantityPerContainer
        );

      if (
        !Number.isSafeInteger(
          inventoryQuantity
        ) ||
        inventoryQuantity <= 0
      ) {
        throw createHttpError(
          400,
          `Số lượng quy đổi của sản phẩm ${product.name} không hợp lệ hoặc quá lớn.`
        );
      }

      if (
        !Number.isSafeInteger(
          baseQuantityPerContainer
        ) ||
        baseQuantityPerContainer <=
          0
      ) {
        throw createHttpError(
          400,
          `Sức chứa container của sản phẩm ${product.name} không hợp lệ hoặc quá lớn.`
        );
      }

      if (
        !Number.isSafeInteger(
          containerQuantity
        ) ||
        containerQuantity <= 0
      ) {
        throw createHttpError(
          400,
          `Số container của sản phẩm ${product.name} không hợp lệ.`
        );
      }

      preparedDetails.push({
        ...item,

        productName:
          product.name,

        unitName:
          packaging.unit_name,

        quantityPerUnit,

        unitsPerContainer,

        inventoryQuantity,

        baseQuantityPerContainer,

        containerQuantity,
      });

      locationContainerMap.set(
        item.locationId,

        Number(
          locationContainerMap.get(
            item.locationId
          ) || 0
        ) +
          containerQuantity
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Kiểm tra sức chứa vị trí
    |--------------------------------------------------------------------------
    */

    const capacityWarnings =
      [];

    for (
      const [
        locationId,
        incomingContainers,
      ] of locationContainerMap
    ) {
      const [locationRows] =
        await connection.query(
          `
            SELECT
              id,
              warehouse_id,
              location_code,
              location_name,
              max_containers,
              warning_threshold_percent,
              status

            FROM warehouse_locations

            WHERE id = ?

            LIMIT 1

            FOR UPDATE
          `,
          [locationId]
        );

      if (
        locationRows.length ===
        0
      ) {
        throw createHttpError(
          404,
          `Không tìm thấy vị trí lưu trữ ID ${locationId}.`
        );
      }

      const location =
        locationRows[0];

      if (
        Number(
          location.warehouse_id
        ) !== warehouseId
      ) {
        throw createHttpError(
          400,
          `Vị trí ${location.location_code} không thuộc kho đã chọn.`
        );
      }

      if (
        location.status !==
        "active"
      ) {
        throw createHttpError(
          400,
          `Vị trí ${location.location_code} đang bị khóa.`
        );
      }

      const [usedRows] =
        await connection.query(
          `
            SELECT
              COALESCE(
                SUM(
                  container_quantity
                ),
                0
              ) AS used_containers

            FROM inventory_batches

            WHERE location_id = ?
              AND quantity > 0
          `,
          [locationId]
        );

      const usedContainers =
        Number(
          usedRows[0]
            ?.used_containers ||
            0
        );

      const maxContainers =
        Number(
          location
            .max_containers ||
            0
        );

      const afterImportContainers =
        usedContainers +
        Number(
          incomingContainers
        );

      if (
        maxContainers > 0 &&
        afterImportContainers >
          maxContainers
      ) {
        const availableContainers =
          Math.max(
            maxContainers -
              usedContainers,
            0
          );

        throw createHttpError(
          400,
          `Vị trí ${location.location_code} không đủ sức chứa. Còn trống ${availableContainers} container, nhưng phiếu cần thêm ${incomingContainers} container.`
        );
      }

      const warningThresholdPercent =
        Number(
          location
            .warning_threshold_percent ??
            80
        );

      const warningLimit =
        (
          maxContainers *
          warningThresholdPercent
        ) / 100;

      if (
        maxContainers > 0 &&
        afterImportContainers >=
          warningLimit
      ) {
        capacityWarnings.push(
          `Vị trí ${location.location_code} sắp đầy: ${afterImportContainers}/${maxContainers} container.`
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Tạo phiếu nhập
    |--------------------------------------------------------------------------
    */

    const [stockInResult] =
      await connection.query(
        `
          INSERT INTO stock_in (
            supplier_id,
            warehouse_id,
            gate_id,
            user_id,
            import_date,
            note
          )
          VALUES (
            ?, ?, ?, ?, ?, ?
          )
        `,
        [
          supplierId,
          warehouseId,
          gateId,
          userId,
          import_date,
          note?.trim() ||
            null,
        ]
      );

    const stockInId =
      stockInResult.insertId;

    /*
    |--------------------------------------------------------------------------
    | 12. Tạo chi tiết và lô tồn kho
    |--------------------------------------------------------------------------
    */

    const createdDetails =
      [];

    for (
      const item of preparedDetails
    ) {
      const [
        stockInDetailResult,
      ] =
        await connection.query(
          `
            INSERT INTO stock_in_details (
              stock_in_id,
              product_id,
              unit_id,
              location_id,
              batch_code,
              quantity,
              container_quantity,
              expiry_date
            )
            VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?
            )
          `,
          [
            stockInId,
            item.productId,
            item.unitId,
            item.locationId,
            item.batchCode,
            item.quantity,
            item.containerQuantity,
            item.expiryDate,
          ]
        );

      const stockInDetailId =
        stockInDetailResult.insertId;

      const [batchResult] =
        await connection.query(
          `
            INSERT INTO inventory_batches (
              stock_in_detail_id,
              product_id,
              warehouse_id,
              location_id,
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
            )
            VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?
            )
          `,
          [
            stockInDetailId,
            item.productId,
            warehouseId,
            item.locationId,
            item.batchCode,

            item.inventoryQuantity,
            item.containerQuantity,

            item.baseQuantityPerContainer,

            storagePricingId,
            storageUnitPrice,

            storagePolicyId,
            maxStorageDays,
            warningDays,
            overdueMultiplier,
            storageDueDate,

            allowOverdueExport
              ? 1
              : 0,

            requireOverdueNote
              ? 1
              : 0,

            import_date,
            item.expiryDate,
          ]
        );

      createdDetails.push({
        stock_in_detail_id:
          stockInDetailId,

        inventory_batch_id:
          batchResult.insertId,

        product_id:
          item.productId,

        product_name:
          item.productName,

        unit_id:
          item.unitId,

        unit_name:
          item.unitName,

        location_id:
          item.locationId,

        batch_code:
          item.batchCode,

        input_quantity:
          item.quantity,

        quantity_per_unit:
          item.quantityPerUnit,

        inventory_quantity:
          item.inventoryQuantity,

        units_per_container:
          item.unitsPerContainer,

        base_quantity_per_container:
          item.baseQuantityPerContainer,

        container_quantity:
          item.containerQuantity,

        storage_policy_id:
          storagePolicyId,

        policy_code:
          selectedPolicy
            .policy_code,

        policy_name:
          selectedPolicy
            .policy_name,

        max_storage_days:
          maxStorageDays,

        warning_days:
          warningDays,

        overdue_multiplier:
          overdueMultiplier,

        storage_due_date:
          storageDueDate,

        allow_overdue_export:
          allowOverdueExport,

        require_overdue_note:
          requireOverdueNote,

        expiry_date:
          item.expiryDate,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 13. Hoàn tất giao dịch
    |--------------------------------------------------------------------------
    */

    await connection.commit();

    transactionStarted =
      false;

    return res
      .status(201)
      .json({
        success: true,

        message:
          capacityWarnings.length >
          0
            ? `Tạo phiếu nhập kho thành công. ${capacityWarnings.join(
                " "
              )}`
            : "Tạo phiếu nhập kho thành công.",

        data: {
          id:
            stockInId,

          storage_pricing_id:
            storagePricingId,

          storage_unit_price:
            storageUnitPrice,

          storage_policy_id:
            storagePolicyId,

          policy_code:
            selectedPolicy
              .policy_code,

          policy_name:
            selectedPolicy
              .policy_name,

          max_storage_days:
            maxStorageDays,

          warning_days:
            warningDays,

          overdue_multiplier:
            overdueMultiplier,

          storage_due_date:
            storageDueDate,

          allow_overdue_export:
            allowOverdueExport,

          require_overdue_note:
            requireOverdueNote,

          details:
            createdDetails,

          warnings:
            capacityWarnings,
        },
      });
  } catch (error) {
    if (
      connection &&
      transactionStarted
    ) {
      try {
        await connection
          .rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Lỗi rollback phiếu nhập:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi tạo phiếu nhập:",
      error
    );

    return res
      .status(
        error.status ||
          500
      )
      .json({
        success: false,

        message:
          error.message ||
          "Không thể tạo phiếu nhập kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  getAllStockIns,
  getStockInById,
  createStockIn,
};