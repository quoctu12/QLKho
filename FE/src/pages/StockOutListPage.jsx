import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getStockOuts } from "../api/stockOutApi";
import { getWarehouses } from "../api/warehouseApi";

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

function StockOutListPage() {
  const navigate = useNavigate();

  const [stockOuts, setStockOuts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [exportRuleFilter, setExportRuleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_previous_page: false,
    has_next_page: false,
  });

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách kho
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWarehouses();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Trì hoãn tìm kiếm 400ms
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

  /*
  |--------------------------------------------------------------------------
  | Khi thay đổi bộ lọc thì quay lại trang đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedKeyword,
    warehouseFilter,
    exportRuleFilter,
    dateFrom,
    dateTo,
    sortBy,
    pageSize,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách phiếu xuất
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadStockOuts();
  }, [
    currentPage,
    pageSize,
    debouncedKeyword,
    warehouseFilter,
    exportRuleFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  async function loadWarehouses() {
    try {
      setLoadingWarehouses(true);

      const data = await getWarehouses();

      setWarehouses(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải danh sách kho:",
        err
      );

      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }

  async function loadStockOuts() {
    try {
      setLoading(true);
      setError("");

      const data = await getStockOuts({
        page: currentPage,
        limit: pageSize,
        keyword: debouncedKeyword || undefined,
        warehouse_id: warehouseFilter || undefined,
        export_rule: exportRuleFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
      });

      const stockOutRows =
        Array.isArray(data?.stock_outs)
          ? data.stock_outs
          : [];

      const paginationData =
        data?.pagination || {};

      setStockOuts(stockOutRows);

      const responsePage = Number(
        paginationData.page || currentPage
      );

      const responseTotalPages = Math.max(
        1,
        Number(
          paginationData.total_pages || 1
        )
      );

      setPagination({
        page: responsePage,
        limit: Number(
          paginationData.limit || pageSize
        ),
        total_items: Number(
          paginationData.total_items || 0
        ),
        total_pages: responseTotalPages,
        has_previous_page: Boolean(
          paginationData.has_previous_page
        ),
        has_next_page: Boolean(
          paginationData.has_next_page
        ),
      });

      if (responsePage !== currentPage) {
        setCurrentPage(responsePage);
      }
    } catch (err) {
      console.error(
        "Lỗi tải phiếu xuất:",
        err
      );

      setStockOuts([]);

      setPagination({
        page: 1,
        limit: pageSize,
        total_items: 0,
        total_pages: 1,
        has_previous_page: false,
        has_next_page: false,
      });

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách phiếu xuất."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Đặt lại bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleResetFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setWarehouseFilter("");
    setExportRuleFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setPageSize(10);
    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng dữ liệu
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
      toDateOnlyTimestamp(value);

    if (timestamp === null) {
      return "Không có";
    }

    return new Date(
      timestamp
    ).toLocaleDateString("vi-VN", {
      timeZone: "UTC",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy trạng thái phí của phiếu xuất
  |--------------------------------------------------------------------------
  */

  function getFeeStatus(stockOut) {
    const regularAmount = Number(
      stockOut.total_regular_amount || 0
    );

    const overdueAmount = Number(
      stockOut.total_overdue_amount || 0
    );

    const totalAmount = Number(
      stockOut.total_amount || 0
    );

    if (totalAmount <= 0) {
      return {
        key: "no_fee",
        label: "Chưa phát sinh phí",
        className: "bg-secondary",
      };
    }

    if (overdueAmount > 0) {
      return {
        key: "overdue",
        label: "Có phí quá hạn",
        className: "bg-danger",
      };
    }

    if (regularAmount > 0) {
      return {
        key: "regular",
        label: "Trong hạn",
        className: "bg-success",
      };
    }

    return {
      key: "unknown",
      label: "Chưa xác định",
      className: "bg-dark",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Thông tin phân trang
  |--------------------------------------------------------------------------
  */

  const totalItems =
    pagination.total_items;

  const totalPages =
    pagination.total_pages;

  const firstItemNumber =
    totalItems === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastItemNumber =
    Math.min(
      currentPage * pageSize,
      totalItems
    );

  /*
  |--------------------------------------------------------------------------
  | Tổng phí của các phiếu đang hiển thị
  |--------------------------------------------------------------------------
  */

  const currentPageTotals =
    useMemo(
      () =>
        stockOuts.reduce(
          (result, stockOut) => ({
            containers:
              result.containers +
              Number(
                stockOut.total_containers ||
                  0
              ),

            regularAmount:
              result.regularAmount +
              Number(
                stockOut.total_regular_amount ||
                  0
              ),

            overdueAmount:
              result.overdueAmount +
              Number(
                stockOut.total_overdue_amount ||
                  0
              ),

            totalAmount:
              result.totalAmount +
              Number(
                stockOut.total_amount ||
                  0
              ),

            overdueVoucherCount:
              result.overdueVoucherCount +
              (
                Number(
                  stockOut.total_overdue_amount ||
                    0
                ) > 0
                  ? 1
                  : 0
              ),
          }),
          {
            containers: 0,
            regularAmount: 0,
            overdueAmount: 0,
            totalAmount: 0,
            overdueVoucherCount: 0,
          }
        ),
      [stockOuts]
    );

  /*
  |--------------------------------------------------------------------------
  | Hiển thị tối đa 5 nút trang
  |--------------------------------------------------------------------------
  */

  const visiblePages =
    useMemo(() => {
      const maximumVisiblePages = 5;

      let startPage = Math.max(
        1,
        currentPage -
          Math.floor(
            maximumVisiblePages / 2
          )
      );

      let endPage = Math.min(
        totalPages,
        startPage +
          maximumVisiblePages -
          1
      );

      startPage = Math.max(
        1,
        endPage -
          maximumVisiblePages +
          1
      );

      const pages = [];

      for (
        let page = startPage;
        page <= endPage;
        page += 1
      ) {
        pages.push(page);
      }

      return pages;
    }, [currentPage, totalPages]);

  return (
    <div>
      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Quản lý xuất kho
          </h1>

          <p className="text-muted mb-0">
            Theo dõi container quyết toán, phí trong hạn và phụ phí quá hạn.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate(
              "/stock-outs/create"
            )
          }
        >
          <i className="bi bi-plus-lg me-2" />

          Tạo phiếu xuất
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
          <div className="row g-3 align-items-end">
            <div className="col-xl-4 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-keyword"
              >
                Tìm kiếm
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>

                <input
                  id="stock-out-keyword"
                  type="search"
                  className="form-control"
                  value={keyword}
                  onChange={(event) =>
                    setKeyword(
                      event.target.value
                    )
                  }
                  placeholder="Mã phiếu, kho, cổng hoặc người tạo"
                />
              </div>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-warehouse-filter"
              >
                Kho
              </label>

              <select
                id="stock-out-warehouse-filter"
                className="form-select"
                value={warehouseFilter}
                disabled={
                  loadingWarehouses
                }
                onChange={(event) =>
                  setWarehouseFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {loadingWarehouses
                    ? "Đang tải kho..."
                    : "Tất cả kho"}
                </option>

                {warehouses.map(
                  (warehouse) => (
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouse.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="col-xl-2 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-rule-filter"
              >
                Quy tắc
              </label>

              <select
                id="stock-out-rule-filter"
                className="form-select"
                value={exportRuleFilter}
                onChange={(event) =>
                  setExportRuleFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Tất cả
                </option>

                <option value="FIFO">
                  FIFO
                </option>

                <option value="FEFO">
                  FEFO
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-sort"
              >
                Sắp xếp
              </label>

              <select
                id="stock-out-sort"
                className="form-select"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
              >
                <option value="newest">
                  Phiếu mới nhất
                </option>

                <option value="oldest">
                  Phiếu cũ nhất
                </option>

                <option value="date_desc">
                  Ngày xuất mới nhất
                </option>

                <option value="date_asc">
                  Ngày xuất cũ nhất
                </option>

                <option value="amount_desc">
                  Tổng phí cao nhất
                </option>

                <option value="amount_asc">
                  Tổng phí thấp nhất
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-date-from"
              >
                Từ ngày
              </label>

              <input
                id="stock-out-date-from"
                type="date"
                className="form-control"
                value={dateFrom}
                max={
                  dateTo || undefined
                }
                onChange={(event) =>
                  setDateFrom(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-date-to"
              >
                Đến ngày
              </label>

              <input
                id="stock-out-date-to"
                type="date"
                className="form-control"
                value={dateTo}
                min={
                  dateFrom || undefined
                }
                onChange={(event) =>
                  setDateTo(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="col-xl-2 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-page-size"
              >
                Số dòng
              </label>

              <select
                id="stock-out-page-size"
                className="form-select"
                value={pageSize}
                onChange={(event) =>
                  setPageSize(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value={5}>
                  5 dòng
                </option>

                <option value={10}>
                  10 dòng
                </option>

                <option value={20}>
                  20 dòng
                </option>

                <option value={50}>
                  50 dòng
                </option>
              </select>
            </div>

            <div className="col-xl-2 col-lg-6">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={
                  handleResetFilters
                }
                disabled={loading}
              >
                <i className="bi bi-arrow-counterclockwise me-2" />

                Xóa lọc
              </button>
            </div>

            <div className="col-xl-2 col-lg-12">
              <div className="text-muted">
                Tìm thấy{" "}
                <strong className="text-dark">
                  {formatNumber(
                    totalItems
                  )}
                </strong>{" "}
                phiếu
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tổng quan trang hiện tại */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">
                Container quyết toán
              </div>

              <div className="h5 mb-0 text-primary">
                {formatNumber(
                  currentPageTotals.containers
                )}{" "}
                container
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">
                Phí trong hạn
              </div>

              <div className="h5 mb-0">
                {formatCurrency(
                  currentPageTotals.regularAmount
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">
                Phí quá hạn
              </div>

              <div className="h5 mb-0 text-danger">
                {formatCurrency(
                  currentPageTotals.overdueAmount
                )}
              </div>

              <div className="small text-muted mt-1">
                {formatNumber(
                  currentPageTotals.overdueVoucherCount
                )}{" "}
                phiếu có phụ phí
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small mb-1">
                Tổng phí
              </div>

              <div className="h5 mb-0 text-success">
                {formatCurrency(
                  currentPageTotals.totalAmount
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách phiếu xuất */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Ngày xuất</th>
                  <th>Kho</th>
                  <th>Cổng xuất</th>
                  <th>Quy tắc</th>
                  <th>Người tạo</th>
                  <th>Số dòng</th>
                  <th>Container quyết toán</th>
                  <th>Phí trong hạn</th>
                  <th>Phí quá hạn</th>
                  <th>Tổng phí</th>
                  <th>Trạng thái phí</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="14"
                      className="text-center text-muted py-5"
                    >
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />

                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : stockOuts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="14"
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-box-arrow-up fs-2 d-block mb-2" />

                      Không tìm thấy phiếu xuất phù hợp.
                    </td>
                  </tr>
                ) : (
                  stockOuts.map(
                    (stockOut, index) => {
                      const regularAmount =
                        Number(
                          stockOut.total_regular_amount ||
                            0
                        );

                      const overdueAmount =
                        Number(
                          stockOut.total_overdue_amount ||
                            0
                        );

                      const totalAmount =
                        Number(
                          stockOut.total_amount ||
                            0
                        );

                      const feeStatus =
                        getFeeStatus(
                          stockOut
                        );

                      return (
                        <tr
                          key={stockOut.id}
                          className={
                            feeStatus.key ===
                            "overdue"
                              ? "table-warning"
                              : ""
                          }
                        >
                          <td>
                            {firstItemNumber +
                              index}
                          </td>

                          <td>
                            <strong>
                              PX-
                              {String(
                                stockOut.id
                              ).padStart(
                                4,
                                "0"
                              )}
                            </strong>
                          </td>

                          <td className="text-nowrap">
                            {formatDate(
                              stockOut.export_date
                            )}
                          </td>

                          <td>
                            {stockOut.warehouse_name ||
                              "Không có"}
                          </td>

                          <td>
                            {stockOut.gate_name ||
                              "Không có"}
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                stockOut.export_rule ===
                                "FEFO"
                                  ? "bg-warning text-dark"
                                  : "bg-primary"
                              }`}
                            >
                              {stockOut.export_rule ||
                                "Không có"}
                            </span>
                          </td>

                          <td>
                            {stockOut.created_by ||
                              "Không có"}
                          </td>

                          <td className="text-center">
                            {formatNumber(
                              stockOut.total_items
                            )}
                          </td>

                          <td className="text-nowrap">
                            <strong className="text-primary">
                              {formatNumber(
                                stockOut.total_containers
                              )}{" "}
                              container
                            </strong>

                            {Number(
                              stockOut.total_containers ||
                                0
                            ) === 0 && (
                              <div className="small text-muted">
                                Chưa giải phóng container
                              </div>
                            )}
                          </td>

                          <td className="text-nowrap">
                            <strong>
                              {formatCurrency(
                                regularAmount
                              )}
                            </strong>
                          </td>

                          <td className="text-nowrap">
                            <strong
                              className={
                                overdueAmount >
                                0
                                  ? "text-danger"
                                  : ""
                              }
                            >
                              {formatCurrency(
                                overdueAmount
                              )}
                            </strong>
                          </td>

                          <td className="text-nowrap">
                            <strong className="text-success">
                              {formatCurrency(
                                totalAmount
                              )}
                            </strong>
                          </td>

                          <td className="text-nowrap">
                            <span
                              className={`badge ${feeStatus.className}`}
                            >
                              {
                                feeStatus.label
                              }
                            </span>
                          </td>

                          <td className="text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                navigate(
                                  `/stock-outs/${stockOut.id}`
                                )
                              }
                            >
                              <i className="bi bi-eye me-1" />

                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>

              {!loading &&
                stockOuts.length >
                  0 && (
                  <tfoot>
                    <tr>
                      <th
                        colSpan="8"
                        className="text-end"
                      >
                        Tổng trang hiện tại
                      </th>

                      <th className="text-nowrap text-primary">
                        {formatNumber(
                          currentPageTotals.containers
                        )}{" "}
                        container
                      </th>

                      <th className="text-nowrap">
                        {formatCurrency(
                          currentPageTotals.regularAmount
                        )}
                      </th>

                      <th className="text-nowrap text-danger">
                        {formatCurrency(
                          currentPageTotals.overdueAmount
                        )}
                      </th>

                      <th className="text-nowrap text-success">
                        {formatCurrency(
                          currentPageTotals.totalAmount
                        )}
                      </th>

                      <th colSpan="2" />
                    </tr>
                  </tfoot>
                )}
            </table>
          </div>

          {/* Phân trang */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-3 mt-2">
            <div className="text-muted small">
              Hiển thị{" "}
              <strong>
                {formatNumber(
                  firstItemNumber
                )}
              </strong>{" "}
              đến{" "}
              <strong>
                {formatNumber(
                  lastItemNumber
                )}
              </strong>{" "}
              trên tổng{" "}
              <strong>
                {formatNumber(
                  totalItems
                )}
              </strong>{" "}
              phiếu xuất
            </div>

            <nav aria-label="Phân trang phiếu xuất">
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={
                      currentPage === 1 ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage
                        ) =>
                          Math.max(
                            1,
                            previousPage -
                              1
                          )
                      )
                    }
                  >
                    <i className="bi bi-chevron-left me-1" />

                    Trước
                  </button>
                </li>

                {visiblePages.map(
                  (page) => (
                    <li
                      key={page}
                      className={`page-item ${
                        currentPage ===
                        page
                          ? "active"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        disabled={loading}
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}

                <li
                  className={`page-item ${
                    currentPage ===
                    totalPages
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={
                      currentPage ===
                        totalPages ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage
                        ) =>
                          Math.min(
                            totalPages,
                            previousPage +
                              1
                          )
                      )
                    }
                  >
                    Sau

                    <i className="bi bi-chevron-right ms-1" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>
              Cách tính:
            </strong>{" "}
            Phí trong hạn = container quyết toán × số ngày trong hạn × đơn giá.
            Phí quá hạn = container quyết toán × số ngày quá hạn × đơn giá × hệ số quá hạn.
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockOutListPage;