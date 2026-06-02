const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration
  registerUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    ntn: Joi.string().length(7).pattern(/^[0-9]+$/).optional(),
    strn: Joi.string().length(13).pattern(/^[0-9]+$/).optional(),
  }),

  // User login
  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // Company setup
  setupCompany: Joi.object({
    businessName: Joi.string().required(),
    ntn: Joi.string().length(7).pattern(/^[0-9]+$/).required(),
    strn: Joi.string().length(13).pattern(/^[0-9]+$/).required(),
    address: Joi.string().required(),
    province: Joi.string().required(),
    city: Joi.string().required(),
    postalCode: Joi.string().optional(),
    contactPhone: Joi.string().optional(),
    contactEmail: Joi.string().email().optional(),
  }),

  // Create customer
  createCustomer: Joi.object({
    businessName: Joi.string().required(),
    ntn: Joi.string().length(7).pattern(/^[0-9]+$/).optional(),
    cnic: Joi.string().pattern(/^[0-9]+-[0-9]+-[0-9]+$/).optional(),
    strn: Joi.string().length(13).pattern(/^[0-9]+$/).optional(),
    address: Joi.string().required(),
    province: Joi.string().required(),
    city: Joi.string().required(),
    registrationType: Joi.string().valid('REGISTERED', 'UNREGISTERED', 'FOREIGN').required(),
    contactPerson: Joi.string().optional(),
    contactPhone: Joi.string().optional(),
    contactEmail: Joi.string().email().optional(),
  }),

  // Create product
  createProduct: Joi.object({
    productName: Joi.string().required(),
    productCode: Joi.string().required(),
    hsCode: Joi.string().min(4).max(8).pattern(/^[0-9]+$/).required(),
    description: Joi.string().optional(),
    unitOfMeasure: Joi.string().valid('KGM', 'LTR', 'TNE', 'DRM', 'BAG', 'NUM').required(),
    defaultSalePrice: Joi.number().positive().required(),
    defaultTaxRate: Joi.number().valid(0, 5, 10, 18).required(),
    chemicalCategory: Joi.string().optional(),
    hazardClassification: Joi.string().optional(),
  }),

  // Create invoice
  createInvoice: Joi.object({
    customerId: Joi.string().required(),
    invoiceDate: Joi.date().max('now').required(),
    invoiceType: Joi.string()
      .valid('NORMAL_SALES_TAX_INVOICE', 'DEBIT_NOTE', 'CREDIT_NOTE', 'EXPORT_INVOICE')
      .required(),
    referenceInvoiceNo: Joi.string().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().positive().required(),
          unitPrice: Joi.number().positive().required(),
          discountAmount: Joi.number().min(0).optional(),
          taxRate: Joi.number().valid(0, 5, 10, 18).required(),
        })
      )
      .min(1)
      .required(),
    paymentTerms: Joi.string().optional(),
    deliveryTerms: Joi.string().optional(),
    remarks: Joi.string().optional(),
  }),

  // Invoice item
  invoiceItem: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().positive().required(),
    unitPrice: Joi.number().positive().required(),
    discountAmount: Joi.number().min(0).optional(),
    taxRate: Joi.number().valid(0, 5, 10, 18).required(),
  }),
};

// Generic validation middleware
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({ error: `Validation schema '${schemaName}' not found` });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: messages,
      });
    }

    req.validatedData = value;
    next();
  };
};

// Validate NTN format
const validateNTN = (ntn) => {
  return /^[0-9]{7}$/.test(ntn);
};

// Validate STRN format
const validateSTRN = (strn) => {
  return /^[0-9]{13}$/.test(strn);
};

// Validate HS Code format
const validateHSCode = (hsCode) => {
  return /^[0-9]{4,8}$/.test(hsCode);
};

// Validate invoice date
const validateInvoiceDate = (invoiceDate) => {
  const date = new Date(invoiceDate);
  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Cannot be future date and not more than 2 days in past
  return date <= today && date >= twoDaysAgo;
};

module.exports = {
  validate,
  validateNTN,
  validateSTRN,
  validateHSCode,
  validateInvoiceDate,
};
