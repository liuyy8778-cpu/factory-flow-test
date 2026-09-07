CREATE TABLE `audit_context` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operation_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`stamp` text NOT NULL,
	`actor` text NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `operation_audit_stamp` ON `operation_audit` (`stamp`);
--> statement-breakpoint
CREATE TRIGGER audit_partners_insert AFTER INSERT ON partners BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'partners',NEW.id,'insert',NULL,json_object('id',NEW."id",'name',NEW."name",'kind',NEW."kind",'contact',NEW."contact",'phone',NEW."phone",'tax_id',NEW."tax_id",'address',NEW."address",'code',NEW."code")); END;

--> statement-breakpoint
CREATE TRIGGER audit_partners_update AFTER UPDATE ON partners BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'partners',NEW.id,'update',json_object('id',OLD."id",'name',OLD."name",'kind',OLD."kind",'contact',OLD."contact",'phone',OLD."phone",'tax_id',OLD."tax_id",'address',OLD."address",'code',OLD."code"),json_object('id',NEW."id",'name',NEW."name",'kind',NEW."kind",'contact',NEW."contact",'phone',NEW."phone",'tax_id',NEW."tax_id",'address',NEW."address",'code',NEW."code")); END;

--> statement-breakpoint
CREATE TRIGGER audit_partners_delete AFTER DELETE ON partners BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'partners',OLD.id,'delete',json_object('id',OLD."id",'name',OLD."name",'kind',OLD."kind",'contact',OLD."contact",'phone',OLD."phone",'tax_id',OLD."tax_id",'address',OLD."address",'code',OLD."code"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_partners BEFORE DELETE ON partners BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_documents_insert AFTER INSERT ON documents BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'documents',NEW.id,'insert',NULL,json_object('id',NEW."id",'number',NEW."number",'kind',NEW."kind",'partner_id',NEW."partner_id",'date',NEW."date",'lines',NEW."lines",'subtotal',NEW."subtotal",'tax',NEW."tax",'total',NEW."total",'note',NEW."note",'invoice_id',NEW."invoice_id",'work_order_id',NEW."work_order_id",'customer_id',NEW."customer_id",'barrels',NEW."barrels",'original_number',NEW."original_number",'voided',NEW."voided")); END;

--> statement-breakpoint
CREATE TRIGGER audit_documents_update AFTER UPDATE ON documents BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'documents',NEW.id,'update',json_object('id',OLD."id",'number',OLD."number",'kind',OLD."kind",'partner_id',OLD."partner_id",'date',OLD."date",'lines',OLD."lines",'subtotal',OLD."subtotal",'tax',OLD."tax",'total',OLD."total",'note',OLD."note",'invoice_id',OLD."invoice_id",'work_order_id',OLD."work_order_id",'customer_id',OLD."customer_id",'barrels',OLD."barrels",'original_number',OLD."original_number",'voided',OLD."voided"),json_object('id',NEW."id",'number',NEW."number",'kind',NEW."kind",'partner_id',NEW."partner_id",'date',NEW."date",'lines',NEW."lines",'subtotal',NEW."subtotal",'tax',NEW."tax",'total',NEW."total",'note',NEW."note",'invoice_id',NEW."invoice_id",'work_order_id',NEW."work_order_id",'customer_id',NEW."customer_id",'barrels',NEW."barrels",'original_number',NEW."original_number",'voided',NEW."voided")); END;

--> statement-breakpoint
CREATE TRIGGER audit_documents_delete AFTER DELETE ON documents BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'documents',OLD.id,'delete',json_object('id',OLD."id",'number',OLD."number",'kind',OLD."kind",'partner_id',OLD."partner_id",'date',OLD."date",'lines',OLD."lines",'subtotal',OLD."subtotal",'tax',OLD."tax",'total',OLD."total",'note',OLD."note",'invoice_id',OLD."invoice_id",'work_order_id',OLD."work_order_id",'customer_id',OLD."customer_id",'barrels',OLD."barrels",'original_number',OLD."original_number",'voided',OLD."voided"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_documents BEFORE DELETE ON documents BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_invoices_insert AFTER INSERT ON invoices BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'invoices',NEW.id,'insert',NULL,json_object('id',NEW."id",'number',NEW."number",'partner_id',NEW."partner_id",'date',NEW."date",'due',NEW."due",'total',NEW."total",'paid',NEW."paid")); END;

