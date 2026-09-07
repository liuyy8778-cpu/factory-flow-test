CREATE TABLE `drawings` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`spec_id` text NOT NULL,
	`number` text NOT NULL,
	`version` text NOT NULL,
	`data` text NOT NULL,
	`preferred` integer DEFAULT 0 NOT NULL,
	`file_key` text,
	`file_name` text,
	`file_type` text,
	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`spec_id` text NOT NULL,
	`drawing_id` text,
	`material_snapshot` text NOT NULL,
	`drawing_snapshot` text,
	`quantity` integer NOT NULL,
	`packages` integer NOT NULL,
	`due` text NOT NULL,
	`fee` integer NOT NULL,
	`dispatched` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `material_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `material_specs_code_unique` ON `material_specs` (`code`);--> statement-breakpoint
CREATE TABLE `spec_options` (
	`id` text PRIMARY KEY NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `work_orders` ADD `intake_id` text REFERENCES intakes(id);