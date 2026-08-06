import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import {
  getStockMovementReport,
  getInventoryByWarehouse,
  getInventoryAlertReport,
  getReportFilterOptions,
} from "../api/reportApi";

/*
|--------------------------------------------------------------------------
| Chuẩn hóa ngày để không bị lệch múi giờ
|--------------------------------------------------------------------------
*/

function toDateTimestamp(value) {
  if (!value) {
    return null;
  }

  const matchedDate = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (matchedDate) {
    return Date.UTC(
      Number(matchedDate[1]),
      Number(matchedDate[2]) - 1,
      Number(matchedDate[3])
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function ReportPage() {
  const [stockMovement, setStockMovement] = useState({
    stock_in: [],
    stock_out: [],
  });

  const [warehouseReport, setWarehouseReport] =
    useState([]);

  const [inventoryAlerts, setInventoryAlerts] =
    useState({
      expiry_alerts: [],
      storage_alerts: [],

      summary: {
        expired_batches: 0,
        expiring_batches: 0,
        overdue_storage_batches: 0,
        storage_warning_batches: 0,
        no_storage_policy_batches: 0,
      },
    });

  const [filterOptions, setFilterOptions] =
    useState({
      warehouses: [],
      products: [],
    });

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    warehouse_id: "",
    product_id: "",
  });

  const [appliedFilters, setAppliedFilters] =
    useState({
      from_date: "",
      to_date: "",
      warehouse_id: "",
      product_id: "",
    });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] =
    useState(false);

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải báo cáo ban đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const optionsData =
        await getReportFilterOptions();

      setFilterOptions({
        warehouses: Array.isArray(
          optionsData?.warehouses
        )
          ? optionsData.warehouses
          : [],

        products: Array.isArray(
          optionsData?.products
        )
          ? optionsData.products
          : [],
      });

      await loadReports({});
    } catch (err) {
      console.error(
        "Lỗi tải báo cáo:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu báo cáo."
      );

      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu báo cáo
  |--------------------------------------------------------------------------
  */

  async function loadReports(params = {}) {
    try {
      setLoading(true);
      setError("");

      const [
        movementData,
        warehouseData,
        alertData,
      ] = await Promise.all([
        getStockMovementReport(params),

        getInventoryByWarehouse({
          warehouse_id:
            params.warehouse_id,
          product_id:
            params.product_id,
        }),

        getInventoryAlertReport({
          warehouse_id:
            params.warehouse_id,
          product_id:
            params.product_id,
        }),
      ]);

      setStockMovement({
        stock_in: Array.isArray(
          movementData?.stock_in
        )
          ? movementData.stock_in
          : [],

        stock_out: Array.isArray(
          movementData?.stock_out
        )
          ? movementData.stock_out
          : [],
      });

      setWarehouseReport(
        Array.isArray(warehouseData)
          ? warehouseData
          : []
      );

      setInventoryAlerts({
        expiry_alerts: Array.isArray(
          alertData?.expiry_alerts
        )
          ? alertData.expiry_alerts
          : [],

        storage_alerts: Array.isArray(
          alertData?.storage_alerts
        )
          ? alertData.storage_alerts
          : [],

        summary: {
          expired_batches: Number(
            alertData?.summary
              ?.expired_batches || 0
          ),

          expiring_batches: Number(
            alertData?.summary
              ?.expiring_batches || 0
          ),

          overdue_storage_batches:
            Number(
              alertData?.summary
                ?.overdue_storage_batches || 0
            ),

          storage_warning_batches:
            Number(
              alertData?.summary
                ?.storage_warning_batches || 0
            ),

          no_storage_policy_batches:
            Number(
              alertData?.summary
                ?.no_storage_policy_batches || 0
            ),
        },
      });
    } catch (err) {
      console.error(
        "Lỗi tải báo cáo:",
        err
      );

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
  | Xử lý bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

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
      filters.from_date >
        filters.to_date
    ) {
      setError(
        "Ngày bắt đầu không được lớn hơn ngày kết thúc."
      );

      return;
    }

    const params = {};

    if (filters.from_date) {
      params.from_date =
        filters.from_date;
    }

    if (filters.to_date) {
      params.to_date =
        filters.to_date;
    }

    if (filters.warehouse_id) {
      params.warehouse_id =
        filters.warehouse_id;
    }

    if (filters.product_id) {
      params.product_id =
        filters.product_id;
    }

    setAppliedFilters({
      ...filters,
    });

    await loadReports(params);
  }

  async function handleReset() {
    const emptyFilters = {
      from_date: "",
      to_date: "",
      warehouse_id: "",
      product_id: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);

    await loadReports({});
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng
  |--------------------------------------------------------------------------
  */

  function formatCurrency(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  }

  function formatNumber(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN");
  }

  function formatDate(value) {
    const timestamp =
      toDateTimestamp(value);

    if (timestamp === null) {
      return "Không có";
    }

    return new Date(
      timestamp
    ).toLocaleDateString("vi-VN", {
      timeZone: "UTC",
    });
  }

  function formatExcelDate(value) {
    const timestamp =
      toDateTimestamp(value);

    if (timestamp === null) {
      return "";
    }

    return new Date(
      timestamp
    ).toLocaleDateString("vi-VN", {
      timeZone: "UTC",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Tính tổng
  |--------------------------------------------------------------------------
  */

  function calculateTotalDocuments(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_documents || 0
        ),
      0
    );
  }

  function calculateTotalQuantity(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_quantity || 0
        ),
      0
    );
  }

  function calculateTotalContainers(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_containers || 0
        ),
      0
    );
  }

  function calculateRegularStorageFee(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_regular_storage_fee ||
            0
        ),
      0
    );
  }

  function calculateOverdueStorageFee(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_overdue_storage_fee ||
            0
        ),
      0
    );
  }

  function calculateTotalStorageFee(rows) {
    return rows.reduce(
      (total, item) =>
        total +
        Number(
          item.total_storage_fee ??
            item.total_amount ??
            0
        ),
      0
    );
  }

  const totalImportDocuments =
    calculateTotalDocuments(
      stockMovement.stock_in
    );

  const totalExportDocuments =
    calculateTotalDocuments(
      stockMovement.stock_out
    );

  const totalImportQuantity =
    calculateTotalQuantity(
      stockMovement.stock_in
    );

  const totalExportQuantity =
    calculateTotalQuantity(
      stockMovement.stock_out
    );

  const totalImportContainers =
    calculateTotalContainers(
      stockMovement.stock_in
    );

  const totalExportContainers =
    calculateTotalContainers(
      stockMovement.stock_out
    );

  const totalRegularStorageFee =
    calculateRegularStorageFee(
      stockMovement.stock_out
    );

  const totalOverdueStorageFee =
    calculateOverdueStorageFee(
      stockMovement.stock_out
    );

  const totalStorageFee =
    calculateTotalStorageFee(
      stockMovement.stock_out
    );

  /*
  |--------------------------------------------------------------------------
  | Tên bộ lọc
  |--------------------------------------------------------------------------
  */

  const selectedWarehouse =
    filterOptions.warehouses.find(
      (item) =>
        String(item.id) ===
        String(
          appliedFilters.warehouse_id
        )
    );

  const selectedProduct =
    filterOptions.products.find(
      (item) =>
        String(item.id) ===
        String(
          appliedFilters.product_id
        )
    );

  /*
  |--------------------------------------------------------------------------
  | Xuất Excel
  |--------------------------------------------------------------------------
  */

  function handleExportExcel() {
    try {
      setExporting(true);
      setError("");

      const overviewData = [
        {
          "Từ ngày":
            appliedFilters.from_date
              ? formatExcelDate(
                  appliedFilters.from_date
                )
              : "Tất cả",

          "Đến ngày":
            appliedFilters.to_date
              ? formatExcelDate(
                  appliedFilters.to_date
                )
              : "Tất cả",

          "Kho":
            selectedWarehouse?.name ||
            "Tất cả",

          "Sản phẩm":
            selectedProduct
              ? `${selectedProduct.sku} - ${selectedProduct.name}`
              : "Tất cả",

          "Số phiếu nhập":
            totalImportDocuments,

          "Tổng số lượng nhập":
            totalImportQuantity,

          "Tổng container nhập":
            totalImportContainers,

          "Số phiếu xuất":
            totalExportDocuments,

          "Tổng số lượng xuất":
            totalExportQuantity,

          "Tổng container xuất":
            totalExportContainers,

          "Phí trong hạn":
            totalRegularStorageFee,

          "Phí quá hạn":
            totalOverdueStorageFee,

          "Tổng phí lưu kho":
            totalStorageFee,

          "Lô hết hạn sử dụng":
            inventoryAlerts.summary
              .expired_batches,

          "Lô sắp hết hạn sử dụng":
            inventoryAlerts.summary
              .expiring_batches,

          "Lô quá hạn lưu kho":
            inventoryAlerts.summary
              .overdue_storage_batches,

          "Lô sắp quá hạn lưu kho":
            inventoryAlerts.summary
              .storage_warning_batches,

          "Lô chưa có chính sách":
            inventoryAlerts.summary
              .no_storage_policy_batches,
        },
      ];

      const movementMap = new Map();

      stockMovement.stock_in.forEach(
        (item) => {
          const dateKey = String(
            item.report_date || ""
          ).slice(0, 10);

          movementMap.set(dateKey, {
            Ngày:
              formatExcelDate(dateKey),

            "Số phiếu nhập":
              Number(
                item.total_documents || 0
              ),

            "Số lượng nhập":
              Number(
                item.total_quantity || 0
              ),

            "Container nhập":
              Number(
                item.total_containers || 0
              ),

            "Số phiếu xuất": 0,
            "Số lượng xuất": 0,
            "Container xuất": 0,
            "Phí trong hạn": 0,
            "Phí quá hạn": 0,
            "Tổng phí lưu kho": 0,
          });
        }
      );

      stockMovement.stock_out.forEach(
        (item) => {
          const dateKey = String(
            item.report_date || ""
          ).slice(0, 10);

          const existingRow =
            movementMap.get(dateKey) || {
              Ngày:
                formatExcelDate(dateKey),

              "Số phiếu nhập": 0,
              "Số lượng nhập": 0,
              "Container nhập": 0,
              "Số phiếu xuất": 0,
              "Số lượng xuất": 0,
              "Container xuất": 0,
              "Phí trong hạn": 0,
              "Phí quá hạn": 0,
              "Tổng phí lưu kho": 0,
            };

          existingRow["Số phiếu xuất"] =
            Number(
              item.total_documents || 0
            );

          existingRow["Số lượng xuất"] =
            Number(
              item.total_quantity || 0
            );

          existingRow["Container xuất"] =
            Number(
              item.total_containers || 0
            );

          existingRow["Phí trong hạn"] =
            Number(
              item.total_regular_storage_fee ||
                0
            );

          existingRow["Phí quá hạn"] =
            Number(
              item.total_overdue_storage_fee ||
                0
            );

          existingRow["Tổng phí lưu kho"] =
            Number(
              item.total_storage_fee ??
                item.total_amount ??
                0
            );

          movementMap.set(
            dateKey,
            existingRow
          );
        }
      );

      const movementData =
        Array.from(
          movementMap.entries()
        )
          .sort(
            (
              [firstDate],
              [secondDate]
            ) =>
              String(
                firstDate
              ).localeCompare(
                String(secondDate)
              )
          )
          .map(([, row]) => row);

      const warehouseData =
        warehouseReport.map(
          (warehouse) => ({
            "Mã kho":
              warehouse.warehouse_id,

            "Tên kho":
              warehouse.warehouse_name,

            "Số lô còn tồn":
              Number(
                warehouse.total_batches ||
                  0
              ),

            "Số sản phẩm còn tồn":
              Number(
                warehouse.total_products ||
                  0
              ),

            "Tổng số lượng tồn":
              Number(
                warehouse.total_quantity ||
                  0
              ),

            "Tổng container tồn":
              Number(
                warehouse.total_containers ||
                  0
              ),

            "Lô hết hạn dùng":
              Number(
                warehouse.expired_batches ||
                  0
              ),

            "Lô sắp hết hạn dùng":
              Number(
                warehouse.expiring_batches ||
                  0
              ),

            "Lô quá hạn lưu":
              Number(
                warehouse
                  .overdue_storage_batches ||
                  0
              ),

            "Lô sắp quá hạn lưu":
              Number(
                warehouse
                  .storage_warning_batches ||
                  0
              ),

            "Lô chưa có chính sách":
              Number(
                warehouse
                  .no_storage_policy_batches ||
                  0
              ),
          })
        );

      const storageAlertData =
        inventoryAlerts.storage_alerts.map(
          (batch) => ({
            "Mã lô":
              batch.batch_code,

            SKU: batch.sku,

            "Sản phẩm":
              batch.product_name,

            Kho:
              batch.warehouse_name,

            "Số lượng":
              Number(
                batch.quantity || 0
              ),

            Container:
              Number(
                batch.container_quantity ||
                  0
              ),

            "Ngày nhập":
              formatExcelDate(
                batch.import_date
              ),

            "Ngày cuối trong hạn":
              formatExcelDate(
                batch.storage_due_date
              ),

            "Trạng thái":
              getStorageStatusText(
                batch.storage_status
              ),

            "Số ngày quá hạn":
              Number(
                batch.overdue_storage_days ||
                  0
              ),

            "Hệ số quá hạn":
              Number(
                batch.overdue_multiplier ||
                  1
              ),

            "Cho phép xuất quá hạn":
              batch.allow_overdue_export
                ? "Có"
                : "Không",

            "Bắt buộc ghi chú":
              batch.require_overdue_note
                ? "Có"
                : "Không",
          })
        );

      const expiryAlertData =
        inventoryAlerts.expiry_alerts.map(
          (batch) => ({
            "Mã lô":
              batch.batch_code,

            SKU: batch.sku,

            "Sản phẩm":
              batch.product_name,

            Kho:
              batch.warehouse_name,

            "Số lượng":
              Number(
                batch.quantity || 0
              ),

            Container:
              Number(
                batch.container_quantity ||
                  0
              ),

            "Hạn sử dụng":
              formatExcelDate(
                batch.expiry_date
              ),

            "Số ngày còn lại":
              Number(
                batch.days_until_expiry ||
                  0
              ),

            "Trạng thái":
              batch.days_until_expiry < 0
                ? "Đã hết hạn"
                : "Sắp hết hạn",
          })
        );

      const workbook =
        XLSX.utils.book_new();

      const overviewSheet =
        XLSX.utils.json_to_sheet(
          overviewData
        );

      const movementSheet =
        XLSX.utils.json_to_sheet(
          movementData
        );

      const warehouseSheet =
        XLSX.utils.json_to_sheet(
          warehouseData
        );

      const storageAlertSheet =
        XLSX.utils.json_to_sheet(
          storageAlertData
        );

      const expiryAlertSheet =
        XLSX.utils.json_to_sheet(
          expiryAlertData
        );

      overviewSheet["!cols"] =
        Array(18).fill({
          wch: 22,
        });

      movementSheet["!cols"] =
        Array(10).fill({
          wch: 20,
        });

      warehouseSheet["!cols"] =
        Array(11).fill({
          wch: 22,
        });

      storageAlertSheet["!cols"] =
        Array(13).fill({
          wch: 23,
        });

      expiryAlertSheet["!cols"] =
        Array(9).fill({
          wch: 22,
        });

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

      XLSX.utils.book_append_sheet(
        workbook,
        storageAlertSheet,
        "Canh bao luu kho"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        expiryAlertSheet,
        "Canh bao han su dung"
      );

      const currentDate =
        new Date()
          .toISOString()
          .slice(0, 10);

      const fromDate =
        appliedFilters.from_date ||
        "tat-ca";

      const toDate =
        appliedFilters.to_date ||
        currentDate;

      const fileName =
        `bao-cao-kho-${fromDate}-den-${toDate}.xlsx`;

      XLSX.writeFile(
        workbook,
        fileName
      );
    } catch (err) {
      console.error(
        "Lỗi xuất Excel:",
        err
      );

      setError(
        "Không thể xuất báo cáo Excel."
      );
    } finally {
      setExporting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | In báo cáo
  |--------------------------------------------------------------------------
  */

  function handlePrint() {
    window.print();
  }

  /*
  |--------------------------------------------------------------------------
  | Trạng thái lưu kho
  |--------------------------------------------------------------------------
  */

  function getStorageStatusText(status) {
    switch (status) {
      case "normal":
        return "Trong thời hạn";

      case "warning":
        return "Sắp quá hạn lưu";

      case "overdue":
        return "Đã quá hạn lưu";

      default:
        return "Chưa có chính sách";
    }
  }

  function getStorageStatusBadge(status) {
    switch (status) {
      case "normal":
        return (
          <span className="badge bg-success">
            Trong thời hạn
          </span>
        );

      case "warning":
        return (
          <span className="badge bg-warning text-dark">
            Sắp quá hạn lưu
          </span>
        );

      case "overdue":
        return (
          <span className="badge bg-danger">
            Đã quá hạn lưu
          </span>
        );

      default:
        return (
          <span className="badge bg-secondary">
            Chưa có chính sách
          </span>
        );
    }
  }

  return (
    <div>
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }

            .card {
              box-shadow: none !important;
              border: 1px solid #dee2e6 !important;
              break-inside: avoid;
            }

            table {
              font-size: 11px;
            }

            body {
              background: white !important;
            }
          }
        `}
      </style>

      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Báo cáo kho
          </h1>

          <p className="text-muted mb-0">
            Báo cáo nhập xuất, tồn kho,
            container, hạn sử dụng và phí
            lưu kho.
          </p>
        </div>

        <div className="d-flex gap-2 no-print">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handlePrint}
            disabled={loading}
          >
            <i className="bi bi-printer me-2" />
            In báo cáo
          </button>

          <button
            type="button"
            className="btn btn-success"
            onClick={
              handleExportExcel
            }
            disabled={
              loading || exporting
            }
          >
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Đang xuất...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-excel me-2" />
                Xuất Excel
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger no-print">
          {error}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4 no-print">
        <div className="card-body">
          <form onSubmit={handleFilter}>
            <div className="row g-3 align-items-end">
              <div className="col-md-6 col-xl-2">
                <label className="form-label">
                  Từ ngày
                </label>

                <input
                  type="date"
                  name="from_date"
                  className="form-control"
                  value={
                    filters.from_date
                  }
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 col-xl-2">
                <label className="form-label">
                  Đến ngày
                </label>

                <input
                  type="date"
                  name="to_date"
                  className="form-control"
                  value={
                    filters.to_date
                  }
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">
                  Kho
                </label>

                <select
                  name="warehouse_id"
                  className="form-select"
                  value={
                    filters.warehouse_id
                  }
                  onChange={handleChange}
                >
                  <option value="">
                    Tất cả kho
                  </option>

                  {filterOptions.warehouses.map(
                    (warehouse) => (
                      <option
                        key={
                          warehouse.id
                        }
                        value={
                          warehouse.id
                        }
                      >
                        {warehouse.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">
                  Sản phẩm
                </label>

                <select
                  name="product_id"
                  className="form-select"
                  value={
                    filters.product_id
                  }
                  onChange={handleChange}
                >
                  <option value="">
                    Tất cả sản phẩm
                  </option>

                  {filterOptions.products.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.sku} -{" "}
                        {product.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-xl-2">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading
                      ? "Đang tải..."
                      : "Xem"}
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

      {/* Bộ lọc đang áp dụng */}
      <div className="alert alert-light border mb-4">
        <strong>
          Phạm vi báo cáo:
        </strong>{" "}

        {appliedFilters.from_date
          ? `Từ ${formatDate(
              appliedFilters.from_date
            )}`
          : "Từ đầu dữ liệu"}

        {" đến "}

        {appliedFilters.to_date
          ? formatDate(
              appliedFilters.to_date
            )
          : "hiện tại"}

        {" · Kho: "}

        {selectedWarehouse?.name ||
          "Tất cả"}

        {" · Sản phẩm: "}

        {selectedProduct
          ? `${selectedProduct.sku} - ${selectedProduct.name}`
          : "Tất cả"}
      </div>

      {/* Tổng quan */}
      <div className="row g-3 mb-4">
        {[
          {
            title: "Phiếu nhập",
            value:
              formatNumber(
                totalImportDocuments
              ),
            className: "text-primary",
          },
          {
            title: "Số lượng nhập",
            value:
              formatNumber(
                totalImportQuantity
              ),
            className: "text-primary",
          },
          {
            title: "Container nhập",
            value: `${formatNumber(
              totalImportContainers
            )} container`,
            className: "text-primary",
          },
          {
            title: "Phiếu xuất",
            value:
              formatNumber(
                totalExportDocuments
              ),
            className: "text-success",
          },
          {
            title: "Số lượng xuất",
            value:
              formatNumber(
                totalExportQuantity
              ),
            className: "text-success",
          },
          {
            title: "Container xuất",
            value: `${formatNumber(
              totalExportContainers
            )} container`,
            className: "text-success",
          },
          {
            title: "Phí trong hạn",
            value:
              formatCurrency(
                totalRegularStorageFee
              ),
            className: "text-primary",
          },
          {
            title: "Phí quá hạn",
            value:
              formatCurrency(
                totalOverdueStorageFee
              ),
            className:
              totalOverdueStorageFee > 0
                ? "text-danger"
                : "text-muted",
          },
          {
            title: "Tổng phí lưu kho",
            value:
              formatCurrency(
                totalStorageFee
              ),
            className: "text-success",
          },
          {
            title: "Lô quá hạn lưu",
            value:
              formatNumber(
                inventoryAlerts.summary
                  .overdue_storage_batches
              ),
            className: "text-danger",
          },
          {
            title: "Lô sắp quá hạn lưu",
            value:
              formatNumber(
                inventoryAlerts.summary
                  .storage_warning_batches
              ),
            className: "text-warning",
          },
          {
            title: "Lô hết hạn dùng",
            value:
              formatNumber(
                inventoryAlerts.summary
                  .expired_batches
              ),
            className: "text-danger",
          },
        ].map((card) => (
          <div
            className="col-md-6 col-xl-3"
            key={card.title}
          >
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">
                  {card.title}
                </div>

                <div className={`fs-5 fw-bold ${card.className}`}>
                  {card.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" />
          Đang tải dữ liệu báo cáo...
        </div>
      ) : (
        <>
          {/* Nhập xuất */}
          <div className="row g-4 mb-4">
            <div className="col-xl-5">
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
                          <th>Phiếu</th>
                          <th>Số lượng</th>
                          <th>Container</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stockMovement.stock_in.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              className="text-center text-muted"
                            >
                              Không có dữ liệu nhập.
                            </td>
                          </tr>
                        ) : (
                          stockMovement.stock_in.map(
                            (item) => (
                              <tr
                                key={String(
                                  item.report_date
                                )}
                              >
                                <td>
                                  {formatDate(
                                    item.report_date
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    item.total_documents
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    item.total_quantity
                                  )}
                                </td>

                                <td>
                                  <strong>
                                    {formatNumber(
                                      item.total_containers
                                    )}{" "}
                                    container
                                  </strong>
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    Báo cáo xuất kho và phí lưu
                  </h5>

                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Phiếu</th>
                          <th>Số lượng</th>
                          <th>Container</th>
                          <th>Trong hạn</th>
                          <th>Quá hạn</th>
                          <th>Tổng phí</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stockMovement.stock_out.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              className="text-center text-muted"
                            >
                              Không có dữ liệu xuất.
                            </td>
                          </tr>
                        ) : (
                          stockMovement.stock_out.map(
                            (item) => (
                              <tr
                                key={String(
                                  item.report_date
                                )}
                                className={
                                  Number(
                                    item.total_overdue_storage_fee ||
                                      0
                                  ) > 0
                                    ? "table-warning"
                                    : ""
                                }
                              >
                                <td>
                                  {formatDate(
                                    item.report_date
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    item.total_documents
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    item.total_quantity
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    item.total_containers
                                  )}
                                </td>

                                <td className="text-nowrap">
                                  {formatCurrency(
                                    item.total_regular_storage_fee
                                  )}
                                </td>

                                <td className="text-nowrap text-danger fw-semibold">
                                  {formatCurrency(
                                    item.total_overdue_storage_fee
                                  )}
                                </td>

                                <td className="text-nowrap text-success fw-bold">
                                  {formatCurrency(
                                    item.total_storage_fee
                                  )}
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tồn kho theo kho */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">
                Tồn kho theo kho
              </h5>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Kho</th>
                      <th>Lô còn tồn</th>
                      <th>Sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Container</th>
                      <th>Hết hạn dùng</th>
                      <th>Sắp hết hạn dùng</th>
                      <th>Quá hạn lưu</th>
                      <th>Sắp quá hạn lưu</th>
                      <th>Chưa có chính sách</th>
                    </tr>
                  </thead>

                  <tbody>
                    {warehouseReport.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="text-center text-muted"
                        >
                          Không có dữ liệu tồn kho.
                        </td>
                      </tr>
                    ) : (
                      warehouseReport.map(
                        (warehouse) => (
                          <tr
                            key={
                              warehouse.warehouse_id
                            }
                          >
                            <td>
                              <strong>
                                {warehouse.warehouse_name}
                              </strong>
                            </td>

                            <td>
                              {formatNumber(
                                warehouse.total_batches
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                warehouse.total_products
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                warehouse.total_quantity
                              )}
                            </td>

                            <td>
                              <strong>
                                {formatNumber(
                                  warehouse.total_containers
                                )}{" "}
                                container
                              </strong>
                            </td>

                            <td className="text-danger">
                              {formatNumber(
                                warehouse.expired_batches
                              )}
                            </td>

                            <td className="text-warning">
                              {formatNumber(
                                warehouse.expiring_batches
                              )}
                            </td>

                            <td className="text-danger fw-semibold">
                              {formatNumber(
                                warehouse.overdue_storage_batches
                              )}
                            </td>

                            <td className="text-warning fw-semibold">
                              {formatNumber(
                                warehouse.storage_warning_batches
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                warehouse.no_storage_policy_batches
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cảnh báo lưu kho */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-1">
                Cảnh báo thời hạn lưu kho
              </h5>

              <p className="text-muted small">
                Các lô sắp quá hạn, đã quá
                hạn hoặc chưa được áp dụng
                chính sách lưu kho.
              </p>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Kho</th>
                      <th>Mã lô</th>
                      <th>Số lượng</th>
                      <th>Container</th>
                      <th>Ngày cuối trong hạn</th>
                      <th>Trạng thái</th>
                      <th>Quy định xuất</th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventoryAlerts.storage_alerts
                      .length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center text-muted"
                        >
                          Không có cảnh báo thời hạn
                          lưu kho.
                        </td>
                      </tr>
                    ) : (
                      inventoryAlerts.storage_alerts.map(
                        (batch) => (
                          <tr
                            key={batch.id}
                            className={
                              batch.storage_status ===
                              "overdue"
                                ? "table-danger"
                                : batch.storage_status ===
                                    "warning"
                                  ? "table-warning"
                                  : ""
                            }
                          >
                            <td>
                              <strong>
                                {batch.product_name}
                              </strong>

                              <div className="text-muted small">
                                {batch.sku}
                              </div>
                            </td>

                            <td>
                              {batch.warehouse_name}
                            </td>

                            <td>
                              {batch.batch_code}
                            </td>

                            <td>
                              {formatNumber(
                                batch.quantity
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                batch.container_quantity
                              )}
                            </td>

                            <td>
                              {formatDate(
                                batch.storage_due_date
                              )}
                            </td>

                            <td>
                              {getStorageStatusBadge(
                                batch.storage_status
                              )}

                              {batch.storage_status ===
                                "overdue" && (
                                <div className="small text-danger mt-1">
                                  Quá{" "}
                                  {formatNumber(
                                    batch.overdue_storage_days
                                  )}{" "}
                                  ngày
                                </div>
                              )}
                            </td>

                            <td>
                              {batch.storage_status ===
                              "no_policy" ? (
                                <span className="text-muted">
                                  Chưa xác định
                                </span>
                              ) : batch.allow_overdue_export ? (
                                <div>
                                  <span className="badge bg-success">
                                    Được xuất
                                  </span>

                                  {batch.require_overdue_note && (
                                    <div className="small text-danger mt-1">
                                      Bắt buộc ghi chú
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="badge bg-danger">
                                  Chặn xuất quá hạn
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cảnh báo hạn sử dụng */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-1">
                Cảnh báo hạn sử dụng
              </h5>

              <p className="text-muted small">
                Các lô đã hết hạn hoặc sẽ hết
                hạn trong vòng 30 ngày.
              </p>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Kho</th>
                      <th>Mã lô</th>
                      <th>Số lượng</th>
                      <th>Container</th>
                      <th>Hạn sử dụng</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventoryAlerts.expiry_alerts
                      .length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center text-muted"
                        >
                          Không có cảnh báo hạn sử
                          dụng.
                        </td>
                      </tr>
                    ) : (
                      inventoryAlerts.expiry_alerts.map(
                        (batch) => (
                          <tr
                            key={batch.id}
                            className={
                              batch.days_until_expiry <
                              0
                                ? "table-danger"
                                : "table-warning"
                            }
                          >
                            <td>
                              <strong>
                                {batch.product_name}
                              </strong>

                              <div className="text-muted small">
                                {batch.sku}
                              </div>
                            </td>

                            <td>
                              {batch.warehouse_name}
                            </td>

                            <td>
                              {batch.batch_code}
                            </td>

                            <td>
                              {formatNumber(
                                batch.quantity
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                batch.container_quantity
                              )}
                            </td>

                            <td>
                              {formatDate(
                                batch.expiry_date
                              )}
                            </td>

                            <td>
                              {batch.days_until_expiry <
                              0 ? (
                                <span className="badge bg-danger">
                                  Đã hết hạn{" "}
                                  {formatNumber(
                                    Math.abs(
                                      batch.days_until_expiry
                                    )
                                  )}{" "}
                                  ngày
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  Còn{" "}
                                  {formatNumber(
                                    batch.days_until_expiry
                                  )}{" "}
                                  ngày
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="alert alert-info mb-0 mt-3">
                <strong>Ghi chú:</strong>{" "}
                Hạn sử dụng quyết định lô hàng
                có được xuất hay không. Thời hạn
                lưu kho quyết định cảnh báo, phụ
                phí và điều kiện xuất quá hạn.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportPage;