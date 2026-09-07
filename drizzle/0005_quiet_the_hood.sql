CREATE TABLE `barrel_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`stamp` text NOT NULL,
	`before` text,
	`after` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `barrel_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `barrel_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`customer_id` text NOT NULL,
	`number` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`incoming` integer NOT NULL,
	`outgoing` integer NOT NULL,
	`note` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`voided` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barrel_entries_document_id_unique` ON `barrel_entries` (`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `barrel_customer_number_unique` ON `barrel_entries` (`customer_id`,`number`);--> statement-breakpoint
CREATE TABLE `number_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `customer_id` text REFERENCES partners(id);--> statement-breakpoint
ALTER TABLE `documents` ADD `barrels` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `original_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `voided` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `intakes` ADD `package_unit` text DEFAULT '件' NOT NULL;--> statement-breakpoint
ALTER TABLE `partners` ADD `code` text DEFAULT '' NOT NULL;