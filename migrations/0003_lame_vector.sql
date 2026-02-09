ALTER TABLE "wholesale_applications" ALTER COLUMN "id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "wholesale_applications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();