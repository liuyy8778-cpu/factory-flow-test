import {sql} from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
export const partners = sqliteTable('partners',{id:text('id').primaryKey(),name:text('name').notNull(),kind:text('kind').notNull(),contact:text('contact').notNull(),phone:text('phone').notNull(),taxId:text('tax_id').notNull(),address:text('address').notNull(),code:text('code').notNull().default('')});
export const documents = sqliteTable('documents',{id:text('id').primaryKey(),number:text('number').notNull(),kind:text('kind').notNull(),partnerId:text('partner_id').notNull().references((): AnySQLiteColumn =>partners.id),date:text('date').notNull(),lines:text('lines').notNull(),subtotal:integer('subtotal').notNull(),tax:integer('tax').notNull(),total:integer('total').notNull(),note:text('note').notNull(),invoiceId:text('invoice_id'),customerId:text('customer_id').references((): AnySQLiteColumn =>partners.id),barrels:integer('barrels').notNull().default(0),originalNumber:text('original_number').notNull().default(''),voided:integer('voided').notNull().default(0),workOrderId:text('work_order_id').references((): AnySQLiteColumn =>workOrders.id)});
export const invoices = sqliteTable('invoices',{id:text('id').primaryKey(),number:text('number').notNull().unique(),partnerId:text('partner_id').notNull().references((): AnySQLiteColumn =>partners.id),date:text('date').notNull(),due:text('due').notNull(),total:integer('total').notNull(),paid:integer('paid').notNull().default(0)});
export const payments = sqliteTable('payments',{id:text('id').primaryKey(),invoiceId:text('invoice_id').notNull().references((): AnySQLiteColumn =>invoices.id),date:text('date').notNull(),amount:integer('amount').notNull(),note:text('note').notNull()});

export const salesOrders = sqliteTable('sales_orders', {
  id: text('id').primaryKey(), number: text('number').notNull().unique(),
  partnerId: text('partner_id').notNull().references((): AnySQLiteColumn => partners.id),
  date: text('date').notNull(), due: text('due').notNull(),
  product: text('product').notNull(), spec: text('spec').notNull(),
  quantity: integer('quantity').notNull(), unit: text('unit').notNull(),
  price: integer('price').notNull(), note: text('note').notNull(),
});
export const workOrders = sqliteTable('work_orders', {
  id: text('id').primaryKey(), number: text('number').notNull().unique(),
  orderId: text('order_id').notNull().unique().references((): AnySQLiteColumn => salesOrders.id),
  machine: text('machine').notNull().default(''), operator: text('operator').notNull().default(''),
  status: text('status').notNull().default('pending'),
  good: integer('good').notNull().default(0), defective: integer('defective').notNull().default(0),
  shipped: integer('shipped').notNull().default(0),
  startedAt: text('started_at'), completedAt: text('completed_at'), allocationId:text('allocation_id').references((): AnySQLiteColumn =>intakeAllocations.id), intakeId:text('intake_id').references((): AnySQLiteColumn =>intakes.id),
},t=>[uniqueIndex('work_orders_intake_unique').on(t.intakeId).where(sql`${t.allocationId} IS NULL`),uniqueIndex('work_orders_allocation_unique').on(t.allocationId)]);
export const productionReports = sqliteTable('production_reports', {
  id: text('id').primaryKey(), workOrderId: text('work_order_id').notNull().references((): AnySQLiteColumn => workOrders.id),
  reportedAt: text('reported_at').notNull(), operator: text('operator').notNull(),
  good: integer('good').notNull(), defective: integer('defective').notNull(), note: text('note').notNull(),
});

export const specOptions = sqliteTable('spec_options', { id:text('id').primaryKey(), field:text('field').notNull(), value:text('value').notNull() });
export const materialSpecs = sqliteTable('material_specs', { id:text('id').primaryKey(), code:text('code').notNull().unique(), data:text('data').notNull(), fingerprint:text('fingerprint').unique() });
export const drawings = sqliteTable('drawings', { disabled:integer('disabled').notNull().default(0),revision:integer('revision').notNull().default(1),used:integer('used').notNull().default(0), id:text('id').primaryKey(), customerId:text('customer_id').notNull().references((): AnySQLiteColumn =>partners.id), specId:text('spec_id').notNull().references((): AnySQLiteColumn =>materialSpecs.id), number:text('number').notNull(), version:text('version').notNull(), data:text('data').notNull(), preferred:integer('preferred').notNull().default(0), fileKey:text('file_key'), fileName:text('file_name'), fileType:text('file_type') },t=>[uniqueIndex('drawings_customer_spec_version_unique').on(t.customerId,t.specId,t.number,t.version)]);
export const intakes = sqliteTable('intakes', { id:text('id').primaryKey(), documentId:text('document_id').notNull().references((): AnySQLiteColumn =>documents.id), customerId:text('customer_id').notNull().references((): AnySQLiteColumn =>partners.id), specId:text('spec_id').notNull().references((): AnySQLiteColumn =>materialSpecs.id), drawingId:text('drawing_id').references((): AnySQLiteColumn =>drawings.id), materialSnapshot:text('material_snapshot').notNull(), drawingSnapshot:text('drawing_snapshot'), quantity:integer('quantity').notNull(), packages:integer('packages').notNull(),packageUnit:text('package_unit').notNull().default('件'),position:integer('position').notNull().default(0), due:text('due').notNull(), fee:integer('fee').notNull(), dispatched:integer('dispatched').notNull().default(0) });

