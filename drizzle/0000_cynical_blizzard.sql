CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`kind` text NOT NULL,
	`partner_id` text NOT NULL,
	`date` text NOT NULL,
	`lines` text NOT NULL,
	`subtotal` integer NOT NULL,
	`tax` integer NOT NULL,
	`total` integer NOT NULL,
	`note` text NOT NULL,
	`invoice_id` text,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_number_unique` ON `documents` (`number`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`partner_id` text NOT NULL,
	`date` text NOT NULL,
	`due` text NOT NULL,
	`total` integer NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`contact` text NOT NULL,
	`phone` text NOT NULL,
	`tax_id` text NOT NULL,
	`address` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
