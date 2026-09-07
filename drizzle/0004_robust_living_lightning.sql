CREATE TABLE `material_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `material_specs` ADD `fingerprint` text;--> statement-breakpoint
CREATE UNIQUE INDEX `material_specs_fingerprint_unique` ON `material_specs` (`fingerprint`);