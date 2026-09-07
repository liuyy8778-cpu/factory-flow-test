CREATE TABLE `production_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`reported_at` text NOT NULL,
	`operator` text NOT NULL,
	`good` integer NOT NULL,
	`defective` integer NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`partner_id` text NOT NULL,
	`date` text NOT NULL,
	`due` text NOT NULL,
	`product` text NOT NULL,
	`spec` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text NOT NULL,
	`price` integer NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_orders_number_unique` ON `sales_orders` (`number`);--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`order_id` text NOT NULL,
	`machine` text DEFAULT '' NOT NULL,
	`operator` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`good` integer DEFAULT 0 NOT NULL,
	`defective` integer DEFAULT 0 NOT NULL,
	`shipped` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_number_unique` ON `work_orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_order_id_unique` ON `work_orders` (`order_id`);--> statement-breakpoint
ALTER TABLE `documents` ADD `work_order_id` text REFERENCES work_orders(id);