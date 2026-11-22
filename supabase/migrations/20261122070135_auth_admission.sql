SET local check_function_bodies = off;

CREATE TABLE "private"."archive_bootstrap" (
  "singleton"      boolean NOT NULL DEFAULT true,
  "archive_id"     uuid    NOT NULL,
  "approved_email" text    NOT NULL,
  "invitation_id"  uuid    NOT NULL,
  CONSTRAINT "archive_bootstrap_archive_id_key" UNIQUE (archive_id),
  CONSTRAINT "archive_bootstrap_pkey" PRIMARY KEY (singleton),
  CONSTRAINT "archive_bootstrap_singleton_check" CHECK (singleton)
);

ALTER TABLE "private"."archive_bootstrap"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.before_user_created (
  event jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if coalesce(event->'user'->>'is_anonymous', 'false') = 'false'
    and event->'user'->'app_metadata'->>'provider' in ('email', 'google')
    and exists (select 1 from private.archive_invitations
      where email = lower(btrim(event->'user'->>'email')) and status = 'pending' and expires_at > now())
  then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Account admission is unavailable.'));
end;
$function$;

CREATE OR REPLACE FUNCTION private.setup_archive (
  archive_name      text,
  approved_email    text,
  credential_digest text,
  recover           boolean DEFAULT false
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  setup private.archive_bootstrap;
  invitation private.archive_invitations;
  normalized text := lower(btrim(approved_email));
  archive uuid;
  issued timestamptz := clock_timestamp();
begin
  if archive_name is null or length(btrim(archive_name)) not between 1 and 200
    or normalized is null or length(normalized) not between 3 and 320
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+$'
    or credential_digest is null or credential_digest !~ '^[0-9a-f]{64}$'
    or recover is null
  then raise exception using errcode = '22023', message = 'invalid_setup'; end if;
  perform pg_advisory_xact_lock(hashtextextended('clutterbase-bootstrap', 0));
  select * into setup from private.archive_bootstrap where singleton for update;
  if found then
    if setup.approved_email <> normalized
      or (select name from public.archives where id = setup.archive_id) <> archive_name
    then raise exception using errcode = 'P0001', message = 'setup_mismatch'; end if;
    archive := setup.archive_id;
    perform 1 from public.archives where id = archive for update;
    select * into invitation from private.archive_invitations where id = setup.invitation_id for update;
    if invitation.status = 'accepted' or exists (
      select 1 from public.archive_memberships where archive_id = archive and role = 'owner'
    ) then
      return jsonb_build_object('created', false, 'outcome', 'established', 'archiveId', archive);
    end if;
    if not recover then
      return jsonb_build_object('created', false, 'outcome', 'pending', 'archiveId', archive,
        'invitation', private.invitation_summary(invitation));
    end if;
    update private.archive_invitations set status = 'replaced' where id = invitation.id;
  else
    if recover then raise exception using errcode = 'P0001', message = 'setup_not_found'; end if;
    insert into public.archives(name) values (archive_name) returning id into archive;
  end if;
  insert into private.archive_invitations(archive_id, email, role, token_digest, issued_at, expires_at)
    values (archive, normalized, 'owner', credential_digest, issued, issued + interval '7 days')
    returning * into invitation;
  insert into private.archive_bootstrap(singleton, archive_id, approved_email, invitation_id)
    values (true, archive, normalized, invitation.id)
    on conflict (singleton) do update set invitation_id = excluded.invitation_id;
  return jsonb_build_object('created', true, 'outcome', 'pending', 'archiveId', archive,
    'invitation', private.invitation_summary(invitation));
end;
$function$;

CREATE OR REPLACE FUNCTION public.setup_archive (
  archive_name      text,
  approved_email    text,
  credential_digest text,
  recover           boolean DEFAULT false
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.setup_archive(archive_name, approved_email, credential_digest, recover)$function$;

REVOKE ALL ON FUNCTION "public"."setup_archive"(text, text, text, boolean) FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "private"."archive_bootstrap"
  ADD CONSTRAINT "archive_bootstrap_archive_id_fkey" FOREIGN KEY (archive_id) REFERENCES public.archives(id);

ALTER TABLE "private"."archive_bootstrap"
  ADD CONSTRAINT "archive_bootstrap_invitation_id_fkey" FOREIGN KEY (invitation_id) REFERENCES private.archive_invitations(id);

CREATE INDEX archive_bootstrap_invitation_idx ON private.archive_bootstrap USING btree (invitation_id);

CREATE POLICY "auth_checks_pending_invitations" ON "private"."archive_invitations"
  FOR SELECT
  TO "supabase_auth_admin"
  USING (((status = 'pending'::text) AND (expires_at > now())));

REVOKE ALL ON FUNCTION "private"."before_user_created"(jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."before_user_created"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."before_user_created"(jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."before_user_created"(jsonb) TO "supabase_auth_admin";

REVOKE ALL ON FUNCTION "private"."setup_archive"(text, text, text, boolean) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."setup_archive"(text, text, text, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."setup_archive"(text, text, text, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."setup_archive"(text, text, text, boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."setup_archive"(text, text, text, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."setup_archive"(text, text, text, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."setup_archive"(text, text, text, boolean) TO "service_role";

REVOKE ALL ON SCHEMA "private" FROM "supabase_auth_admin";

GRANT USAGE ON SCHEMA "private" TO "supabase_auth_admin";

REVOKE ALL ("email") ON TABLE "private"."archive_invitations" FROM "supabase_auth_admin";

GRANT SELECT ("email") ON TABLE "private"."archive_invitations" TO "supabase_auth_admin";

REVOKE ALL ("expires_at") ON TABLE "private"."archive_invitations" FROM "supabase_auth_admin";

GRANT SELECT ("expires_at") ON TABLE "private"."archive_invitations" TO "supabase_auth_admin";

REVOKE ALL ("status") ON TABLE "private"."archive_invitations" FROM "supabase_auth_admin";

GRANT SELECT ("status") ON TABLE "private"."archive_invitations" TO "supabase_auth_admin";

