CREATE TABLE `intake_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`intake_id` text NOT NULL,
	`drawing_id` text NOT NULL,
	`drawing_snapshot` text NOT NULL,
	`quantity` integer NOT NULL,
	`fee` integer NOT NULL,
	`due` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`intake_id`) REFERENCES `intakes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `allocations_intake_idx` ON `intake_allocations` (`intake_id`);--> statement-breakpoint
CREATE TABLE `intake_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`intake_id` text NOT NULL,
	`stamp` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	FOREIGN KEY (`intake_id`) REFERENCES `intakes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intake_audit_intake_idx` ON `intake_audit` (`intake_id`);--> statement-breakpoint
DROP INDEX `work_orders_intake_unique`;--> statement-breakpoint
ALTER TABLE `work_orders` ADD `allocation_id` text REFERENCES intake_allocations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_allocation_unique` ON `work_orders` (`allocation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_intake_unique` ON `work_orders` (`intake_id`) WHERE "work_orders"."allocation_id" IS NULL;