--> statement-breakpoint
CREATE TRIGGER audit_invoices_update AFTER UPDATE ON invoices BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'invoices',NEW.id,'update',json_object('id',OLD."id",'number',OLD."number",'partner_id',OLD."partner_id",'date',OLD."date",'due',OLD."due",'total',OLD."total",'paid',OLD."paid"),json_object('id',NEW."id",'number',NEW."number",'partner_id',NEW."partner_id",'date',NEW."date",'due',NEW."due",'total',NEW."total",'paid',NEW."paid")); END;

--> statement-breakpoint
CREATE TRIGGER audit_invoices_delete AFTER DELETE ON invoices BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'invoices',OLD.id,'delete',json_object('id',OLD."id",'number',OLD."number",'partner_id',OLD."partner_id",'date',OLD."date",'due',OLD."due",'total',OLD."total",'paid',OLD."paid"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_invoices BEFORE DELETE ON invoices BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_payments_insert AFTER INSERT ON payments BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'payments',NEW.id,'insert',NULL,json_object('id',NEW."id",'invoice_id',NEW."invoice_id",'date',NEW."date",'amount',NEW."amount",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_payments_update AFTER UPDATE ON payments BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'payments',NEW.id,'update',json_object('id',OLD."id",'invoice_id',OLD."invoice_id",'date',OLD."date",'amount',OLD."amount",'note',OLD."note"),json_object('id',NEW."id",'invoice_id',NEW."invoice_id",'date',NEW."date",'amount',NEW."amount",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_payments_delete AFTER DELETE ON payments BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'payments',OLD.id,'delete',json_object('id',OLD."id",'invoice_id',OLD."invoice_id",'date',OLD."date",'amount',OLD."amount",'note',OLD."note"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_payments BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_sales_orders_insert AFTER INSERT ON sales_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'sales_orders',NEW.id,'insert',NULL,json_object('id',NEW."id",'number',NEW."number",'partner_id',NEW."partner_id",'date',NEW."date",'due',NEW."due",'product',NEW."product",'spec',NEW."spec",'quantity',NEW."quantity",'unit',NEW."unit",'price',NEW."price",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_sales_orders_update AFTER UPDATE ON sales_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'sales_orders',NEW.id,'update',json_object('id',OLD."id",'number',OLD."number",'partner_id',OLD."partner_id",'date',OLD."date",'due',OLD."due",'product',OLD."product",'spec',OLD."spec",'quantity',OLD."quantity",'unit',OLD."unit",'price',OLD."price",'note',OLD."note"),json_object('id',NEW."id",'number',NEW."number",'partner_id',NEW."partner_id",'date',NEW."date",'due',NEW."due",'product',NEW."product",'spec',NEW."spec",'quantity',NEW."quantity",'unit',NEW."unit",'price',NEW."price",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_sales_orders_delete AFTER DELETE ON sales_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'sales_orders',OLD.id,'delete',json_object('id',OLD."id",'number',OLD."number",'partner_id',OLD."partner_id",'date',OLD."date",'due',OLD."due",'product',OLD."product",'spec',OLD."spec",'quantity',OLD."quantity",'unit',OLD."unit",'price',OLD."price",'note',OLD."note"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_sales_orders BEFORE DELETE ON sales_orders BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_work_orders_insert AFTER INSERT ON work_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'work_orders',NEW.id,'insert',NULL,json_object('id',NEW."id",'number',NEW."number",'order_id',NEW."order_id",'machine',NEW."machine",'operator',NEW."operator",'status',NEW."status",'good',NEW."good",'defective',NEW."defective",'shipped',NEW."shipped",'started_at',NEW."started_at",'completed_at',NEW."completed_at",'intake_id',NEW."intake_id",'allocation_id',NEW."allocation_id")); END;

--> statement-breakpoint
CREATE TRIGGER audit_work_orders_update AFTER UPDATE ON work_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'work_orders',NEW.id,'update',json_object('id',OLD."id",'number',OLD."number",'order_id',OLD."order_id",'machine',OLD."machine",'operator',OLD."operator",'status',OLD."status",'good',OLD."good",'defective',OLD."defective",'shipped',OLD."shipped",'started_at',OLD."started_at",'completed_at',OLD."completed_at",'intake_id',OLD."intake_id",'allocation_id',OLD."allocation_id"),json_object('id',NEW."id",'number',NEW."number",'order_id',NEW."order_id",'machine',NEW."machine",'operator',NEW."operator",'status',NEW."status",'good',NEW."good",'defective',NEW."defective",'shipped',NEW."shipped",'started_at',NEW."started_at",'completed_at',NEW."completed_at",'intake_id',NEW."intake_id",'allocation_id',NEW."allocation_id")); END;

--> statement-breakpoint
CREATE TRIGGER audit_work_orders_delete AFTER DELETE ON work_orders BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'work_orders',OLD.id,'delete',json_object('id',OLD."id",'number',OLD."number",'order_id',OLD."order_id",'machine',OLD."machine",'operator',OLD."operator",'status',OLD."status",'good',OLD."good",'defective',OLD."defective",'shipped',OLD."shipped",'started_at',OLD."started_at",'completed_at',OLD."completed_at",'intake_id',OLD."intake_id",'allocation_id',OLD."allocation_id"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_work_orders BEFORE DELETE ON work_orders BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_production_reports_insert AFTER INSERT ON production_reports BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'production_reports',NEW.id,'insert',NULL,json_object('id',NEW."id",'work_order_id',NEW."work_order_id",'reported_at',NEW."reported_at",'operator',NEW."operator",'good',NEW."good",'defective',NEW."defective",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_production_reports_update AFTER UPDATE ON production_reports BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'production_reports',NEW.id,'update',json_object('id',OLD."id",'work_order_id',OLD."work_order_id",'reported_at',OLD."reported_at",'operator',OLD."operator",'good',OLD."good",'defective',OLD."defective",'note',OLD."note"),json_object('id',NEW."id",'work_order_id',NEW."work_order_id",'reported_at',NEW."reported_at",'operator',NEW."operator",'good',NEW."good",'defective',NEW."defective",'note',NEW."note")); END;

--> statement-breakpoint
CREATE TRIGGER audit_production_reports_delete AFTER DELETE ON production_reports BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'production_reports',OLD.id,'delete',json_object('id',OLD."id",'work_order_id',OLD."work_order_id",'reported_at',OLD."reported_at",'operator',OLD."operator",'good',OLD."good",'defective',OLD."defective",'note',OLD."note"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_production_reports BEFORE DELETE ON production_reports BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_material_specs_insert AFTER INSERT ON material_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'material_specs',NEW.id,'insert',NULL,json_object('id',NEW."id",'code',NEW."code",'data',NEW."data",'fingerprint',NEW."fingerprint")); END;

--> statement-breakpoint
CREATE TRIGGER audit_material_specs_update AFTER UPDATE ON material_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'material_specs',NEW.id,'update',json_object('id',OLD."id",'code',OLD."code",'data',OLD."data",'fingerprint',OLD."fingerprint"),json_object('id',NEW."id",'code',NEW."code",'data',NEW."data",'fingerprint',NEW."fingerprint")); END;

--> statement-breakpoint
CREATE TRIGGER audit_material_specs_delete AFTER DELETE ON material_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'material_specs',OLD.id,'delete',json_object('id',OLD."id",'code',OLD."code",'data',OLD."data",'fingerprint',OLD."fingerprint"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_material_specs BEFORE DELETE ON material_specs BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawings_insert AFTER INSERT ON drawings BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawings',NEW.id,'insert',NULL,json_object('id',NEW."id",'customer_id',NEW."customer_id",'spec_id',NEW."spec_id",'number',NEW."number",'version',NEW."version",'data',NEW."data",'preferred',NEW."preferred",'file_key',NEW."file_key",'file_name',NEW."file_name",'file_type',NEW."file_type",'disabled',NEW."disabled",'revision',NEW."revision",'used',NEW."used")); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawings_update AFTER UPDATE ON drawings BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawings',NEW.id,'update',json_object('id',OLD."id",'customer_id',OLD."customer_id",'spec_id',OLD."spec_id",'number',OLD."number",'version',OLD."version",'data',OLD."data",'preferred',OLD."preferred",'file_key',OLD."file_key",'file_name',OLD."file_name",'file_type',OLD."file_type",'disabled',OLD."disabled",'revision',OLD."revision",'used',OLD."used"),json_object('id',NEW."id",'customer_id',NEW."customer_id",'spec_id',NEW."spec_id",'number',NEW."number",'version',NEW."version",'data',NEW."data",'preferred',NEW."preferred",'file_key',NEW."file_key",'file_name',NEW."file_name",'file_type',NEW."file_type",'disabled',NEW."disabled",'revision',NEW."revision",'used',NEW."used")); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawings_delete AFTER DELETE ON drawings BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawings',OLD.id,'delete',json_object('id',OLD."id",'customer_id',OLD."customer_id",'spec_id',OLD."spec_id",'number',OLD."number",'version',OLD."version",'data',OLD."data",'preferred',OLD."preferred",'file_key',OLD."file_key",'file_name',OLD."file_name",'file_type',OLD."file_type",'disabled',OLD."disabled",'revision',OLD."revision",'used',OLD."used"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_drawings BEFORE DELETE ON drawings BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawing_specs_insert AFTER INSERT ON drawing_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawing_specs',NEW.id,'insert',NULL,json_object('id',NEW."id",'drawing_id',NEW."drawing_id",'spec_id',NEW."spec_id",'preferred',NEW."preferred")); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawing_specs_update AFTER UPDATE ON drawing_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawing_specs',NEW.id,'update',json_object('id',OLD."id",'drawing_id',OLD."drawing_id",'spec_id',OLD."spec_id",'preferred',OLD."preferred"),json_object('id',NEW."id",'drawing_id',NEW."drawing_id",'spec_id',NEW."spec_id",'preferred',NEW."preferred")); END;

--> statement-breakpoint
CREATE TRIGGER audit_drawing_specs_delete AFTER DELETE ON drawing_specs BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'drawing_specs',OLD.id,'delete',json_object('id',OLD."id",'drawing_id',OLD."drawing_id",'spec_id',OLD."spec_id",'preferred',OLD."preferred"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_drawing_specs BEFORE DELETE ON drawing_specs BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_intakes_insert AFTER INSERT ON intakes BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intakes',NEW.id,'insert',NULL,json_object('id',NEW."id",'document_id',NEW."document_id",'customer_id',NEW."customer_id",'spec_id',NEW."spec_id",'drawing_id',NEW."drawing_id",'material_snapshot',NEW."material_snapshot",'drawing_snapshot',NEW."drawing_snapshot",'quantity',NEW."quantity",'packages',NEW."packages",'due',NEW."due",'fee',NEW."fee",'dispatched',NEW."dispatched",'package_unit',NEW."package_unit",'position',NEW."position")); END;

--> statement-breakpoint
CREATE TRIGGER audit_intakes_update AFTER UPDATE ON intakes BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intakes',NEW.id,'update',json_object('id',OLD."id",'document_id',OLD."document_id",'customer_id',OLD."customer_id",'spec_id',OLD."spec_id",'drawing_id',OLD."drawing_id",'material_snapshot',OLD."material_snapshot",'drawing_snapshot',OLD."drawing_snapshot",'quantity',OLD."quantity",'packages',OLD."packages",'due',OLD."due",'fee',OLD."fee",'dispatched',OLD."dispatched",'package_unit',OLD."package_unit",'position',OLD."position"),json_object('id',NEW."id",'document_id',NEW."document_id",'customer_id',NEW."customer_id",'spec_id',NEW."spec_id",'drawing_id',NEW."drawing_id",'material_snapshot',NEW."material_snapshot",'drawing_snapshot',NEW."drawing_snapshot",'quantity',NEW."quantity",'packages',NEW."packages",'due',NEW."due",'fee',NEW."fee",'dispatched',NEW."dispatched",'package_unit',NEW."package_unit",'position',NEW."position")); END;

--> statement-breakpoint
CREATE TRIGGER audit_intakes_delete AFTER DELETE ON intakes BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intakes',OLD.id,'delete',json_object('id',OLD."id",'document_id',OLD."document_id",'customer_id',OLD."customer_id",'spec_id',OLD."spec_id",'drawing_id',OLD."drawing_id",'material_snapshot',OLD."material_snapshot",'drawing_snapshot',OLD."drawing_snapshot",'quantity',OLD."quantity",'packages',OLD."packages",'due',OLD."due",'fee',OLD."fee",'dispatched',OLD."dispatched",'package_unit',OLD."package_unit",'position',OLD."position"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_intakes BEFORE DELETE ON intakes BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;

--> statement-breakpoint
CREATE TRIGGER audit_intake_allocations_insert AFTER INSERT ON intake_allocations BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intake_allocations',NEW.id,'insert',NULL,json_object('id',NEW."id",'intake_id',NEW."intake_id",'drawing_id',NEW."drawing_id",'drawing_snapshot',NEW."drawing_snapshot",'quantity',NEW."quantity",'fee',NEW."fee",'due',NEW."due",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_intake_allocations_update AFTER UPDATE ON intake_allocations BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intake_allocations',NEW.id,'update',json_object('id',OLD."id",'intake_id',OLD."intake_id",'drawing_id',OLD."drawing_id",'drawing_snapshot',OLD."drawing_snapshot",'quantity',OLD."quantity",'fee',OLD."fee",'due',OLD."due",'created_at',OLD."created_at"),json_object('id',NEW."id",'intake_id',NEW."intake_id",'drawing_id',NEW."drawing_id",'drawing_snapshot',NEW."drawing_snapshot",'quantity',NEW."quantity",'fee',NEW."fee",'due',NEW."due",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_intake_allocations_delete AFTER DELETE ON intake_allocations BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'intake_allocations',OLD.id,'delete',json_object('id',OLD."id",'intake_id',OLD."intake_id",'drawing_id',OLD."drawing_id",'drawing_snapshot',OLD."drawing_snapshot",'quantity',OLD."quantity",'fee',OLD."fee",'due',OLD."due",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_barrel_entries_insert AFTER INSERT ON barrel_entries BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'barrel_entries',NEW.id,'insert',NULL,json_object('id',NEW."id",'document_id',NEW."document_id",'customer_id',NEW."customer_id",'number',NEW."number",'date',NEW."date",'kind',NEW."kind",'incoming',NEW."incoming",'outgoing',NEW."outgoing",'note',NEW."note",'version',NEW."version",'voided',NEW."voided")); END;

--> statement-breakpoint
CREATE TRIGGER audit_barrel_entries_update AFTER UPDATE ON barrel_entries BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'barrel_entries',NEW.id,'update',json_object('id',OLD."id",'document_id',OLD."document_id",'customer_id',OLD."customer_id",'number',OLD."number",'date',OLD."date",'kind',OLD."kind",'incoming',OLD."incoming",'outgoing',OLD."outgoing",'note',OLD."note",'version',OLD."version",'voided',OLD."voided"),json_object('id',NEW."id",'document_id',NEW."document_id",'customer_id',NEW."customer_id",'number',NEW."number",'date',NEW."date",'kind',NEW."kind",'incoming',NEW."incoming",'outgoing',NEW."outgoing",'note',NEW."note",'version',NEW."version",'voided',NEW."voided")); END;

--> statement-breakpoint
CREATE TRIGGER audit_barrel_entries_delete AFTER DELETE ON barrel_entries BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'barrel_entries',OLD.id,'delete',json_object('id',OLD."id",'document_id',OLD."document_id",'customer_id',OLD."customer_id",'number',OLD."number",'date',OLD."date",'kind',OLD."kind",'incoming',OLD."incoming",'outgoing',OLD."outgoing",'note',OLD."note",'version',OLD."version",'voided',OLD."voided"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER protect_delete_barrel_entries BEFORE DELETE ON barrel_entries BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;
