import { productSchema, updateProductSchema } from '../product.service';

describe('Product DTO Validation Unit Tests', () => {
  it('should validate valid product creation payload', () => {
    const validPayload = {
      sku: 'SKU-TEST-001',
      name: 'Varilla Corrugada 3/8',
      costPrice: 150.50,
      salePrice: 195.00,
      currentStock: 100,
      minStock: 10,
      unit: 'UNIDAD',
      isActive: true,
    };

    const result = productSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid pricing (negative numbers)', () => {
    const invalidPayload = {
      sku: 'SKU-TEST-002',
      name: 'Varilla Invalida',
      costPrice: -10,
      salePrice: -20,
    };

    const result = productSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should reject missing required SKU or Name', () => {
    const invalidPayload = {
      costPrice: 100,
      salePrice: 150,
    };

    const result = productSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should validate partial update payload', () => {
    const partialPayload = {
      salePrice: 220.00,
      minStock: 15,
    };

    const result = updateProductSchema.safeParse(partialPayload);
    expect(result.success).toBe(true);
  });
});
