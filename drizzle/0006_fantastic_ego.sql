DROP INDEX `barrel_customer_number_unique`;--> statement-breakpoint
CREATE INDEX `barrel_customer_date_idx` ON `barrel_entries` (`customer_id`,`date`);--> statement-breakpoint
DROP INDEX `documents_number_unique`;