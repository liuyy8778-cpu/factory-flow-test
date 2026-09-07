CREATE TABLE `drawing_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`drawing_id` text NOT NULL,
	`stamp` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`action` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	FOREIGN KEY (`drawing_id`) REFERENCES `drawings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `drawing_audit_drawing_idx` ON `drawing_audit` (`drawing_id`);--> statement-breakpoint
ALTER TABLE `drawings` ADD `disabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drawings` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `drawings` ADD `used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TRIGGER drawing_mark_used_intake AFTER INSERT ON intakes WHEN NEW.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;
--> statement-breakpoint
CREATE TRIGGER drawing_mark_used_bind AFTER UPDATE OF drawing_id ON intakes WHEN NEW.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;
--> statement-breakpoint
CREATE TRIGGER drawing_mark_used_allocation AFTER INSERT ON intake_allocations BEGIN UPDATE drawings SET used=1 WHERE id=NEW.drawing_id; END;
--> statement-breakpoint
CREATE TRIGGER drawings_shared_unique_update BEFORE UPDATE OF number,version ON drawings
WHEN EXISTS(SELECT 1 FROM drawings other WHERE other.id<>NEW.id AND other.customer_id=NEW.customer_id AND other.number=NEW.number AND other.version=NEW.version AND (other.spec_id=NEW.spec_id OR other.spec_id IN(SELECT spec_id FROM drawing_specs WHERE drawing_id=NEW.id) OR EXISTS(SELECT 1 FROM drawing_specs ds WHERE ds.drawing_id=other.id AND (ds.spec_id=NEW.spec_id OR ds.spec_id IN(SELECT spec_id FROM drawing_specs WHERE drawing_id=NEW.id)))))
BEGIN SELECT RAISE(ABORT,'duplicate drawing mapping'); END;
--> statement-breakpoint
CREATE TRIGGER drawing_keep_used_allocation BEFORE DELETE ON intake_allocations BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;
--> statement-breakpoint
CREATE TRIGGER drawing_keep_used_bind BEFORE UPDATE OF drawing_id ON intakes WHEN OLD.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;
--> statement-breakpoint
CREATE TRIGGER drawing_keep_used_intake BEFORE DELETE ON intakes WHEN OLD.drawing_id IS NOT NULL BEGIN UPDATE drawings SET used=1 WHERE id=OLD.drawing_id; END;
