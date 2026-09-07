CREATE TABLE `drawing_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`drawing_id` text NOT NULL,
	`spec_id` text NOT NULL,
	`preferred` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spec_id`) REFERENCES `material_specs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drawing_specs_pair` ON `drawing_specs` (`drawing_id`,`spec_id`);--> statement-breakpoint
CREATE INDEX `drawing_specs_spec` ON `drawing_specs` (`spec_id`);--> statement-breakpoint
CREATE TRIGGER drawings_shared_unique BEFORE INSERT ON drawings
WHEN EXISTS(SELECT 1 FROM drawing_specs ds JOIN drawings d ON d.id=ds.drawing_id WHERE ds.spec_id=NEW.spec_id AND d.customer_id=NEW.customer_id AND d.number=NEW.number AND d.version=NEW.version)
BEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;
--> statement-breakpoint
CREATE TRIGGER drawing_specs_shared_unique BEFORE INSERT ON drawing_specs
WHEN EXISTS(SELECT 1 FROM drawings current JOIN drawings other ON other.customer_id=current.customer_id AND other.number=current.number AND other.version=current.version AND other.id<>current.id WHERE current.id=NEW.drawing_id AND (other.spec_id=NEW.spec_id OR EXISTS(SELECT 1 FROM drawing_specs ds WHERE ds.drawing_id=other.id AND ds.spec_id=NEW.spec_id)))
BEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;
