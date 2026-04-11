import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const companyStatusEnum = pgEnum('company_status', ['active', 'pending', 'suspended']);
export const relationshipTypeEnum = pgEnum('relationship_type', ['supplier', 'client', 'partner', 'distributor']);
export const relationshipStatusEnum = pgEnum('relationship_status', ['active', 'pending']);
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'manager', 'user']);

// Sectors Table
export const sectors = pgTable('sectors', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// Company Types Table
export const companyTypes = pgTable('company_types', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    sectorId: uuid('sector_id').references(() => sectors.id),
    createdAt: timestamp('created_at').defaultNow(),
});

// Companies Table (Tenant)
export const companies = pgTable('companies', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    logo: varchar('logo', { length: 500 }),
    sectorId: uuid('sector_id').references(() => sectors.id),
    typeId: uuid('type_id').references(() => companyTypes.id),
    address: text('address'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    website: varchar('website', { length: 200 }),
    status: companyStatusEnum('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Categories (Per Company)
export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Products (Per Company - POS ready)
export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id).notNull(),
    categoryId: uuid('category_id').references(() => categories.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 50 }),
    barcode: varchar('barcode', { length: 100 }),
    price: varchar('price', { length: 50 }).notNull().default('0'), // Standardized as string for precision
    cost: varchar('cost', { length: 50 }).default('0'),
    image: varchar('image', { length: 500 }),
    isActive: varchar('is_active', { length: 10 }).default('true'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory/Stock
export const inventory = pgTable('inventory', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    companyId: uuid('company_id').references(() => companies.id).notNull(),
    quantity: varchar('quantity', { length: 50 }).notNull().default('0'),
    minStock: varchar('min_stock', { length: 50 }).default('0'),
    location: varchar('location', { length: 100 }),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Opportunities (Automatic Detection & Leads)
export const opportunities = pgTable('opportunities', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id).notNull(), // The company getting the opportunity
    sourceCompanyId: uuid('source_company_id').references(() => companies.id), // The potential client/partner
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // 'lead', 'match', 'rfq'
    probability: varchar('probability', { length: 10 }).default('0.5'),
    status: varchar('status', { length: 50 }).default('open'), // 'open', 'contacted', 'won', 'lost'
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at'),
});

// Company Relationships (Engranajes)
export const companyRelationships = pgTable('company_relationships', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyAId: uuid('company_a_id').references(() => companies.id).notNull(),
    companyBId: uuid('company_b_id').references(() => companies.id).notNull(),
    relationshipType: relationshipTypeEnum('relationship_type').notNull(),
    status: relationshipStatusEnum('status').default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Users Table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 200 }),
    role: userRoleEnum('role').default('user'),
    companyId: uuid('company_id').references(() => companies.id),
    createdAt: timestamp('created_at').defaultNow(),
});

// POS Transactions
export const posTransactions = pgTable('pos_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    total: varchar('total', { length: 50 }).notNull().default('0'),
    tax: varchar('tax', { length: 50 }).default('0'),
    discount: varchar('discount', { length: 50 }).default('0'),
    paymentMethod: varchar('payment_method', { length: 50 }), // 'cash', 'card', 'transfer'
    status: varchar('status', { length: 50 }).default('completed'), // 'completed', 'cancelled', 'refunded'
    createdAt: timestamp('created_at').defaultNow(),
});

// POS Transaction Items
export const posTransactionItems = pgTable('pos_transaction_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id').references(() => posTransactions.id).notNull(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    quantity: varchar('quantity', { length: 50 }).notNull().default('1'),
    price: varchar('price', { length: 50 }).notNull(),
    subtotal: varchar('subtotal', { length: 50 }).notNull(),
});

// Type exports
export type Sector = typeof sectors.$inferSelect;
export type CompanyType = typeof companyTypes.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type CompanyRelationship = typeof companyRelationships.$inferSelect;
export type PosTransaction = typeof posTransactions.$inferSelect;
export type PosTransactionItem = typeof posTransactionItems.$inferSelect;

// Events Management
export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 300 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 300 }),
    eventDate: timestamp('event_date').notNull(),
    status: varchar('status', { length: 50 }).default('upcoming'), // 'upcoming', 'active', 'completed', 'cancelled'
    createdAt: timestamp('created_at').defaultNow(),
});

// Event Attendance & Data Collection (Lead Magnet)
export const eventAttendance = pgTable('event_attendance', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    companyId: uuid('company_id').references(() => companies.id), // Optional, can be new lead
    guestName: varchar('guest_name', { length: 300 }).notNull(),
    email: varchar('email', { length: 300 }).notNull(),
    whatsapp: varchar('whatsapp', { length: 50 }).notNull(),
    companyName: varchar('company_name', { length: 300 }),
    confirmed: boolean('confirmed').default(false),
    validatedAt: timestamp('validated_at'),
    metadata: jsonb('metadata'), // To store additional business info collected
    createdAt: timestamp('created_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventAttendance = typeof eventAttendance.$inferSelect;

