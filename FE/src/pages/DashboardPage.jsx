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

import { getInventoryBatches } from "../api/inventoryApi";
import { getStockIns } from "../api/stockInApi";
import { getStockOuts } from "../api/stockOutApi";

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
    total_storage_fee: 0,
    expired_batches: 0,
    expiring_batches: 0,
  });

  const [movementChart, setMovementChart] = useState([]);
  const [warehouseChart, setWarehouseChart] = useState([]);

  const [expiringBatches, setExpiringBatches] = useState([]);
  const [recentStockIns, setRecentStockIns] = useState([]);
  const [recentStockOuts, setRecentStockOuts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu Dashboard
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        summaryData,
        expiringData,
        stockInData,
        stockOutData,
        movementData,
        warehouseData,
      ] = await Promise.all([
        getDashboardSummary(),

        getInventoryBatches({
          expiry_status: "expiring",
        }),

        getStockIns(),
        getStockOuts(),
        getStockMovementReport(),
        getInventoryByWarehouse(),
      ]);

      setSummary({
        total_products: Number(summaryData?.total_products || 0),
        total_warehouses: Number(summaryData?.total_warehouses || 0),
        total_quantity: Number(summaryData?.total_quantity || 0),
        total_containers: Number(summaryData?.total_containers || 0),
        total_batches: Number(summaryData?.total_batches || 0),
        total_products_in_stock: Number(summaryData?.total_products_in_stock || 0),

        total_stock_ins: Number(summaryData?.total_stock_ins || 0),
        total_import_quantity: Number(summaryData?.total_import_quantity || 0),
        total_import_containers: Number(summaryData?.total_import_containers || 0),

        total_stock_outs: Number(summaryData?.total_stock_outs || 0),
        total_export_quantity: Number(summaryData?.total_export_quantity || 0),
        total_export_containers: Number(summaryData?.total_export_containers || 0),
        total_storage_fee: Number(summaryData?.total_storage_fee || 0),

        expired_batches: Number(summaryData?.expired_batches || 0),
        expiring_batches: Number(summaryData?.expiring_batches || 0),
      });

      setExpiringBatches(
        Array.isArray(expiringData) ? expiringData.slice(0, 5) : []
      );

      const stockInRows = Array.isArray(stockInData?.stock_ins)
        ? stockInData.stock_ins
        : Array.isArray(stockInData)
          ? stockInData
          : [];

      const stockOutRows = Array.isArray(stockOutData?.stock_outs)
        ? stockOutData.stock_outs
        : Array.isArray(stockOutData)
          ? stockOutData
          : [];

      setRecentStockIns(stockInRows.slice(0, 5));
      setRecentStockOuts(stockOutRows.slice(0, 5));

      const movementMap = new Map();

      const stockInMovement = Array.isArray(movementData?.stock_in)
        ? movementData.stock_in
        : [];

      const stockOutMovement = Array.isArray(movementData?.stock_out)
        ? movementData.stock_out
        : [];

      stockInMovement.forEach((item) => {
        const dateKey = String(item.report_date).slice(0, 10);

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
        const dateKey = String(item.report_date).slice(0, 10);

        const existingItem = movementMap.get(dateKey) || {
          dateKey,
          date: formatChartDate(dateKey),
          importQuantity: 0,
          exportQuantity: 0,
          importContainers: 0,
          exportContainers: 0,
          storageFee: 0,
        };

        existingItem.exportQuantity = Number(item.total_quantity || 0);
        existingItem.exportContainers = Number(item.total_containers || 0);
        existingItem.storageFee = Number(item.total_storage_fee || item.total_amount || 0);

        movementMap.set(dateKey, existingItem);
      });

      const sortedMovementData = Array.from(movementMap.values()).sort(
        (firstItem, secondItem) =>
          new Date(firstItem.dateKey) - new Date(secondItem.dateKey)
      );

      setMovementChart(sortedMovementData);

      const warehouseRows = Array.isArray(warehouseData) ? warehouseData : [];

      setWarehouseChart(
        warehouseRows.map((item) => ({
          warehouse: item.warehouse_name,
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
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Format dữ liệu
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
    if (!value) {
      return "Không có";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không hợp lệ";
    }

    return date.toLocaleDateString("vi-VN");
  }

  function formatChartDate(value) {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function formatCompactNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }

  const cards = [
    {
      title: "Sản phẩm hoạt động",
      value: formatNumber(summary.total_products),
      icon: "bi-box-seam",
      textClass: "text-primary",
      path: "/products",
    },
    {
      title: "Tổng lô còn tồn",
      value: formatNumber(summary.total_batches),
      icon: "bi-collection",
      textClass: "text-secondary",
      path: "/inventory",
    },
    {
      title: "Số lượng tồn kho",
      value: formatNumber(summary.total_quantity),
      icon: "bi-boxes",
      textClass: "text-success",
      path: "/inventory",
    },
    {
      title: "Container đang lưu",
      value: `${formatNumber(summary.total_containers)} container`,
      icon: "bi-hdd-rack",
      textClass: "text-info",
      path: "/inventory",
    },
    {
      title: "Tổng container nhập",
      value: `${formatNumber(summary.total_import_containers)} container`,
      icon: "bi-box-arrow-in-down",
      textClass: "text-primary",
      path: "/stock-ins",
    },
    {
      title: "Tổng container xuất",
      value: `${formatNumber(summary.total_export_containers)} container`,
      icon: "bi-box-arrow-up",
      textClass: "text-success",
      path: "/stock-outs",
    },
    {
      title: "Tổng phí lưu kho",
      value: formatCurrency(summary.total_storage_fee),
      icon: "bi-cash-coin",
      textClass: "text-primary",
      path: "/stock-outs",
    },
    {
      title: "Lô sắp hết hạn",
      value: formatNumber(summary.expiring_batches),
      icon: "bi-exclamation-triangle",
      textClass: "text-warning",
      path: "/inventory",
    },
    {
      title: "Lô đã hết hạn",
      value: formatNumber(summary.expired_batches),
      icon: "bi-x-octagon",
      textClass: "text-danger",
      path: "/inventory",
    },
    {
      title: "Kho đang quản lý",
      value: formatNumber(summary.total_warehouses),
      icon: "bi-building",
      textClass: "text-secondary",
      path: "/warehouses",
    },
  ];

  if (loading) {
    return <p>Đang tải dữ liệu Dashboard...</p>;
  }

  return (
    <div>
      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 mb-1">
            Tổng quan hệ thống
          </h1>

          <p className="text-muted mb-0">
            Theo dõi nhanh số lượng tồn, container, vị trí lưu trữ và phí lưu kho.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadDashboard}
        >
          <i className="bi bi-arrow-clockwise me-2" />
          Làm mới
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
              onClick={() => navigate(card.path)}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">
                      {card.title}
                    </div>

                    <div className="fs-5 fw-bold">
                      {card.value}
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
        {/* Biểu đồ số lượng nhập xuất */}
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

                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />

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

        {/* Biểu đồ container theo kho */}
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

      {/* Hoạt động nhập và xuất gần đây */}
      <div className="row g-4 mb-4">
        {/* Phiếu nhập */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Hoạt động nhập kho gần đây
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
                              onClick={() => navigate(`/stock-ins/${item.id}`)}
                            >
                              PN-{String(item.id).padStart(4, "0")}
                            </button>
                          </td>

                          <td>
                            {formatDate(item.import_date)}
                          </td>

                          <td>
                            {item.warehouse_name}
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

        {/* Phiếu xuất */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">
                  Hoạt động xuất kho gần đây
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
                      <th>Phí lưu kho</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentStockOuts.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center text-muted"
                        >
                          Chưa có phiếu xuất.
                        </td>
                      </tr>
                    ) : (
                      recentStockOuts.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none"
                              onClick={() => navigate(`/stock-outs/${item.id}`)}
                            >
                              PX-{String(item.id).padStart(4, "0")}
                            </button>
                          </td>

                          <td>
                            {formatDate(item.export_date)}
                          </td>

                          <td>
                            <strong>
                              {formatNumber(item.total_containers)} container
                            </strong>
                          </td>

                          <td>
                            <strong className="text-primary">
                              {formatCurrency(item.total_amount)}
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

      {/* Cảnh báo sắp hết hạn */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="card-title mb-1">
                Cảnh báo lô sắp hết hạn
              </h5>

              <p className="text-muted small mb-0">
                Các lô sẽ hết hạn trong vòng 30 ngày.
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
                      Không có lô sắp hết hạn.
                    </td>
                  </tr>
                ) : (
                  expiringBatches.map((batch) => (
                    <tr key={batch.id}>
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
                        {formatNumber(batch.quantity)}
                      </td>

                      <td>
                        {formatNumber(batch.container_quantity)} container
                      </td>

                      <td>
                        {formatDate(batch.expiry_date)}
                      </td>

                      <td>
                        <span className="badge bg-warning text-dark">
                          Còn {batch.days_until_expiry} ngày
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
            Dashboard hiện theo nghiệp vụ kho bãi: tập trung vào số lượng, container, lô hàng, hạn sử dụng và phí lưu kho khi xuất hàng.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;