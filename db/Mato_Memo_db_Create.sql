-- public."AspNetRoles" definition

-- Drop table

-- DROP TABLE public."AspNetRoles";

CREATE TABLE public."AspNetRoles" (
	"Id" uuid NOT NULL,
	"Name" varchar(256) NULL,
	"NormalizedName" varchar(256) NULL,
	"ConcurrencyStamp" text NULL,
	CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX "RoleNameIndex" ON public."AspNetRoles" USING btree ("NormalizedName");


-- public."AspNetUsers" definition

-- Drop table

-- DROP TABLE public."AspNetUsers";

CREATE TABLE public."AspNetUsers" (
	"Id" uuid NOT NULL,
	"UserName" varchar(256) NULL,
	"NormalizedUserName" varchar(256) NULL,
	"Email" varchar(256) NULL,
	"NormalizedEmail" varchar(256) NULL,
	"EmailConfirmed" bool NOT NULL,
	"PasswordHash" text NULL,
	"SecurityStamp" text NULL,
	"ConcurrencyStamp" text NULL,
	"PhoneNumber" text NULL,
	"PhoneNumberConfirmed" bool NOT NULL,
	"TwoFactorEnabled" bool NOT NULL,
	"LockoutEnd" timestamptz NULL,
	"LockoutEnabled" bool NOT NULL,
	"AccessFailedCount" int4 NOT NULL,
	CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id")
);
CREATE INDEX "EmailIndex" ON public."AspNetUsers" USING btree ("NormalizedEmail");
CREATE UNIQUE INDEX "UserNameIndex" ON public."AspNetUsers" USING btree ("NormalizedUserName");


-- public."__EFMigrationsHistory" definition

-- Drop table

-- DROP TABLE public."__EFMigrationsHistory";

CREATE TABLE public."__EFMigrationsHistory" (
	"MigrationId" varchar(150) NOT NULL,
	"ProductVersion" varchar(32) NOT NULL,
	CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);


-- public.mgr_app_info definition

-- Drop table

-- DROP TABLE public.mgr_app_info;

CREATE TABLE public.mgr_app_info (
	id int4 DEFAULT 1 NOT NULL,
	avg_score numeric(3, 2) DEFAULT 0 NULL,
	total_feedback_count int8 DEFAULT 0 NULL,
	total_user_count int8 DEFAULT 0 NULL,
	total_archive_pub_count int8 DEFAULT 0 NULL,
	total_detail_pub_count int8 DEFAULT 0 NULL,
	last_aggregate_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT mgr_app_info_pkey PRIMARY KEY (id)
);


-- public.mgr_sys_config definition

-- Drop table

-- DROP TABLE public.mgr_sys_config;

CREATE TABLE public.mgr_sys_config (
	category varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	value text NULL,
	description text NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT mgr_sys_config_pkey PRIMARY KEY (category, key)
);


-- public.mgr_table_statistics definition

-- Drop table

-- DROP TABLE public.mgr_table_statistics;

CREATE TABLE public.mgr_table_statistics (
	table_id int4 NOT NULL,
	table_name varchar(50) NOT NULL,
	record_count int8 DEFAULT 0 NULL,
	user_count int8 DEFAULT 0 NULL,
	last_count_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT mgr_table_statistics_pkey PRIMARY KEY (table_id)
);


-- public.t_app_user definition

-- Drop table

-- DROP TABLE public.t_app_user;

CREATE TABLE public.t_app_user (
	user_id uuid NOT NULL,
	table_id int4 NOT NULL,
	plan_type varchar(20) DEFAULT 'Free'::character varying NULL,
	member_no bigserial NULL,
	user_category varchar(50) DEFAULT '通りすがり'::character varying NULL,
	user_rank int4 DEFAULT 0 NULL,
	icon varchar(20) NULL,
	nick_name varchar(50) NULL,
	description text NULL,
	link_1 varchar(2000) NULL,
	link_2 varchar(2000) NULL,
	link_3 varchar(2000) NULL,
	anonymous_flg bool DEFAULT false NULL,
	ban_flg bool DEFAULT false NULL,
	del_flg bool DEFAULT false NULL,
	last_login_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	click_stats jsonb DEFAULT '{}'::jsonb NULL,
	info_stats jsonb DEFAULT '{}'::jsonb NULL,
	info_stats_pub jsonb DEFAULT '{}'::jsonb NULL,
	report_count int4 DEFAULT 0 NULL,
	view_history jsonb DEFAULT '[]'::jsonb NULL,
	CONSTRAINT t_app_user_pkey PRIMARY KEY (user_id)
);


-- public.t_memo_archive definition

-- Drop table

-- DROP TABLE public.t_memo_archive;

CREATE TABLE public.t_memo_archive (
	archive_id serial4 NOT NULL,
	user_id uuid NOT NULL,
	category varchar(50) DEFAULT '気まぐれ旅'::character varying NULL,
	title varchar(100) NOT NULL,
	memo text NULL,
	link_url varchar(2000) NULL,
	currency_unit varchar(10) DEFAULT 'JPY'::character varying NULL,
	detail_count int4 DEFAULT 0 NULL,
	closed_flg bool DEFAULT false NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_archive_pkey PRIMARY KEY (archive_id)
);
CREATE INDEX idx_memo_archive_user ON public.t_memo_archive USING btree (user_id);


-- public.t_memo_archive_pub definition

-- Drop table

-- DROP TABLE public.t_memo_archive_pub;

CREATE TABLE public.t_memo_archive_pub (
	archive_id int4 NOT NULL,
	user_id uuid NOT NULL,
	category varchar(50) DEFAULT '気まぐれ旅'::character varying NULL,
	title varchar(100) NOT NULL,
	memo text NULL,
	link_url varchar(2000) NULL,
	currency_unit varchar(10) DEFAULT 'JPY'::character varying NULL,
	detail_count int4 DEFAULT 0 NULL,
	report_count int4 DEFAULT 0 NULL,
	closed_flg bool DEFAULT true NULL,
	limited_open_flg bool DEFAULT false NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	click_stats jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT t_memo_archive_pub_pkey PRIMARY KEY (archive_id)
);
CREATE INDEX idx_memo_archive_pub_user ON public.t_memo_archive_pub USING btree (user_id);


-- public.t_memo_detail_1 definition

-- Drop table

-- DROP TABLE public.t_memo_detail_1;

CREATE TABLE public.t_memo_detail_1 (
	seq bigserial NOT NULL,
	archive_id int4 DEFAULT 0 NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_detail_1_pkey PRIMARY KEY (seq)
);
CREATE INDEX idx_memo_detail_1_archive ON public.t_memo_detail_1 USING btree (archive_id);
CREATE INDEX idx_memo_detail_1_stray ON public.t_memo_detail_1 USING btree (user_id) WHERE (archive_id = 0);


-- public.t_memo_detail_2 definition

-- Drop table

-- DROP TABLE public.t_memo_detail_2;

CREATE TABLE public.t_memo_detail_2 (
	seq bigserial NOT NULL,
	archive_id int4 DEFAULT 0 NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_detail_2_pkey PRIMARY KEY (seq)
);
CREATE INDEX idx_memo_detail_2_archive ON public.t_memo_detail_2 USING btree (archive_id);
CREATE INDEX idx_memo_detail_2_stray ON public.t_memo_detail_2 USING btree (user_id) WHERE (archive_id = 0);


-- public.t_memo_detail_3 definition

-- Drop table

-- DROP TABLE public.t_memo_detail_3;

CREATE TABLE public.t_memo_detail_3 (
	seq bigserial NOT NULL,
	archive_id int4 DEFAULT 0 NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_detail_3_pkey PRIMARY KEY (seq)
);
CREATE INDEX idx_memo_detail_3_archive ON public.t_memo_detail_3 USING btree (archive_id);
CREATE INDEX idx_memo_detail_3_stray ON public.t_memo_detail_3 USING btree (user_id) WHERE (archive_id = 0);


-- public.t_memo_detail_4 definition

-- Drop table

-- DROP TABLE public.t_memo_detail_4;

CREATE TABLE public.t_memo_detail_4 (
	seq bigserial NOT NULL,
	archive_id int4 DEFAULT 0 NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_detail_4_pkey PRIMARY KEY (seq)
);
CREATE INDEX idx_memo_detail_4_archive ON public.t_memo_detail_4 USING btree (archive_id);
CREATE INDEX idx_memo_detail_4_stray ON public.t_memo_detail_4 USING btree (user_id) WHERE (archive_id = 0);


-- public.t_memo_detail_5 definition

-- Drop table

-- DROP TABLE public.t_memo_detail_5;

CREATE TABLE public.t_memo_detail_5 (
	seq bigserial NOT NULL,
	archive_id int4 DEFAULT 0 NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_memo_detail_5_pkey PRIMARY KEY (seq)
);
CREATE INDEX idx_memo_detail_5_archive ON public.t_memo_detail_5 USING btree (archive_id);
CREATE INDEX idx_memo_detail_5_stray ON public.t_memo_detail_5 USING btree (user_id) WHERE (archive_id = 0);


-- public.t_memo_detail_pub definition

-- Drop table

-- DROP TABLE public.t_memo_detail_pub;

CREATE TABLE public.t_memo_detail_pub (
	archive_id int4 NOT NULL,
	seq int8 NOT NULL,
	user_id uuid NOT NULL,
	latitude numeric(12, 9) NULL,
	longitude numeric(12, 9) NULL,
	title varchar(100) NULL,
	body text NULL,
	memo_date varchar(20) NULL,
	memo_time varchar(20) NULL,
	face_emoji varchar(20) NULL,
	weather_code varchar(20) NULL,
	link_url varchar(2000) NULL,
	memo_price int4 DEFAULT 0 NULL,
	feel_type int4 DEFAULT 0 NULL,
	count_funny int4 DEFAULT 0 NULL,
	count_love int4 DEFAULT 0 NULL,
	count_surprise int4 DEFAULT 0 NULL,
	count_sad int4 DEFAULT 0 NULL,
	del_flg bool DEFAULT false NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	click_stats jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT t_memo_detail_pub_pkey PRIMARY KEY (archive_id, seq)
);
CREATE INDEX idx_memo_detail_pub_archive ON public.t_memo_detail_pub USING btree (archive_id);
CREATE INDEX idx_memo_detail_pub_geo ON public.t_memo_detail_pub USING gist (point((longitude)::double precision, (latitude)::double precision));


-- public.t_reaction_pub definition

-- Drop table

-- DROP TABLE public.t_reaction_pub;

CREATE TABLE public.t_reaction_pub (
	archive_id int4 NOT NULL,
	seq int8 NOT NULL,
	user_id uuid NOT NULL,
	has_funny bool DEFAULT false NULL,
	has_love bool DEFAULT false NULL,
	has_surprise bool DEFAULT false NULL,
	has_sad bool DEFAULT false NULL,
	del_flg bool DEFAULT false NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_reaction_pub_pkey PRIMARY KEY (archive_id, seq, user_id)
);
CREATE INDEX idx_reaction_pub_target ON public.t_reaction_pub USING btree (archive_id, seq);


-- public.t_sys_feedbacks definition

-- Drop table

-- DROP TABLE public.t_sys_feedbacks;

CREATE TABLE public.t_sys_feedbacks (
	user_id uuid NOT NULL,
	body text NULL,
	score int4 NOT NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_sys_feedbacks_pkey PRIMARY KEY (user_id),
	CONSTRAINT t_sys_feedbacks_score_check CHECK (((score >= 1) AND (score <= 5)))
);


-- public.t_sys_notifications definition

-- Drop table

-- DROP TABLE public.t_sys_notifications;

CREATE TABLE public.t_sys_notifications (
	seq serial4 NOT NULL,
	title varchar(200) NOT NULL,
	body text NULL,
	link_url varchar(2000) NULL,
	kind int2 DEFAULT 1 NULL,
	disp_from timestamptz NOT NULL,
	disp_to timestamptz NOT NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_sys_notifications_pkey PRIMARY KEY (seq)
);


-- public.t_sys_reports definition

-- Drop table

-- DROP TABLE public.t_sys_reports;

CREATE TABLE public.t_sys_reports (
	reporter_user_id uuid NOT NULL,
	target_user_id uuid NOT NULL,
	archive_id int8 NOT NULL,
	body text NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	update_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_sys_reports_pkey PRIMARY KEY (reporter_user_id, target_user_id, archive_id)
);


-- public.t_sys_user_histories definition

-- Drop table

-- DROP TABLE public.t_sys_user_histories;

CREATE TABLE public.t_sys_user_histories (
	seq bigserial NOT NULL,
	user_id uuid NOT NULL,
	action_kind varchar(50) NOT NULL,
	body text NULL,
	memo_json jsonb NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_sys_user_histories_pkey PRIMARY KEY (seq)
);


-- public.t_sys_user_notifications definition

-- Drop table

-- DROP TABLE public.t_sys_user_notifications;

CREATE TABLE public.t_sys_user_notifications (
	seq serial4 NOT NULL,
	user_id uuid NOT NULL,
	kind int2 DEFAULT 1 NULL,
	body text NOT NULL,
	link_url varchar(2000) NULL,
	send_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT t_sys_user_notifications_pkey PRIMARY KEY (seq)
);


-- public.tmp_count_queue definition

-- Drop table

-- DROP TABLE public.tmp_count_queue;

CREATE TABLE public.tmp_count_queue (
	target_type int2 NOT NULL,
	target_user_id uuid NOT NULL,
	archive_id int4 NULL,
	seq int8 NULL,
	item_name varchar(50) NOT NULL,
	viewer_user_id uuid NULL,
	create_tim timestamptz DEFAULT CURRENT_TIMESTAMP NULL
);


-- public."AspNetRoleClaims" definition

-- Drop table

-- DROP TABLE public."AspNetRoleClaims";

CREATE TABLE public."AspNetRoleClaims" (
	"Id" int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"RoleId" uuid NOT NULL,
	"ClaimType" text NULL,
	"ClaimValue" text NULL,
	CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
	CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE
);
CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON public."AspNetRoleClaims" USING btree ("RoleId");


-- public."AspNetUserClaims" definition

-- Drop table

-- DROP TABLE public."AspNetUserClaims";

CREATE TABLE public."AspNetUserClaims" (
	"Id" int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"UserId" uuid NOT NULL,
	"ClaimType" text NULL,
	"ClaimValue" text NULL,
	CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
	CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE
);
CREATE INDEX "IX_AspNetUserClaims_UserId" ON public."AspNetUserClaims" USING btree ("UserId");


-- public."AspNetUserLogins" definition

-- Drop table

-- DROP TABLE public."AspNetUserLogins";

CREATE TABLE public."AspNetUserLogins" (
	"LoginProvider" text NOT NULL,
	"ProviderKey" text NOT NULL,
	"ProviderDisplayName" text NULL,
	"UserId" uuid NOT NULL,
	CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
	CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE
);
CREATE INDEX "IX_AspNetUserLogins_UserId" ON public."AspNetUserLogins" USING btree ("UserId");


-- public."AspNetUserRoles" definition

-- Drop table

-- DROP TABLE public."AspNetUserRoles";

CREATE TABLE public."AspNetUserRoles" (
	"UserId" uuid NOT NULL,
	"RoleId" uuid NOT NULL,
	CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
	CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES public."AspNetRoles"("Id") ON DELETE CASCADE,
	CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE
);
CREATE INDEX "IX_AspNetUserRoles_RoleId" ON public."AspNetUserRoles" USING btree ("RoleId");


-- public."AspNetUserTokens" definition

-- Drop table

-- DROP TABLE public."AspNetUserTokens";

CREATE TABLE public."AspNetUserTokens" (
	"UserId" uuid NOT NULL,
	"LoginProvider" text NOT NULL,
	"Name" text NOT NULL,
	"Value" text NULL,
	CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
	CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES public."AspNetUsers"("Id") ON DELETE CASCADE
);