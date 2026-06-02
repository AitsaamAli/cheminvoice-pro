const { PrismaClient } = require('@prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createCustomer = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { businessName, ntn, cnic, strn, address, province, city, registrationType, contactPerson, contactPhone, contactEmail } = req.body;

  const customer = await prisma.customer.create({
    data: {
      businessName,
      ntn: ntn || null,
      cnic: cnic || null,
      strn: strn || null,
      address: address || null,
      province: province || null,
      city: city || null,
      registrationType: registrationType || 'UNREGISTERED',
      contactPerson: contactPerson || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      companyId,
    },
  });

  res.status(201).json({ success: true, customer });
});

const listCustomers = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { skip = 0, take = 50 } = req.query;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId },
      skip: parseInt(skip),
      take: parseInt(take),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where: { companyId } }),
  ]);

  res.json({ customers, pagination: { total, skip: parseInt(skip), take: parseInt(take) } });
});

const getCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError('Customer not found', 404);
  res.json(customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { businessName, ntn, cnic, strn, address, province, city, registrationType, contactPerson, contactPhone, contactEmail } = req.body;
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      businessName,
      ntn: ntn || null,
      cnic: cnic || null,
      strn: strn || null,
      address: address || null,
      province: province || null,
      city: city || null,
      registrationType: registrationType || 'UNREGISTERED',
      contactPerson: contactPerson || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
    },
  });
  res.json({ success: true, customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  await prisma.customer.delete({ where: { id: customerId } });
  res.json({ success: true, message: 'Customer deleted' });
});

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
};
