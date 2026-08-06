import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  getProducts,
  deactivateProduct,
} from "../api/productApi";

import { getCategories } from "../api/categoryApi";
import { useAuth } from "../contexts/AuthContext";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="64" height="64" rx="8" fill="#eef2f7"/>
      <path d="M18 21h28v24H18z" fill="#d6dee8"/>
      <path d="M22 39l7-8 5 5 4-4 6 7H22z" fill="#9aa8b8"/>
      <circle cx="39" cy="27" r="4" fill="#9aa8b8"/>
    </svg>
  `);

function ProductListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [
    loadingCategories,
    setLoadingCategories,
  ] = useState(true);

  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");

  const [
    debouncedKeyword,
    setDebouncedKeyword,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [sortBy, setSortBy] =
    useState("newest");

  const [pageSize, setPageSize] =
    useState(10);

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total_items: 0,
      total_pages: 1,
      has_previous_page: false,
      has_next_page: false,
    });

  /*
  |--------------------------------------------------------------------------
  | Phân quyền
  |--------------------------------------------------------------------------
  */

  const canCreateProduct = [
    "ADMIN",
    "MANAGER",
    "STAFF",
  ].includes(currentRole);

  const canEditProduct = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const canDeactivateProduct = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  /*
  |--------------------------------------------------------------------------
  | Tải danh mục
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadCategories();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Trì hoãn tìm kiếm
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedKeyword(
        keyword.trim()
      );
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

  /*
  |--------------------------------------------------------------------------
  | Quay về trang đầu khi thay đổi bộ lọc
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedKeyword,
    categoryFilter,
    statusFilter,
    sortBy,
    pageSize,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Tải sản phẩm
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProducts();
  }, [
    currentPage,
    pageSize,
    debouncedKeyword,
    categoryFilter,
    statusFilter,
    sortBy,
  ]);

  async function loadCategories() {
    try {
      setLoadingCategories(true);

      const data =
        await getCategories();

      setCategories(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải danh mục:",
        err
      );

      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts({
        page: currentPage,
        limit: pageSize,

        keyword:
          debouncedKeyword ||
          undefined,

        category_id:
          categoryFilter ||
          undefined,

        status:
          statusFilter ||
          undefined,

        sort_by: sortBy,
      });

      const productRows =
        Array.isArray(
          data?.products
        )
          ? data.products
          : [];

      const paginationData =
        data?.pagination || {};

      setProducts(productRows);

      setPagination({
        page: Number(
          paginationData.page ||
            currentPage
        ),

        limit: Number(
          paginationData.limit ||
            pageSize
        ),

        total_items: Number(
          paginationData.total_items ||
            0
        ),

        total_pages: Math.max(
          1,
          Number(
            paginationData.total_pages ||
              1
          )
        ),

        has_previous_page:
          Boolean(
            paginationData
              .has_previous_page
          ),

        has_next_page:
          Boolean(
            paginationData
              .has_next_page
          ),
      });
    } catch (err) {
      console.error(
        "Lỗi tải danh sách sản phẩm:",
        err
      );

      setProducts([]);

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
          "Không thể tải danh sách sản phẩm."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Ngừng hoạt động sản phẩm
  |--------------------------------------------------------------------------
  */

  async function handleDeactivate(product) {
    if (!canDeactivateProduct) {
      alert(
        "Bạn không có quyền ngừng hoạt động sản phẩm."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn ngừng hoạt động sản phẩm "${product.name}" không?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deactivateProduct(
        product.id
      );

      alert(
        "Đã ngừng hoạt động sản phẩm."
      );

      await loadProducts();
    } catch (err) {
      console.error(
        "Lỗi ngừng hoạt động sản phẩm:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Không thể ngừng hoạt động sản phẩm."
      );
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
    setCategoryFilter("");
    setStatusFilter("");
    setSortBy("newest");
    setPageSize(10);
    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý ảnh lỗi
  |--------------------------------------------------------------------------
  */

  function handleImageError(event) {
    event.currentTarget.onerror =
      null;

    event.currentTarget.src =
      PLACEHOLDER_IMAGE;
  }

  /*
  |--------------------------------------------------------------------------
  | Hiển thị tồn tối thiểu
  |--------------------------------------------------------------------------
  */

  function renderMinimumStock(product) {
    const minimumStock = Number(
      product.minimum_stock || 0
    );

    if (minimumStock <= 0) {
      return (
        <div>
          <span className="fw-semibold">
            0
          </span>

          <div className="mt-1">
            <span className="badge bg-secondary">
              Chưa thiết lập
            </span>
          </div>
        </div>
      );
    }

    return (
      <div>
        <span className="fw-semibold">
          {minimumStock.toLocaleString(
            "vi-VN"
          )}
        </span>

        <div className="mt-1">
          <span className="badge bg-info text-dark">
            Đã thiết lập
          </span>
        </div>
      </div>
    );
  }

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

  const visiblePages =
    useMemo(() => {
      const maximumVisiblePages =
        5;

      let startPage = Math.max(
        1,
        currentPage -
          Math.floor(
            maximumVisiblePages /
              2
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
    }, [
      currentPage,
      totalPages,
    ]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Danh sách sản phẩm
          </h1>

          <p className="text-muted mb-0">
            {canEditProduct
              ? "Quản lý thông tin và mức tồn tối thiểu của sản phẩm."
              : "Xem và thêm sản phẩm mới phục vụ nhập kho."}
          </p>
        </div>

        {canCreateProduct && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              navigate(
                "/products/create"
              )
            }
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm sản phẩm
          </button>
        )}
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn được thêm sản phẩm mới nhưng
          không được sửa hoặc ngừng hoạt
          động sản phẩm đã có.
        </div>
      )}

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
                htmlFor="product-keyword"
              >
                Tìm kiếm
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>

                <input
                  id="product-keyword"
                  type="search"
                  className="form-control"
                  placeholder="Tên sản phẩm, mã SKU..."
                  value={keyword}
                  onChange={(event) =>
                    setKeyword(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="category-filter"
              >
                Danh mục
              </label>

              <select
                id="category-filter"
                className="form-select"
                value={categoryFilter}
                disabled={
                  loadingCategories
                }
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {loadingCategories
                    ? "Đang tải danh mục..."
                    : "Tất cả danh mục"}
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="status-filter"
              >
                Trạng thái
              </label>

              <select
                id="status-filter"
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Tất cả trạng thái
                </option>

                <option value="active">
                  Đang hoạt động
                </option>

                <option value="inactive">
                  Ngừng hoạt động
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
              >
                <i className="bi bi-arrow-counterclockwise me-2" />
                Xóa lọc
              </button>
            </div>

            <div className="col-xl-4 col-lg-6">
              <label
                className="form-label"
                htmlFor="sort-filter"
              >
                Sắp xếp theo
              </label>

              <select
                id="sort-filter"
                className="form-select"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
              >
                <option value="newest">
                  ID mới nhất
                </option>

                <option value="oldest">
                  ID cũ nhất
                </option>

                <option value="name_asc">
                  Tên A đến Z
                </option>

                <option value="name_desc">
                  Tên Z đến A
                </option>

                <option value="sku_asc">
                  SKU tăng dần
                </option>

                <option value="sku_desc">
                  SKU giảm dần
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="page-size"
              >
                Số dòng mỗi trang
              </label>

              <select
                id="page-size"
                className="form-select"
                value={pageSize}
                onChange={(event) =>
                  setPageSize(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                <option value={5}>
                  5 sản phẩm
                </option>

                <option value={10}>
                  10 sản phẩm
                </option>

                <option value={20}>
                  20 sản phẩm
                </option>

                <option value={50}>
                  50 sản phẩm
                </option>
              </select>
            </div>

            <div className="col-xl-5 col-lg-12">
              <div className="text-muted">
                Tìm thấy{" "}
                <strong className="text-dark">
                  {totalItems}
                </strong>{" "}
                sản phẩm
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>
                    STT
                  </th>

                  <th style={{ width: 90 }}>
                    Ảnh
                  </th>

                  <th>Mã sản phẩm</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Tồn tối thiểu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center text-muted py-5"
                    >
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />

                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : products.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-box-seam fs-2 d-block mb-2" />
                      Không tìm thấy sản phẩm
                      phù hợp.
                    </td>
                  </tr>
                ) : (
                  products.map(
                    (
                      product,
                      index
                    ) => (
                      <tr
                        key={product.id}
                      >
                        <td>
                          {firstItemNumber +
                            index}
                        </td>

                        <td>
                          <img
                            src={
                              product.image_url ||
                              PLACEHOLDER_IMAGE
                            }
                            alt={
                              product.name ||
                              "Ảnh sản phẩm"
                            }
                            width="56"
                            height="56"
                            className="rounded border bg-light"
                            style={{
                              objectFit:
                                "contain",
                            }}
                            onError={
                              handleImageError
                            }
                          />
                        </td>

                        <td>
                          <span className="fw-semibold">
                            {product.sku ||
                              "Không có"}
                          </span>
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {product.name}
                          </div>

                          <div className="text-muted small">
                            ID:{" "}
                            {product.id}
                          </div>
                        </td>

                        <td>
                          {product.category_name ||
                            "Chưa phân loại"}
                        </td>

                        <td>
                          {renderMinimumStock(
                            product
                          )}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              product.status ===
                              "active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {product.status ===
                            "active"
                              ? "Đang hoạt động"
                              : "Ngừng hoạt động"}
                          </span>
                        </td>

                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                navigate(
                                  `/products/${product.id}`
                                )
                              }
                            >
                              Xem
                            </button>

                            {canEditProduct && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                onClick={() =>
                                  navigate(
                                    `/products/${product.id}/edit`
                                  )
                                }
                              >
                                Sửa
                              </button>
                            )}

                            {canDeactivateProduct &&
                              product.status ===
                                "active" && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() =>
                                    handleDeactivate(
                                      product
                                    )
                                  }
                                >
                                  Ngừng hoạt động
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-3 mt-2">
            <div className="text-muted small">
              Hiển thị{" "}
              <strong>
                {firstItemNumber}
              </strong>{" "}
              đến{" "}
              <strong>
                {lastItemNumber}
              </strong>{" "}
              trên tổng{" "}
              <strong>
                {totalItems}
              </strong>{" "}
              sản phẩm
            </div>

            <nav aria-label="Phân trang sản phẩm">
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
                      currentPage ===
                        1 ||
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
        </div>
      </div>
    </div>
  );
}

export default ProductListPage;