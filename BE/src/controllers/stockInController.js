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
| Lấy danh sách phiếu nhập có tìm kiếm, lọc và phân trang
|--------------------------------------------------------------------------
*/

async function getAllStockIns(req, res) {
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

    const currentPage = Number(page);
    const pageLimit = Number(limit);

    if (!Number.isInteger(currentPage) || currentPage <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ.",
      });
    }

    if (!Number.isInteger(pageLimit) || pageLimit <= 0 || pageLimit > 100) {
      return res.status(400).json({
        success: false,
        message: "Số dòng mỗi trang phải nằm trong khoảng từ 1 đến 100.",
      });
    }

    const conditions = [];
    const params = [];

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();

      if (normalizedKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      const extractedId = normalizedKeyword.replace(/^PN-/i, "").replace(/^0+/, "");

      conditions.push(`
        (
          CAST(si.id AS CHAR) LIKE ?
          OR s.name LIKE ?
          OR w.name LIKE ?
          OR wg.name LIKE ?
          OR u.full_name LIKE ?
          ${/^\d+$/.test(extractedId) ? "OR si.id = ?" : ""}
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(searchValue, searchValue, searchValue, searchValue, searchValue);

      if (/^\d+$/.test(extractedId)) {
        params.push(Number(extractedId));
      }
    }

    if (warehouse_id) {
      const warehouseId = Number(warehouse_id);

      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã kho không hợp lệ.",
        });
      }

      conditions.push("si.warehouse_id = ?");
      params.push(warehouseId);
    }

    if (supplier_id) {
      const supplierId = Number(supplier_id);

      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã nhà cung cấp không hợp lệ.",
        });
      }

      conditions.push("si.supplier_id = ?");
      params.push(supplierId);
    }

    if (date_from) {
      const parsedDateFrom = new Date(date_from);

      if (Number.isNaN(parsedDateFrom.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu không hợp lệ.",
        });
      }

      conditions.push("si.import_date >= ?");
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

      conditions.push("si.import_date <= ?");
      params.push(date_to);
    }

    if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortOptions = {
      newest: "si.id DESC",
      oldest: "si.id ASC",
      date_desc: "si.import_date DESC, si.id DESC",
      date_asc: "si.import_date ASC, si.id ASC",
      quantity_desc: "total_quantity DESC, si.id DESC",
      quantity_asc: "total_quantity ASC, si.id ASC",
      container_desc: "total_containers DESC, si.id DESC",
      container_asc: "total_containers ASC, si.id ASC",
      amount_desc: "total_containers DESC, si.id DESC",
      amount_asc: "total_containers ASC, si.id ASC",
    };

    const orderClause = allowedSortOptions[sort_by] || allowedSortOptions.newest;

    const [countRows] = await pool.query(
      `
        SELECT COUNT(DISTINCT si.id) AS total_items

        FROM stock_in si

        JOIN suppliers s ON si.supplier_id = s.id
        JOIN warehouses w ON si.warehouse_id = w.id
        JOIN warehouse_gates wg ON si.gate_id = wg.id
        JOIN users u ON si.user_id = u.id

        ${whereClause}
      `,
      params
    );

    const totalItems = Number(countRows[0]?.total_items || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const offset = (safeCurrentPage - 1) * pageLimit;

    const [rows] = await pool.query(
      `
        SELECT
          si.id,
          si.supplier_id,
          s.name AS supplier_name,
          si.warehouse_id,
          w.name AS warehouse_name,
          si.gate_id,
          wg.name AS gate_name,
          si.user_id,
          u.full_name AS created_by,
          si.import_date,
          si.note,
          si.created_at,

          COUNT(sid.id) AS total_items,

          COALESCE(SUM(sid.quantity), 0) AS total_quantity,

          COALESCE(SUM(sid.container_quantity), 0) AS total_containers,

          0 AS total_amount

        FROM stock_in si

        JOIN suppliers s ON si.supplier_id = s.id
        JOIN warehouses w ON si.warehouse_id = w.id
        JOIN warehouse_gates wg ON si.gate_id = wg.id
        JOIN users u ON si.user_id = u.id

        LEFT JOIN stock_in_details sid ON si.id = sid.stock_in_id

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

        ORDER BY ${orderClause}

        LIMIT ?
        OFFSET ?
      `,
      [...params, pageLimit, offset]
    );

    const formattedRows = rows.map((row) => ({
      ...row,
      total_items: Number(row.total_items || 0),
      total_quantity: Number(row.total_quantity || 0),
      total_containers: Number(row.total_containers || 0),
      total_amount: Number(row.total_amount || 0),
    }));

    return res.status(200).json({
      success: true,
      data: {
        stock_ins: formattedRows,
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
    console.error("Lỗi lấy danh sách phiếu nhập:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách phiếu nhập.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết phiếu nhập
|--------------------------------------------------------------------------
*/

async function getStockInById(req, res) {
  try {
    const stockInId = Number(req.params.id);

    if (
      !Number.isInteger(stockInId) ||
      stockInId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã phiếu nhập không hợp lệ.",
      });
    }

    const [stockInRows] = await pool.query(
      `
        SELECT
          si.id,
          si.supplier_id,
          s.name AS supplier_name,
          si.warehouse_id,
          w.name AS warehouse_name,
          si.gate_id,
          wg.name AS gate_name,
          si.user_id,
          u.full_name AS created_by,
          si.import_date,
          si.note,
          si.created_at

        FROM stock_in si

        JOIN suppliers s
          ON si.supplier_id = s.id

        JOIN warehouses w
          ON si.warehouse_id = w.id

        JOIN warehouse_gates wg
          ON si.gate_id = wg.id

        JOIN users u
          ON si.user_id = u.id

        WHERE si.id = ?

        LIMIT 1
      `,
      [stockInId]
    );

    if (stockInRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu nhập.",
      });
    }

    const [detailRows] = await pool.query(
      `
        SELECT
          sid.id,
          sid.product_id,
          p.name AS product_name,
          p.sku,
          sid.unit_id,
          pu.name AS unit_name,
          sid.location_id,
          wl.location_code,
          wl.location_name,
          sid.batch_code,
          sid.quantity,
          sid.container_quantity,
          sid.expiry_date,
          sid.import_price,
          sid.total_import_amount

        FROM stock_in_details sid

        JOIN products p
          ON sid.product_id = p.id

        JOIN product_units pu
          ON sid.unit_id = pu.id

        LEFT JOIN warehouse_locations wl
          ON sid.location_id = wl.id

        WHERE sid.stock_in_id = ?

        ORDER BY sid.id ASC
      `,
      [stockInId]
    );

    const formattedDetails = detailRows.map((detail) => ({
      ...detail,
      quantity: Number(detail.quantity || 0),
      container_quantity: Number(detail.container_quantity || 0),
      import_price: Number(detail.import_price || 0),
      total_import_amount: Number(detail.total_import_amount || 0),
    }));

    return res.status(200).json({
      success: true,
      data: {
        ...stockInRows[0],
        details: formattedDetails,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết phiếu nhập:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết phiếu nhập.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo phiếu nhập kho
|--------------------------------------------------------------------------
|
| Theo nghiệp vụ mới:
| - Nhập kho không tính tiền.
| - Chỉ lưu số lượng hàng, số container, vị trí lưu trữ và ngày nhập.
| - Giá nhập, thành tiền nhập và giá vốn được lưu 0 để tương thích DB cũ.
| - Khi nhập, hệ thống kiểm tra vị trí kho còn đủ sức chứa container.
|
*/

async function createStockIn(req, res) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    const {
      warehouse_id,
      gate_id,
      supplier_id,
      import_date,
      note,
      details,
    } = req.body;

    const userId = Number(req.user?.id);
    const warehouseId = Number(warehouse_id);
    const gateId = Number(gate_id);
    const supplierId = Number(supplier_id);

    if (
      !Number.isInteger(supplierId) ||
      supplierId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Nhà cung cấp không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kho nhập không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(gateId) ||
      gateId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cổng nhập không hợp lệ.",
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

    if (!import_date) {
      return res.status(400).json({
        success: false,
        message: "Ngày nhập là bắt buộc.",
      });
    }

    const parsedImportDate = new Date(import_date);

    if (Number.isNaN(parsedImportDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày nhập không hợp lệ.",
      });
    }

    if (
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phiếu nhập phải có ít nhất một sản phẩm.",
      });
    }

    /*
     * Kiểm tra dữ liệu từng dòng nhập.
     */
    const detailKeys = new Set();
    const locationContainerMap = new Map();

    for (const item of details) {
      const productId = Number(item.product_id);
      const unitId = Number(item.unit_id);
      const locationId = Number(item.location_id);
      const quantity = Number(item.quantity);
      const containerQuantity = Number(item.container_quantity);
      const batchCode = item.batch_code?.trim();

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
        !Number.isInteger(unitId) ||
        unitId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Đơn vị tính không hợp lệ.",
        });
      }

      if (
        !Number.isInteger(locationId) ||
        locationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Vị trí lưu trữ không hợp lệ.",
        });
      }

      if (!batchCode) {
        return res.status(400).json({
          success: false,
          message: "Mã lô không được để trống.",
        });
      }

      if (batchCode.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Mã lô không được vượt quá 100 ký tự.",
        });
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Số lượng nhập phải lớn hơn 0.",
        });
      }

      if (
        !Number.isInteger(containerQuantity) ||
        containerQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Số container nhập phải là số nguyên lớn hơn 0.",
        });
      }

      if (item.expiry_date) {
        const parsedExpiryDate = new Date(item.expiry_date);

        if (Number.isNaN(parsedExpiryDate.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              `Hạn sử dụng của lô ${batchCode} không hợp lệ.`,
          });
        }

        if (parsedExpiryDate < parsedImportDate) {
          return res.status(400).json({
            success: false,
            message:
              `Hạn sử dụng của lô ${batchCode} không được nhỏ hơn ngày nhập.`,
          });
        }
      }

      /*
       * Không cho nhập trùng sản phẩm + mã lô trong cùng phiếu.
       */
      const detailKey = `${productId}:${batchCode.toLowerCase()}`;

      if (detailKeys.has(detailKey)) {
        return res.status(400).json({
          success: false,
          message:
            `Sản phẩm ID ${productId} với mã lô ${batchCode} bị nhập trùng trong phiếu.`,
        });
      }

      detailKeys.add(detailKey);

      /*
       * Cộng tổng container nhập theo từng vị trí.
       * Dùng để kiểm tra sức chứa vị trí kho.
       */
      locationContainerMap.set(
        locationId,
        Number(locationContainerMap.get(locationId) || 0) +
          containerQuantity
      );
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
     * Kiểm tra cổng nhập.
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

    if (!["IN", "BOTH"].includes(normalizedGateType)) {
      throw createHttpError(
        400,
        "Cổng đã chọn không hỗ trợ nhập kho."
      );
    }

    /*
     * Kiểm tra nhà cung cấp.
     */
    const [supplierRows] = await connection.query(
      `
        SELECT id
        FROM suppliers
        WHERE id = ?
        LIMIT 1
      `,
      [supplierId]
    );

    if (supplierRows.length === 0) {
      throw createHttpError(404, "Không tìm thấy nhà cung cấp.");
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
     * Kiểm tra sức chứa của từng vị trí được chọn.
     */
    const capacityWarnings = [];

    for (const [
      locationId,
      newContainers,
    ] of locationContainerMap.entries()) {
      const [locationRows] = await connection.query(
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

      if (locationRows.length === 0) {
        throw createHttpError(
          404,
          `Không tìm thấy vị trí lưu trữ ID ${locationId}.`
        );
      }

      const location = locationRows[0];

      if (Number(location.warehouse_id) !== warehouseId) {
        throw createHttpError(
          400,
          `Vị trí ${location.location_code} không thuộc kho đã chọn.`
        );
      }

      if (location.status !== "active") {
        throw createHttpError(
          400,
          `Vị trí ${location.location_code} đang bị khóa.`
        );
      }

      const [usedRows] = await connection.query(
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

      const maxContainers = Number(
        location.max_containers || 0
      );

      const afterImportContainers =
        usedContainers + Number(newContainers);

      if (
        maxContainers > 0 &&
        afterImportContainers > maxContainers
      ) {
        const availableContainers = Math.max(
          maxContainers - usedContainers,
          0
        );

        throw createHttpError(
          400,
          `Vị trí ${location.location_code} không đủ sức chứa. Còn trống ${availableContainers} container.`
        );
      }

      const warningThresholdPercent = Number(
        location.warning_threshold_percent || 80
      );

      const warningLimit =
        maxContainers * warningThresholdPercent / 100;

      if (
        maxContainers > 0 &&
        afterImportContainers >= warningLimit
      ) {
        capacityWarnings.push(
          `Vị trí ${location.location_code} sắp đầy sau khi nhập.`
        );
      }
    }

    /*
     * Tạo phiếu nhập.
     */
    const [stockInResult] = await connection.query(
      `
        INSERT INTO stock_in (
          supplier_id,
          warehouse_id,
          gate_id,
          user_id,
          import_date,
          note
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        supplierId,
        warehouseId,
        gateId,
        userId,
        import_date,
        note?.trim() || null,
      ]
    );

    const stockInId = stockInResult.insertId;

    /*
     * Tạo chi tiết phiếu nhập và cập nhật tồn kho.
     */
    for (const item of details) {
      const productId = Number(item.product_id);
      const unitId = Number(item.unit_id);
      const locationId = Number(item.location_id);
      const batchCode = item.batch_code.trim();
      const quantity = Number(item.quantity);
      const containerQuantity = Number(item.container_quantity);

      /*
       * Nhập kho không tính tiền.
       */
      const importPrice = 0;
      const totalImportAmount = 0;
      const costPrice = 0;

      /*
       * Kiểm tra sản phẩm.
       */
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

      /*
       * Kiểm tra đơn vị tính.
       */
      const [unitRows] = await connection.query(
        `
          SELECT id
          FROM product_units
          WHERE id = ?
          LIMIT 1
        `,
        [unitId]
      );

      if (unitRows.length === 0) {
        throw createHttpError(
          404,
          `Không tìm thấy đơn vị tính ID ${unitId}.`
        );
      }

      /*
       * Lấy tỷ lệ quy đổi đóng gói.
       */
      const [packagingRows] = await connection.query(
        `
          SELECT quantity_per_unit

          FROM product_packaging

          WHERE product_id = ?
            AND unit_id = ?

          LIMIT 1
        `,
        [productId, unitId]
      );

      const conversionRate =
        packagingRows.length > 0
          ? Number(packagingRows[0].quantity_per_unit)
          : 1;

      if (
        !Number.isFinite(conversionRate) ||
        conversionRate <= 0
      ) {
        throw createHttpError(
          400,
          `Tỷ lệ quy đổi của sản phẩm ID ${productId} không hợp lệ.`
        );
      }

      /*
       * Quy đổi số lượng nhập sang đơn vị cơ sở.
       */
      const inventoryQuantity = quantity * conversionRate;

      if (
        !Number.isFinite(inventoryQuantity) ||
        inventoryQuantity <= 0
      ) {
        throw createHttpError(
          400,
          `Số lượng tồn quy đổi của sản phẩm ID ${productId} không hợp lệ.`
        );
      }

      /*
       * Lưu chi tiết phiếu nhập.
       */
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
            expiry_date,
            import_price,
            total_import_amount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          stockInId,
          productId,
          unitId,
          locationId,
          batchCode,
          quantity,
          containerQuantity,
          item.expiry_date || null,
          importPrice,
          totalImportAmount,
        ]
      );

      /*
       * Kiểm tra lô đã tồn tại chưa.
       */
      const [batchRows] = await connection.query(
        `
          SELECT
            id,
            quantity,
            container_quantity,
            expiry_date,
            location_id

          FROM inventory_batches

          WHERE product_id = ?
            AND warehouse_id = ?
            AND batch_code = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          productId,
          warehouseId,
          batchCode,
        ]
      );

      if (batchRows.length > 0) {
        const existingBatch = batchRows[0];

        if (
          Number(existingBatch.location_id) !==
          locationId
        ) {
          throw createHttpError(
            400,
            `Lô ${batchCode} đã tồn tại ở vị trí khác.`
          );
        }

        if (
          existingBatch.expiry_date &&
          item.expiry_date
        ) {
          const oldExpiryDate = new Date(
            existingBatch.expiry_date
          )
            .toISOString()
            .slice(0, 10);

          const newExpiryDate = new Date(item.expiry_date)
            .toISOString()
            .slice(0, 10);

          if (oldExpiryDate !== newExpiryDate) {
            throw createHttpError(
              400,
              `Lô ${batchCode} đã tồn tại với hạn sử dụng khác.`
            );
          }
        }

        const newQuantity =
          Number(existingBatch.quantity || 0) +
          inventoryQuantity;

        const newContainerQuantity =
          Number(existingBatch.container_quantity || 0) +
          containerQuantity;

        await connection.query(
          `
            UPDATE inventory_batches

            SET
              quantity = ?,
              container_quantity = ?,
              cost_price = ?,
              expiry_date = COALESCE(expiry_date, ?)

            WHERE id = ?
          `,
          [
            newQuantity,
            newContainerQuantity,
            costPrice,
            item.expiry_date || null,
            existingBatch.id,
          ]
        );
      } else {
        await connection.query(
          `
            INSERT INTO inventory_batches (
              product_id,
              warehouse_id,
              location_id,
              batch_code,
              quantity,
              container_quantity,
              import_date,
              expiry_date,
              cost_price
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            productId,
            warehouseId,
            locationId,
            batchCode,
            inventoryQuantity,
            containerQuantity,
            import_date,
            item.expiry_date || null,
            costPrice,
          ]
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message:
        capacityWarnings.length > 0
          ? `Tạo phiếu nhập kho thành công. ${capacityWarnings.join(" ")}`
          : "Tạo phiếu nhập kho thành công.",
      data: {
        id: stockInId,
        warnings: capacityWarnings,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }

    console.error("Lỗi tạo phiếu nhập:", error);

    return res
      .status(error.status || 500)
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

/*
|--------------------------------------------------------------------------
| Cập nhật giá nhập của chi tiết phiếu
|--------------------------------------------------------------------------
*/

async function updateStockInDetailPrice(
  req,
  res
) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();

    const stockInId = Number(
      req.params.stockInId
    );

    const detailId = Number(
      req.params.detailId
    );

    const newImportPrice = Number(
      req.body.import_price
    );

    if (
      !Number.isInteger(stockInId) ||
      stockInId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã phiếu nhập không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(detailId) ||
      detailId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã chi tiết phiếu nhập không hợp lệ.",
      });
    }

    if (
      req.body.import_price ===
        undefined ||
      !Number.isFinite(
        newImportPrice
      ) ||
      newImportPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Giá nhập không hợp lệ.",
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    /*
     * Khóa chi tiết phiếu nhập cần cập nhật.
     */
    const [detailRows] =
      await connection.query(
        `
          SELECT
            sid.id,
            sid.stock_in_id,
            sid.product_id,
            sid.unit_id,
            sid.batch_code,
            sid.quantity,
            sid.import_price,
            sid.total_import_amount,
            si.warehouse_id

          FROM stock_in_details sid

          JOIN stock_in si
            ON sid.stock_in_id =
               si.id

          WHERE sid.id = ?
            AND sid.stock_in_id = ?

          FOR UPDATE
        `,
        [
          detailId,
          stockInId,
        ]
      );

    if (detailRows.length === 0) {
      throw createHttpError(
        404,
        "Không tìm thấy chi tiết phiếu nhập."
      );
    }

    const detail = detailRows[0];

    const quantity = Number(
      detail.quantity
    );

    const totalImportAmount =
      quantity *
      newImportPrice;

    /*
     * Cập nhật giá và thành tiền của chi tiết phiếu nhập.
     */
    await connection.query(
      `
        UPDATE stock_in_details

        SET
          import_price = ?,
          total_import_amount = ?

        WHERE id = ?
      `,
      [
        newImportPrice,
        totalImportAmount,
        detailId,
      ]
    );

    /*
     * Tính lại giá vốn trung bình của toàn bộ các lần nhập
     * có cùng sản phẩm, kho và mã lô.
     *
     * Không đặt trực tiếp giá vốn bằng giá của một chi tiết,
     * vì một lô có thể được nhập nhiều lần với giá khác nhau.
     */
    const [costRows] =
      await connection.query(
        `
          SELECT
            COALESCE(
              SUM(
                sid.total_import_amount
              ),
              0
            ) AS total_cost,

            COALESCE(
              SUM(
                sid.quantity *
                COALESCE(
                  pp.quantity_per_unit,
                  1
                )
              ),
              0
            ) AS total_base_quantity

          FROM stock_in_details sid

          JOIN stock_in si
            ON sid.stock_in_id =
               si.id

          LEFT JOIN product_packaging pp
            ON pp.product_id =
               sid.product_id
            AND pp.unit_id =
               sid.unit_id

          WHERE sid.product_id = ?
            AND si.warehouse_id = ?
            AND sid.batch_code = ?
        `,
        [
          detail.product_id,
          detail.warehouse_id,
          detail.batch_code,
        ]
      );

    const totalCost = Number(
      costRows[0]?.total_cost || 0
    );

    const totalBaseQuantity = Number(
      costRows[0]
        ?.total_base_quantity || 0
    );

    if (
      !Number.isFinite(
        totalBaseQuantity
      ) ||
      totalBaseQuantity <= 0
    ) {
      throw createHttpError(
        400,
        "Không thể tính lại số lượng quy đổi của lô hàng."
      );
    }

    const costPrice =
      totalCost /
      totalBaseQuantity;

    /*
     * Khóa lô tồn kho trước khi cập nhật giá vốn.
     */
    const [batchRows] =
      await connection.query(
        `
          SELECT id

          FROM inventory_batches

          WHERE product_id = ?
            AND warehouse_id = ?
            AND batch_code = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          detail.product_id,
          detail.warehouse_id,
          detail.batch_code,
        ]
      );

    if (batchRows.length === 0) {
      throw createHttpError(
        404,
        "Không tìm thấy lô tồn kho tương ứng."
      );
    }

    await connection.query(
      `
        UPDATE inventory_batches

        SET cost_price = ?

        WHERE id = ?
      `,
      [
        costPrice,
        batchRows[0].id,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật giá nhập thành công.",
      data: {
        detail_id: detailId,
        import_price:
          newImportPrice,
        total_import_amount:
          totalImportAmount,
        cost_price:
          costPrice,
      },
    });
  } catch (error) {
    if (
      connection &&
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "Lỗi cập nhật giá nhập:",
      error
    );

    return res
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Không thể cập nhật giá nhập.",
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
  updateStockInDetailPrice,
};