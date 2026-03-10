CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'setup' NOT NULL,
	"season" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pools_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "pool_settings" (
	"pool_id" uuid PRIMARY KEY NOT NULL,
	"salary_cap" integer,
	"roster_size" integer NOT NULL,
	"max_forwards" integer NOT NULL,
	"max_defensemen" integer NOT NULL,
	"max_goalies" integer NOT NULL,
	"max_wildcards" integer DEFAULT 0 NOT NULL,
	"scoring_mode" text DEFAULT 'classic' NOT NULL,
	"allow_trades" boolean DEFAULT false NOT NULL,
	"allow_swaps" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"stat_key" text NOT NULL,
	"position_group" text NOT NULL,
	"points_value" numeric(5, 2) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_scoring_rule" UNIQUE("pool_id","stat_key","position_group")
);
--> statement-breakpoint
CREATE TABLE "nhl_game_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"game_date" date NOT NULL,
	"stat_key" text NOT NULL,
	"stat_value" numeric(8, 2) NOT NULL,
	CONSTRAINT "uq_game_stat" UNIQUE("player_id","game_id","stat_key")
);
--> statement-breakpoint
CREATE TABLE "nhl_players" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"team_id" integer,
	"team_abbrev" text,
	"position" text NOT NULL,
	"position_group" text NOT NULL,
	"salary" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"headshot_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nhl_teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"player_id" integer NOT NULL,
	"roster_slot" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"game_date" date NOT NULL,
	"points" numeric(10, 2) DEFAULT '0' NOT NULL,
	"breakdown" jsonb,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily_score" UNIQUE("pool_id","user_id","game_date")
);
--> statement-breakpoint
CREATE TABLE "total_scores" (
	"pool_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "total_scores_pool_id_user_id_pk" PRIMARY KEY("pool_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_settings" ADD CONSTRAINT "pool_settings_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_rules" ADD CONSTRAINT "scoring_rules_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nhl_game_stats" ADD CONSTRAINT "nhl_game_stats_player_id_nhl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nhl_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nhl_players" ADD CONSTRAINT "nhl_players_team_id_nhl_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."nhl_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_members" ADD CONSTRAINT "pool_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_player_id_nhl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nhl_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scores" ADD CONSTRAINT "daily_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "total_scores" ADD CONSTRAINT "total_scores_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "total_scores" ADD CONSTRAINT "total_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pools_host" ON "pools" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "idx_pools_invite" ON "pools" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "idx_scoring_rules_pool" ON "scoring_rules" USING btree ("pool_id");--> statement-breakpoint
CREATE INDEX "idx_game_stats_date" ON "nhl_game_stats" USING btree ("game_date");--> statement-breakpoint
CREATE INDEX "idx_game_stats_player_date" ON "nhl_game_stats" USING btree ("player_id","game_date");--> statement-breakpoint
CREATE INDEX "idx_nhl_players_team" ON "nhl_players" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_nhl_players_position" ON "nhl_players" USING btree ("position_group");--> statement-breakpoint
CREATE INDEX "idx_nhl_players_name" ON "nhl_players" USING btree ("full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pool_member" ON "pool_members" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_pool_members_user" ON "pool_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roster_exclusive" ON "roster_entries" USING btree ("pool_id","player_id");--> statement-breakpoint
CREATE INDEX "idx_roster_user_pool" ON "roster_entries" USING btree ("pool_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_scores_lookup" ON "daily_scores" USING btree ("pool_id","game_date");