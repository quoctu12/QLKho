const cors = require("cors");
const express = require("express");
const path = require("path");
require("dotenv").config();

const pool = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const storagePolicyRoutes = require("./routes/storagePolicyRoutes");

const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const unitRoutes = require("./routes/unitRoutes");
const packagingRoutes = require("./routes/packagingRoutes");
const supplierRoutes = require("./routes/supplierRoutes");

const warehouseRoutes = require("./routes/warehouseRoutes");
const gateRoutes = require("./routes/gateRoutes");

const stockInRoutes = require("./routes/stockInRoutes");
const stockOutRoutes = require("./routes/stockOutRoutes");

const inventoryRoutes = require("./routes/inventoryRoutes");
const reportRoutes = require("./routes/reportRoutes");

const warehouseLocationRoutes = require("./routes/warehouseLocationRoutes");
const storagePricingRoutes = require("./routes/storagePricingRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;


/*
|--------------------------------------------------------------------------
| Middleware chung
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Cho phép trình duyệt truy cập ảnh đã upload
|--------------------------------------------------------------------------
|
| Thư mục thật:
| BE/uploads/products
|
| Địa chỉ truy cập:
| http://localhost:3000/uploads/products/ten-file.jpg
|
*/

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

/*
|--------------------------------------------------------------------------
| API kiểm tra server
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "WMS Backend API đang hoạt động.",
  });
});

/*
|--------------------------------------------------------------------------
| Authentication và người dùng
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/*
|--------------------------------------------------------------------------
| Chính sách
|--------------------------------------------------------------------------
*/

app.use("/api/storage-policies", storagePolicyRoutes);

/*
|--------------------------------------------------------------------------
| Sản phẩm và dữ liệu liên quan
|--------------------------------------------------------------------------
*/

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/packaging", packagingRoutes);
app.use("/api/suppliers", supplierRoutes);

/*
|--------------------------------------------------------------------------
| Quản lý kho
|--------------------------------------------------------------------------
*/

app.use("/api/warehouses", warehouseRoutes);
app.use("/api/gates", gateRoutes);
app.use("/api/warehouse-locations", warehouseLocationRoutes);
app.use("/api/storage-pricing", storagePricingRoutes);

/*
|--------------------------------------------------------------------------
| Nhập kho và xuất kho
|--------------------------------------------------------------------------
*/

app.use("/api/stock-ins", stockInRoutes);
app.use("/api/stock-outs", stockOutRoutes);

/*
|--------------------------------------------------------------------------
| Tồn kho và báo cáo
|--------------------------------------------------------------------------
*/

app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);

/*
|--------------------------------------------------------------------------
| API không tồn tại
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
  });
});

/*
|--------------------------------------------------------------------------
| Xử lý lỗi hệ thống
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error("Lỗi hệ thống:", error);

  /*
   * Multer báo lỗi khi ảnh vượt quá 5 MB.
   */
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Dung lượng ảnh không được vượt quá 5 MB.",
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Đã xảy ra lỗi hệ thống.",
  });
});

/*
|--------------------------------------------------------------------------
| Khởi động server
|--------------------------------------------------------------------------
*/

async function startServer() {
  try {
    const connection = await pool.getConnection();

    console.log("Kết nối MySQL thành công.");

    connection.release();

    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
      console.log(`Thư mục ảnh: http://localhost:${PORT}/uploads`);
    });
  } catch (error) {
    console.error("Không thể kết nối MySQL:", error.message);
    process.exit(1);
  }
}

startServer();