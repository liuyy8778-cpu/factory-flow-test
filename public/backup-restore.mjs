// <define:__MIGRATIONS__>
var define_MIGRATIONS_default = ["CREATE TABLE `documents` (\n	`id` text PRIMARY KEY NOT NULL,\n	`number` text NOT NULL,\n	`kind` text NOT NULL,\n	`partner_id` text NOT NULL,\n	`date` text NOT NULL,\n	`lines` text NOT NULL,\n	`subtotal` integer NOT NULL,\n	`tax` integer NOT NULL,\n	`total` integer NOT NULL,\n	`note` text NOT NULL,\n	`invoice_id` text,\n	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `documents_number_unique` ON `documents` (`number`);--> statement-breakpoint\nCREATE TABLE `invoices` (\n	`id` text PRIMARY KEY NOT NULL,\n	`number` text NOT NULL,\n	`partner_id` text NOT NULL,\n	`date` text NOT NULL,\n	`due` text NOT NULL,\n	`total` integer NOT NULL,\n	`paid` integer DEFAULT 0 NOT NULL,\n	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint\nCREATE TABLE `partners` (\n	`id` text PRIMARY KEY NOT NULL,\n	`name` text NOT NULL,\n	`kind` text NOT NULL,\n	`contact` text NOT NULL,\n	`phone` text NOT NULL,\n	`tax_id` text NOT NULL,\n	`address` text NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE `payments` (\n	`id` text PRIMARY KEY NOT NULL,\n	`invoice_id` text NOT NULL,\n	`date` text NOT NULL,\n	`amount` integer NOT NULL,\n	`note` text NOT NULL,\n	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action\n);\n", "CREATE TABLE `production_reports` (\n	`id` text PRIMARY KEY NOT NULL,\n	`work_order_id` text NOT NULL,\n	`reported_at` text NOT NULL,\n	`operator` text NOT NULL,\n	`good` integer NOT NULL,\n	`defective` integer NOT NULL,\n	`note` text NOT NULL,\n	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE TABLE `sales_orders` (\n	`id` text PRIMARY KEY NOT NULL,\n	`number` text NOT NULL,\n	`partner_id` text NOT NULL,\n	`date` text NOT NULL,\n	`due` text NOT NULL,\n	`product` text NOT NULL,\n	`spec` text NOT NULL,\n	`quantity` integer NOT NULL,\n	`unit` text NOT NULL,\n	`price` integer NOT NULL,\n	`note` text NOT NULL,\n	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `sales_orders_number_unique` ON `sales_orders` (`number`);--> statement-breakpoint\nCREATE TABLE `work_orders` (\n	`id` text PRIMARY KEY NOT NULL,\n	`number` text NOT NULL,\n	`order_id` text NOT NULL,\n	`machine` text DEFAULT '' NOT NULL,\n	`operator` text DEFAULT '' NOT NULL,\n	`status` text DEFAULT 'pending' NOT NULL,\n	`good` integer DEFAULT 0 NOT NULL,\n	`defective` integer DEFAULT 0 NOT NULL,\n	`shipped` integer DEFAULT 0 NOT NULL,\n	`started_at` text,\n	`completed_at` text,\n	FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `work_orders_number_unique` ON `work_orders` (`number`);--> statement-breakpoint\nCREATE UNIQUE INDEX `work_orders_order_id_unique` ON `work_orders` (`order_id`);--> statement-breakpoint\nALTER TABLE `documents` ADD `work_order_id` text REFERENCES work_orders(id);", "CREATE TABLE `drawings` (\n	`id` text PRIMARY KEY NOT NULL,\n	`customer_id` text NOT NULL,\n	`spec_id` text NOT NULL,\n	`number` text NOT NULL,\n	`version` text NOT NULL,\n	`data` text NOT NULL,\n	`preferred` integer DEFAULT 0 NOT NULL,\n	`file_key` text,\n	`file_name` text,\n	`file_type` text,\n	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE TABLE `intakes` (\n	`id` text PRIMARY KEY NOT NULL,\n	`document_id` text NOT NULL,\n	`customer_id` text NOT NULL,\n	`spec_id` text NOT NULL,\n	`drawing_id` text,\n	`material_snapshot` text NOT NULL,\n	`drawing_snapshot` text,\n	`quantity` integer NOT NULL,\n	`packages` integer NOT NULL,\n	`due` text NOT NULL,\n	`fee` integer NOT NULL,\n	`dispatched` integer DEFAULT 0 NOT NULL,\n	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE TABLE `material_specs` (\n	`id` text PRIMARY KEY NOT NULL,\n	`code` text NOT NULL,\n	`data` text NOT NULL\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `material_specs_code_unique` ON `material_specs` (`code`);--> statement-breakpoint\nCREATE TABLE `spec_options` (\n	`id` text PRIMARY KEY NOT NULL,\n	`field` text NOT NULL,\n	`value` text NOT NULL\n);\n--> statement-breakpoint\nALTER TABLE `work_orders` ADD `intake_id` text REFERENCES intakes(id);", "CREATE UNIQUE INDEX `drawings_customer_spec_version_unique` ON `drawings` (`customer_id`,`spec_id`,`number`,`version`);--> statement-breakpoint\nCREATE UNIQUE INDEX `work_orders_intake_unique` ON `work_orders` (`intake_id`);", "CREATE TABLE `material_drafts` (\n	`id` text PRIMARY KEY NOT NULL,\n	`data` text NOT NULL,\n	`updated_at` text NOT NULL\n);\n--> statement-breakpoint\nALTER TABLE `material_specs` ADD `fingerprint` text;--> statement-breakpoint\nCREATE UNIQUE INDEX `material_specs_fingerprint_unique` ON `material_specs` (`fingerprint`);", "CREATE TABLE `barrel_audit` (\n	`id` text PRIMARY KEY NOT NULL,\n	`entry_id` text NOT NULL,\n	`stamp` text NOT NULL,\n	`before` text,\n	`after` text NOT NULL,\n	`reason` text NOT NULL,\n	FOREIGN KEY (`entry_id`) REFERENCES `barrel_entries`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE TABLE `barrel_entries` (\n	`id` text PRIMARY KEY NOT NULL,\n	`document_id` text,\n	`customer_id` text NOT NULL,\n	`number` text NOT NULL,\n	`date` text NOT NULL,\n	`kind` text NOT NULL,\n	`incoming` integer NOT NULL,\n	`outgoing` integer NOT NULL,\n	`note` text NOT NULL,\n	`version` integer DEFAULT 1 NOT NULL,\n	`voided` integer DEFAULT 0 NOT NULL,\n	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `barrel_entries_document_id_unique` ON `barrel_entries` (`document_id`);--> statement-breakpoint\nCREATE UNIQUE INDEX `barrel_customer_number_unique` ON `barrel_entries` (`customer_id`,`number`);--> statement-breakpoint\nCREATE TABLE `number_counters` (\n	`id` text PRIMARY KEY NOT NULL,\n	`value` integer NOT NULL\n);\n--> statement-breakpoint\nALTER TABLE `documents` ADD `customer_id` text REFERENCES partners(id);--> statement-breakpoint\nALTER TABLE `documents` ADD `barrels` integer DEFAULT 0 NOT NULL;--> statement-breakpoint\nALTER TABLE `documents` ADD `original_number` text DEFAULT '' NOT NULL;--> statement-breakpoint\nALTER TABLE `documents` ADD `voided` integer DEFAULT 0 NOT NULL;--> statement-breakpoint\nALTER TABLE `intakes` ADD `package_unit` text DEFAULT '\u4EF6' NOT NULL;--> statement-breakpoint\nALTER TABLE `partners` ADD `code` text DEFAULT '' NOT NULL;", "DROP INDEX `barrel_customer_number_unique`;--> statement-breakpoint\nCREATE INDEX `barrel_customer_date_idx` ON `barrel_entries` (`customer_id`,`date`);--> statement-breakpoint\nDROP INDEX `documents_number_unique`;", "ALTER TABLE `intakes` ADD `position` integer DEFAULT 0 NOT NULL;", 'CREATE TABLE `intake_allocations` (\n	`id` text PRIMARY KEY NOT NULL,\n	`intake_id` text NOT NULL,\n	`drawing_id` text NOT NULL,\n	`drawing_snapshot` text NOT NULL,\n	`quantity` integer NOT NULL,\n	`fee` integer NOT NULL,\n	`due` text NOT NULL,\n	`created_at` text NOT NULL,\n	FOREIGN KEY (`intake_id`) REFERENCES `intakes`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE INDEX `allocations_intake_idx` ON `intake_allocations` (`intake_id`);--> statement-breakpoint\nCREATE TABLE `intake_audit` (\n	`id` text PRIMARY KEY NOT NULL,\n	`intake_id` text NOT NULL,\n	`stamp` text NOT NULL,\n	`actor` text NOT NULL,\n	`reason` text NOT NULL,\n	`before` text NOT NULL,\n	`after` text NOT NULL,\n	FOREIGN KEY (`intake_id`) REFERENCES `intakes`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE INDEX `intake_audit_intake_idx` ON `intake_audit` (`intake_id`);--> statement-breakpoint\nDROP INDEX `work_orders_intake_unique`;--> statement-breakpoint\nALTER TABLE `work_orders` ADD `allocation_id` text REFERENCES intake_allocations(id);--> statement-breakpoint\nCREATE UNIQUE INDEX `work_orders_allocation_unique` ON `work_orders` (`allocation_id`);--> statement-breakpoint\nCREATE UNIQUE INDEX `work_orders_intake_unique` ON `work_orders` (`intake_id`) WHERE "work_orders"."allocation_id" IS NULL;', "CREATE TABLE `drawing_specs` (\n	`id` text PRIMARY KEY NOT NULL,\n	`drawing_id` text NOT NULL,\n	`spec_id` text NOT NULL,\n	`preferred` integer DEFAULT 0 NOT NULL,\n	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action,\n	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `drawing_specs_pair` ON `drawing_specs` (`drawing_id`,`spec_id`);--> statement-breakpoint\nCREATE INDEX `drawing_specs_spec` ON `drawing_specs` (`spec_id`);--> statement-breakpoint\nCREATE TRIGGER drawings_shared_unique BEFORE INSERT ON drawings\nWHEN EXISTS(SELECT 1 FROM drawing_specs ds JOIN drawings d ON d.id=ds.drawing_id WHERE ds.spec_id=NEW.spec_id AND d.customer_id=NEW.customer_id AND d.number=NEW.number AND d.version=NEW.version)\nBEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_specs_shared_unique BEFORE INSERT ON drawing_specs\nWHEN EXISTS(SELECT 1 FROM drawings current JOIN drawings other ON other.customer_id=current.customer_id AND other.number=current.number AND other.version=current.version AND other.id<>current.id WHERE current.id=NEW.drawing_id AND (other.spec_id=NEW.spec_id OR EXISTS(SELECT 1 FROM drawing_specs ds WHERE ds.drawing_id=other.id AND ds.spec_id=NEW.spec_id)))\nBEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;\n", "CREATE TABLE `drawing_audit` (\n	`id` text PRIMARY KEY NOT NULL,\n	`drawing_id` text NOT NULL,\n	`stamp` text NOT NULL,\n	`actor` text NOT NULL,\n	`reason` text NOT NULL,\n	`action` text NOT NULL,\n	`before` text NOT NULL,\n	`after` text NOT NULL,\n	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE INDEX `drawing_audit_drawing_idx` ON `drawing_audit` (`drawing_id`);--> statement-breakpoint\nALTER TABLE `drawings` ADD `disabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint\nALTER TABLE `drawings` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint\nALTER TABLE `drawings` ADD `used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint\nCREATE TRIGGER drawing_mark_used_intake AFTER INSERT ON intakes WHEN NEW.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_mark_used_bind AFTER UPDATE OF drawing_id ON intakes WHEN NEW.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_mark_used_allocation AFTER INSERT ON intake_allocations BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;\n--> statement-breakpoint\nCREATE TRIGGER drawings_shared_unique_update BEFORE UPDATE OF number,version ON drawings\nWHEN EXISTS(SELECT 1 FROM drawings other WHERE other.id<>NEW.id AND other.customer_id=NEW.customer_id AND other.number=NEW.number AND other.version=NEW.version AND (other.spec_id=NEW.spec_id OR other.spec_id IN(SELECT spec_id FROM drawing_specs WHERE drawing_id=NEW.id) OR EXISTS(SELECT 1 FROM drawing_specs ds WHERE ds.drawing_id=other.id AND (ds.spec_id=NEW.spec_id OR ds.spec_id IN(SELECT spec_id FROM drawing_specs WHERE drawing_id=NEW.id)))))\nBEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_keep_used_allocation BEFORE DELETE ON intake_allocations BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_keep_used_bind BEFORE UPDATE OF drawing_id ON intakes WHEN OLD.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;\n--> statement-breakpoint\nCREATE TRIGGER drawing_keep_used_intake BEFORE DELETE ON intakes WHEN OLD.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;\n", `CREATE TABLE \`audit_context\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`actor\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`operation_audit\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`stamp\` text NOT NULL,
	\`actor\` text NOT NULL,
	\`table_name\` text NOT NULL,
	\`record_id\` text NOT NULL,
	\`action\` text NOT NULL,
	\`before\` text,
	\`after\` text
);
--> statement-breakpoint
CREATE INDEX \`operation_audit_stamp\` ON \`operation_audit\` (\`stamp\`);
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
`];

