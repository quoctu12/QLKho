const pool = require("../config/database");

async function getAllWarehouses(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        address,
        description
      FROM warehouses
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách kho.",
    });
  }
}

async function createWarehouse(req, res) {
  try {
    const { name, address, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên kho là bắt buộc.",
      });
    }

    const [duplicateRows] = await pool.query(
      "SELECT id FROM warehouses WHERE name = ?",
      [name.trim()]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên kho đã tồn tại.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO warehouses (
          name,
          address,
          description
        )
        VALUES (?, ?, ?)
      `,
      [
        name.trim(),
        address?.trim() || null,
        description?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm kho thành công.",
      data: {
        id: result.insertId,
        name: name.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm kho.",
    });
  }
}

async function updateWarehouse(req, res) {
  try {
    const { id } = req.params;
    const { name, address, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên kho là bắt buộc.",
      });
    }

    const [existingRows] = await pool.query(
      "SELECT id FROM warehouses WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho.",
      });
    }

    const [duplicateRows] = await pool.query(
      `
        SELECT id
        FROM warehouses
        WHERE name = ? AND id <> ?
      `,
      [name.trim(), id]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên kho đã tồn tại.",
      });
    }

    await pool.query(
      `
        UPDATE warehouses
        SET name = ?,
            address = ?,
            description = ?
        WHERE id = ?
      `,
      [
        name.trim(),
        address?.trim() || null,
        description?.trim() || null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật kho thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật kho.",
    });
  }
}

async function deleteWarehouse(req, res) {
  try {
    const { id } = req.params;

    const [existingRows] = await pool.query(
      "SELECT id FROM warehouses WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kho.",
      });
    }

    const [gateRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_gates
        WHERE warehouse_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (gateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Không thể xóa vì kho đang có cổng kho.",
      });
    }

    const [inventoryRows] = await pool.query(
      `
        SELECT id
        FROM inventory_batches
        WHERE warehouse_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (inventoryRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Không thể xóa vì kho đang có tồn kho.",
      });
    }

    const [stockInRows] = await pool.query(
      `
        SELECT id
        FROM stock_in
        WHERE warehouse_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (stockInRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Không thể xóa vì kho đã có phiếu nhập.",
      });
    }

    const [stockOutRows] = await pool.query(
      `
        SELECT id
        FROM stock_out
        WHERE warehouse_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (stockOutRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Không thể xóa vì kho đã có phiếu xuất.",
      });
    }

    await pool.query(
      "DELETE FROM warehouses WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa kho thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa kho.",
    });
  }
}

module.exports = {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};