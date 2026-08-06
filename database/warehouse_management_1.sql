-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 05, 2026 at 08:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `warehouse_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Thực phẩm khô', 'Các loại mì, bánh và thực phẩm đóng gói'),
(2, 'Đồ uống', 'Các loại nước uống đóng chai hoặc đóng lon'),
(3, 'Sữa và sản phẩm từ sữa', 'Các sản phẩm sữa có hạn sử dụng'),
(4, 'Gia vị', 'Các loại gia vị và nguyên liệu nấu ăn'),
(5, 'Mỹ phẩm', 'Các sản phẩm là mỹ phẩm');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_batches`
--

CREATE TABLE `inventory_batches` (
  `id` int(11) NOT NULL,
  `stock_in_detail_id` int(11) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `batch_code` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `container_quantity` int(11) NOT NULL DEFAULT 0,
  `base_quantity_per_container` int(11) NOT NULL,
  `storage_pricing_id` int(11) NOT NULL,
  `storage_unit_price` decimal(15,2) NOT NULL,
  `storage_policy_id` int(11) DEFAULT NULL,
  `max_storage_days` int(11) DEFAULT NULL,
  `warning_days` int(11) DEFAULT NULL,
  `overdue_multiplier` decimal(5,2) DEFAULT NULL,
  `storage_due_date` date DEFAULT NULL,
  `allow_overdue_export` tinyint(1) NOT NULL DEFAULT 1,
  `require_overdue_note` tinyint(1) NOT NULL DEFAULT 1,
  `import_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL
) ;

--
-- Dumping data for table `inventory_batches`
--

INSERT INTO `inventory_batches` (`id`, `stock_in_detail_id`, `product_id`, `warehouse_id`, `location_id`, `batch_code`, `quantity`, `container_quantity`, `base_quantity_per_container`, `storage_pricing_id`, `storage_unit_price`, `storage_policy_id`, `max_storage_days`, `warning_days`, `overdue_multiplier`, `storage_due_date`, `allow_overdue_export`, `require_overdue_note`, `import_date`, `expiry_date`) VALUES
(1, NULL, 1, 1, 1, 'HH-0601-A', 240, 1, 1500, 1, 100000.00, 1, 30, 7, 1.50, '2026-06-30', 1, 1, '2026-06-01', '2026-12-01'),
(2, NULL, 2, 1, 1, 'LV-0603-A', 432, 1, 1200, 1, 100000.00, 1, 30, 7, 1.50, '2026-07-02', 1, 1, '2026-06-03', '2027-06-03'),
(3, NULL, 3, 1, 1, 'VM-0605-A', 570, 1, 1200, 1, 100000.00, 1, 30, 7, 1.50, '2026-07-04', 1, 1, '2026-06-05', '2026-07-20'),
(4, NULL, 3, 1, 1, 'VM-0605-B', 0, 0, 1200, 1, 100000.00, 1, 30, 7, 1.50, '2026-07-04', 1, 1, '2026-06-05', '2026-08-15'),
(5, NULL, 4, 2, 2, 'NN-0607-A', 44, 1, 600, 2, 100000.00, 2, 30, 7, 1.50, '2026-07-06', 1, 1, '2026-06-07', '2027-06-07'),
(6, NULL, 5, 1, 1, 'OR-0608-A', 192, 1, 1200, 1, 100000.00, 1, 30, 7, 1.50, '2026-07-07', 1, 1, '2026-06-08', '2026-11-30'),
(7, NULL, 3, 1, 1, '12', 6680, 6, 1200, 1, 100000.00, 1, 30, 7, 1.50, '2026-07-23', 1, 1, '2026-06-24', '2027-01-24'),
(9, NULL, 5, 2, 5, '122', 0, 0, 1200, 2, 100000.00, 2, 30, 7, 1.50, '2026-08-16', 1, 1, '2026-07-18', '2027-06-19'),
(10, NULL, 5, 2, 5, '123', 0, 0, 1200, 2, 100000.00, 2, 30, 7, 1.50, '2026-08-16', 1, 1, '2026-07-18', '2027-07-19'),
(11, 11, 1, 1, 4, '008', 2400, 2, 1500, 4, 120000.00, 1, 30, 7, 1.50, '2026-09-03', 1, 1, '2026-08-05', '2027-04-05'),
(12, 12, 5, 2, 5, '113', 2101, 2, 1200, 2, 100000.00, 2, 30, 7, 1.50, '2026-09-03', 1, 1, '2026-08-05', '2027-04-05'),
(13, 13, 3, 2, 11, 'V01', 4200, 4, 1200, 2, 100000.00, 2, 30, 7, 1.50, '2026-09-03', 1, 1, '2026-08-05', '2027-04-05');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_batches_backup_20260805`
--

CREATE TABLE `inventory_batches_backup_20260805` (
  `id` int(11) NOT NULL DEFAULT 0,
  `stock_in_detail_id` int(11) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `batch_code` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `container_quantity` int(11) NOT NULL DEFAULT 0,
  `base_quantity_per_container` int(11) DEFAULT NULL,
  `storage_pricing_id` int(11) NOT NULL,
  `storage_unit_price` decimal(15,2) NOT NULL,
  `import_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_batches_backup_20260805`
--

INSERT INTO `inventory_batches_backup_20260805` (`id`, `stock_in_detail_id`, `product_id`, `warehouse_id`, `location_id`, `batch_code`, `quantity`, `container_quantity`, `base_quantity_per_container`, `storage_pricing_id`, `storage_unit_price`, `import_date`, `expiry_date`) VALUES
(1, NULL, 1, 1, 1, 'HH-0601-A', 240, 0, NULL, 1, 100000.00, '2026-06-01', '2026-12-01'),
(2, NULL, 2, 1, 1, 'LV-0603-A', 432, 0, NULL, 1, 100000.00, '2026-06-03', '2027-06-03'),
(3, NULL, 3, 1, 1, 'VM-0605-A', 570, 0, NULL, 1, 100000.00, '2026-06-05', '2026-07-20'),
(4, NULL, 3, 1, 1, 'VM-0605-B', 0, 0, NULL, 1, 100000.00, '2026-06-05', '2026-08-15'),
(5, NULL, 4, 2, 2, 'NN-0607-A', 44, 0, NULL, 2, 100000.00, '2026-06-07', '2027-06-07'),
(6, NULL, 5, 1, 1, 'OR-0608-A', 192, 0, NULL, 1, 100000.00, '2026-06-08', '2026-11-30'),
(7, NULL, 3, 1, 1, '12', 6680, 0, NULL, 1, 100000.00, '2026-06-24', '2027-01-24'),
(8, NULL, 6, 1, 1, 'TTT', 50, 0, NULL, 1, 100000.00, '2026-06-24', '2027-06-24'),
(9, NULL, 5, 2, 5, '122', 1601, 0, NULL, 2, 100000.00, '2026-07-18', '2027-06-19'),
(10, NULL, 5, 2, 5, '123', 400, 2, NULL, 2, 100000.00, '2026-07-18', '2027-07-19'),
(11, 11, 1, 1, 4, '008', 2400, 2, 1500, 4, 120000.00, '2026-08-05', '2027-04-05');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `minimum_stock` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `sku`, `description`, `image_url`, `minimum_stock`, `status`, `created_at`) VALUES
(1, 1, 'Mì gói Hảo Hảo', 'SP001', 'Mì ăn liền vị tôm chua cay', '/uploads/products/product-1783684450162-186814244.webp', 99, 'active', '2026-06-19 18:16:28'),
(2, 2, 'Nước suối Lavie 500ml', 'SP002', 'Nước suối đóng chai 500ml', '/uploads/products/product-1783684697799-806181396.jpg', 50, 'active', '2026-06-19 18:16:28'),
(3, 3, 'Sữa tươi Vinamilk 180ml', 'SP003', 'Sữa tươi tiệt trùng đóng hộp', '/uploads/products/product-1783684654166-502627711.jpg', 0, 'active', '2026-06-19 18:16:28'),
(4, 4, 'Nước mắm Nam Ngư 500ml', 'SP004', 'Nước mắm đóng chai 500ml', '/uploads/products/product-1783684594400-977660545.jpg', 80, 'active', '2026-06-19 18:16:28'),
(5, 1, 'Bánh Oreo', 'SP005', 'Bánh quy kem đóng gói', '/uploads/products/product-1783684544858-675455067.jpg', 0, 'active', '2026-06-19 18:16:28'),
(6, 4, 'Nước tương Tam Thái Tử', 'SP006', 'Nước tương đóng chai 500ml', '/uploads/products/product-1783684504183-266334696.webp', 50, 'active', '2026-06-23 10:18:25'),
(7, 5, 'ád', 'SP007', NULL, NULL, 0, 'active', '2026-06-24 15:13:06'),
(8, 4, 'Nước tương Tam Thái Tử qưeqưe', 'SP008', NULL, NULL, 200, 'inactive', '2026-08-06 00:11:18');

-- --------------------------------------------------------

--
-- Table structure for table `product_packaging`
--

CREATE TABLE `product_packaging` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `quantity_per_unit` int(11) NOT NULL,
  `units_per_container` int(11) NOT NULL,
  `note` varchar(255) DEFAULT NULL
) ;

--
-- Dumping data for table `product_packaging`
--

INSERT INTO `product_packaging` (`id`, `product_id`, `unit_id`, `quantity_per_unit`, `units_per_container`, `note`) VALUES
(1, 1, 2, 1, 1500, '1 gói mì tương ứng 1 đơn vị cơ sở'),
(2, 1, 6, 30, 50, '1 thùng mì gồm 30 gói'),
(3, 2, 3, 1, 1200, '1 chai nước tương ứng 1 đơn vị cơ sở'),
(4, 2, 6, 24, 50, '1 thùng nước gồm 24 chai'),
(5, 3, 4, 1, 1200, '1 hộp sữa tương ứng 1 đơn vị cơ sở'),
(7, 3, 6, 48, 25, '1 thùng sữa gồm 48 hộp'),
(8, 4, 3, 1, 600, '1 chai nước mắm tương ứng 1 đơn vị cơ sở'),
(9, 4, 6, 12, 50, '1 thùng nước mắm gồm 12 chai'),
(10, 5, 2, 1, 1200, '1 gói bánh tương ứng 1 đơn vị cơ sở'),
(11, 5, 6, 24, 50, '1 thùng bánh gồm 24 gói');

-- --------------------------------------------------------

--
-- Table structure for table `product_units`
--

CREATE TABLE `product_units` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_units`
--

INSERT INTO `product_units` (`id`, `name`, `description`) VALUES
(1, 'Cái', 'Đơn vị sản phẩm lẻ'),
(2, 'Gói', 'Đơn vị đóng gói'),
(3, 'Chai', 'Đơn vị chai'),
(4, 'Hộp', 'Đơn vị hộp'),
(5, 'Lốc', 'Đơn vị lốc'),
(6, 'Thùng', 'Đơn vị thùng'),
(7, 'Công', 'Đơn vị container');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Admin', 'Quản trị toàn bộ hệ thống'),
(2, 'Nhân viên kho', 'Thực hiện nhập kho, xuất kho và quản lý tồn kho'),
(3, 'Quản lý kho', 'Quản lý hoạt động kho, xem báo cáo và giám sát nhân viên');

-- --------------------------------------------------------

--
-- Table structure for table `stock_in`
--

CREATE TABLE `stock_in` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `gate_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `import_date` date NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_in`
--

INSERT INTO `stock_in` (`id`, `supplier_id`, `warehouse_id`, `gate_id`, `user_id`, `import_date`, `note`, `created_at`) VALUES
(1, 1, 1, 1, 2, '2026-06-01', 'Nhập mì gói đợt đầu tháng', '2026-06-19 18:16:29'),
(2, 2, 1, 1, 2, '2026-06-03', 'Nhập nước suối', '2026-06-19 18:16:29'),
(3, 3, 1, 1, 3, '2026-06-05', 'Nhập sữa tươi', '2026-06-19 18:16:29'),
(4, 4, 2, 4, 3, '2026-06-07', 'Nhập nước mắm vào kho phụ', '2026-06-19 18:16:29'),
(5, 5, 1, 3, 2, '2026-06-08', 'Nhập bánh Oreo', '2026-06-19 18:16:29'),
(6, 3, 1, 3, 4, '2026-06-24', NULL, '2026-06-24 11:48:47'),
(7, 1, 1, 1, 1, '2026-06-24', NULL, '2026-06-24 17:38:15'),
(8, 5, 2, 4, 1, '2026-07-18', NULL, '2026-07-19 01:22:01'),
(9, 5, 2, 4, 1, '2026-07-18', NULL, '2026-07-19 01:25:05'),
(10, 1, 1, 3, 1, '2026-08-05', NULL, '2026-08-05 17:19:14'),
(11, 5, 2, 4, 1, '2026-08-05', NULL, '2026-08-05 19:12:43'),
(12, 3, 2, 4, 1, '2026-08-05', NULL, '2026-08-05 22:49:50');

-- --------------------------------------------------------

--
-- Table structure for table `stock_in_details`
--

CREATE TABLE `stock_in_details` (
  `id` int(11) NOT NULL,
  `stock_in_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `batch_code` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `container_quantity` int(11) NOT NULL DEFAULT 0,
  `expiry_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_in_details`
--

INSERT INTO `stock_in_details` (`id`, `stock_in_id`, `product_id`, `unit_id`, `location_id`, `batch_code`, `quantity`, `container_quantity`, `expiry_date`) VALUES
(1, 1, 1, 6, 1, 'HH-0601-A', 10, 0, '2026-12-01'),
(2, 2, 2, 6, 1, 'LV-0603-A', 20, 0, '2027-06-03'),
(3, 3, 3, 6, 1, 'VM-0605-A', 15, 0, '2026-07-20'),
(4, 3, 3, 6, 1, 'VM-0605-B', 10, 0, '2026-08-15'),
(5, 4, 4, 6, 2, 'NN-0607-A', 12, 0, '2027-06-07'),
(6, 5, 5, 6, 1, 'OR-0608-A', 8, 0, '2026-11-30'),
(7, 6, 3, 6, 1, '12', 150, 0, '2027-01-24'),
(8, 7, 6, 6, 1, 'TTT', 50, 0, '2027-06-24'),
(9, 8, 5, 6, 5, '122', 100, 2, '2027-06-19'),
(10, 9, 5, 5, 5, '123', 400, 2, '2027-07-19'),
(11, 10, 1, 6, 4, '008', 80, 2, '2027-04-05'),
(12, 11, 5, 6, 5, '113', 150, 3, '2027-04-05'),
(13, 12, 3, 6, 11, 'V01', 150, 6, '2027-04-05');

-- --------------------------------------------------------

--
-- Table structure for table `stock_out`
--

CREATE TABLE `stock_out` (
  `id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `gate_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `export_date` date NOT NULL,
  `export_rule` enum('FIFO','FEFO') DEFAULT 'FIFO',
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_out`
--

INSERT INTO `stock_out` (`id`, `warehouse_id`, `gate_id`, `user_id`, `export_date`, `export_rule`, `note`, `created_at`) VALUES
(1, 1, 2, 2, '2026-06-10', 'FIFO', 'Xuất mì và nước theo lô nhập trước', '2026-06-19 18:16:29'),
(2, 1, 2, 3, '2026-06-12', 'FEFO', 'Xuất sữa theo hạn sử dụng gần nhất', '2026-06-19 18:16:29'),
(4, 1, 3, 4, '2026-06-24', 'FIFO', NULL, '2026-06-24 12:02:55'),
(6, 2, 5, 1, '2026-07-18', 'FIFO', NULL, '2026-07-19 02:03:54'),
(7, 2, 5, 1, '2026-07-31', 'FIFO', NULL, '2026-07-19 02:04:27'),
(8, 2, 5, 1, '2026-07-31', 'FIFO', NULL, '2026-07-31 15:51:56'),
(9, 1, 2, 1, '2026-07-31', 'FIFO', NULL, '2026-07-31 15:53:46'),
(10, 2, 5, 1, '2026-08-05', 'FIFO', NULL, '2026-08-05 19:16:00'),
(11, 2, 5, 1, '2026-08-05', 'FIFO', NULL, '2026-08-05 19:26:56'),
(12, 2, 5, 1, '2026-08-10', 'FIFO', NULL, '2026-08-05 22:54:13');

-- --------------------------------------------------------

--
-- Table structure for table `stock_out_details`
--

CREATE TABLE `stock_out_details` (
  `id` int(11) NOT NULL,
  `stock_out_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `container_quantity` int(11) NOT NULL DEFAULT 0,
  `storage_days` int(11) NOT NULL DEFAULT 0,
  `regular_storage_days` int(11) NOT NULL DEFAULT 0,
  `overdue_storage_days` int(11) NOT NULL DEFAULT 0,
  `overdue_multiplier` decimal(5,2) NOT NULL DEFAULT 1.00,
  `storage_unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `regular_storage_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `overdue_storage_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_storage_amount` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_out_details`
--

INSERT INTO `stock_out_details` (`id`, `stock_out_id`, `product_id`, `batch_id`, `quantity`, `container_quantity`, `storage_days`, `regular_storage_days`, `overdue_storage_days`, `overdue_multiplier`, `storage_unit_price`, `regular_storage_amount`, `overdue_storage_amount`, `total_storage_amount`) VALUES
(1, 1, 1, 1, 60, 0, 0, 0, 0, 1.00, 0.00, 0.00, 0.00, 0.00),
(2, 1, 2, 2, 48, 0, 0, 0, 0, 1.00, 0.00, 0.00, 0.00, 0.00),
(3, 2, 3, 3, 100, 0, 0, 0, 0, 1.00, 0.00, 0.00, 0.00, 0.00),
(4, 4, 3, 3, 50, 0, 0, 0, 0, 1.00, 0.00, 0.00, 0.00, 0.00),
(5, 6, 5, 9, 500, 1, 1, 1, 0, 1.00, 100000.00, 100000.00, 0.00, 100000.00),
(6, 7, 5, 9, 299, 1, 14, 14, 0, 1.00, 100000.00, 1400000.00, 0.00, 1400000.00),
(7, 8, 4, 5, 100, 0, 55, 55, 0, 1.00, 100000.00, 0.00, 0.00, 0.00),
(8, 9, 3, 4, 480, 0, 57, 57, 0, 1.00, 120000.00, 0.00, 0.00, 0.00),
(9, 9, 3, 7, 520, 0, 38, 38, 0, 1.00, 120000.00, 0.00, 0.00, 0.00),
(10, 10, 5, 9, 1500, 1, 19, 19, 0, 1.00, 100000.00, 1900000.00, 0.00, 1900000.00),
(11, 11, 5, 9, 101, 1, 19, 19, 0, 1.00, 100000.00, 1900000.00, 0.00, 1900000.00),
(12, 11, 5, 10, 400, 1, 19, 19, 0, 1.00, 100000.00, 1900000.00, 0.00, 1900000.00),
(13, 11, 5, 12, 1499, 1, 1, 1, 0, 1.00, 100000.00, 100000.00, 0.00, 100000.00),
(14, 12, 3, 13, 3000, 2, 6, 6, 0, 1.50, 100000.00, 1200000.00, 0.00, 1200000.00);

-- --------------------------------------------------------

--
-- Table structure for table `storage_pricing`
--

CREATE TABLE `storage_pricing` (
  `id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `price_per_container_per_day` decimal(15,2) NOT NULL DEFAULT 0.00,
  `effective_from` date NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `storage_pricing`
--

INSERT INTO `storage_pricing` (`id`, `warehouse_id`, `price_per_container_per_day`, `effective_from`, `status`, `created_at`) VALUES
(1, 1, 100000.00, '2020-01-01', 'inactive', '2026-07-19 00:22:38'),
(2, 2, 100000.00, '2020-01-01', 'active', '2026-07-19 00:22:38'),
(4, 1, 120000.00, '2026-07-18', 'active', '2026-07-19 02:17:40');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `phone`, `address`, `email`) VALUES
(1, 'Công ty Acecook Việt Nam', '02838154064', 'TP. Hồ Chí Minh', 'acecook@gmail.com'),
(2, 'Công ty Nước khoáng Lavie', '02839996666', 'Long An', 'lavie@gmail.com'),
(3, 'Công ty Vinamilk', '02854155555', 'TP. Hồ Chí Minh', 'vinamilk@gmail.com'),
(4, 'Công ty Masan Consumer', '02862555560', 'TP. Hồ Chí Minh', 'masan@gmail.com'),
(5, 'Nhà phân phối Bánh Kẹo Thành Công', '0909123456', 'Quận 8, TP. Hồ Chí Minh', 'thanhcong@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role_id`, `full_name`, `email`, `password`, `status`, `created_at`) VALUES
(1, 1, 'Admin', 'admin@gmail.com', '$2b$10$v1xZnTyPYxl0FifzvPuVN.6IK8egf4ithSiutBlWdsXq8pSggqY9i', 'active', '2026-06-19 18:16:28'),
(2, 3, 'Trần Minh Kho', 'nhanvienkho1@gmail.com', '$2b$10$5519F4uFODsGVh9hph1SheuoPGDCOipICIayudMhSk9X9jurFTsnO', 'active', '2026-06-19 18:16:28'),
(3, 3, 'Lê Hoàng Nam', 'nhanvienkho2@gmail.com', '$2b$10$3/enopda3Y.bdAfEUMRLwO8fGhVYdh7zgFp8lU.Q1SfzmkovwsAsu', 'active', '2026-06-19 18:16:28'),
(4, 2, 'Nguyễn Văn Nhân Viên', 'nhanvien3@gmail.com', '$2b$10$YT7b82rxoLBfGa0vuXor7e96nE0.LdPl1KGdagR6CWo93Ft1LCqtW', 'active', '2026-06-24 09:59:20');

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `name`, `address`, `description`) VALUES
(1, 'Kho trung tâm Quận 8', 'Quận 8, TP. Hồ Chí Minh', 'Kho lưu trữ hàng hóa chính'),
(2, 'Kho phụ Bình Chánh', 'Bình Chánh, TP. Hồ Chí Minh', 'Kho hỗ trợ lưu trữ hàng tồn');

-- --------------------------------------------------------

--
-- Table structure for table `warehouse_gates`
--

CREATE TABLE `warehouse_gates` (
  `id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `gate_type` enum('IN','OUT','BOTH') NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouse_gates`
--

INSERT INTO `warehouse_gates` (`id`, `warehouse_id`, `name`, `gate_type`, `description`) VALUES
(1, 1, 'Cổng nhập A1', 'IN', 'Cổng tiếp nhận hàng nhập của kho trung tâm'),
(2, 1, 'Cổng xuất A2', 'OUT', 'Cổng xuất hàng của kho trung tâm'),
(3, 1, 'Cổng đa năng A3', 'BOTH', 'Cổng có thể dùng để nhập và xuất hàng'),
(4, 2, 'Cổng nhập B1', 'IN', 'Cổng nhập hàng của kho phụ'),
(5, 2, 'Cổng xuất B2', 'OUT', 'Cổng xuất hàng của kho phụ');

-- --------------------------------------------------------

--
-- Table structure for table `warehouse_locations`
--

CREATE TABLE `warehouse_locations` (
  `id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `location_code` varchar(50) NOT NULL,
  `location_name` varchar(100) NOT NULL,
  `max_containers` int(11) NOT NULL DEFAULT 0,
  `warning_threshold_percent` int(11) NOT NULL DEFAULT 80,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouse_locations`
--

INSERT INTO `warehouse_locations` (`id`, `warehouse_id`, `location_code`, `location_name`, `max_containers`, `warning_threshold_percent`, `status`, `created_at`) VALUES
(1, 1, 'DEFAULT', 'Vị trí mặc định - Kho trung tâm Quận 8', 1000, 80, 'active', '2026-07-19 00:22:38'),
(2, 2, 'DEFAULT', 'Vị trí mặc định - Kho phụ Bình Chánh', 1000, 80, 'active', '2026-07-19 00:22:38'),
(4, 1, 'A-01', 'Khu A - Dãy 01', 100, 80, 'active', '2026-07-19 00:52:48'),
(5, 2, 'A-01', 'Khu A - Dãy 01', 100, 80, 'active', '2026-07-19 00:52:48'),
(7, 1, 'A-02', 'Khu A - Dãy 02', 150, 80, 'active', '2026-07-19 00:52:48'),
(8, 2, 'A-02', 'Khu A - Dãy 02', 150, 80, 'active', '2026-07-19 00:52:48'),
(10, 1, 'B-01', 'Khu B - Dãy 01', 80, 75, 'active', '2026-07-19 00:52:48'),
(11, 2, 'B-01', 'Khu B - Dãy 01', 80, 75, 'active', '2026-07-19 00:52:48'),
(13, 1, 'COLD-01', 'Khu lạnh - Dãy 01', 50, 80, 'active', '2026-07-19 00:52:48'),
(14, 2, 'COLD-01', 'Khu lạnh - Dãy 01', 50, 80, 'active', '2026-07-19 00:52:48');

-- --------------------------------------------------------

--
-- Table structure for table `warehouse_storage_policies`
--

CREATE TABLE `warehouse_storage_policies` (
  `id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `policy_code` varchar(50) NOT NULL,
  `policy_name` varchar(150) NOT NULL,
  `version_number` int(11) NOT NULL DEFAULT 1,
  `max_storage_days` int(11) NOT NULL DEFAULT 30,
  `warning_days` int(11) NOT NULL DEFAULT 7,
  `apply_overdue_fee` tinyint(1) NOT NULL DEFAULT 1,
  `overdue_multiplier` decimal(5,2) NOT NULL DEFAULT 1.50,
  `allow_overdue_export` tinyint(1) NOT NULL DEFAULT 1,
  `require_overdue_note` tinyint(1) NOT NULL DEFAULT 1,
  `is_supplier_visible` tinyint(1) NOT NULL DEFAULT 1,
  `effective_from` date NOT NULL,
  `status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft',
  `policy_content` longtext DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouse_storage_policies`
--

INSERT INTO `warehouse_storage_policies` (`id`, `warehouse_id`, `policy_code`, `policy_name`, `version_number`, `max_storage_days`, `warning_days`, `apply_overdue_fee`, `overdue_multiplier`, `allow_overdue_export`, `require_overdue_note`, `is_supplier_visible`, `effective_from`, `status`, `policy_content`, `note`, `created_at`, `updated_at`) VALUES
(1, 1, 'CS-KHO-001-V1', 'Chính sách lưu kho - Kho trung tâm Quận 8', 1, 30, 7, 1, 1.50, 1, 1, 1, '2000-01-01', 'active', '1. Hàng hóa được lưu kho tối đa 30 ngày.\n2. Hệ thống cảnh báo trước thời hạn 7 ngày.\n3. Ngày lưu vượt thời hạn được tính với hệ số 1,5 lần đơn giá thông thường.\n4. Phí lưu kho được quyết toán khi container thực tế được giải phóng.\n5. Hàng quá thời hạn lưu vẫn được phép xuất nhưng phải ghi rõ lý do.\n6. Hàng hết hạn sử dụng hoặc hư hỏng không được xuất bán thông thường.\n7. Hàng hư hỏng phải được chuyển cách ly, trả nhà cung cấp hoặc tiêu hủy theo quy định.', 'Chính sách mặc định ban đầu.', '2026-08-05 13:02:28', '2026-08-05 13:02:28'),
(2, 2, 'CS-KHO-002-V1', 'Chính sách lưu kho - Kho phụ Bình Chánh', 1, 30, 7, 1, 1.50, 1, 1, 1, '2000-01-01', 'active', '1. Hàng hóa được lưu kho tối đa 30 ngày.\n2. Hệ thống cảnh báo trước thời hạn 7 ngày.\n3. Ngày lưu vượt thời hạn được tính với hệ số 1,5 lần đơn giá thông thường.\n4. Phí lưu kho được quyết toán khi container thực tế được giải phóng.\n5. Hàng quá thời hạn lưu vẫn được phép xuất nhưng phải ghi rõ lý do.\n6. Hàng hết hạn sử dụng hoặc hư hỏng không được xuất bán thông thường.\n7. Hàng hư hỏng phải được chuyển cách ly, trả nhà cung cấp hoặc tiêu hủy theo quy định.', 'Chính sách mặc định ban đầu.', '2026-08-05 13:02:28', '2026-08-05 13:02:28');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_batch_stock_in_detail` (`stock_in_detail_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `idx_inventory_batches_location_id` (`location_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `product_packaging`
--
ALTER TABLE `product_packaging`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `unit_id` (`unit_id`);

--
-- Indexes for table `product_units`
--
ALTER TABLE `product_units`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stock_in`
--
ALTER TABLE `stock_in`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `gate_id` (`gate_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_in_id` (`stock_in_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `idx_stock_in_details_location_id` (`location_id`);

--
-- Indexes for table `stock_out`
--
ALTER TABLE `stock_out`
  ADD PRIMARY KEY (`id`),
  ADD KEY `warehouse_id` (`warehouse_id`),
  ADD KEY `gate_id` (`gate_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_out_id` (`stock_out_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `storage_pricing`
--
ALTER TABLE `storage_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_storage_pricing_warehouse_id` (`warehouse_id`),
  ADD KEY `idx_storage_pricing_status` (`status`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `warehouse_gates`
--
ALTER TABLE `warehouse_gates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `warehouse_id` (`warehouse_id`);

--
-- Indexes for table `warehouse_locations`
--
ALTER TABLE `warehouse_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_location_code_per_warehouse` (`warehouse_id`,`location_code`),
  ADD KEY `idx_warehouse_locations_warehouse_id` (`warehouse_id`),
  ADD KEY `idx_warehouse_locations_status` (`status`);

--
-- Indexes for table `warehouse_storage_policies`
--
ALTER TABLE `warehouse_storage_policies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_storage_policy_code` (`policy_code`),
  ADD KEY `idx_storage_policy_lookup` (`warehouse_id`,`effective_from`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_packaging`
--
ALTER TABLE `product_packaging`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_units`
--
ALTER TABLE `product_units`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `stock_in`
--
ALTER TABLE `stock_in`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `stock_out`
--
ALTER TABLE `stock_out`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `storage_pricing`
--
ALTER TABLE `storage_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `warehouses`
--
ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `warehouse_gates`
--
ALTER TABLE `warehouse_gates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `warehouse_locations`
--
ALTER TABLE `warehouse_locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `warehouse_storage_policies`
--
ALTER TABLE `warehouse_storage_policies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD CONSTRAINT `fk_inventory_batch_stock_in_detail` FOREIGN KEY (`stock_in_detail_id`) REFERENCES `stock_in_details` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_batches_location` FOREIGN KEY (`location_id`) REFERENCES `warehouse_locations` (`id`),
  ADD CONSTRAINT `inventory_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `inventory_batches_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `inventory_batches_ibfk_3` FOREIGN KEY (`stock_in_detail_id`) REFERENCES `stock_in_details` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `product_packaging`
--
ALTER TABLE `product_packaging`
  ADD CONSTRAINT `product_packaging_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `product_packaging_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `product_units` (`id`);

--
-- Constraints for table `stock_in`
--
ALTER TABLE `stock_in`
  ADD CONSTRAINT `stock_in_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `stock_in_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stock_in_ibfk_3` FOREIGN KEY (`gate_id`) REFERENCES `warehouse_gates` (`id`),
  ADD CONSTRAINT `stock_in_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_in_details`
--
ALTER TABLE `stock_in_details`
  ADD CONSTRAINT `fk_stock_in_details_location` FOREIGN KEY (`location_id`) REFERENCES `warehouse_locations` (`id`),
  ADD CONSTRAINT `stock_in_details_ibfk_1` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in` (`id`),
  ADD CONSTRAINT `stock_in_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stock_in_details_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `product_units` (`id`);

--
-- Constraints for table `stock_out`
--
ALTER TABLE `stock_out`
  ADD CONSTRAINT `stock_out_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `stock_out_ibfk_2` FOREIGN KEY (`gate_id`) REFERENCES `warehouse_gates` (`id`),
  ADD CONSTRAINT `stock_out_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_out_details`
--
ALTER TABLE `stock_out_details`
  ADD CONSTRAINT `stock_out_details_ibfk_1` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_out` (`id`),
  ADD CONSTRAINT `stock_out_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stock_out_details_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`id`);

--
-- Constraints for table `storage_pricing`
--
ALTER TABLE `storage_pricing`
  ADD CONSTRAINT `fk_storage_pricing_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `warehouse_gates`
--
ALTER TABLE `warehouse_gates`
  ADD CONSTRAINT `warehouse_gates_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

--
-- Constraints for table `warehouse_locations`
--
ALTER TABLE `warehouse_locations`
  ADD CONSTRAINT `fk_warehouse_locations_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