// scripts/backup-restore-source.mjs
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

// app/backup-format.ts
var BACKUP_TABLES = ["partners", "documents", "invoices", "payments", "sales_orders", "work_orders", "production_reports", "spec_options", "material_specs", "drawings", "intakes", "material_drafts", "number_counters", "barrel_entries", "barrel_audit", "intake_allocations", "intake_audit", "drawing_specs", "drawing_audit", "operation_audit", "audit_context"];
async function digest(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (n) => n.toString(16).padStart(2, "0")).join("");
}
function fileReferences(tables) {
  const refs = /* @__PURE__ */ new Map();
  function walk(x) {
    if (!x || typeof x !== "object") return;
    if (typeof x.file_key === "string" && x.file_key) refs.set(x.file_key, { name: x.file_name || "\u5716\u6A94", type: x.file_type || "application/octet-stream" });
    if (x.file && typeof x.file.key === "string") refs.set(x.file.key, { name: x.file.name || "\u5716\u6A94", type: x.file.type || "application/octet-stream" });
    for (const v of Object.values(x)) {
      if (typeof v === "string" && /^[\[{]/.test(v.trim())) {
        try {
          walk(JSON.parse(v));
        } catch {
        }
      } else if (typeof v === "object") walk(v);
    }
  }
  walk(tables);
  return refs;
}
async function verifyBackup(input) {
  const b = input;
  if (!b?.payload || b.payload.format !== "factory-flow-backup-v1" || !b.sha256) throw Error("\u4E0D\u662F\u652F\u63F4\u7684\u5EE0\u52D9\u5E33\u5099\u4EFD\u6A94");
  if (await digest(JSON.stringify(b.payload)) !== b.sha256) throw Error("\u5099\u4EFD\u6AA2\u67E5\u78BC\u4E0D\u7B26\uFF0C\u6A94\u6848\u53EF\u80FD\u4E0D\u5B8C\u6574\u6216\u5DF2\u8B8A\u66F4");
  const p = b.payload;
  if (!p.tables || !Array.isArray(p.schema) || !Array.isArray(p.relations) || !Array.isArray(p.files)) throw Error("\u5099\u4EFD\u7D50\u69CB\u4E0D\u5B8C\u6574");
  for (const t of BACKUP_TABLES) {
    if (!Array.isArray(p.tables[t]) || !p.schema.some((s) => s.type === "table" && s.name === t)) throw Error("\u7F3A\u5C11\u8CC7\u6599\u8868\uFF1A" + t);
    const ids = /* @__PURE__ */ new Set(), rowids = /* @__PURE__ */ new Set();
    for (const r of p.tables[t]) {
      if (!r || typeof r.id !== "string" || ids.has(r.id) || !Number.isSafeInteger(r.__backup_rowid) || rowids.has(r.__backup_rowid)) throw Error("\u8CC7\u6599\u8B58\u5225\u91CD\u8907\u6216\u7121\u6548\uFF1A" + t);
      ids.add(r.id);
      rowids.add(r.__backup_rowid);
    }
  }
  for (const rel of [...p.relations, { table: "documents", from: "invoice_id", target: "invoices", to: "id" }]) {
    if (!Array.isArray(p.tables[rel.table]) || !Array.isArray(p.tables[rel.target])) throw Error("\u95DC\u806F\u8CC7\u6599\u8868\u4E0D\u5B58\u5728");
    const targets = new Set(p.tables[rel.target].map((r) => r[rel.to]));
    for (const row of p.tables[rel.table]) if (row[rel.from] != null && !targets.has(row[rel.from])) throw Error("\u8CC7\u6599\u95DC\u806F\u7F3A\u5931\uFF1A" + rel.table + "." + rel.from);
  }
  const files = /* @__PURE__ */ new Map();
  for (const f of p.files) {
    if (files.has(f.key)) throw Error("\u5716\u6A94\u91CD\u8907");
    const binary = atob(f.base64), bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    if (bytes.length !== f.size || await digest(bytes) !== f.sha256) throw Error("\u5716\u6A94\u5167\u5BB9\u4E0D\u5B8C\u6574\uFF1A" + f.name);
    files.set(f.key, f);
  }
  for (const [key] of fileReferences(p.tables)) if (!files.has(key)) throw Error("\u7F3A\u5C11\u5716\u6A94\uFF1A" + key);
  return { created_at: p.created_at, version: p.version, tables: BACKUP_TABLES.map((name) => ({ name, count: p.tables[name].length })), files: p.files.length, rows: BACKUP_TABLES.reduce((n, t) => n + p.tables[t].length, 0) };
}

// scripts/backup-restore-source.mjs
var migrations = define_MIGRATIONS_default;
var quote = (s) => '"' + s.replaceAll('"', '""') + '"';
var canonical = (rows) => JSON.stringify(rows.map((row) => Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))));
async function restoreCopy(backup, destination) {
  const checked = await verifyBackup(backup);
  const db = new DatabaseSync(":memory:");
  try {
    for (const sql of migrations) db.exec(sql);
    const triggers = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger'").all();
    for (const t of triggers) db.exec("DROP TRIGGER " + quote(t.name));
    db.exec("PRAGMA foreign_keys=OFF; BEGIN");
    for (const table of BACKUP_TABLES) {
      const columns = db.prepare("PRAGMA table_info(" + quote(table) + ")").all().map((c) => c.name);
      const expected = ["__backup_rowid", ...columns].sort().join("|");
      const insert = db.prepare("INSERT INTO " + quote(table) + " (rowid," + columns.map(quote).join(",") + ") VALUES (" + ["?", ...columns.map(() => "?")].join(",") + ")");
      for (const row of backup.payload.tables[table]) {
        if (Object.keys(row).sort().join("|") !== expected) throw Error("\u8CC7\u6599\u6B04\u4F4D\u7248\u672C\u4E0D\u7B26\uFF1A" + table);
        insert.run(row.__backup_rowid, ...columns.map((c) => row[c]));
      }
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw Error("\u9084\u539F\u5F8C\u8CC7\u6599\u95DC\u806F\u6AA2\u67E5\u5931\u6557");
    for (const table of BACKUP_TABLES) {
      const restored = db.prepare("SELECT rowid AS __backup_rowid,* FROM " + quote(table) + " ORDER BY rowid").all();
      if (canonical(restored) !== canonical(backup.payload.tables[table])) throw Error("\u9084\u539F\u5167\u5BB9\u4E0D\u7B26\uFF1A" + table);
    }
    for (const t of triggers) db.exec(t.sql);
    db.exec("COMMIT; PRAGMA foreign_keys=ON");
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw Error("SQLite \u5B8C\u6574\u6027\u6AA2\u67E5\u5931\u6557");
    if (existsSync(destination)) throw Error("\u8F38\u51FA\u8CC7\u6599\u593E\u5DF2\u5B58\u5728\uFF0C\u8ACB\u9078\u64C7\u65B0\u7684\u7A7A\u8DEF\u5F91");
    mkdirSync(destination, { recursive: true });
    mkdirSync(join(destination, "attachments"));
    const manifest = [];
    for (const f of backup.payload.files) {
      const filename = await digest(f.key);
      writeFileSync(join(destination, "attachments", filename), Buffer.from(f.base64, "base64"), { flag: "wx" });
      manifest.push({ key: f.key, original_name: f.name, type: f.type, filename, size: f.size, sha256: f.sha256 });
    }
    db.prepare("VACUUM INTO ?").run(join(destination, "factory-flow.sqlite"));
    const report = { ...checked, restored_at: (/* @__PURE__ */ new Date()).toISOString(), database_integrity: "ok", relationships: "ok", all_rows_match: true, attachments_verified: true, production_modified: false };
    writeFileSync(join(destination, "attachments.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
    writeFileSync(join(destination, "report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    return report;
  } finally {
    db.close();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [file, destination] = process.argv.slice(2);
    if (!file || !destination) throw Error("\u7528\u6CD5\uFF1Anode backup-restore.mjs \u5099\u4EFD\u6A94.json \u65B0\u7684\u8F38\u51FA\u8CC7\u6599\u593E");
    if (statSync(file).size > 40 * 1024 * 1024) throw Error("\u672C\u7248\u652F\u63F4 40 MB \u4EE5\u5167\u7684\u5099\u4EFD");
    const result = await restoreCopy(JSON.parse(readFileSync(file, "utf8")), resolve(destination));
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
export {
  restoreCopy
};
