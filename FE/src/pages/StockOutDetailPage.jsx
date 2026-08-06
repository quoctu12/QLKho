import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { getStockOutById } from "../api/stockOutApi";

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

function StockOutDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const printRef = useRef(null);

  const [stockOut, setStockOut] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    exportingPdf,
    setExportingPdf,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Tải chi tiết phiếu xuất
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadStockOut();
  }, [id]);

  async function loadStockOut() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getStockOutById(id);

      setStockOut(data);
    } catch (err) {
      console.error(
        "Lỗi tải chi tiết phiếu xuất:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể tải chi tiết phiếu xuất."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng dữ liệu
  |--------------------------------------------------------------------------
  */

  function formatDate(value) {
    const timestamp =
      toDateOnlyTimestamp(value);

    if (timestamp === null) {
      return "Không có";
    }

    return new Date(
      timestamp
    ).toLocaleDateString(
      "vi-VN",
      {
        timeZone: "UTC",
      }
    );
  }

  function formatCurrency(value) {
    return Number(
      value || 0
    ).toLocaleString(
      "vi-VN",
      {
        style: "currency",
        currency: "VND",
      }
    );
  }

  function formatNumber(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN");
  }

  function formatMultiplier(value) {
    const numberValue =
      Number(value || 1);

    return `${numberValue.toLocaleString(
      "vi-VN",
      {
        maximumFractionDigits: 2,
      }
    )} lần`;
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy tên vị trí
  |--------------------------------------------------------------------------
  */

  function getLocationName(detail) {
    if (
      detail.location_code &&
      detail.location_name
    ) {
      return `${detail.location_code} - ${detail.location_name}`;
    }

    if (detail.location_code) {
      return detail.location_code;
    }

    if (detail.location_name) {
      return detail.location_name;
    }

    return "Chưa có vị trí";
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy dữ liệu phí, tương thích cả phiếu cũ
  |--------------------------------------------------------------------------
  */

  function getRegularStorageDays(detail) {
    if (
      detail.regular_storage_days !==
        null &&
      detail.regular_storage_days !==
        undefined
    ) {
      return Number(
        detail.regular_storage_days ||
          0
      );
    }

    return Number(
      detail.storage_days || 0
    );
  }

  function getOverdueStorageDays(detail) {
    return Number(
      detail.overdue_storage_days ||
        0
    );
  }

  function getOverdueMultiplier(detail) {
    return Number(
      detail.overdue_multiplier ||
        1
    );
  }

  function getRegularStorageAmount(
    detail
  ) {
    if (
      detail.regular_storage_amount !==
        null &&
      detail.regular_storage_amount !==
        undefined
    ) {
      return Number(
        detail.regular_storage_amount ||
          0
      );
    }

    return Number(
      detail.total_storage_amount ||
        0
    );
  }

  function getOverdueStorageAmount(
    detail
  ) {
    return Number(
      detail.overdue_storage_amount ||
        0
    );
  }

  function getTotalStorageAmount(
    detail
  ) {
    if (
      detail.total_storage_amount !==
        null &&
      detail.total_storage_amount !==
        undefined
    ) {
      return Number(
        detail.total_storage_amount ||
          0
      );
    }

    return (
      getRegularStorageAmount(
        detail
      ) +
      getOverdueStorageAmount(
        detail
      )
    );
  }

  function isOverdueDetail(detail) {
    return (
      getOverdueStorageDays(
        detail
      ) > 0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Tính tổng
  |--------------------------------------------------------------------------
  */

  function calculateTotals(details) {
    return details.reduce(
      (result, detail) => ({
        totalQuantity:
          result.totalQuantity +
          Number(
            detail.quantity || 0
          ),

        totalContainers:
          result.totalContainers +
          Number(
            detail.container_quantity ||
              0
          ),

        totalRegularAmount:
          result.totalRegularAmount +
          getRegularStorageAmount(
            detail
          ),

        totalOverdueAmount:
          result.totalOverdueAmount +
          getOverdueStorageAmount(
            detail
          ),

        totalStorageAmount:
          result.totalStorageAmount +
          getTotalStorageAmount(
            detail
          ),

        overdueBatchCount:
          result.overdueBatchCount +
          (
            isOverdueDetail(detail)
              ? 1
              : 0
          ),

        maxOverdueDays:
          Math.max(
            result.maxOverdueDays,

            getOverdueStorageDays(
              detail
            )
          ),
      }),
      {
        totalQuantity: 0,
        totalContainers: 0,
        totalRegularAmount: 0,
        totalOverdueAmount: 0,
        totalStorageAmount: 0,
        overdueBatchCount: 0,
        maxOverdueDays: 0,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Xuất PDF
  |--------------------------------------------------------------------------
  */

  async function handleExportPdf() {
    if (
      !printRef.current ||
      !stockOut
    ) {
      return;
    }

    try {
      setExportingPdf(true);

      const canvas =
        await html2canvas(
          printRef.current,
          {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#ffffff",
            logging: false,
          }
        );

      const imageData =
        canvas.toDataURL(
          "image/png",
          1
        );

      /*
       * Dùng khổ ngang vì bảng có nhiều cột.
       */
      const pdf = new jsPDF(
        "l",
        "mm",
        "a4"
      );

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 8;

      const printableWidth =
        pageWidth - margin * 2;

      const printableHeight =
        pageHeight - margin * 2;

      const imageHeight =
        (
          canvas.height *
          printableWidth
        ) / canvas.width;

      let remainingHeight =
        imageHeight;

      let positionY = margin;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        positionY,
        printableWidth,
        imageHeight
      );

      remainingHeight -=
        printableHeight;

      while (
        remainingHeight > 0
      ) {
        pdf.addPage();

        positionY =
          margin -
          (
            imageHeight -
            remainingHeight
          );

        pdf.addImage(
          imageData,
          "PNG",
          margin,
          positionY,
          printableWidth,
          imageHeight
        );

        remainingHeight -=
          printableHeight;
      }

      const fileName =
        `phieu-xuat-PX-${String(
          stockOut.id
        ).padStart(
          4,
          "0"
        )}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error(
        "Lỗi xuất PDF:",
        err
      );

      alert(
        "Không thể xuất file PDF."
      );
    } finally {
      setExportingPdf(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | In phiếu
  |--------------------------------------------------------------------------
  */

  function handlePrint() {
    if (
      !printRef.current ||
      !stockOut
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=850"
      );

    if (!printWindow) {
      alert(
        "Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup."
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html lang="vi">
        <head>
          <meta charset="UTF-8" />

          <title>
            Phiếu xuất PX-${String(
              stockOut.id
            ).padStart(4, "0")}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 18px;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }

            .print-document {
              width: 100%;
              margin: 0 auto;
            }

            .print-header {
              text-align: center;
              margin-bottom: 20px;
            }

            .print-header h1 {
              margin: 0 0 8px;
              font-size: 25px;
              text-transform: uppercase;
            }

            .print-header p {
              margin: 4px 0;
            }

            .print-info {
              width: 100%;
              margin-bottom: 18px;
              border-collapse: collapse;
            }

            .print-info td {
              width: 50%;
              padding: 5px 7px;
              vertical-align: top;
              font-size: 12px;
            }

            .product-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            .product-table th,
            .product-table td {
              border: 1px solid #000;
              padding: 5px;
              font-size: 9px;
              vertical-align: middle;
            }

            .product-table th {
              text-align: center;
              font-weight: bold;
            }

            .text-center {
              text-align: center !important;
            }

            .text-end {
              text-align: right !important;
            }

            .signature-table {
              width: 100%;
              margin-top: 35px;
              border-collapse: collapse;
            }

            .signature-table td {
              width: 33.33%;
              text-align: center;
              vertical-align: top;
              padding: 0 10px;
            }

            .signature-space {
              height: 75px;
            }

            .signature-note {
              font-size: 11px;
              font-style: italic;
            }

            @page {
              size: A4 landscape;
              margin: 9mm;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  /*
  |--------------------------------------------------------------------------
  | Trạng thái tải dữ liệu
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <span
          className="spinner-border spinner-border-sm"
          role="status"
        />

        Đang tải chi tiết phiếu xuất...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  if (!stockOut) {
    return (
      <div className="alert alert-warning">
        Không tìm thấy phiếu xuất.
      </div>
    );
  }

  const details =
    Array.isArray(
      stockOut.details
    )
      ? stockOut.details
      : [];

  const stockOutCode =
    `PX-${String(
      stockOut.id
    ).padStart(
      4,
      "0"
    )}`;

  const totals =
    calculateTotals(details);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Chi tiết phiếu xuất{" "}
            {stockOutCode}
          </h1>

          <p className="text-muted mb-0">
            Phí lưu kho được quyết toán theo số container thực sự được giải phóng.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-danger"
            disabled={
              exportingPdf
            }
            onClick={
              handleExportPdf
            }
          >
            <i className="bi bi-file-earmark-pdf me-2" />

            {exportingPdf
              ? "Đang xuất PDF..."
              : "Xuất PDF"}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={
              handlePrint
            }
          >
            <i className="bi bi-printer me-2" />

            In phiếu
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(
                "/stock-outs"
              )
            }
          >
            Quay lại
          </button>
        </div>
      </div>

      {totals.overdueBatchCount >
        0 && (
        <div className="alert alert-warning">
          <strong>
            Cảnh báo:
          </strong>{" "}
          Phiếu xuất có{" "}
          <strong>
            {formatNumber(
              totals.overdueBatchCount
            )} lô
          </strong>{" "}
          quá thời hạn lưu kho. Thời gian quá hạn cao nhất là{" "}
          <strong>
            {formatNumber(
              totals.maxOverdueDays
            )} ngày
          </strong>
          .
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Thông tin phiếu xuất
          </h5>

          <div className="row g-3">
            <div className="col-md-4">
              <span className="text-muted">
                Kho
              </span>

              <div className="fw-semibold">
                {stockOut.warehouse_name ||
                  "Không có"}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Cổng xuất
              </span>

              <div className="fw-semibold">
                {stockOut.gate_name ||
                  "Không có"}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Ngày xuất
              </span>

              <div className="fw-semibold">
                {formatDate(
                  stockOut.export_date
                )}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Quy tắc xuất
              </span>

              <div>
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
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Người tạo
              </span>

              <div className="fw-semibold">
                {stockOut.created_by ||
                  "Không có"}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Tổng số lượng xuất
              </span>

              <div className="fw-semibold">
                {formatNumber(
                  totals.totalQuantity
                )}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Container quyết toán
              </span>

              <div className="fw-semibold text-primary">
                {formatNumber(
                  totals.totalContainers
                )}{" "}
                container
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Phí trong hạn
              </span>

              <div className="fw-semibold">
                {formatCurrency(
                  totals.totalRegularAmount
                )}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Phí quá hạn
              </span>

              <div
                className={`fw-semibold ${
                  totals.totalOverdueAmount >
                  0
                    ? "text-danger"
                    : ""
                }`}
              >
                {formatCurrency(
                  totals.totalOverdueAmount
                )}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Tổng phí lưu kho
              </span>

              <div className="fw-bold text-success">
                {formatCurrency(
                  totals.totalStorageAmount
                )}
              </div>
            </div>

            <div className="col-md-8">
              <span className="text-muted">
                Ghi chú
              </span>

              <div className="fw-semibold">
                {stockOut.note ||
                  "Không có ghi chú"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Chi tiết lô hàng xuất
          </h5>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>
                    Sản phẩm
                  </th>

                  <th>
                    Lô và vị trí
                  </th>

                  <th>
                    Thời hạn lưu
                  </th>

                  <th>
                    Số lượng xuất
                  </th>

                  <th>
                    Container quyết toán
                  </th>

                  <th>
                    Số ngày lưu
                  </th>

                  <th>
                    Đơn giá và hệ số
                  </th>

                  <th>
                    Phí trong hạn
                  </th>

                  <th>
                    Phí quá hạn
                  </th>

                  <th>
                    Tổng phí
                  </th>
                </tr>
              </thead>

              <tbody>
                {details.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="text-center text-muted"
                    >
                      Phiếu xuất chưa có sản phẩm.
                    </td>
                  </tr>
                ) : (
                  details.map(
                    (
                      detail,
                      index
                    ) => {
                      const regularDays =
                        getRegularStorageDays(
                          detail
                        );

                      const overdueDays =
                        getOverdueStorageDays(
                          detail
                        );

                      const regularAmount =
                        getRegularStorageAmount(
                          detail
                        );

                      const overdueAmount =
                        getOverdueStorageAmount(
                          detail
                        );

                      const totalAmount =
                        getTotalStorageAmount(
                          detail
                        );

                      const isOverdue =
                        overdueDays > 0;

                      return (
                        <tr
                          key={
                            detail.id ||
                            `${detail.batch_id}-${index}`
                          }
                          className={
                            isOverdue
                              ? "table-warning"
                              : ""
                          }
                        >
                          <td
                            style={{
                              minWidth:
                                "220px",
                            }}
                          >
                            <strong>
                              {
                                detail.product_name
                              }
                            </strong>

                            <div className="text-muted small">
                              SKU:{" "}
                              {detail.sku ||
                                "Không có"}
                            </div>

                            {isOverdue && (
                              <span className="badge bg-danger mt-1">
                                Quá hạn lưu kho
                              </span>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "200px",
                            }}
                          >
                            <div>
                              <strong>
                                Mã lô:{" "}
                                {detail.batch_code ||
                                  "Không có"}
                              </strong>
                            </div>

                            <div className="small text-muted">
                              {getLocationName(
                                detail
                              )}
                            </div>

                            <div className="small text-muted">
                              Ngày nhập:{" "}
                              {formatDate(
                                detail.import_date
                              )}
                            </div>

                            {detail.expiry_date && (
                              <div className="small text-muted">
                                Hạn sử dụng:{" "}
                                {formatDate(
                                  detail.expiry_date
                                )}
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "175px",
                            }}
                          >
                            <div>
                              Tối đa:{" "}
                              <strong>
                                {formatNumber(
                                  detail.max_storage_days
                                )}{" "}
                                ngày
                              </strong>
                            </div>

                            <div className="small text-muted">
                              Ngày cuối trong hạn:{" "}
                              {formatDate(
                                detail.storage_due_date
                              )}
                            </div>

                            {isOverdue ? (
                              <div className="small text-danger fw-semibold">
                                Quá hạn{" "}
                                {formatNumber(
                                  overdueDays
                                )}{" "}
                                ngày
                              </div>
                            ) : (
                              <div className="small text-success">
                                Xuất trong thời hạn
                              </div>
                            )}
                          </td>

                          <td className="text-nowrap">
                            <strong>
                              {formatNumber(
                                detail.quantity
                              )}
                            </strong>
                          </td>

                          <td className="text-nowrap">
                            <strong className="text-primary">
                              {formatNumber(
                                detail.container_quantity
                              )}{" "}
                              container
                            </strong>

                            {Number(
                              detail.container_quantity ||
                                0
                            ) === 0 && (
                              <div className="small text-muted">
                                Chưa giải phóng container
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "155px",
                            }}
                          >
                            <div>
                              Tổng:{" "}
                              <strong>
                                {formatNumber(
                                  detail.storage_days
                                )}{" "}
                                ngày
                              </strong>
                            </div>

                            <div className="small text-success">
                              Trong hạn:{" "}
                              {formatNumber(
                                regularDays
                              )}{" "}
                              ngày
                            </div>

                            <div
                              className={`small ${
                                overdueDays >
                                0
                                  ? "text-danger fw-semibold"
                                  : "text-muted"
                              }`}
                            >
                              Quá hạn:{" "}
                              {formatNumber(
                                overdueDays
                              )}{" "}
                              ngày
                            </div>
                          </td>

                          <td
                            style={{
                              minWidth:
                                "170px",
                            }}
                          >
                            <div>
                              {formatCurrency(
                                detail.storage_unit_price
                              )}
                            </div>

                            <div className="small text-muted">
                              / container / ngày
                            </div>

                            <div
                              className={`small ${
                                isOverdue
                                  ? "text-danger fw-semibold"
                                  : "text-muted"
                              }`}
                            >
                              Hệ số quá hạn:{" "}
                              {formatMultiplier(
                                getOverdueMultiplier(
                                  detail
                                )
                              )}
                            </div>
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
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>

              <tfoot>
                <tr>
                  <th
                    colSpan="3"
                    className="text-end"
                  >
                    Tổng cộng
                  </th>

                  <th>
                    {formatNumber(
                      totals.totalQuantity
                    )}
                  </th>

                  <th>
                    {formatNumber(
                      totals.totalContainers
                    )}{" "}
                    container
                  </th>

                  <th colSpan="2">
                    Tổng phí
                  </th>

                  <th>
                    {formatCurrency(
                      totals.totalRegularAmount
                    )}
                  </th>

                  <th className="text-danger">
                    {formatCurrency(
                      totals.totalOverdueAmount
                    )}
                  </th>

                  <th className="text-success">
                    {formatCurrency(
                      totals.totalStorageAmount
                    )}
                  </th>
                </tr>
              </tfoot>
            </table>
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

      {/*
       * Mẫu phiếu dùng riêng cho xuất PDF và in.
       */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "1450px",
          backgroundColor:
            "#ffffff",
          color: "#000000",
          zIndex: -1,
        }}
      >
        <div
          ref={printRef}
          className="print-document"
          style={{
            width: "100%",
            padding: "28px",
            backgroundColor:
              "#ffffff",
            color: "#000000",
            fontFamily:
              "Arial, Helvetica, sans-serif",
          }}
        >
          <div
            className="print-header"
            style={{
              textAlign:
                "center",
              marginBottom:
                "20px",
            }}
          >
            <h1
              style={{
                margin:
                  "0 0 8px",
                fontSize:
                  "25px",
                textTransform:
                  "uppercase",
              }}
            >
              Phiếu xuất kho
            </h1>

            <p
              style={{
                margin:
                  "4px 0",
                fontWeight:
                  "bold",
              }}
            >
              Mã phiếu:{" "}
              {stockOutCode}
            </p>

            <p
              style={{
                margin:
                  "4px 0",
              }}
            >
              Ngày xuất:{" "}
              {formatDate(
                stockOut.export_date
              )}
            </p>
          </div>

          <table
            className="print-info"
            style={{
              width: "100%",
              marginBottom:
                "18px",
              borderCollapse:
                "collapse",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "50%",
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Kho xuất:
                  </strong>{" "}
                  {stockOut.warehouse_name ||
                    "Không có"}
                </td>

                <td
                  style={{
                    width: "50%",
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Cổng xuất:
                  </strong>{" "}
                  {stockOut.gate_name ||
                    "Không có"}
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Quy tắc xuất:
                  </strong>{" "}
                  {stockOut.export_rule ||
                    "Không có"}
                </td>

                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Người lập:
                  </strong>{" "}
                  {stockOut.created_by ||
                    "Không có"}
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Tổng số lượng:
                  </strong>{" "}
                  {formatNumber(
                    totals.totalQuantity
                  )}
                </td>

                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Container quyết toán:
                  </strong>{" "}
                  {formatNumber(
                    totals.totalContainers
                  )}{" "}
                  container
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Phí trong hạn:
                  </strong>{" "}
                  {formatCurrency(
                    totals.totalRegularAmount
                  )}
                </td>

                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Phí quá hạn:
                  </strong>{" "}
                  {formatCurrency(
                    totals.totalOverdueAmount
                  )}
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Tổng phí:
                  </strong>{" "}
                  {formatCurrency(
                    totals.totalStorageAmount
                  )}
                </td>

                <td
                  style={{
                    padding:
                      "5px 7px",
                  }}
                >
                  <strong>
                    Ghi chú:
                  </strong>{" "}
                  {stockOut.note ||
                    "Không có ghi chú"}
                </td>
              </tr>
            </tbody>
          </table>

          <table
            className="product-table"
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              marginTop:
                "10px",
            }}
          >
            <thead>
              <tr>
                {[
                  "STT",
                  "Sản phẩm",
                  "Lô / vị trí",
                  "SL xuất",
                  "Container QT",
                  "Tổng ngày",
                  "Trong hạn",
                  "Quá hạn",
                  "Đơn giá",
                  "Hệ số",
                  "Phí trong hạn",
                  "Phí quá hạn",
                  "Tổng phí",
                ].map(
                  (title) => (
                    <th
                      key={
                        title
                      }
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "center",
                      }}
                    >
                      {title}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {details.map(
                (
                  detail,
                  index
                ) => (
                  <tr
                    key={
                      detail.id ||
                      `${detail.batch_id}-${index}`
                    }
                  >
                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "center",
                      }}
                    >
                      {index + 1}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                      }}
                    >
                      {
                        detail.product_name
                      }

                      <div>
                        SKU:{" "}
                        {detail.sku ||
                          "Không có"}
                      </div>
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                      }}
                    >
                      <div>
                        Lô:{" "}
                        {detail.batch_code ||
                          "Không có"}
                      </div>

                      <div>
                        {getLocationName(
                          detail
                        )}
                      </div>

                      <div>
                        Nhập:{" "}
                        {formatDate(
                          detail.import_date
                        )}
                      </div>

                      <div>
                        Hạn lưu:{" "}
                        {formatDate(
                          detail.storage_due_date
                        )}
                      </div>
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatNumber(
                        detail.quantity
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatNumber(
                        detail.container_quantity
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatNumber(
                        detail.storage_days
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatNumber(
                        getRegularStorageDays(
                          detail
                        )
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatNumber(
                        getOverdueStorageDays(
                          detail
                        )
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatCurrency(
                        detail.storage_unit_price
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatMultiplier(
                        getOverdueMultiplier(
                          detail
                        )
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatCurrency(
                        getRegularStorageAmount(
                          detail
                        )
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                      }}
                    >
                      {formatCurrency(
                        getOverdueStorageAmount(
                          detail
                        )
                      )}
                    </td>

                    <td
                      style={{
                        border:
                          "1px solid #000",
                        padding:
                          "5px",
                        fontSize:
                          "9px",
                        textAlign:
                          "right",
                        fontWeight:
                          "bold",
                      }}
                    >
                      {formatCurrency(
                        getTotalStorageAmount(
                          detail
                        )
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>

            <tfoot>
              <tr>
                <th
                  colSpan="4"
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                    textAlign:
                      "right",
                  }}
                >
                  Tổng cộng
                </th>

                <th
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                    textAlign:
                      "right",
                  }}
                >
                  {formatNumber(
                    totals.totalContainers
                  )}
                </th>

                <th
                  colSpan="5"
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                  }}
                />

                <th
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                    textAlign:
                      "right",
                  }}
                >
                  {formatCurrency(
                    totals.totalRegularAmount
                  )}
                </th>

                <th
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                    textAlign:
                      "right",
                  }}
                >
                  {formatCurrency(
                    totals.totalOverdueAmount
                  )}
                </th>

                <th
                  style={{
                    border:
                      "1px solid #000",
                    padding:
                      "5px",
                    textAlign:
                      "right",
                  }}
                >
                  {formatCurrency(
                    totals.totalStorageAmount
                  )}
                </th>
              </tr>
            </tfoot>
          </table>

          <table
            className="signature-table"
            style={{
              width: "100%",
              marginTop:
                "35px",
              borderCollapse:
                "collapse",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width:
                      "33.33%",
                    textAlign:
                      "center",
                  }}
                >
                  <strong>
                    Người nhận hàng
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize:
                        "11px",
                      fontStyle:
                        "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height:
                        "75px",
                    }}
                  />
                </td>

                <td
                  style={{
                    width:
                      "33.33%",
                    textAlign:
                      "center",
                  }}
                >
                  <strong>
                    Thủ kho
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize:
                        "11px",
                      fontStyle:
                        "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height:
                        "75px",
                    }}
                  />
                </td>

                <td
                  style={{
                    width:
                      "33.33%",
                    textAlign:
                      "center",
                  }}
                >
                  <strong>
                    Người lập phiếu
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize:
                        "11px",
                      fontStyle:
                        "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height:
                        "75px",
                    }}
                  />

                  <strong>
                    {stockOut.created_by ||
                      ""}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StockOutDetailPage;