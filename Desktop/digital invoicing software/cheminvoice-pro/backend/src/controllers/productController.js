const { PrismaClient } = require('@prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createProduct = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  // Only pass fields that exist in the database schema
  const { productName, productCode, hsCode, description, unitOfMeasure, defaultSalePrice, defaultTaxRate } = req.body;

  const product = await prisma.product.create({
    data: { productName, productCode, hsCode, description: description || null, unitOfMeasure, defaultSalePrice, defaultTaxRate, companyId },
  });

  res.status(201).json({ success: true, product });
});

const listProducts = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { skip = 0, take = 100 } = req.query;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { companyId, isActive: true },
      skip: parseInt(skip),
      take: parseInt(take),
      orderBy: { productName: 'asc' },
    }),
    prisma.product.count({ where: { companyId, isActive: true } }),
  ]);

  res.json({ products, pagination: { total, skip: parseInt(skip), take: parseInt(take) } });
});

const getProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { productName, productCode, hsCode, description, unitOfMeasure, defaultSalePrice, defaultTaxRate } = req.body;
  const product = await prisma.product.update({
    where: { id: productId },
    data: { productName, productCode, hsCode, description: description || null, unitOfMeasure, defaultSalePrice, defaultTaxRate },
  });
  res.json({ success: true, product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'Product deleted' });
});

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
