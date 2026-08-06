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
| Kiểm tra ngày dạng YYYY-MM-DD
|--------------------------------------------------------------------------
*/

function isValidDateOnly(value) {
  if (!value) {
    return false;
  }

  const matchedDate = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!matchedDate) {
    return false;
  }

  const year = Number(matchedDate[1]);
  const month = Number(matchedDate[2]);
  const day = Number(matchedDate[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/*
|--------------------------------------------------------------------------
| Chuẩn hóa giá trị boolean
|--------------------------------------------------------------------------
*/

function normalizeBoolean(value, fieldName) {
  if (
    value === true ||
    value === 1 ||
    value === "1"
  ) {
    return 1;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0"
  ) {
    return 0;
  }

  throw createHttpError(
    400,
    `${fieldName} phải có giá trị true hoặc false.`
  );
}

/*
|--------------------------------------------------------------------------
| Chuẩn hóa dữ liệu chính sách
|--------------------------------------------------------------------------
*/

function normalizePolicyData(body, currentPolicy = null) {
  const policyCode = String(
    body.policy_code ??
      currentPolicy?.policy_code ??
      ""
  ).trim();

  const policyName = String(
    body.policy_name ??
      currentPolicy?.policy_name ??
      ""
  ).trim();

  const warehouseId = Number(
    body.warehouse_id ??
      currentPolicy?.warehouse_id
  );

  const versionNumber = Number(
    body.version_number ??
      currentPolicy?.version_number ??
      1
  );

  const maxStorageDays = Number(
    body.max_storage_days ??
      currentPolicy?.max_storage_days
  );

  const warningDays = Number(
    body.warning_days ??
      currentPolicy?.warning_days ??
      0
  );

  const applyOverdueFee = normalizeBoolean(
    body.apply_overdue_fee ??
      currentPolicy?.apply_overdue_fee ??
      1,
    "Quy định áp dụng phí quá hạn"
  );

  const configuredOverdueMultiplier = Number(
    body.overdue_multiplier ??
      currentPolicy?.overdue_multiplier ??
      1
  );

  const overdueMultiplier =
    applyOverdueFee === 1
      ? configuredOverdueMultiplier
      : 1;

  const allowOverdueExport = normalizeBoolean(
    body.allow_overdue_export ??
      currentPolicy?.allow_overdue_export ??
      1,
    "Quy định cho phép xuất hàng quá hạn"
  );

  const requireOverdueNote = normalizeBoolean(
    body.require_overdue_note ??
      currentPolicy?.require_overdue_note ??
      1,
    "Quy định bắt buộc ghi chú khi xuất quá hạn"
  );

  const isSupplierVisible = normalizeBoolean(
    body.is_supplier_visible ??
      currentPolicy?.is_supplier_visible ??
      1,
    "Quy định hiển thị cho nhà cung cấp"
  );

  const effectiveFrom = String(
    body.effective_from ??
      currentPolicy?.effective_from ??
      ""
  ).slice(0, 10);

  const status = String(
    body.status ??
      currentPolicy?.status ??
      "draft"
  )
    .trim()
    .toLowerCase();

  const policyContent = String(
    body.policy_content ??
      currentPolicy?.policy_content ??
      ""
  ).trim();

  const noteValue =
    body.note !== undefined
      ? body.note
      : currentPolicy?.note;

  const note =
    noteValue === null ||
    noteValue === undefined ||
    String(noteValue).trim() === ""
      ? null
      : String(noteValue).trim();

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra dữ liệu
  |--------------------------------------------------------------------------
  */

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    throw createHttpError(
      400,
      "Kho áp dụng không hợp lệ."
    );
  }

  if (!policyCode) {
    throw createHttpError(
      400,
      "Mã chính sách không được để trống."
    );
  }

  if (policyCode.length > 50) {
    throw createHttpError(
      400,
      "Mã chính sách không được vượt quá 50 ký tự."
    );
  }

  if (!policyName) {
    throw createHttpError(
      400,
      "Tên chính sách không được để trống."
    );
  }

  if (policyName.length > 150) {
    throw createHttpError(
      400,
      "Tên chính sách không được vượt quá 150 ký tự."
    );
  }

  if (
    !Number.isInteger(versionNumber) ||
    versionNumber <= 0
  ) {
    throw createHttpError(
      400,
      "Phiên bản chính sách phải là số nguyên lớn hơn 0."
    );
  }

  if (
    !Number.isInteger(maxStorageDays) ||
    maxStorageDays <= 0
  ) {
    throw createHttpError(
      400,
      "Thời hạn lưu tối đa phải là số nguyên lớn hơn 0."
    );
  }

  if (
    !Number.isInteger(warningDays) ||
    warningDays < 0 ||
    warningDays >= maxStorageDays
  ) {
    throw createHttpError(
      400,
      "Số ngày cảnh báo phải từ 0 đến nhỏ hơn thời hạn lưu tối đa."
    );
  }

  if (
    !Number.isFinite(overdueMultiplier) ||
    overdueMultiplier < 1
  ) {
    throw createHttpError(
      400,
      "Hệ số phí quá hạn phải lớn hơn hoặc bằng 1."
    );
  }

  if (!isValidDateOnly(effectiveFrom)) {
    throw createHttpError(
      400,
      "Ngày bắt đầu áp dụng không hợp lệ."
    );
  }

  if (
    ![
      "draft",
      "active",
      "inactive",
    ].includes(status)
  ) {
    throw createHttpError(
      400,
      "Trạng thái chính sách không hợp lệ."
    );
  }

  if (policyContent.length > 10000) {
    throw createHttpError(
      400,
      "Nội dung chính sách không được vượt quá 10.000 ký tự."
    );
  }

  if (note && note.length > 1000) {
    throw createHttpError(
      400,
      "Ghi chú không được vượt quá 1.000 ký tự."
    );
  }

  return {
    warehouseId,
    policyCode,
    policyName,
    versionNumber,
    maxStorageDays,
    warningDays,
    applyOverdueFee,
    overdueMultiplier,
    allowOverdueExport,
    requireOverdueNote,
    isSupplierVisible,
    effectiveFrom,
    status,
    policyContent: policyContent || null,
    note,
  };
}

/*
|--------------------------------------------------------------------------
| Chuẩn hóa dữ liệu trả về
|--------------------------------------------------------------------------
*/

function formatPolicy(policy) {
  return {
    ...policy,

    id: Number(policy.id),

    warehouse_id: Number(
      policy.warehouse_id
    ),

    version_number: Number(
      policy.version_number || 1
    ),

    max_storage_days: Number(
      policy.max_storage_days || 0
    ),

    warning_days: Number(
      policy.warning_days || 0
    ),

    apply_overdue_fee: Boolean(
      Number(policy.apply_overdue_fee)
    ),

    overdue_multiplier: Number(
      policy.overdue_multiplier || 1
    ),

    allow_overdue_export: Boolean(
      Number(policy.allow_overdue_export)
    ),

    require_overdue_note: Boolean(
      Number(policy.require_overdue_note)
    ),

    is_supplier_visible: Boolean(
      Number(policy.is_supplier_visible)
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Lấy danh sách chính sách
|--------------------------------------------------------------------------
*/

async function getStoragePolicies(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      keyword,
      warehouse_id,
      status,
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

      const searchValue =
        `%${normalizedKeyword}%`;

      conditions.push(`
        (
          wsp.policy_code LIKE ?
          OR wsp.policy_name LIKE ?
          OR w.name LIKE ?
          OR wsp.policy_content LIKE ?
          OR wsp.note LIKE ?
        )
      `);

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (warehouse_id) {
      const warehouseId =
        Number(warehouse_id);

      if (
        !Number.isInteger(warehouseId) ||
        warehouseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Mã kho không hợp lệ.",
        });
      }

      conditions.push(
        "wsp.warehouse_id = ?"
      );

      params.push(warehouseId);
    }

    if (status) {
      const normalizedStatus =
        String(status)
          .trim()
          .toLowerCase();

      if (
        ![
          "draft",
          "active",
          "inactive",
        ].includes(normalizedStatus)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Trạng thái chính sách không hợp lệ.",
        });
      }

      conditions.push(
        "wsp.status = ?"
      );

      params.push(normalizedStatus);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const allowedSortOptions = {
      newest:
        "wsp.id DESC",

      oldest:
        "wsp.id ASC",

      effective_desc:
        "wsp.effective_from DESC, wsp.id DESC",

      effective_asc:
        "wsp.effective_from ASC, wsp.id ASC",

      name_asc:
        "wsp.policy_name ASC, wsp.id ASC",

      name_desc:
        "wsp.policy_name DESC, wsp.id DESC",

      version_desc:
        "wsp.version_number DESC, wsp.id DESC",

      version_asc:
        "wsp.version_number ASC, wsp.id ASC",
    };

    if (!allowedSortOptions[sort_by]) {
      return res.status(400).json({
        success: false,
        message:
          "Kiểu sắp xếp không hợp lệ.",
      });
    }

    const orderClause =
      allowedSortOptions[sort_by];

    const [countRows] =
      await pool.query(
        `
          SELECT
            COUNT(*) AS total_items

          FROM warehouse_storage_policies wsp

          JOIN warehouses w
            ON wsp.warehouse_id = w.id

          ${whereClause}
        `,
        params
      );

    const totalItems = Number(
      countRows[0]?.total_items || 0
    );

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageLimit)
    );

    const safeCurrentPage = Math.min(
      currentPage,
      totalPages
    );

    const offset =
      (safeCurrentPage - 1) *
      pageLimit;

    const [rows] =
      await pool.query(
        `
          SELECT
            wsp.id,
            wsp.warehouse_id,
            w.name AS warehouse_name,

            wsp.policy_code,
            wsp.policy_name,
            wsp.version_number,

            wsp.max_storage_days,
            wsp.warning_days,

            wsp.apply_overdue_fee,
            wsp.overdue_multiplier,

            wsp.allow_overdue_export,
            wsp.require_overdue_note,

            wsp.is_supplier_visible,
            wsp.effective_from,
            wsp.status,

            wsp.policy_content,
            wsp.note,

            wsp.created_at,
            wsp.updated_at,

            (
              SELECT COUNT(*)

              FROM inventory_batches ib

              WHERE ib.storage_policy_id =
                wsp.id
            ) AS total_batches_using_policy

          FROM warehouse_storage_policies wsp

          JOIN warehouses w
            ON wsp.warehouse_id = w.id

          ${whereClause}

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

    const formattedRows = rows.map(
      (row) => ({
        ...formatPolicy(row),

        total_batches_using_policy:
          Number(
            row.total_batches_using_policy ||
              0
          ),
      })
    );

    return res.status(200).json({
      success: true,

      data: {
        policies: formattedRows,

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
      "Lỗi lấy danh sách chính sách lưu kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách chính sách lưu kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết chính sách
|--------------------------------------------------------------------------
*/

async function getStoragePolicyById(
  req,
  res
) {
  try {
    const policyId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chính sách không hợp lệ.",
      });
    }

    const [rows] =
      await pool.query(
        `
          SELECT
            wsp.id,
            wsp.warehouse_id,
            w.name AS warehouse_name,

            wsp.policy_code,
            wsp.policy_name,
            wsp.version_number,

            wsp.max_storage_days,
            wsp.warning_days,

            wsp.apply_overdue_fee,
            wsp.overdue_multiplier,

            wsp.allow_overdue_export,
            wsp.require_overdue_note,

            wsp.is_supplier_visible,
            wsp.effective_from,
            wsp.status,

            wsp.policy_content,
            wsp.note,

            wsp.created_at,
            wsp.updated_at,

            (
              SELECT COUNT(*)

              FROM inventory_batches ib

              WHERE ib.storage_policy_id =
                wsp.id
            ) AS total_batches_using_policy

          FROM warehouse_storage_policies wsp

          JOIN warehouses w
            ON wsp.warehouse_id = w.id

          WHERE wsp.id = ?

          LIMIT 1
        `,
        [policyId]
      );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy chính sách lưu kho.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        ...formatPolicy(rows[0]),

        total_batches_using_policy:
          Number(
            rows[0]
              .total_batches_using_policy ||
              0
          ),
      },
    });
  } catch (error) {
    console.error(
      "Lỗi lấy chi tiết chính sách lưu kho:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy chi tiết chính sách lưu kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo chính sách
|--------------------------------------------------------------------------
*/

async function createStoragePolicy(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    connection =
      await pool.getConnection();

    const policy =
      normalizePolicyData(req.body);

    await connection.beginTransaction();
    transactionStarted = true;

    /*
    |--------------------------------------------------------------------------
    | Kiểm tra kho
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
        [policy.warehouseId]
      );

    if (
      warehouseRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy kho áp dụng."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Kiểm tra trùng mã và phiên bản
    |--------------------------------------------------------------------------
    */

    const [duplicateRows] =
      await connection.query(
        `
          SELECT id

          FROM warehouse_storage_policies

          WHERE warehouse_id = ?
            AND policy_code = ?
            AND version_number = ?

          LIMIT 1
        `,
        [
          policy.warehouseId,
          policy.policyCode,
          policy.versionNumber,
        ]
      );

    if (
      duplicateRows.length > 0
    ) {
      throw createHttpError(
        409,
        "Mã chính sách và phiên bản này đã tồn tại trong kho."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Khi kích hoạt chính sách mới:
    | đưa chính sách đang active của kho về inactive.
    |
    | Các chính sách cũ vẫn được giữ để lô nhập trước đó tiếp tục tham chiếu.
    |--------------------------------------------------------------------------
    */

    if (
      policy.status === "active"
    ) {
      await connection.query(
        `
          UPDATE warehouse_storage_policies

          SET status = 'inactive'

          WHERE warehouse_id = ?
            AND status = 'active'
        `,
        [policy.warehouseId]
      );
    }

    const [result] =
      await connection.query(
        `
          INSERT INTO warehouse_storage_policies (
            warehouse_id,
            policy_code,
            policy_name,
            version_number,

            max_storage_days,
            warning_days,

            apply_overdue_fee,
            overdue_multiplier,

            allow_overdue_export,
            require_overdue_note,

            is_supplier_visible,
            effective_from,
            status,

            policy_content,
            note
          )
          VALUES (
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?
          )
        `,
        [
          policy.warehouseId,
          policy.policyCode,
          policy.policyName,
          policy.versionNumber,

          policy.maxStorageDays,
          policy.warningDays,

          policy.applyOverdueFee,
          policy.overdueMultiplier,

          policy.allowOverdueExport,
          policy.requireOverdueNote,

          policy.isSupplierVisible,
          policy.effectiveFrom,
          policy.status,

          policy.policyContent,
          policy.note,
        ]
      );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message:
        "Tạo chính sách lưu kho thành công.",

      data: {
        id: result.insertId,

        warehouse_id:
          policy.warehouseId,

        policy_code:
          policy.policyCode,

        policy_name:
          policy.policyName,

        version_number:
          policy.versionNumber,

        max_storage_days:
          policy.maxStorageDays,

        warning_days:
          policy.warningDays,

        apply_overdue_fee:
          policy.applyOverdueFee === 1,

        overdue_multiplier:
          policy.overdueMultiplier,

        allow_overdue_export:
          policy.allowOverdueExport === 1,

        require_overdue_note:
          policy.requireOverdueNote === 1,

        is_supplier_visible:
          policy.isSupplierVisible === 1,

        effective_from:
          policy.effectiveFrom,

        status:
          policy.status,

        policy_content:
          policy.policyContent,

        note:
          policy.note,
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
          "Lỗi rollback chính sách lưu kho:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi tạo chính sách lưu kho:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Không thể tạo chính sách lưu kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Cập nhật chính sách
|--------------------------------------------------------------------------
*/

async function updateStoragePolicy(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    const policyId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chính sách không hợp lệ.",
      });
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [currentRows] =
      await connection.query(
        `
          SELECT *

          FROM warehouse_storage_policies

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [policyId]
      );

    if (
      currentRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy chính sách lưu kho."
      );
    }

    const currentPolicy =
      currentRows[0];

    /*
    |--------------------------------------------------------------------------
    | Chính sách đã được lô hàng sử dụng không được thay đổi điều khoản.
    | Chỉ được đổi trạng thái hoặc ghi chú.
    |--------------------------------------------------------------------------
    */

    const [usageRows] =
      await connection.query(
        `
          SELECT
            COUNT(*) AS total_batches

          FROM inventory_batches

          WHERE storage_policy_id = ?
        `,
        [policyId]
      );

    const totalBatchesUsingPolicy =
      Number(
        usageRows[0]?.total_batches ||
          0
      );

    const protectedFields = [
      "warehouse_id",
      "policy_code",
      "version_number",
      "max_storage_days",
      "warning_days",
      "apply_overdue_fee",
      "overdue_multiplier",
      "allow_overdue_export",
      "require_overdue_note",
      "effective_from",
    ];

    if (
      totalBatchesUsingPolicy > 0
    ) {
      const changedProtectedField =
        protectedFields.find(
          (fieldName) =>
            req.body[fieldName] !==
              undefined &&
            String(
              req.body[fieldName]
            ) !==
              String(
                currentPolicy[fieldName]
              )
        );

      if (changedProtectedField) {
        throw createHttpError(
          409,
          "Chính sách đã được lô hàng sử dụng. Hãy tạo phiên bản chính sách mới thay vì sửa điều khoản cũ."
        );
      }
    }

    const policy =
      normalizePolicyData(
        req.body,
        currentPolicy
      );

    const [warehouseRows] =
      await connection.query(
        `
          SELECT id

          FROM warehouses

          WHERE id = ?

          LIMIT 1
        `,
        [policy.warehouseId]
      );

    if (
      warehouseRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy kho áp dụng."
      );
    }

    const [duplicateRows] =
      await connection.query(
        `
          SELECT id

          FROM warehouse_storage_policies

          WHERE warehouse_id = ?
            AND policy_code = ?
            AND version_number = ?
            AND id <> ?

          LIMIT 1
        `,
        [
          policy.warehouseId,
          policy.policyCode,
          policy.versionNumber,
          policyId,
        ]
      );

    if (
      duplicateRows.length > 0
    ) {
      throw createHttpError(
        409,
        "Mã chính sách và phiên bản này đã tồn tại trong kho."
      );
    }

    if (
      policy.status === "active"
    ) {
      await connection.query(
        `
          UPDATE warehouse_storage_policies

          SET status = 'inactive'

          WHERE warehouse_id = ?
            AND status = 'active'
            AND id <> ?
        `,
        [
          policy.warehouseId,
          policyId,
        ]
      );
    }

    await connection.query(
      `
        UPDATE warehouse_storage_policies

        SET
          warehouse_id = ?,
          policy_code = ?,
          policy_name = ?,
          version_number = ?,

          max_storage_days = ?,
          warning_days = ?,

          apply_overdue_fee = ?,
          overdue_multiplier = ?,

          allow_overdue_export = ?,
          require_overdue_note = ?,

          is_supplier_visible = ?,
          effective_from = ?,
          status = ?,

          policy_content = ?,
          note = ?

        WHERE id = ?
      `,
      [
        policy.warehouseId,
        policy.policyCode,
        policy.policyName,
        policy.versionNumber,

        policy.maxStorageDays,
        policy.warningDays,

        policy.applyOverdueFee,
        policy.overdueMultiplier,

        policy.allowOverdueExport,
        policy.requireOverdueNote,

        policy.isSupplierVisible,
        policy.effectiveFrom,
        policy.status,

        policy.policyContent,
        policy.note,

        policyId,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật chính sách lưu kho thành công.",

      data: {
        id: policyId,

        warehouse_id:
          policy.warehouseId,

        policy_code:
          policy.policyCode,

        policy_name:
          policy.policyName,

        version_number:
          policy.versionNumber,

        max_storage_days:
          policy.maxStorageDays,

        warning_days:
          policy.warningDays,

        apply_overdue_fee:
          policy.applyOverdueFee === 1,

        overdue_multiplier:
          policy.overdueMultiplier,

        allow_overdue_export:
          policy.allowOverdueExport === 1,

        require_overdue_note:
          policy.requireOverdueNote === 1,

        is_supplier_visible:
          policy.isSupplierVisible === 1,

        effective_from:
          policy.effectiveFrom,

        status:
          policy.status,

        policy_content:
          policy.policyContent,

        note:
          policy.note,

        total_batches_using_policy:
          totalBatchesUsingPolicy,
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
          "Lỗi rollback cập nhật chính sách:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi cập nhật chính sách lưu kho:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Không thể cập nhật chính sách lưu kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Kích hoạt chính sách
|--------------------------------------------------------------------------
*/

async function activateStoragePolicy(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    const policyId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chính sách không hợp lệ.",
      });
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [policyRows] =
      await connection.query(
        `
          SELECT
            id,
            warehouse_id,
            status

          FROM warehouse_storage_policies

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [policyId]
      );

    if (
      policyRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy chính sách lưu kho."
      );
    }

    const policy =
      policyRows[0];

    await connection.query(
      `
        UPDATE warehouse_storage_policies

        SET status = 'inactive'

        WHERE warehouse_id = ?
          AND status = 'active'
          AND id <> ?
      `,
      [
        policy.warehouse_id,
        policyId,
      ]
    );

    await connection.query(
      `
        UPDATE warehouse_storage_policies

        SET status = 'active'

        WHERE id = ?
      `,
      [policyId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        "Kích hoạt chính sách lưu kho thành công.",

      data: {
        id: policyId,
        status: "active",
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
          "Lỗi rollback kích hoạt chính sách:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi kích hoạt chính sách:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Không thể kích hoạt chính sách lưu kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Ngừng áp dụng chính sách
|--------------------------------------------------------------------------
*/

async function deactivateStoragePolicy(
  req,
  res
) {
  try {
    const policyId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chính sách không hợp lệ.",
      });
    }

    const [result] =
      await pool.query(
        `
          UPDATE warehouse_storage_policies

          SET status = 'inactive'

          WHERE id = ?
        `,
        [policyId]
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy chính sách lưu kho.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Đã ngừng áp dụng chính sách lưu kho.",

      data: {
        id: policyId,
        status: "inactive",
      },
    });
  } catch (error) {
    console.error(
      "Lỗi ngừng áp dụng chính sách:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể ngừng áp dụng chính sách lưu kho.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Xóa chính sách nháp
|--------------------------------------------------------------------------
*/

async function deleteStoragePolicy(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    const policyId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chính sách không hợp lệ.",
      });
    }

    connection =
      await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [policyRows] =
      await connection.query(
        `
          SELECT
            id,
            policy_name,
            status

          FROM warehouse_storage_policies

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [policyId]
      );

    if (
      policyRows.length === 0
    ) {
      throw createHttpError(
        404,
        "Không tìm thấy chính sách lưu kho."
      );
    }

    const policy =
      policyRows[0];

    if (
      policy.status !== "draft"
    ) {
      throw createHttpError(
        409,
        "Chỉ được xóa chính sách đang ở trạng thái nháp."
      );
    }

    const [usageRows] =
      await connection.query(
        `
          SELECT
            COUNT(*) AS total_batches

          FROM inventory_batches

          WHERE storage_policy_id = ?
        `,
        [policyId]
      );

    if (
      Number(
        usageRows[0]?.total_batches ||
          0
      ) > 0
    ) {
      throw createHttpError(
        409,
        "Không thể xóa chính sách đã được lô hàng sử dụng."
      );
    }

    await connection.query(
      `
        DELETE FROM warehouse_storage_policies

        WHERE id = ?
      `,
      [policyId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        `Đã xóa chính sách "${policy.policy_name}".`,
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
          "Lỗi rollback xóa chính sách:",
          rollbackError
        );
      }
    }

    console.error(
      "Lỗi xóa chính sách lưu kho:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Không thể xóa chính sách lưu kho.",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  getStoragePolicies,
  getStoragePolicyById,
  createStoragePolicy,
  updateStoragePolicy,
  activateStoragePolicy,
  deactivateStoragePolicy,
  deleteStoragePolicy,
};