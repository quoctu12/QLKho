const pool = require("../config/database");

async function getAllGates(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        wg.id,
        wg.warehouse_id,
        w.name AS warehouse_name,
        wg.name,
        wg.gate_type,
        wg.description
      FROM warehouse_gates wg
      JOIN warehouses w ON wg.warehouse_id = w.id
      ORDER BY wg.id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách cổng kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách cổng kho.",
    });
  }
}

async function createGate(req, res) {
  try {
    const {
      warehouse_id,
      name,
      gate_type,
      description,
    } = req.body;

    if (!warehouse_id || !name?.trim() || !gate_type) {
      return res.status(400).json({
        success: false,
        message: "Kho, tên cổng và loại cổng là bắt buộc.",
      });
    }

    const validTypes = ["IN", "OUT", "BOTH"];

    if (!validTypes.includes(gate_type)) {
      return res.status(400).json({
        success: false,
        message: "Loại cổng không hợp lệ.",
      });
    }

    const [warehouseRows] = await pool.query(
      "SELECT id FROM warehouses WHERE id = ?",
      [warehouse_id]
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
        FROM warehouse_gates
        WHERE warehouse_id = ? AND name = ?
      `,
      [warehouse_id, name.trim()]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên cổng đã tồn tại trong kho này.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO warehouse_gates (
          warehouse_id,
          name,
          gate_type,
          description
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        warehouse_id,
        name.trim(),
        gate_type,
        description?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm cổng kho thành công.",
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm cổng kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm cổng kho.",
    });
  }
}

async function updateGate(req, res) {
  try {
    const { id } = req.params;

    const {
      warehouse_id,
      name,
      gate_type,
      description,
    } = req.body;

    if (!warehouse_id || !name?.trim() || !gate_type) {
      return res.status(400).json({
        success: false,
        message: "Kho, tên cổng và loại cổng là bắt buộc.",
      });
    }

    const validTypes = ["IN", "OUT", "BOTH"];

    if (!validTypes.includes(gate_type)) {
      return res.status(400).json({
        success: false,
        message: "Loại cổng không hợp lệ.",
      });
    }

    const [existingRows] = await pool.query(
      "SELECT id FROM warehouse_gates WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cổng kho.",
      });
    }

    const [duplicateRows] = await pool.query(
      `
        SELECT id
        FROM warehouse_gates
        WHERE warehouse_id = ?
          AND name = ?
          AND id <> ?
      `,
      [warehouse_id, name.trim(), id]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên cổng đã tồn tại trong kho này.",
      });
    }

    await pool.query(
      `
        UPDATE warehouse_gates
        SET warehouse_id = ?,
            name = ?,
            gate_type = ?,
            description = ?
        WHERE id = ?
      `,
      [
        warehouse_id,
        name.trim(),
        gate_type,
        description?.trim() || null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật cổng kho thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật cổng kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật cổng kho.",
    });
  }
}

async function deleteGate(req, res) {
  try {
    const { id } = req.params;

    const [existingRows] = await pool.query(
      "SELECT id FROM warehouse_gates WHERE id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cổng kho.",
      });
    }

    const [stockInRows] = await pool.query(
      `
        SELECT id
        FROM stock_in
        WHERE gate_id = ?
        LIMIT 1
      `,
      [id]
    );

    const [stockOutRows] = await pool.query(
      `
        SELECT id
        FROM stock_out
        WHERE gate_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (stockInRows.length > 0 || stockOutRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa vì cổng kho đã được sử dụng trong phiếu nhập hoặc phiếu xuất.",
      });
    }

    await pool.query(
      "DELETE FROM warehouse_gates WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa cổng kho thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa cổng kho:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa cổng kho.",
    });
  }
}

module.exports = {
  getAllGates,
  createGate,
  updateGate,
  deleteGate,
};