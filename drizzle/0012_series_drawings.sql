CREATE TABLE `series_drawing_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`size` text NOT NULL,
	`style` text DEFAULT '' NOT NULL,
	`turn_end` text NOT NULL,
	`turn_diameter` text NOT NULL,
	`step_length` text DEFAULT '' NOT NULL,
	`total_length` text NOT NULL,
	`groove_gap` text DEFAULT '' NOT NULL,
	`thread_depth` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`drawing_id` text,
	`spec_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series_drawings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_rows_size` ON `series_drawing_rows` (`series_id`,`size`);--> statement-breakpoint
CREATE INDEX `series_rows_series` ON `series_drawing_rows` (`series_id`);--> statement-breakpoint
CREATE TABLE `series_drawings` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`number` text NOT NULL,
	`version` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`material` text DEFAULT '' NOT NULL,
	`drive` text DEFAULT '' NOT NULL,
	`drawing_date` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`file_key` text,
	`file_name` text,
	`file_type` text,
	`disabled` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_customer_number_version` ON `series_drawings` (`customer_id`,`number`,`version`);
--> statement-breakpoint
CREATE TRIGGER audit_series_drawings_insert AFTER INSERT ON series_drawings BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'series_drawings',NEW.id,'insert',NULL,json_object('id',NEW."id",'customer_id',NEW."customer_id",'number',NEW."number",'version',NEW."version",'name',NEW."name",'material',NEW."material",'drive',NEW."drive",'drawing_date',NEW."drawing_date",'note',NEW."note",'file_key',NEW."file_key",'file_name',NEW."file_name",'file_type',NEW."file_type",'disabled',NEW."disabled",'created_at',NEW."created_at")); END;--> statement-breakpoint
CREATE TRIGGER audit_series_drawings_update AFTER UPDATE ON series_drawings BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'series_drawings',NEW.id,'update',json_object('id',OLD."id",'customer_id',OLD."customer_id",'number',OLD."number",'version',OLD."version",'name',OLD."name",'material',OLD."material",'drive',OLD."drive",'drawing_date',OLD."drawing_date",'note',OLD."note",'file_key',OLD."file_key",'file_name',OLD."file_name",'file_type',OLD."file_type",'disabled',OLD."disabled",'created_at',OLD."created_at"),json_object('id',NEW."id",'customer_id',NEW."customer_id",'number',NEW."number",'version',NEW."version",'name',NEW."name",'material',NEW."material",'drive',NEW."drive",'drawing_date',NEW."drawing_date",'note',NEW."note",'file_key',NEW."file_key",'file_name',NEW."file_name",'file_type',NEW."file_type",'disabled',NEW."disabled",'created_at',NEW."created_at")); END;--> statement-breakpoint
CREATE TRIGGER protect_delete_series_drawings BEFORE DELETE ON series_drawings BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;--> statement-breakpoint
CREATE TRIGGER audit_series_drawing_rows_insert AFTER INSERT ON series_drawing_rows BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'series_drawing_rows',NEW.id,'insert',NULL,json_object('id',NEW."id",'series_id',NEW."series_id",'position',NEW."position",'size',NEW."size",'style',NEW."style",'turn_end',NEW."turn_end",'turn_diameter',NEW."turn_diameter",'step_length',NEW."step_length",'total_length',NEW."total_length",'groove_gap',NEW."groove_gap",'thread_depth',NEW."thread_depth",'note',NEW."note",'drawing_id',NEW."drawing_id",'spec_count',NEW."spec_count")); END;--> statement-breakpoint
CREATE TRIGGER audit_series_drawing_rows_update AFTER UPDATE ON series_drawing_rows BEGIN INSERT INTO operation_audit(id,stamp,actor,table_name,record_id,action,before,after) VALUES(lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%fZ','now'),COALESCE((SELECT actor FROM audit_context WHERE id='current'),'{"id":"unavailable"}'),'series_drawing_rows',NEW.id,'update',json_object('id',OLD."id",'series_id',OLD."series_id",'position',OLD."position",'size',OLD."size",'style',OLD."style",'turn_end',OLD."turn_end",'turn_diameter',OLD."turn_diameter",'step_length',OLD."step_length",'total_length',OLD."total_length",'groove_gap',OLD."groove_gap",'thread_depth',OLD."thread_depth",'note',OLD."note",'drawing_id',OLD."drawing_id",'spec_count',OLD."spec_count"),json_object('id',NEW."id",'series_id',NEW."series_id",'position',NEW."position",'size',NEW."size",'style',NEW."style",'turn_end',NEW."turn_end",'turn_diameter',NEW."turn_diameter",'step_length',NEW."step_length",'total_length',NEW."total_length",'groove_gap',NEW."groove_gap",'thread_depth',NEW."thread_depth",'note',NEW."note",'drawing_id',NEW."drawing_id",'spec_count',NEW."spec_count")); END;--> statement-breakpoint
CREATE TRIGGER protect_delete_series_drawing_rows BEFORE DELETE ON series_drawing_rows BEGIN SELECT RAISE(ABORT,'permanent deletion disabled; retain or void record'); END;
