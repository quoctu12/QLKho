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

import { getStockInById } from "../api/stockInApi";

function StockInDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const printRef = useRef(null);

  const [stockIn, setStockIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Tải chi tiết phiếu nhập
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadStockIn();
  }, [id]);

  async function loadStockIn() {
    try {
      setLoading(true);
      setError("");

      const data = await getStockInById(id);

      setStockIn(data);
    } catch (err) {
      console.error("Lỗi tải chi tiết phiếu nhập:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải chi tiết phiếu nhập."
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

  function getLocationName(detail) {
    if (detail.location_code && detail.location_name) {
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

  function calculateTotalContainers() {
    if (!Array.isArray(stockIn?.details)) {
      return 0;
    }

    return stockIn.details.reduce(
      (sum, detail) =>
        sum + Number(detail.container_quantity || 0),
      0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Xuất PDF
  |--------------------------------------------------------------------------
  */

  async function handleExportPdf() {
    if (!printRef.current || !stockIn) {
      return;
    }

    try {
      setExportingPdf(true);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imageData = canvas.toDataURL("image/png", 1);

      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const imageHeight =
        (canvas.height * printableWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let positionY = margin;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        positionY,
        printableWidth,
        imageHeight
      );

      remainingHeight -= printableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();

        positionY =
          margin - (imageHeight - remainingHeight);

        pdf.addImage(
          imageData,
          "PNG",
          margin,
          positionY,
          printableWidth,
          imageHeight
        );

        remainingHeight -= printableHeight;
      }

      const fileName = `phieu-nhap-PN-${String(
        stockIn.id
      ).padStart(4, "0")}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);

      alert("Không thể xuất file PDF.");
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
    if (!printRef.current || !stockIn) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
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
            Phiếu nhập PN-${String(stockIn.id).padStart(4, "0")}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }

            .print-document {
              width: 100%;
              max-width: 900px;
              margin: 0 auto;
            }

            .print-header {
              text-align: center;
              margin-bottom: 24px;
            }

            .print-header h1 {
              margin: 0 0 8px;
              font-size: 26px;
              text-transform: uppercase;
            }

            .print-header p {
              margin: 4px 0;
            }

            .print-info {
              width: 100%;
              margin-bottom: 22px;
              border-collapse: collapse;
            }

            .print-info td {
              width: 50%;
              padding: 6px 8px;
              vertical-align: top;
            }

            .product-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            .product-table th,
            .product-table td {
              border: 1px solid #000;
              padding: 8px;
              font-size: 13px;
              text-align: left;
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
              margin-top: 45px;
              border-collapse: collapse;
            }

            .signature-table td {
              width: 33.33%;
              text-align: center;
              vertical-align: top;
              padding: 0 10px;
            }

            .signature-space {
              height: 90px;
            }

            .signature-note {
              font-size: 12px;
              font-style: italic;
            }

            @page {
              size: A4;
              margin: 12mm;
            }

            @media print {
              body {
                padding: 0;
              }

              .print-document {
                max-width: none;
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
  | Loading / Error
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <p>
        Đang tải chi tiết phiếu nhập...
      </p>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  if (!stockIn) {
    return (
      <div className="alert alert-warning">
        Không tìm thấy phiếu nhập.
      </div>
    );
  }

  const details = Array.isArray(stockIn.details)
    ? stockIn.details
    : [];

  const stockInCode = `PN-${String(stockIn.id).padStart(4, "0")}`;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Chi tiết phiếu nhập {stockInCode}
          </h1>

          <p className="text-muted mb-0">
            Xem thông tin hàng nhập, vị trí lưu trữ và số container.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-danger"
            disabled={exportingPdf}
            onClick={handleExportPdf}
          >
            <i className="bi bi-file-earmark-pdf me-2" />

            {exportingPdf ? "Đang xuất PDF..." : "Xuất PDF"}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handlePrint}
          >
            <i className="bi bi-printer me-2" />
            In phiếu
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/stock-ins")}
          >
            Quay lại
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Thông tin phiếu nhập
          </h5>

          <div className="row g-3">
            <div className="col-md-4">
              <span className="text-muted">
                Nhà cung cấp
              </span>

              <div className="fw-semibold">
                {stockIn.supplier_name}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Kho
              </span>

              <div className="fw-semibold">
                {stockIn.warehouse_name}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Cổng nhập
              </span>

              <div className="fw-semibold">
                {stockIn.gate_name}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Ngày nhập
              </span>

              <div className="fw-semibold">
                {formatDate(stockIn.import_date)}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Người tạo
              </span>

              <div className="fw-semibold">
                {stockIn.created_by}
              </div>
            </div>

            <div className="col-md-4">
              <span className="text-muted">
                Tổng container
              </span>

              <div className="fw-semibold">
                {formatNumber(calculateTotalContainers())} container
              </div>
            </div>

            <div className="col-md-12">
              <span className="text-muted">
                Ghi chú
              </span>

              <div className="fw-semibold">
                {stockIn.note || "Không có ghi chú"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Chi tiết sản phẩm nhập
          </h5>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn vị</th>
                  <th>Vị trí lưu trữ</th>
                  <th>Mã lô</th>
                  <th>Số lượng</th>
                  <th>Số container</th>
                  <th>Hạn sử dụng</th>
                </tr>
              </thead>

              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center text-muted"
                    >
                      Phiếu nhập chưa có sản phẩm.
                    </td>
                  </tr>
                ) : (
                  details.map((detail) => (
                    <tr key={detail.id}>
                      <td>
                        <strong>
                          {detail.product_name}
                        </strong>

                        <div className="text-muted small">
                          {detail.sku}
                        </div>
                      </td>

                      <td>
                        {detail.unit_name}
                      </td>

                      <td>
                        <strong>
                          {getLocationName(detail)}
                        </strong>
                      </td>

                      <td>
                        {detail.batch_code}
                      </td>

                      <td>
                        {formatNumber(detail.quantity)}
                      </td>

                      <td>
                        {formatNumber(detail.container_quantity)} container
                      </td>

                      <td>
                        {formatDate(detail.expiry_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr>
                  <th
                    colSpan="5"
                    className="text-end"
                  >
                    Tổng container
                  </th>

                  <th colSpan="2">
                    {formatNumber(calculateTotalContainers())} container
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>Ghi chú:</strong>{" "}
            Phiếu nhập chỉ ghi nhận hàng hóa, vị trí lưu trữ và số container. Tiền lưu kho sẽ được tính khi xuất kho.
          </div>
        </div>
      </div>

      {/*
       * Mẫu phiếu dùng riêng cho chức năng xuất PDF và in giấy.
       */}
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "794px",
          backgroundColor: "#ffffff",
          color: "#000000",
          zIndex: -1,
        }}
      >
        <div
          ref={printRef}
          className="print-document"
          style={{
            width: "100%",
            padding: "35px",
            backgroundColor: "#ffffff",
            color: "#000000",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div
            className="print-header"
            style={{
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "26px",
                textTransform: "uppercase",
              }}
            >
              Phiếu nhập kho
            </h1>

            <p
              style={{
                margin: "4px 0",
                fontWeight: "bold",
              }}
            >
              Mã phiếu: {stockInCode}
            </p>

            <p
              style={{
                margin: "4px 0",
              }}
            >
              Ngày nhập: {formatDate(stockIn.import_date)}
            </p>
          </div>

          <table
            className="print-info"
            style={{
              width: "100%",
              marginBottom: "22px",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "50%",
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Nhà cung cấp:
                  </strong>{" "}
                  {stockIn.supplier_name || "Không có"}
                </td>

                <td
                  style={{
                    width: "50%",
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Kho nhập:
                  </strong>{" "}
                  {stockIn.warehouse_name || "Không có"}
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Cổng nhập:
                  </strong>{" "}
                  {stockIn.gate_name || "Không có"}
                </td>

                <td
                  style={{
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Người lập phiếu:
                  </strong>{" "}
                  {stockIn.created_by || "Không có"}
                </td>
              </tr>

              <tr>
                <td
                  style={{
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Tổng container:
                  </strong>{" "}
                  {formatNumber(calculateTotalContainers())} container
                </td>

                <td
                  style={{
                    padding: "6px 8px",
                  }}
                >
                  <strong>
                    Ghi chú:
                  </strong>{" "}
                  {stockIn.note || "Không có ghi chú"}
                </td>
              </tr>
            </tbody>
          </table>

          <table
            className="product-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "12px",
            }}
          >
            <thead>
              <tr>
                {[
                  "STT",
                  "Sản phẩm",
                  "Đơn vị",
                  "Vị trí",
                  "Mã lô",
                  "Số lượng",
                  "Container",
                  "Hạn sử dụng",
                ].map((title) => (
                  <th
                    key={title}
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {details.map((detail, index) => (
                <tr key={detail.id}>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                    }}
                  >
                    {detail.product_name}

                    <div
                      style={{
                        fontSize: "11px",
                      }}
                    >
                      SKU: {detail.sku || "Không có"}
                    </div>
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                    }}
                  >
                    {detail.unit_name}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                    }}
                  >
                    {getLocationName(detail)}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                    }}
                  >
                    {detail.batch_code}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                      textAlign: "right",
                    }}
                  >
                    {formatNumber(detail.quantity)}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                      textAlign: "right",
                    }}
                  >
                    {formatNumber(detail.container_quantity)}
                  </td>

                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "8px",
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    {formatDate(detail.expiry_date)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <th
                  colSpan="6"
                  style={{
                    border: "1px solid #000",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  Tổng container
                </th>

                <th
                  colSpan="2"
                  style={{
                    border: "1px solid #000",
                    padding: "8px",
                    textAlign: "left",
                  }}
                >
                  {formatNumber(calculateTotalContainers())} container
                </th>
              </tr>
            </tfoot>
          </table>

          <table
            className="signature-table"
            style={{
              width: "100%",
              marginTop: "45px",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "33.33%",
                    textAlign: "center",
                  }}
                >
                  <strong>
                    Người giao hàng
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height: "90px",
                    }}
                  />
                </td>

                <td
                  style={{
                    width: "33.33%",
                    textAlign: "center",
                  }}
                >
                  <strong>
                    Thủ kho
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height: "90px",
                    }}
                  />
                </td>

                <td
                  style={{
                    width: "33.33%",
                    textAlign: "center",
                  }}
                >
                  <strong>
                    Người lập phiếu
                  </strong>

                  <div
                    className="signature-note"
                    style={{
                      fontSize: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    Ký và ghi rõ họ tên
                  </div>

                  <div
                    className="signature-space"
                    style={{
                      height: "90px",
                    }}
                  />

                  <strong>
                    {stockIn.created_by || ""}
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

export default StockInDetailPage;