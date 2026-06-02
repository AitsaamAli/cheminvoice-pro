const Joi = require('joi');

const schemas = {
  registerUser: Joi.object({
    email: Joi.string().email().required().messages({ 'string.email': 'Valid email required', 'any.required': 'Email required' }),
    password: Joi.string().min(8).required().messages({ 'string.min': 'Password must be at least 8 characters', 'any.required': 'Password required' }),
    firstName: Joi.string().required().messages({ 'any.required': 'First name required' }),
    lastName: Joi.string().required().messages({ 'any.required': 'Last name required' }),
    businessName: Joi.string().optional().allow(''),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow('').messages({ 'string.pattern.base': 'NTN must be exactly 7 digits' }),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow('').messages({ 'string.pattern.base': 'STRN must be exactly 13 digits' }),
    address: Joi.string().optional().allow(''),
    province: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
  }),

  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  setupCompany: Joi.object({
    businessName: Joi.string().required(),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow(''),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow(''),
    address: Joi.string().optional().allow(''),
    province: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    postalCode: Joi.string().optional().allow(''),
    contactPhone: Joi.string().optional().allow(''),
    contactEmail: Joi.string().email().optional().allow(''),
  }),

  createCustomer: Joi.object({
    businessName: Joi.string().required().messages({ 'any.required': 'Business name is required' }),
    ntn: Joi.string().pattern(/^[0-9]{7}$/).optional().allow('').messages({ 'string.pattern.base': 'NTN must be exactly 7 digits' }),
    cnic: Joi.string().optional().allow(''),
    strn: Joi.string().pattern(/^[0-9]{13}$/).optional().allow('').messages({ 'string.pattern.base': 'STRN must be exactly 13 digits' }),
    address: Joi.string().optional().allow(''),
    province: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    registrationType: Joi.string().valid('REGISTERED', 'UNREGISTERED', 'FOREIGN').default('UNREGISTERED'),
    contactPerson: Joi.string().optional().allow(''),
    contactPhone: Joi.string().optional().allow(''),
    contactEmail: Joi.string().email().optional().allow('').messages({ 'string.email': 'Valid email required' }),
  }),

  createProduct: Joi.object({
    productName: Joi.string().required(),
    productCode: Joi.string().required(),
    hsCode: Joi.string().min(4).max(8).pattern(/^[0-9]+$/).required().messages({ 'string.pattern.base': 'HS Code must be numbers only (4-8 digits)' }),
    description: Joi.string().optional().allow(''),
    unitOfMeasure: Joi.string().valid('KGM', 'LTR', 'TNE', 'DRM', 'BAG', 'NUM').required(),
    defaultSalePrice: Joi.number().positive().required(),
    defaultTaxRate: Joi.number().valid(0, 5, 10, 18).required(),
    chemicalCategory: Joi.string().optional().allow(''),
    hazardClassification: Joi.string().optional().allow(''),
  }),

  createInvoice: Joi.object({
    customerId: Joi.string().required(),
    invoiceDate: Joi.date().required(),
    invoiceType: Joi.string().valid('NORMAL_SALES_TAX_INVOICE', 'DEBIT_NOTE', 'CREDIT_NOTE', 'EXPORT_INVOICE').required(),
    referenceInvoiceNo: Joi.string().optional().allow(''),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        unitPrice: Joi.number().positive().required(),
        discountAmount: Joi.number().min(0).optional().default(0),
        taxRate: Joi.number().valid(0, 5, 10, 18).required(),
      })
    ).min(1).required(),
    paymentTerms: Joi.string().optional().allow(''),
    deliveryTerms: Joi.string().optional().allow(''),
    remarks: Joi.string().optional().allow(''),
  }),

  invoiceItem: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().positive().required(),
    unitPrice: Joi.number().positive().required(),
    discountAmount: Joi.number().min(0).optional().default(0),
    taxRate: Joi.number().valid(0, 5, 10, 18).required(),
  }),
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return res.status(500).json({ error: `Schema '${schemaName}' not found` });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      return res.status(400).json({ error: `Validation failed: ${messages}` });
    }

    req.validatedData = value;
    req.body = value;
    next();
  };
};

module.exports = { validate };