export const materialDrafts=sqliteTable('material_drafts',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});

export const numberCounters=sqliteTable('number_counters',{id:text('id').primaryKey(),value:integer('value').notNull()});
export const barrelEntries=sqliteTable('barrel_entries',{id:text('id').primaryKey(),documentId:text('document_id').unique().references((): AnySQLiteColumn=>documents.id),customerId:text('customer_id').notNull().references((): AnySQLiteColumn=>partners.id),number:text('number').notNull(),date:text('date').notNull(),kind:text('kind').notNull(),incoming:integer('incoming').notNull(),outgoing:integer('outgoing').notNull(),note:text('note').notNull(),version:integer('version').notNull().default(1),voided:integer('voided').notNull().default(0)},t=>[index('barrel_customer_date_idx').on(t.customerId,t.date)]);
export const barrelAudit=sqliteTable('barrel_audit',{id:text('id').primaryKey(),entryId:text('entry_id').notNull().references((): AnySQLiteColumn=>barrelEntries.id),stamp:text('stamp').notNull(),before:text('before'),after:text('after').notNull(),reason:text('reason').notNull()});

export const intakeAllocations=sqliteTable('intake_allocations',{
 id:text('id').primaryKey(),intakeId:text('intake_id').notNull().references(():AnySQLiteColumn=>intakes.id),drawingId:text('drawing_id').notNull().references(():AnySQLiteColumn=>drawings.id),drawingSnapshot:text('drawing_snapshot').notNull(),quantity:integer('quantity').notNull(),fee:integer('fee').notNull(),due:text('due').notNull(),createdAt:text('created_at').notNull()
},t=>[index('allocations_intake_idx').on(t.intakeId)]);
export const intakeAudit=sqliteTable('intake_audit',{
 id:text('id').primaryKey(),intakeId:text('intake_id').notNull().references(():AnySQLiteColumn=>intakes.id),stamp:text('stamp').notNull(),actor:text('actor').notNull(),reason:text('reason').notNull(),before:text('before').notNull(),after:text('after').notNull()
},t=>[index('intake_audit_intake_idx').on(t.intakeId)]);
export const drawingSpecs=sqliteTable('drawing_specs',{id:text('id').primaryKey(),drawingId:text('drawing_id').notNull().references(():AnySQLiteColumn=>drawings.id),specId:text('spec_id').notNull().references(():AnySQLiteColumn=>materialSpecs.id),preferred:integer('preferred').notNull().default(0)},t=>[uniqueIndex('drawing_specs_pair').on(t.drawingId,t.specId),index('drawing_specs_spec').on(t.specId)]);

export const drawingAudit=sqliteTable('drawing_audit',{id:text('id').primaryKey(),drawingId:text('drawing_id').notNull().references(():AnySQLiteColumn=>drawings.id),stamp:text('stamp').notNull(),actor:text('actor').notNull(),reason:text('reason').notNull(),action:text('action').notNull(),before:text('before').notNull(),after:text('after').notNull()},t=>[index('drawing_audit_drawing_idx').on(t.drawingId)]);
export const operationAudit=sqliteTable('operation_audit',{id:text('id').primaryKey(),stamp:text('stamp').notNull(),actor:text('actor').notNull(),tableName:text('table_name').notNull(),recordId:text('record_id').notNull(),action:text('action').notNull(),before:text('before'),after:text('after')},t=>[index('operation_audit_stamp').on(t.stamp)]);
export const auditContext=sqliteTable('audit_context',{id:text('id').primaryKey(),actor:text('actor').notNull()});

// 系列圖面：客戶一張圖管一整個系列（6～32 mm）。一列一個公稱尺寸，存師傅要看的七格；
// 存檔時每列自動產生一筆標準格式的 drawings（含 drawing_specs 共用），下游進貨、派工、標籤完全沿用。
export const seriesDrawings=sqliteTable('series_drawings',{id:text('id').primaryKey(),customerId:text('customer_id').notNull().references(():AnySQLiteColumn=>partners.id),number:text('number').notNull(),version:text('version').notNull(),name:text('name').notNull().default(''),material:text('material').notNull().default(''),drive:text('drive').notNull().default(''),drawingDate:text('drawing_date').notNull().default(''),note:text('note').notNull().default(''),fileKey:text('file_key'),fileName:text('file_name'),fileType:text('file_type'),disabled:integer('disabled').notNull().default(0),createdAt:text('created_at').notNull()},t=>[uniqueIndex('series_customer_number_version').on(t.customerId,t.number,t.version)]);
export const seriesDrawingRows=sqliteTable('series_drawing_rows',{id:text('id').primaryKey(),seriesId:text('series_id').notNull().references(():AnySQLiteColumn=>seriesDrawings.id),position:integer('position').notNull().default(0),size:text('size').notNull(),style:text('style').notNull().default(''),turnEnd:text('turn_end').notNull(),turnDiameter:text('turn_diameter').notNull(),stepLength:text('step_length').notNull().default(''),totalLength:text('total_length').notNull(),grooveGap:text('groove_gap').notNull().default(''),threadDepth:text('thread_depth').notNull().default(''),note:text('note').notNull().default(''),drawingId:text('drawing_id').references(():AnySQLiteColumn=>drawings.id),specCount:integer('spec_count').notNull().default(0)},t=>[uniqueIndex('series_rows_size').on(t.seriesId,t.size),index('series_rows_series').on(t.seriesId)]);
