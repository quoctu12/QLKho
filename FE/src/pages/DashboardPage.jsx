import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  getDashboardSummary,
  getStockMovementReport,
  getInventoryByWarehouse,
} from "../api/reportApi";

import {
  getInventoryBatches,
  getInventorySummary,
} from "../api/inventoryApi";

import { getStockIns } from "../api/stockInApi";
import { getStockOuts } from "../api/stockOutApi";

/*
|--------------------------------------------------------------------------
| Chuyển ngày về timestamp chỉ gồm năm, tháng, ngày
|--------------------------------------------------------------------------
*/

function toDateOnlyTimestamp(value) {
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

function DashboardPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    total_products: 0,
    total_warehouses: 0,

    total_quantity: 0,
    total_containers: 0,
    total_batches: 0,
    total_products_in_stock: 0,

    total_stock_ins: 0,
    total_import_quantity: 0,
    total_import_containers: 0,

    total_stock_outs: 0,
    total_export_quantity: 0,
    total_export_containers: 0,

    total_regular_storage_fee: 0,
    total_overdue_storage_fee: 0,
    total_storage_fee: 0,

    expired_batches: 0,
    expiring_batches: 0,
    low_stock_products: 0,

    storage_warning_batches: 0,
    overdue_storage_batches: 0,
    no_storage_policy_batches: 0,
  });

  const [movementChart, setMovementChart] = useState([]);
  const [warehouseChart, setWarehouseChart] = useState([]);

  const [expiringBatches, setExpiringBatches] = useState([]);
  const [storageAlertBatches, setStorageAlertBatches] = useState([]);

  const [recentStockIns, setRecentStockIns] = useState([]);
  const [recentStockOuts, setRecentStockOuts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu Dashboard
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        dashboardSummaryData,
        inventorySummaryData,
        expiringData,
        storageWarningData,
        storageOverdueData,
        stockInData,
        stockOutData,
        movementData,
        warehouseData,
      ] = await Promise.all([
        getDashboardSummary(),

        getInventorySummary(),

        getInventoryBatches({
          page: 1,
          limit: 5,
          expiry_status: "expiring",
          sort_by: "expiry_asc",
        }),

        getInventoryBatches({
          page: 1,
          limit: 5,
          storage_status: "warning",
          sort_by: "storage_due_asc",
        }),

        getInventoryBatches({
          page: 1,
          limit: 5,
          storage_status: "overdue",
          sort_by: "storage_due_asc",
        }),

        getStockIns({
          page: 1,
          limit: 5,
          sort_by: "newest",
        }),

        getStockOuts({
          page: 1,
          limit: 5,
          sort_by: "newest",
        }),

        getStockMovementReport(),

        getInventoryByWarehouse(),
      ]);

      /*
      |--------------------------------------------------------------------------
      | Tổng phí lưu kho
      |--------------------------------------------------------------------------
      */

      const totalStorageFee = Number(
        dashboardSummaryData?.total_storage_fee ??
          dashboardSummaryData?.total_amount ??
          0
      );

      const hasStorageFeeSplit =
        dashboardSummaryData?.total_regular_storage_fee !== undefined ||
        dashboardSummaryData?.total_regular_amount !== undefined ||
        dashboardSummaryData?.total_overdue_storage_fee !== undefined ||
        dashboardSummaryData?.total_overdue_amount !== undefined;

      const totalRegularStorageFee = hasStorageFeeSplit
        ? Number(
            dashboardSummaryData?.total_regular_storage_fee ??
              dashboardSummaryData?.total_regular_amount ??
              0
          )
        : totalStorageFee;

      const totalOverdueStorageFee = Number(
        dashboardSummaryData?.total_overdue_storage_fee ??
          dashboardSummaryData?.total_overdue_amount ??
          0
      );

      setSummary({
        total_products: Number(
          dashboardSummaryData?.total_products || 0
        ),

        total_warehouses: Number(
          dashboardSummaryData?.total_warehouses || 0
        ),

        total_quantity: Number(
          inventorySummaryData?.total_quantity ??
            dashboardSummaryData?.total_quantity ??
            0
        ),

        total_containers: Number(
          inventorySummaryData?.total_containers ??
            dashboardSummaryData?.total_containers ??
            0
        ),

        total_batches: Number(
          inventorySummaryData?.total_batches ??
            dashboardSummaryData?.total_batches ??
            0
        ),

        total_products_in_stock: Number(
          inventorySummaryData?.total_products ??
            dashboardSummaryData?.total_products_in_stock ??
            0
        ),

        total_stock_ins: Number(
          dashboardSummaryData?.total_stock_ins || 0
        ),

        total_import_quantity: Number(
          dashboardSummaryData?.total_import_quantity || 0
        ),

        total_import_containers: Number(
          dashboardSummaryData?.total_import_containers || 0
        ),

        total_stock_outs: Number(
          dashboardSummaryData?.total_stock_outs || 0
        ),

        total_export_quantity: Number(
          dashboardSummaryData?.total_export_quantity || 0
        ),

        total_export_containers: Number(
          dashboardSummaryData?.total_export_containers || 0
        ),

        total_regular_storage_fee: totalRegularStorageFee,

        total_overdue_storage_fee: totalOverdueStorageFee,

        total_storage_fee: totalStorageFee,

        expired_batches: Number(
          inventorySummaryData?.expired_batches ??
            dashboardSummaryData?.expired_batches ??
            0
        ),

        expiring_batches: Number(
          inventorySummaryData?.expiring_batches ??
            dashboardSummaryData?.expiring_batches ??
            0
        ),

        low_stock_products: Number(
          inventorySummaryData?.low_stock_products ??
            dashboardSummaryData?.low_stock_products ??
            0
        ),

        storage_warning_batches: Number(
          inventorySummaryData?.storage_warning_batches || 0
        ),

        overdue_storage_batches: Number(
          inventorySummaryData?.overdue_storage_batches || 0
        ),

        no_storage_policy_batches: Number(
          inventorySummaryData?.no_storage_policy_batches || 0
        ),
      });

      /*
      |--------------------------------------------------------------------------
      | Lô sắp hết hạn sử dụng
      |--------------------------------------------------------------------------
      */

      const expiringRows = Array.isArray(expiringData?.batches)
        ? expiringData.batches
        : Array.isArray(expiringData)
          ? expiringData
          : [];

      setExpiringBatches(expiringRows.slice(0, 5));

      /*
      |--------------------------------------------------------------------------
      | Lô cảnh báo thời hạn lưu kho
      |--------------------------------------------------------------------------
      */

      const storageWarningRows = Array.isArray(
        storageWarningData?.batches
      )
        ? storageWarningData.batches
        : Array.isArray(storageWarningData)
          ? storageWarningData
          : [];

      const storageOverdueRows = Array.isArray(
        storageOverdueData?.batches
      )
        ? storageOverdueData.batches
        : Array.isArray(storageOverdueData)
          ? storageOverdueData
          : [];

      const storageAlertMap = new Map();

      storageOverdueRows.forEach((batch) => {
        storageAlertMap.set(String(batch.id), batch);
      });

      storageWarningRows.forEach((batch) => {
        if (!storageAlertMap.has(String(batch.id))) {
          storageAlertMap.set(String(batch.id), batch);
        }
      });

      setStorageAlertBatches(
        Array.from(storageAlertMap.values()).slice(0, 5)
      );

      /*
      |--------------------------------------------------------------------------
      | Phiếu nhập gần đây
      |--------------------------------------------------------------------------
      */

      const stockInRows = Array.isArray(stockInData?.stock_ins)
        ? stockInData.stock_ins
        : Array.isArray(stockInData)
          ? stockInData
          : [];

      setRecentStockIns(stockInRows.slice(0, 5));

      /*
      |--------------------------------------------------------------------------
      | Phiếu xuất gần đây
      |--------------------------------------------------------------------------
      */

      const stockOutRows = Array.isArray(stockOutData?.stock_outs)
        ? stockOutData.stock_outs
        : Array.isArray(stockOutData)
          ? stockOutData
          : [];

      setRecentStockOuts(stockOutRows.slice(0, 5));

      /*
      |--------------------------------------------------------------------------
      | Biểu đồ nhập và xuất theo ngày
      |--------------------------------------------------------------------------
      */

      const movementMap = new Map();

      const stockInMovement = Array.isArray(movementData?.stock_in)
        ? movementData.stock_in
        : [];

      const stockOutMovement = Array.isArray(movementData?.stock_out)
        ? movementData.stock_out
        : [];

      stockInMovement.forEach((item) => {
        const dateKey = String(item.report_date || "").slice(0, 10);

        if (!dateKey) {
          return;
        }

        movementMap.set(dateKey, {
          dateKey,
          date: formatChartDate(dateKey),
          importQuantity: Number(item.total_quantity || 0),
          exportQuantity: 0,
          importContainers: Number(item.total_containers || 0),
          exportContainers: 0,
          storageFee: 0,
        });
      });

      stockOutMovement.forEach((item) => {
        const dateKey = String(item.report_date || "").slice(0, 10);

        if (!dateKey) {
          return;
        }

        const existingItem = movementMap.get(dateKey) || {
          dateKey,
          date: formatChartDate(dateKey),
          importQuantity: 0,
          exportQuantity: 0,
          importContainers: 0,
          exportContainers: 0,
          storageFee: 0,
        };

        existingItem.exportQuantity = Number(
          item.total_quantity || 0
        );

        existingItem.exportContainers = Number(
          item.total_containers || 0
        );

        existingItem.storageFee = Number(
          item.total_storage_fee ??
            item.total_amount ??
            0
        );

        movementMap.set(dateKey, existingItem);
      });

      const sortedMovementData = Array.from(
        movementMap.values()
      ).sort(
        (firstItem, secondItem) =>
          String(firstItem.dateKey).localeCompare(
            String(secondItem.dateKey)
          )
      );

      setMovementChart(sortedMovementData);

      /*
      |--------------------------------------------------------------------------
      | Biểu đồ tồn kho theo kho
      |--------------------------------------------------------------------------
      */

      const warehouseRows = Array.isArray(warehouseData)
        ? warehouseData
        : Array.isArray(warehouseData?.warehouses)
          ? warehouseData.warehouses
          : [];

      setWarehouseChart(
        warehouseRows.map((item) => ({
          warehouse: item.warehouse_name || "Không xác định",

          totalQuantity: Number(item.total_quantity || 0),

          totalContainers: Number(item.total_containers || 0),

          totalBatches: Number(item.total_batches || 0),

          totalProducts: Number(item.total_products || 0),
        }))
      );
    } catch (err) {
      console.error("Lỗi tải Dashboard:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu Dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng dữ liệu
  |--------------------------------------------------------------------------
  */

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
    const timestamp = toDateOnlyTimestamp(value);

    if (timestamp === null) {
      return "Không có";
    }

    return new Date(timestamp).toLocaleDateString("vi-VN", {
      timeZone: "UTC",
    });
  }

  function formatChartDate(value) {
    const timestamp = toDateOnlyTimestamp(value);

    if (timestamp === null) {
      return "";
    }

    return new Date(timestamp).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });
  }

  function formatCompactNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Dữ liệu phí của phiếu xuất
  |--------------------------------------------------------------------------
  */

  function getStockOutRegularAmount(item) {
    if (
      item.total_regular_amount !== null &&
      item.total_regular_amount !== undefined
    ) {
      return Number(item.total_regular_amount || 0);
    }

    return Number(item.total_amount || 0);
  }

  function getStockOutOverdueAmount(item) {
    return Number(item.total_overdue_amount || 0);
  }

  function getStockOutTotalAmount(item) {
    if (
      item.total_amount !== null &&
      item.total_amount !== undefined
    ) {
      return Number(item.total_amount || 0);
    }

    return (
      getStockOutRegularAmount(item) +
      getStockOutOverdueAmount(item)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Badge trạng thái thời hạn lưu kho
  |--------------------------------------------------------------------------
  */

  function getStorageStatusBadge(batch) {
    if (batch.storage_status === "overdue") {
      return (
        <span className="badge bg-danger">
          Đã quá hạn lưu
        </span>
      );
    }

    if (batch.storage_status === "warning") {
      return (
        <span className="badge bg-warning text-dark">
          Sắp quá hạn lưu
        </span>
      );
    }

    if (batch.storage_status === "normal") {
      return (
        <span className="badge bg-success">
          Trong thời hạn
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Chưa có chính sách
      </span>
    );
  }

  function getStorageRemainingText(batch) {
    if (batch.storage_status === "overdue") {
      return (
        <span className="text-danger fw-semibold">
          Quá hạn{" "}
          {formatNumber(batch.overdue_storage_days)} ngày
        </span>
      );
    }

    const daysUntilDue =
      batch.days_until_storage_due === null ||
      batch.days_until_storage_due === undefined
        ? null
        : Number(batch.days_until_storage_due);

    if (daysUntilDue === null) {
      return (
        <span className="text-muted">
          Chưa xác định
        </span>
      );
    }

    if (daysUntilDue === 0) {
      return (
        <span className="text-warning-emphasis fw-semibold">
          Hết hạn lưu hôm nay
        </span>
      );
    }

    return (
      <span
        className={
          batch.storage_status === "warning"
            ? "text-warning-emphasis fw-semibold"
            : "text-success"
        }
      >
        Còn {formatNumber(daysUntilDue)} ngày
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Các thẻ tổng quan
  |--------------------------------------------------------------------------
  */

  const cards = [
    {
      title: "Sản phẩm hoạt động",
      value: formatNumber(summary.total_products),
      note: `${formatNumber(
        summary.total_products_in_stock
      )} sản phẩm đang còn tồn`,
      icon: "bi-box-seam",
      textClass: "text-primary",
      path: "/products",
    },
    {
      title: "Tổng lô còn tồn",
      value: formatNumber(summary.total_batches),
      note: `${formatNumber(
        summary.no_storage_policy_batches
      )} lô chưa có chính sách`,
      icon: "bi-collection",
      textClass: "text-secondary",
      path: "/inventory",
    },
    {
      title: "Số lượng tồn kho",
      value: formatNumber(summary.total_quantity),
      note: "Tổng số lượng vật lý đang lưu",
      icon: "bi-boxes",
      textClass: "text-success",
      path: "/inventory",
    },
    {
      title: "Container đang lưu",
      value: `${formatNumber(summary.total_containers)} container`,
      note: "Container đang chiếm diện tích kho",
      icon: "bi-hdd-rack",
      textClass: "text-info",
      path: "/inventory",
    },
    {
      title: "Phiếu nhập kho",
      value: formatNumber(summary.total_stock_ins),
      note: `${formatNumber(
        summary.total_import_containers
      )} container đã nhập`,
      icon: "bi-box-arrow-in-down",
      textClass: "text-primary",
      path: "/stock-ins",
    },
    {
      title: "Phiếu xuất kho",
      value: formatNumber(summary.total_stock_outs),
      note: `${formatNumber(
        summary.total_export_containers
      )} container quyết toán`,
      icon: "bi-box-arrow-up",
      textClass: "text-success",
      path: "/stock-outs",
    },
    {
      title: "Sản phẩm tồn thấp",
      value: formatNumber(summary.low_stock_products),
      note: "Cần xem xét bổ sung hàng",
      icon: "bi-graph-down-arrow",
      textClass:
        summary.low_stock_products > 0
          ? "text-danger"
          : "text-success",
      path: "/inventory",
    },
    {
      title: "Lô sắp hết hạn dùng",
      value: formatNumber(summary.expiring_batches),
      note: "Ưu tiên xử lý theo FEFO",
      icon: "bi-exclamation-triangle",
      textClass: "text-warning",
      path: "/inventory",
    },
    {
      title: "Lô đã hết hạn dùng",
      value: formatNumber(summary.expired_batches),
      note: "Không được xuất kho bình thường",
      icon: "bi-x-octagon",
      textClass: "text-danger",
      path: "/inventory",
    },
    {
      title: "Sắp quá hạn lưu kho",
      value: formatNumber(summary.storage_warning_batches),
      note: "Đang trong khoảng thời gian cảnh báo",
      icon: "bi-clock",
      textClass: "text-warning",
      path: "/inventory",
    },
    {
      title: "Đã quá hạn lưu kho",
      value: formatNumber(summary.overdue_storage_batches),
      note: "Có thể phát sinh phụ phí quá hạn",
      icon: "bi-clock-history",
      textClass: "text-danger",
      path: "/inventory",
    },
    {
      title: "Tổng phí lưu kho",
      value: formatCurrency(summary.total_storage_fee),
      note: `Trong hạn: ${formatCurrency(
        summary.total_regular_storage_fee
      )} · Quá hạn: ${formatCurrency(
        summary.total_overdue_storage_fee
      )}`,
      icon: "bi-cash-coin",
      textClass: "text-primary",
      path: "/stock-outs",
    },
  ];

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <span
          className="spinner-border spinner-border-sm"
          role="status"
        />

        Đang tải dữ liệu Dashboard...
      </div>
    );
  }

  return (
    <div>
      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Tổng quan hệ thống
          </h1>

          <p className="text-muted mb-0">
            Theo dõi tồn kho, container, hạn sử dụng, thời hạn lưu
            và phí lưu kho.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              />

              Đang làm mới...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-clockwise me-2" />
              Làm mới
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Các thẻ thống kê */}
      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div
            className="col-md-6 col-xl-3"
            key={card.title}
          >
            <div
              className="card border-0 shadow-sm h-100"
              role="button"
              tabIndex={0}
              onClick={() => navigate(card.path)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  navigate(card.path);
                }
              }}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="text-muted small mb-2">
                      {card.title}
                    </div>

                    <div className={`fs-5 fw-bold ${card.textClass}`}>
                      {card.value}
                    </div>

                    <div className="text-muted small mt-2">
                      {card.note}
                    </div>
                  </div>

                  <div className={`fs-3 ${card.textClass}`}>
                    <i className={`bi ${card.icon}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Biểu đồ */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-1">
                Biểu đồ số lượng nhập và xuất kho
              </h5>

              <p className="text-muted small mb-4">
                Theo dõi tổng số lượng hàng nhập và xuất theo từng ngày.
              </p>

              {movementChart.length === 0 ? (
                <div className="text-center text-muted py-5">
                  Chưa có dữ liệu nhập xuất.
                </div>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={movementChart}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        tickFormatter={formatCompactNumber}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip
                        formatter={(value, name) => [
                          formatNumber(value),
                          name,
                        ]}
                      />

                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="importQuantity"
                        name="Số lượng nhập"
                        stroke="#0d6efd"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="exportQuantity"
                        name="Số lượng xuất"
                        stroke="#198754"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-1">
                Container tồn theo kho
              </h5>

              <p className="text-muted small mb-4">
                Tổng số container đang lưu tại từng kho.
              </p>

              {warehouseChart.length === 0 ? (
                <div className="text-center text-muted py-5">
                  Chưa có dữ liệu tồn kho.
                </div>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={warehouseChart}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 5,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="warehouse"
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis
                        tickFormatter={formatCompactNumber}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(value)} container`,
                          "Container tồn",
                        ]}
                      />

                      <Legend />

                      <Bar
                        dataKey="totalContainers"
                        name="Container tồn"
                        fill="#6f42c1"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo thời hạn lưu kho */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5 className="card-title mb-1">
                Lô cần xử lý theo thời hạn lưu kho
              </h5>

              <p className="text-muted small mb-0">
                Ưu tiên các lô đã quá hạn lưu và các lô sắp đến hạn.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => navigate("/inventory")}
            >
              Xem tồn kho
            </button>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Kho và vị trí</th>
                  <th>Mã lô</th>
                  <th>Số lượng</th>
                  <th>Container</th>
                  <th>Ngày cuối trong hạn</th>
                  <th>Thời gian còn lại</th>
                  <th>Trạng thái</th>
                  <th>Quy định xuất</th>
                </tr>
              </thead>

              <tbody>
                {storageAlertBatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center text-muted py-4"
                    >
                      Không có lô sắp quá hạn hoặc đã quá hạn lưu kho.
                    </td>
                  </tr>
                ) : (
                  storageAlertBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className={
                        batch.storage_status === "overdue"
                          ? "table-danger"
                          : "table-warning"
                      }
                    >
                      <td>
                        <strong>
                          {batch.product_name || "Không có"}
                        </strong>

                        <div className="text-muted small">
                          SKU: {batch.sku || "Không có"}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {batch.warehouse_name || "Không có"}
                        </strong>

                        <div className="text-muted small">
                          {batch.location_code ||
                            batch.location_name ||
                            "Chưa có vị trí"}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {batch.batch_code || "Không có"}
                        </strong>
                      </td>

                      <td>
                        {formatNumber(batch.quantity)}
                      </td>

                      <td className="text-nowrap">
                        {formatNumber(batch.container_quantity)} container
                      </td>

                      <td className="text-nowrap">
                        {formatDate(batch.storage_due_date)}
                      </td>

                      <td>
                        {getStorageRemainingText(batch)}
                      </td>

                      <td>
                        {getStorageStatusBadge(batch)}
                      </td>

                      <td>
                        {batch.allow_overdue_export === true ? (
                          <div>
                            <span className="badge bg-success">
                              Được xuất quá hạn
                            </span>

                            {batch.require_overdue_note === true && (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hoạt động gần đây */}
      <div className="row g-4 mb-4">
        <div className="col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Nhập kho gần đây
                </h5>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate("/stock-ins")}
                >
                  Xem tất cả
                </button>
              </div>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Ngày nhập</th>
                      <th>Kho</th>
                      <th>Container</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentStockIns.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center text-muted"
                        >
                          Chưa có phiếu nhập.
                        </td>
                      </tr>
                    ) : (
                      recentStockIns.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none"
                              onClick={() =>
                                navigate(`/stock-ins/${item.id}`)
                              }
                            >
                              PN-{String(item.id).padStart(4, "0")}
                            </button>
                          </td>

                          <td className="text-nowrap">
                            {formatDate(item.import_date)}
                          </td>

                          <td>
                            {item.warehouse_name || "Không có"}
                          </td>

                          <td className="text-nowrap">
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

        <div className="col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Xuất kho và phí lưu gần đây
                </h5>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate("/stock-outs")}
                >
                  Xem tất cả
                </button>
              </div>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Ngày xuất</th>
                      <th>Container</th>
                      <th>Phí trong hạn</th>
                      <th>Phí quá hạn</th>
                      <th>Tổng phí</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentStockOuts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center text-muted"
                        >
                          Chưa có phiếu xuất.
                        </td>
                      </tr>
                    ) : (
                      recentStockOuts.map((item) => {
                        const regularAmount =
                          getStockOutRegularAmount(item);

                        const overdueAmount =
                          getStockOutOverdueAmount(item);

                        const totalAmount =
                          getStockOutTotalAmount(item);

                        return (
                          <tr
                            key={item.id}
                            className={
                              overdueAmount > 0
                                ? "table-warning"
                                : ""
                            }
                          >
                            <td>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none"
                                onClick={() =>
                                  navigate(`/stock-outs/${item.id}`)
                                }
                              >
                                PX-{String(item.id).padStart(4, "0")}
                              </button>
                            </td>

                            <td className="text-nowrap">
                              {formatDate(item.export_date)}
                            </td>

                            <td className="text-nowrap">
                              <strong>
                                {formatNumber(
                                  item.total_containers
                                )}{" "}
                                container
                              </strong>
                            </td>

                            <td className="text-nowrap">
                              {formatCurrency(regularAmount)}
                            </td>

                            <td className="text-nowrap">
                              <strong
                                className={
                                  overdueAmount > 0
                                    ? "text-danger"
                                    : ""
                                }
                              >
                                {formatCurrency(overdueAmount)}
                              </strong>
                            </td>

                            <td className="text-nowrap">
                              <strong className="text-success">
                                {formatCurrency(totalAmount)}
                              </strong>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo hạn sử dụng */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5 className="card-title mb-1">
                Cảnh báo lô sắp hết hạn sử dụng
              </h5>

              <p className="text-muted small mb-0">
                Các lô sắp hết hạn nên được ưu tiên xuất theo FEFO.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={() => navigate("/inventory")}
            >
              Xem tồn kho
            </button>
          </div>

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
                  <th>Còn lại</th>
                </tr>
              </thead>

              <tbody>
                {expiringBatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center text-muted"
                    >
                      Không có lô sắp hết hạn sử dụng.
                    </td>
                  </tr>
                ) : (
                  expiringBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <strong>
                          {batch.product_name || "Không có"}
                        </strong>

                        <div className="text-muted small">
                          SKU: {batch.sku || "Không có"}
                        </div>
                      </td>

                      <td>
                        {batch.warehouse_name || "Không có"}
                      </td>

                      <td>
                        {batch.batch_code || "Không có"}
                      </td>

                      <td>
                        {formatNumber(batch.quantity)}
                      </td>

                      <td className="text-nowrap">
                        {formatNumber(batch.container_quantity)} container
                      </td>

                      <td className="text-nowrap">
                        {formatDate(batch.expiry_date)}
                      </td>

                      <td>
                        <span className="badge bg-warning text-dark">
                          Còn {formatNumber(batch.days_until_expiry)} ngày
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>Ghi chú:</strong>{" "}
            Hạn sử dụng quyết định việc lô có được xuất hay không.
            Thời hạn lưu kho quyết định cảnh báo và phí quá hạn.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;