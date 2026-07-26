import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import {
  getStockMovementReport,
  getInventoryByWarehouse,
} from "../api/reportApi";

function ReportPage() {
  const [stockMovement, setStockMovement] = useState({
    stock_in: [],
    stock_out: [],
  });

  const [warehouseReport, setWarehouseReport] = useState([]);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải báo cáo ban đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadReports();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu báo cáo
  |--------------------------------------------------------------------------
  */

  async function loadReports(params = {}) {
    try {
      setLoading(true);
      setError("");

      const [movementData, warehouseData] = await Promise.all([
        getStockMovementReport(params),
        getInventoryByWarehouse(),
      ]);

      setStockMovement({
        stock_in: Array.isArray(movementData?.stock_in)
          ? movementData.stock_in
          : [],

        stock_out: Array.isArray(movementData?.stock_out)
          ? movementData.stock_out
          : [],
      });

      setWarehouseReport(
        Array.isArray(warehouseData) ? warehouseData : []
      );
    } catch (err) {
      console.error("Lỗi tải báo cáo:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu báo cáo."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xuất Excel
  |--------------------------------------------------------------------------
  */

  function handleExportExcel() {
    try {
      const totalImportDocuments = calculateTotalDocuments(
        stockMovement.stock_in
      );

      const totalExportDocuments = calculateTotalDocuments(
        stockMovement.stock_out
      );

      const totalImportQuantity = calculateTotalQuantity(
        stockMovement.stock_in
      );

      const totalExportQuantity = calculateTotalQuantity(
        stockMovement.stock_out
      );

      const totalImportContainers = calculateTotalContainers(
        stockMovement.stock_in
      );

      const totalExportContainers = calculateTotalContainers(
        stockMovement.stock_out
      );

      const totalStorageFee = calculateTotalStorageFee(
        stockMovement.stock_out
      );

      const overviewData = [
        {
          "Từ ngày": filters.from_date
            ? formatExcelDate(filters.from_date)
            : "Tất cả",
          "Đến ngày": filters.to_date
            ? formatExcelDate(filters.to_date)
            : "Tất cả",
          "Số phiếu nhập": totalImportDocuments,
          "Tổng số lượng nhập": totalImportQuantity,
          "Tổng container nhập": totalImportContainers,
          "Số phiếu xuất": totalExportDocuments,
          "Tổng số lượng xuất": totalExportQuantity,
          "Tổng container xuất": totalExportContainers,
          "Tổng phí lưu kho": totalStorageFee,
        },
      ];

      const movementMap = new Map();

      stockMovement.stock_in.forEach((item) => {
        const dateKey = String(item.report_date).slice(0, 10);

        movementMap.set(dateKey, {
          "Ngày": formatExcelDate(dateKey),
          "Số phiếu nhập": Number(item.total_documents || 0),
          "Số lượng nhập": Number(item.total_quantity || 0),
          "Container nhập": Number(item.total_containers || 0),
          "Số phiếu xuất": 0,
          "Số lượng xuất": 0,
          "Container xuất": 0,
          "Phí lưu kho": 0,
        });
      });

      stockMovement.stock_out.forEach((item) => {
        const dateKey = String(item.report_date).slice(0, 10);

        const existingRow = movementMap.get(dateKey) || {
          "Ngày": formatExcelDate(dateKey),
          "Số phiếu nhập": 0,
          "Số lượng nhập": 0,
          "Container nhập": 0,
          "Số phiếu xuất": 0,
          "Số lượng xuất": 0,
          "Container xuất": 0,
          "Phí lưu kho": 0,
        };

        existingRow["Số phiếu xuất"] = Number(item.total_documents || 0);
        existingRow["Số lượng xuất"] = Number(item.total_quantity || 0);
        existingRow["Container xuất"] = Number(item.total_containers || 0);
        existingRow["Phí lưu kho"] = Number(
          item.total_storage_fee || item.total_amount || 0
        );

        movementMap.set(dateKey, existingRow);
      });

      const movementData = Array.from(movementMap.entries())
        .sort(
          ([firstDate], [secondDate]) =>
            new Date(firstDate) - new Date(secondDate)
        )
        .map(([, row]) => row);

      const warehouseData = warehouseReport.map((warehouse) => ({
        "Mã kho": warehouse.warehouse_id,
        "Tên kho": warehouse.warehouse_name,
        "Số lô còn tồn": Number(warehouse.total_batches || 0),
        "Số sản phẩm còn tồn": Number(warehouse.total_products || 0),
        "Tổng số lượng tồn": Number(warehouse.total_quantity || 0),
        "Tổng container tồn": Number(warehouse.total_containers || 0),
      }));

      const workbook = XLSX.utils.book_new();

      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      const movementSheet = XLSX.utils.json_to_sheet(movementData);
      const warehouseSheet = XLSX.utils.json_to_sheet(warehouseData);

      overviewSheet["!cols"] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
      ];

      movementSheet["!cols"] = [
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
      ];

      warehouseSheet["!cols"] = [
        { wch: 12 },
        { wch: 30 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        overviewSheet,
        "Tong quan"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        movementSheet,
        "Nhap xuat theo ngay"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        warehouseSheet,
        "Ton kho theo kho"
      );

      const currentDate = new Date().toISOString().slice(0, 10);

      let fileName = `bao-cao-kho-${currentDate}.xlsx`;

      if (filters.from_date || filters.to_date) {
        const fromDate = filters.from_date || "bat-dau";
        const toDate = filters.to_date || "hien-tai";

        fileName = `bao-cao-kho-${fromDate}-den-${toDate}.xlsx`;
      }

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err);

      setError("Không thể xuất báo cáo Excel.");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleFilter(event) {
    event.preventDefault();

    if (
      filters.from_date &&
      filters.to_date &&
      filters.from_date > filters.to_date
    ) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    const params = {};

    if (filters.from_date) {
      params.from_date = filters.from_date;
    }

    if (filters.to_date) {
      params.to_date = filters.to_date;
    }

    await loadReports(params);
  }

  async function handleReset() {
    setFilters({
      from_date: "",
      to_date: "",
    });

    await loadReports();
  }

  /*
  |--------------------------------------------------------------------------
  | Format dữ liệu
  |--------------------------------------------------------------------------
  */

  function formatExcelDate(value) {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleDateString("vi-VN");
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function formatDate(value) {
    if (!value) {
      return "Không có";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không hợp lệ";
    }

    return date.toLocaleDateString("vi-VN");
  }

  /*
  |--------------------------------------------------------------------------
  | Tính tổng
  |--------------------------------------------------------------------------
  */

  function calculateTotalDocuments(rows) {
    return rows.reduce(
      (total, item) => total + Number(item.total_documents || 0),
      0
    );
  }

  function calculateTotalQuantity(rows) {
    return rows.reduce(
      (total, item) => total + Number(item.total_quantity || 0),
      0
    );
  }

  function calculateTotalContainers(rows) {
    return rows.reduce(
      (total, item) => total + Number(item.total_containers || 0),
      0
    );
  }

  function calculateTotalStorageFee(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(item.total_storage_fee || item.total_amount || 0),
      0
    );
  }

  const totalImportDocuments = calculateTotalDocuments(
    stockMovement.stock_in
  );

  const totalExportDocuments = calculateTotalDocuments(
    stockMovement.stock_out
  );

  const totalImportQuantity = calculateTotalQuantity(
    stockMovement.stock_in
  );

  const totalExportQuantity = calculateTotalQuantity(
    stockMovement.stock_out
  );

  const totalImportContainers = calculateTotalContainers(
    stockMovement.stock_in
  );

  const totalExportContainers = calculateTotalContainers(
    stockMovement.stock_out
  );

  const totalStorageFee = calculateTotalStorageFee(
    stockMovement.stock_out
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-1">
            Báo cáo kho
          </h1>

          <p className="text-muted mb-0">
            Theo dõi nhập kho, xuất kho, container, tồn kho và phí lưu kho.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={handleExportExcel}
          disabled={loading}
        >
          <i className="bi bi-file-earmark-excel me-2" />
          Xuất Excel
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleFilter}>
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label">
                  Từ ngày
                </label>

                <input
                  type="date"
                  name="from_date"
                  className="form-control"
                  value={filters.from_date}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  Đến ngày
                </label>

                <input
                  type="date"
                  name="to_date"
                  className="form-control"
                  value={filters.to_date}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Đang tải..." : "Xem báo cáo"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Đặt lại
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Thẻ tổng quan */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Số phiếu nhập
              </div>

              <div className="fs-4 fw-bold">
                {formatNumber(totalImportDocuments)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng số lượng nhập
              </div>

              <div className="fs-4 fw-bold text-primary">
                {formatNumber(totalImportQuantity)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng container nhập
              </div>

              <div className="fs-4 fw-bold text-primary">
                {formatNumber(totalImportContainers)} container
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Số phiếu xuất
              </div>

              <div className="fs-4 fw-bold">
                {formatNumber(totalExportDocuments)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng số lượng xuất
              </div>

              <div className="fs-4 fw-bold text-success">
                {formatNumber(totalExportQuantity)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng container xuất
              </div>

              <div className="fs-4 fw-bold text-success">
                {formatNumber(totalExportContainers)} container
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng phí lưu kho
              </div>

              <div className="fw-bold text-primary">
                {formatCurrency(totalStorageFee)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Đang tải dữ liệu báo cáo...</p>
      ) : (
        <>
          {/* Báo cáo nhập xuất theo ngày */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    Báo cáo nhập kho
                  </h5>

                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Số phiếu</th>
                          <th>Số lượng nhập</th>
                          <th>Container nhập</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stockMovement.stock_in.length === 0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              className="text-center text-muted"
                            >
                              Không có dữ liệu nhập kho.
                            </td>
                          </tr>
                        ) : (
                          stockMovement.stock_in.map((item, index) => (
                            <tr key={index}>
                              <td>
                                {formatDate(item.report_date)}
                              </td>

                              <td>
                                {formatNumber(item.total_documents)}
                              </td>

                              <td>
                                {formatNumber(item.total_quantity)}
                              </td>

                              <td>
                                <strong>
                                  {formatNumber(item.total_containers)} container
                                </strong>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    Báo cáo xuất kho
                  </h5>

                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Số phiếu</th>
                          <th>Số lượng xuất</th>
                          <th>Container xuất</th>
                          <th>Phí lưu kho</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stockMovement.stock_out.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="text-center text-muted"
                            >
                              Không có dữ liệu xuất kho.
                            </td>
                          </tr>
                        ) : (
                          stockMovement.stock_out.map((item, index) => (
                            <tr key={index}>
                              <td>
                                {formatDate(item.report_date)}
                              </td>

                              <td>
                                {formatNumber(item.total_documents)}
                              </td>

                              <td>
                                {formatNumber(item.total_quantity)}
                              </td>

                              <td>
                                <strong>
                                  {formatNumber(item.total_containers)} container
                                </strong>
                              </td>

                              <td>
                                <strong className="text-primary">
                                  {formatCurrency(
                                    item.total_storage_fee ||
                                      item.total_amount
                                  )}
                                </strong>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tồn kho theo kho */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                Tồn kho theo kho
              </h5>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Kho</th>
                      <th>Số lô còn tồn</th>
                      <th>Số sản phẩm còn tồn</th>
                      <th>Tổng số lượng</th>
                      <th>Tổng container</th>
                    </tr>
                  </thead>

                  <tbody>
                    {warehouseReport.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center text-muted"
                        >
                          Không có dữ liệu tồn kho.
                        </td>
                      </tr>
                    ) : (
                      warehouseReport.map((warehouse) => (
                        <tr key={warehouse.warehouse_id}>
                          <td>
                            <strong>
                              {warehouse.warehouse_name}
                            </strong>
                          </td>

                          <td>
                            {formatNumber(warehouse.total_batches)}
                          </td>

                          <td>
                            {formatNumber(warehouse.total_products)}
                          </td>

                          <td>
                            {formatNumber(warehouse.total_quantity)}
                          </td>

                          <td>
                            <strong>
                              {formatNumber(warehouse.total_containers)} container
                            </strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="alert alert-info mb-0 mt-3">
                <strong>Ghi chú:</strong>{" "}
                Báo cáo hiện theo nghiệp vụ kho bãi: nhập kho ghi nhận số lượng và container; xuất kho tính phí lưu kho theo container, số ngày lưu và đơn giá.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportPage;