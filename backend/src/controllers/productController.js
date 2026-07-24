const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const MAX_TAKE = 200;

const createProduct = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  // companyId verified by requireCompanyAccess middleware
  const { productName, productCode, hsCode, description, unitOfMeasure, defaultSalePrice, defaultTaxRate,
          isService, isThirdSchedule, mrp, sroScheduleNo, sroItemSerialNo,
          trackStock, stockQuantity, reorderLevel } = req.body;

  const product = await prisma.product.create({
    data: {
      productName,
      productCode,
      isService: isService || false,
      hsCode: isService ? '' : (hsCode || ''),
      description: description || null,
      unitOfMeasure,
      defaultSalePrice,
      defaultTaxRate,
      isThirdSchedule: isThirdSchedule || false,
      mrp: isThirdSchedule && mrp ? parseFloat(mrp) : null,
      sroScheduleNo: sroScheduleNo || null,
      sroItemSerialNo: sroItemSerialNo || null,
      trackStock: trackStock || false,
      stockQuantity: trackStock ? (parseFloat(stockQuantity) || 0) : 0,
      reorderLevel: trackStock ? (parseFloat(reorderLevel) || 0) : 0,
      companyId,
    },
  });

  res.status(201).json({ success: true, product });
});

const listProducts = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  // ✅ FIX: clamp take
  const skip = Math.max(0, parseInt(req.query.skip) || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(req.query.take) || 100));

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { companyId, isActive: true },
      skip,
      take,
      orderBy: { productName: 'asc' },
    }),
    prisma.product.count({ where: { companyId, isActive: true } }),
  ]);

  res.json({ products, pagination: { total, skip, take } });
});

const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Product not found', 404);

  // ✅ FIX: IDOR — verify product belongs to requesting user's company
  if (product.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  res.json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // ✅ FIX: IDOR — fetch and verify ownership before updating
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) throw new AppError('Product not found', 404);
  if (existing.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  const { productName, productCode, hsCode, description, unitOfMeasure, defaultSalePrice, defaultTaxRate,
          isService, isThirdSchedule, mrp, sroScheduleNo, sroItemSerialNo,
          trackStock, stockQuantity, reorderLevel } = req.body;

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      productName,
      productCode,
      isService: isService || false,
      hsCode: isService ? '' : (hsCode || ''),
      description: description || null,
      unitOfMeasure,
      defaultSalePrice,
      defaultTaxRate,
      isThirdSchedule: isThirdSchedule || false,
      mrp: isThirdSchedule && mrp ? parseFloat(mrp) : null,
      sroScheduleNo: sroScheduleNo || null,
      sroItemSerialNo: sroItemSerialNo || null,
      trackStock: trackStock !== undefined ? (trackStock || false) : existing.trackStock,
      stockQuantity: trackStock !== undefined ? (parseFloat(stockQuantity) || 0) : existing.stockQuantity,
      reorderLevel: trackStock !== undefined ? (parseFloat(reorderLevel) || 0) : existing.reorderLevel,
    },
  });

  res.json({ success: true, product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // ✅ FIX: IDOR — verify ownership before soft-deleting
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) throw new AppError('Product not found', 404);
  if (existing.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  // Soft delete — preserves historical invoice items
  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  res.json({ success: true, message: 'Product deleted' });
});

module.exports = { createProduct, listProducts, getProduct, updateProduct, deleteProduct };
