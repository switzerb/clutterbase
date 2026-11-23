-- Generated from the inspected local database with Supabase pg-delta.
-- Explicit grants below are authoritative; disable legacy automatic exposure.
SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

CREATE SCHEMA "private";

REVOKE ALL ON SCHEMA "private" FROM PUBLIC, "anon";

CREATE TABLE "public"."archive_memberships" (
  "archive_id"      uuid                     NOT NULL,
  "user_id"         uuid                     NOT NULL,
  "role"            text                     NOT NULL,
  "blocked"         boolean                  NOT NULL DEFAULT false,
  "admission_email" text                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "archive_membership_email_unique" UNIQUE (archive_id, admission_email),
  CONSTRAINT "archive_memberships_admission_email_check"
    CHECK (((admission_email = lower(btrim(admission_email))) AND ((length(admission_email) >= 3) AND (length(admission_email) <= 320)))),
  CONSTRAINT "archive_memberships_pkey" PRIMARY KEY (archive_id, user_id),
  CONSTRAINT "archive_memberships_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'contributor'::text]))),
  CONSTRAINT "owners_cannot_be_blocked" CHECK (((role <> 'owner'::text) OR (NOT blocked)))
);

ALTER TABLE "public"."archive_memberships"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."archive_memberships" FROM "anon";

CREATE TABLE "public"."archives" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "archives_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200))),
  CONSTRAINT "archives_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."archives"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."archives" FROM "anon";

CREATE OR REPLACE FUNCTION private.active_archive_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select archive_id from public.archive_memberships
  where user_id = (select auth.uid()) and not blocked
$function$;

CREATE OR REPLACE FUNCTION private.owned_archive_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select archive_id from public.archive_memberships
  where user_id = (select auth.uid()) and role = 'owner' and not blocked
$function$;

CREATE OR REPLACE FUNCTION private.set_contributor_block (
  target_archive_id uuid,
  target_user_id    uuid,
  should_block      boolean
)
  RETURNS public.archive_memberships
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  caller uuid := auth.uid();
  target public.archive_memberships;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if should_block is null then
    raise exception using errcode = '22023', message = 'invalid_block_state';
  end if;
  perform 1 from public.archives where id = target_archive_id for update;
  if not exists (
    select 1 from public.archive_memberships
    where archive_id = target_archive_id and user_id = caller and role = 'owner' and not blocked
  ) then
    raise exception using errcode = '42501', message = 'owner_required';
  end if;
  select * into target from public.archive_memberships
    where archive_id = target_archive_id and user_id = target_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'membership_not_found';
  end if;
  if target.role = 'owner' then
    raise exception using errcode = '42501', message = 'owner_protected';
  end if;
  update public.archive_memberships
    set blocked = should_block,
        updated_at = case when blocked is distinct from should_block then clock_timestamp() else updated_at end
    where archive_id = target_archive_id and user_id = target_user_id
    returning * into target;
  return target;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_contributor_block (
  target_archive_id uuid,
  target_user_id    uuid,
  should_block      boolean
)
  RETURNS public.archive_memberships
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  select private.set_contributor_block(target_archive_id, target_user_id, should_block)
$function$;

REVOKE ALL ON FUNCTION "public"."set_contributor_block"(uuid, uuid, boolean) FROM PUBLIC, "anon";

ALTER TABLE "public"."archive_memberships"
  ADD CONSTRAINT "archive_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."archive_memberships"
  ADD CONSTRAINT "archive_memberships_archive_id_fkey" FOREIGN KEY (archive_id) REFERENCES public.archives(id) ON DELETE RESTRICT;

CREATE INDEX archive_memberships_user_id_idx ON public.archive_memberships USING btree (user_id);

CREATE POLICY "members_read_memberships" ON "public"."archive_memberships"
  FOR SELECT
  TO "authenticated"
  USING ((((user_id = ( SELECT auth.uid() AS uid)) AND (NOT blocked)) OR (archive_id IN ( SELECT private.owned_archive_ids() AS owned_archive_ids))));

CREATE POLICY "members_read_archives" ON "public"."archives"
  FOR SELECT
  TO "authenticated"
  USING ((id IN ( SELECT private.active_archive_ids() AS active_archive_ids)));

REVOKE ALL ON FUNCTION "private"."active_archive_ids"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."active_archive_ids"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."owned_archive_ids"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."owned_archive_ids"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."set_contributor_block"(uuid, uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."set_contributor_block"(uuid, uuid, boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."set_contributor_block"(uuid, uuid, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."set_contributor_block"(uuid, uuid, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_contributor_block"(uuid, uuid, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_contributor_block"(uuid, uuid, boolean) TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

REVOKE ALL ON TABLE "public"."archive_memberships" FROM "authenticated";

GRANT SELECT ON TABLE "public"."archive_memberships" TO "authenticated";

REVOKE ALL ON TABLE "public"."archive_memberships" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."archive_memberships" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."archive_memberships" TO "service_role";

REVOKE ALL ON TABLE "public"."archives" FROM "authenticated";

GRANT SELECT ON TABLE "public"."archives" TO "authenticated";

REVOKE ALL ON TABLE "public"."archives" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."archives" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."archives" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE EXECUTE ON FUNCTIONS FROM "anon", "authenticated", "service_role";
