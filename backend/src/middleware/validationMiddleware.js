const Joi = require('joi');

const MAX = {
  name: 255,
  address: 500,
  remarks: 1000,
  code: 50,
  email: 254,
};

const schemas = {
  registerUser: Joi.object({
    email: Joi.string().email().max(MAX.email).required()
      .messages({ 'string.email': 'Valid email required', 'any.required': 'Email required' }),
    password: Joi.string().min(8).max(128).required()
      .messages({ 'string.min': 'Password must be at least 8 characters', 'any.required': 'Password required' }),
    firstName: Joi.string().max(100).required(),
    lastName: Joi.string().max(100).required(),
    businessName: Joi.string().max(MAX.name).optional().allow(''),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'NTN must be exactly 7 digits' }),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'STRN must be exactly 13 digits' }),
    address: Joi.string().max(MAX.address).optional().allow(''),
    province: Joi.string().max(100).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
  }),

  loginUser: Joi.object({
    email: Joi.string().email().max(MAX.email).required(),
    password: Joi.string().max(128).required(),
  }),

  createCustomer: Joi.object({
    businessName: Joi.string().max(MAX.name).required()
      .messages({ 'any.required': 'Business name is required' }),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'NTN must be exactly 7 digits' }),
    cnic: Joi.string().max(20).optional().allow(''),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'STRN must be exactly 13 digits' }),
    address: Joi.string().max(MAX.address).optional().allow(''),
    province: Joi.string().max(100).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    registrationType: Joi.string().valid('REGISTERED', 'UNREGISTERED', 'FOREIGN').default('UNREGISTERED'),
    contactPerson: Joi.string().max(MAX.name).optional().allow(''),
    contactPhone: Joi.string().max(20).optional().allow(''),
    contactEmail: Joi.string().email().max(MAX.email).optional().allow('')
      .messages({ 'string.email': 'Valid email required' }),
  }),

  createProduct: Joi.object({
    productName: Joi.string().max(MAX.name).required(),
    productCode: Joi.string().max(MAX.code).required(),
    hsCode: Joi.string().min(4).max(8).pattern(/^[0-9]+$/).required()
      .messages({ 'string.pattern.base': 'HS Code must be numbers only (4-8 digits)' }),
    description: Joi.string().max(500).optional().allow(''),
    unitOfMeasure: Joi.string().valid('KGM', 'LTR', 'TNE', 'DRM', 'BAG', 'NUM').required(),
    defaultSalePrice: Joi.number().min(0).max(99999999).precision(4).required(),
    defaultTaxRate: Joi.number().valid(0, 5, 10, 18).required(),
    isThirdSchedule: Joi.boolean().optional().default(false),
    mrp: Joi.number().min(0).max(99999999).precision(2).optional().allow(null),
    sroScheduleNo: Joi.string().max(100).optional().allow('', null),
    sroItemSerialNo: Joi.string().max(50).optional().allow('', null),
  }),

  updatePayment: Joi.object({
    paymentStatus: Joi.string().valid('UNPAID', 'PARTIAL', 'PAID').optional(),
    paidAmount: Joi.number().min(0).max(99999999999).precision(2).required(),
  }),

  updateCompany: Joi.object({
    businessName: Joi.string().max(MAX.name).optional(),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'NTN must be exactly 7 digits' }),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow('')
      .messages({ 'string.pattern.base': 'STRN must be exactly 13 digits' }),
    address: Joi.string().max(MAX.address).optional().allow(''),
    province: Joi.string().max(100).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    contactPhone: Joi.string().max(20).optional().allow(''),
    contactEmail: Joi.string().email().max(MAX.email).optional().allow('')
      .messages({ 'string.email': 'Valid email required' }),
  }),

  createInvoice: Joi.object({
    customerId: Joi.string().max(50).required(),
    invoiceDate: Joi.date().required(),
    invoiceType: Joi.string()
      .valid('NORMAL_SALES_TAX_INVOICE', 'DEBIT_NOTE', 'CREDIT_NOTE', 'EXPORT_INVOICE')
      .required(),
    referenceInvoiceNo: Joi.string().max(100).optional().allow(''),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().max(50).required(),
        quantity: Joi.number().positive().max(999999).precision(4).required(),
        unitPrice: Joi.number().min(0).max(99999999).precision(4).required(),
        discountAmount: Joi.number().min(0).max(99999999).precision(4).optional().default(0),
        taxRate: Joi.number().valid(0, 5, 10, 18).required(),
        saleType: Joi.string().valid('Goods', 'Services', 'Zero-Rated', 'Exempt', 'Third Schedule').optional().default('Goods'),
        salesTaxWithheldAtSource: Joi.number().min(0).max(99999999).precision(2).optional().default(0),
        fedPayable: Joi.number().min(0).max(99999999).precision(2).optional().default(0),
        sroScheduleNo: Joi.string().max(100).optional().allow('', null),
        sroItemSerialNo: Joi.string().max(50).optional().allow('', null),
      })
    ).min(1).max(100).required(),
    paymentTerms: Joi.string().max(200).optional().allow(''),
    deliveryTerms: Joi.string().max(200).optional().allow(''),
    remarks: Joi.string().max(MAX.remarks).optional().allow(''),
  }),
};

const validate = (schemaName) => (req, res, next) => {
  const schema = schemas[schemaName];
  if (!schema) return res.status(500).json({ error: 'Internal configuration error' });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,   // removes unknown fields (chemicalCategory etc.)
    convert: true,
  });

  if (error) {
    const messages = error.details.map(d => d.message).join(', ');
    return res.status(400).json({ error: `Validation failed: ${messages}` });
  }

  req.body = value;
  next();
};

module.exports = { validate };
