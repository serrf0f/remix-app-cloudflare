CREATE TABLE `email_verification_code` (
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`retry` integer,
	PRIMARY KEY(`email`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `oauth_account` (
	`provider_id` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`provider_id`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reset_password` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer,
	`hashed_password` text,
	`username` text,
	`avatar_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_code_user_id_unique` ON `email_verification_code` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);