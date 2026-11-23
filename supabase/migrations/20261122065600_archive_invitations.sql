SET local check_function_bodies = off;

CREATE TABLE "private"."archive_invitations" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "archive_id"   uuid                     NOT NULL,
  "email"        text                     NOT NULL,
  "role"         text                     NOT NULL,
  "token_digest" text                     NOT NULL,
  "issued_at"    timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  "expires_at"   timestamp with time zone NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "inviter_id"   uuid,
  "accepted_by"  uuid,
  "accepted_at"  timestamp with time zone,
  "delivery"     text                     NOT NULL DEFAULT 'unknown'::text,
  CONSTRAINT "accepted_identity" CHECK ((((status = 'accepted'::text) AND (accepted_by IS NOT NULL) AND (accepted_at IS
    NOT NULL)) OR ((status <> 'accepted'::text) AND (accepted_by IS NULL) AND (accepted_at IS NULL)))),
  CONSTRAINT "archive_invitations_delivery_check" CHECK ((delivery = ANY (ARRAY['unknown'::text, 'accepted'::text, 'rejected'::text]))),
  CONSTRAINT "archive_invitations_email_check" CHECK (((email = lower(btrim(email))) AND ((length(email) >= 3) AND (length(email) <= 320)))),
  CONSTRAINT "archive_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "archive_invitations_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'contributor'::text]))),
  CONSTRAINT "archive_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'canceled'::text, 'replaced'::text]))),
  CONSTRAINT "archive_invitations_token_digest_check" CHECK ((token_digest ~ '^[0-9a-f]{64}$'::text)),
  CONSTRAINT "archive_invitations_token_digest_key" UNIQUE (token_digest),
  CONSTRAINT "invitation_lifetime" CHECK ((expires_at = (issued_at + '7 days'::interval)))
);

ALTER TABLE "private"."archive_invitations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "private"."invitation_operations" (
  "caller_id"     uuid  NOT NULL,
  "retry_id"      uuid  NOT NULL,
  "request"       jsonb NOT NULL,
  "invitation_id" uuid  NOT NULL,
  CONSTRAINT "invitation_operations_pkey" PRIMARY KEY (caller_id, retry_id)
);

ALTER TABLE "private"."invitation_operations"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.accept_archive_invitation (
  credential_digest text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  caller uuid := auth.uid();
  verified_email text;
  invitation private.archive_invitations;
  membership public.archive_memberships;
  target_archive uuid;
begin
  select lower(btrim(email)) into verified_email from auth.users
    where id = caller and email_confirmed_at is not null and not is_anonymous;
  if verified_email is null then
    return jsonb_build_object('outcome', 'verified_identity_required');
  end if;
  select archive_id into target_archive from private.archive_invitations where token_digest = credential_digest;
  if not found then return jsonb_build_object('outcome', 'invalid_invitation'); end if;
  perform 1 from public.archives where id = target_archive for update;
  select * into invitation from private.archive_invitations where token_digest = credential_digest for update;
  if invitation.email <> verified_email then return jsonb_build_object('outcome', 'wrong_account'); end if;
  if invitation.status = 'accepted' then
    if invitation.accepted_by <> caller then return jsonb_build_object('outcome', 'membership_exists'); end if;
    select * into membership from public.archive_memberships where archive_id = target_archive and user_id = caller;
    if not found then return jsonb_build_object('outcome', 'no_access'); end if;
    if membership.blocked then return jsonb_build_object('outcome', 'member_blocked'); end if;
    return jsonb_build_object('outcome', 'already_accepted', 'archiveId', target_archive);
  end if;
  if invitation.status <> 'pending' then return jsonb_build_object('outcome', invitation.status); end if;
  if clock_timestamp() >= invitation.expires_at then return jsonb_build_object('outcome', 'expired'); end if;
  select * into membership from public.archive_memberships where archive_id = target_archive
    and (user_id = caller or admission_email = verified_email) limit 1;
  if found then return jsonb_build_object('outcome',
    case when membership.blocked then 'member_blocked' else 'membership_exists' end); end if;
  insert into public.archive_memberships(archive_id, user_id, role, admission_email)
    values (target_archive, caller, invitation.role, verified_email);
  update private.archive_invitations set status = 'accepted', accepted_by = caller, accepted_at = clock_timestamp()
    where id = invitation.id;
  return jsonb_build_object('outcome', 'accepted', 'archiveId', target_archive);
end;
$function$;

CREATE OR REPLACE FUNCTION private.cancel_archive_invitation (
  target_archive_id    uuid,
  target_invitation_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare invitation private.archive_invitations;
begin
  perform 1 from public.archives where id = target_archive_id for update;
  if not exists (select 1 from public.archive_memberships where archive_id = target_archive_id
    and user_id = (select auth.uid()) and role = 'owner' and not blocked)
  then raise exception using errcode = '42501', message = 'owner_required'; end if;
  select * into invitation from private.archive_invitations
    where id = target_invitation_id and archive_id = target_archive_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'invitation_not_found'; end if;
  if invitation.status = 'pending' then
    update private.archive_invitations set status = 'canceled' where id = invitation.id returning * into invitation;
  end if;
  return private.invitation_summary(invitation);
end;
$function$;

CREATE OR REPLACE FUNCTION private.invitation_summary (
  invitation private.archive_invitations
)
  RETURNS jsonb
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select jsonb_build_object(
    'id', invitation.id, 'archiveId', invitation.archive_id, 'email', invitation.email,
    'role', invitation.role, 'issuedAt', invitation.issued_at, 'expiresAt', invitation.expires_at,
    'status', invitation.status, 'delivery', invitation.delivery
  )
$function$;

CREATE OR REPLACE FUNCTION private.issue_archive_invitation (
  verified_caller_id uuid,
  retry_id           uuid,
  target_archive_id  uuid,
  invited_email      text,
  invited_role       text,
  replaces_id        uuid,
  credential_digest  text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  normalized text := lower(btrim(invited_email));
  request_data jsonb;
  previous private.invitation_operations;
  invitation private.archive_invitations;
  membership public.archive_memberships;
  issued timestamptz := clock_timestamp();
begin
  if verified_caller_id is null or retry_id is null or target_archive_id is null
    or normalized is null or length(normalized) not between 3 and 320
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+$'
    or invited_role is null or invited_role not in ('owner', 'contributor')
    or credential_digest is null or credential_digest !~ '^[0-9a-f]{64}$'
  then raise exception using errcode = '22023', message = 'invalid_request'; end if;
  request_data := jsonb_build_object(
    'archive', target_archive_id, 'email', normalized, 'role', invited_role, 'replaces', replaces_id
  );
  -- Serialize retries even when the caller substitutes a different archive.
  perform pg_advisory_xact_lock(hashtextextended(verified_caller_id::text || retry_id::text, 0));
  perform 1 from public.archives where id = target_archive_id for update;
  if not exists (select 1 from public.archive_memberships where archive_id = target_archive_id
    and user_id = verified_caller_id and role = 'owner' and not blocked)
  then raise exception using errcode = '42501', message = 'owner_required'; end if;
  select * into previous from private.invitation_operations o
    where o.caller_id = verified_caller_id and o.retry_id = issue_archive_invitation.retry_id;
  if found then
    if previous.request <> request_data then
      raise exception using errcode = 'P0001', message = 'retry_conflict';
    end if;
    select * into invitation from private.archive_invitations where id = previous.invitation_id;
    return jsonb_build_object('created', false, 'invitation', private.invitation_summary(invitation));
  end if;
  select m.* into membership from public.archive_memberships m
    join auth.users u on u.id = m.user_id
    where m.archive_id = target_archive_id
      and (m.admission_email = normalized or lower(btrim(u.email)) = normalized)
    limit 1;
  if found then
    raise exception using errcode = 'P0001',
      message = case when membership.blocked then 'member_blocked' else 'membership_exists' end;
  end if;
  if (select count(*) from private.archive_invitations
    where inviter_id = verified_caller_id and issued_at > issued - interval '1 hour') >= 20
  then raise exception using errcode = 'P0001', message = 'send_rate_limited'; end if;
  if replaces_id is not null then
    select * into invitation from private.archive_invitations
      where id = replaces_id and archive_id = target_archive_id for update;
    if not found or invitation.status <> 'pending' then
      raise exception using errcode = 'P0001', message = 'invitation_not_pending';
    end if;
    if invitation.email <> normalized or invitation.role <> invited_role then
      raise exception using errcode = 'P0001', message = 'replacement_mismatch';
    end if;
    update private.archive_invitations set status = 'replaced' where id = replaces_id;
  end if;
  if exists (select 1 from private.archive_invitations
    where archive_id = target_archive_id and email = normalized and status = 'pending')
  then raise exception using errcode = 'P0001', message = 'invitation_exists'; end if;
  insert into private.archive_invitations(
    archive_id, email, role, token_digest, issued_at, expires_at, inviter_id
  ) values (
    target_archive_id, normalized, invited_role, credential_digest, issued, issued + interval '7 days', verified_caller_id
  ) returning * into invitation;
  insert into private.invitation_operations(caller_id, retry_id, request, invitation_id)
    values (verified_caller_id, retry_id, request_data, invitation.id);
  return jsonb_build_object('created', true, 'invitation', private.invitation_summary(invitation));
end;
$function$;

CREATE OR REPLACE FUNCTION private.list_archive_invitations (
  target_archive_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not exists (select 1 from public.archive_memberships where archive_id = target_archive_id
    and user_id = (select auth.uid()) and role = 'owner' and not blocked)
  then raise exception using errcode = '42501', message = 'owner_required'; end if;
  return (select coalesce(jsonb_agg(private.invitation_summary(i) order by i.issued_at desc, i.id), '[]'::jsonb)
    from private.archive_invitations i where archive_id = target_archive_id);
end;
$function$;

CREATE OR REPLACE FUNCTION private.record_invitation_delivery (
  target_invitation_id uuid,
  outcome              text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare target_archive uuid;
begin
  if outcome is null or outcome not in ('accepted', 'rejected', 'unknown') then
    raise exception using errcode = '22023', message = 'invalid_delivery_outcome';
  end if;
  select archive_id into target_archive from private.archive_invitations where id = target_invitation_id;
  perform 1 from public.archives where id = target_archive for update;
  update private.archive_invitations set delivery = outcome
    where id = target_invitation_id and status = 'pending' and delivery = 'unknown';
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_archive_invitation (
  credential_digest text
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.accept_archive_invitation(credential_digest)$function$;

REVOKE ALL ON FUNCTION "public"."accept_archive_invitation"(text) FROM PUBLIC, "anon", "service_role";

CREATE OR REPLACE FUNCTION public.cancel_archive_invitation (
  target_archive_id    uuid,
  target_invitation_id uuid
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.cancel_archive_invitation(target_archive_id, target_invitation_id)$function$;

REVOKE ALL ON FUNCTION "public"."cancel_archive_invitation"(uuid, uuid) FROM PUBLIC, "anon", "service_role";

CREATE OR REPLACE FUNCTION public.issue_archive_invitation (
  verified_caller_id uuid,
  retry_id           uuid,
  target_archive_id  uuid,
  invited_email      text,
  invited_role       text,
  replaces_id        uuid,
  credential_digest  text
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.issue_archive_invitation(verified_caller_id, retry_id, target_archive_id, invited_email, invited_role, replaces_id, credential_digest)$function$;

REVOKE ALL ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.list_archive_invitations (
  target_archive_id uuid
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.list_archive_invitations(target_archive_id)$function$;

REVOKE ALL ON FUNCTION "public"."list_archive_invitations"(uuid) FROM PUBLIC, "anon", "service_role";

CREATE OR REPLACE FUNCTION public.record_invitation_delivery (
  target_invitation_id uuid,
  outcome              text
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.record_invitation_delivery(target_invitation_id, outcome)$function$;

REVOKE ALL ON FUNCTION "public"."record_invitation_delivery"(uuid, text) FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "archive_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES auth.users(id);

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "archive_invitations_archive_id_fkey" FOREIGN KEY (archive_id) REFERENCES public.archives(id);

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "archive_invitations_inviter_id_fkey" FOREIGN KEY (inviter_id) REFERENCES auth.users(id);

ALTER TABLE "private"."invitation_operations"
  ADD CONSTRAINT "invitation_operations_caller_id_fkey" FOREIGN KEY (caller_id) REFERENCES auth.users(id);

ALTER TABLE "private"."invitation_operations"
  ADD CONSTRAINT "invitation_operations_invitation_id_fkey" FOREIGN KEY (invitation_id) REFERENCES private.archive_invitations(id);

CREATE INDEX archive_invitations_accepted_by_idx ON private.archive_invitations USING btree (accepted_by);

CREATE INDEX archive_invitations_archive_idx ON private.archive_invitations USING btree (archive_id);

CREATE INDEX archive_invitations_email_idx ON private.archive_invitations USING btree (email, status, expires_at);

CREATE INDEX archive_invitations_inviter_idx ON private.archive_invitations USING btree (inviter_id, issued_at);

CREATE UNIQUE INDEX archive_invitations_pending_email_idx ON private.archive_invitations USING btree (archive_id, email)
  WHERE (status = 'pending'::text);

CREATE INDEX invitation_operations_invitation_idx ON private.invitation_operations USING btree (invitation_id);

REVOKE ALL ON FUNCTION "private"."accept_archive_invitation"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."accept_archive_invitation"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."accept_archive_invitation"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."accept_archive_invitation"(text) TO "postgres";

REVOKE ALL ON FUNCTION "private"."cancel_archive_invitation"(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."cancel_archive_invitation"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."cancel_archive_invitation"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."cancel_archive_invitation"(uuid, uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."invitation_summary"(private.archive_invitations) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."invitation_summary"(private.archive_invitations) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."invitation_summary"(private.archive_invitations) TO "postgres";

REVOKE ALL ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "private"."list_archive_invitations"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."list_archive_invitations"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."list_archive_invitations"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."list_archive_invitations"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."record_invitation_delivery"(uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."record_invitation_delivery"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."record_invitation_delivery"(uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."record_invitation_delivery"(uuid, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."accept_archive_invitation"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."accept_archive_invitation"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."accept_archive_invitation"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_archive_invitation"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."cancel_archive_invitation"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_archive_invitation"(uuid, uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."list_archive_invitations"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."list_archive_invitations"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_archive_invitations"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."record_invitation_delivery"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."record_invitation_delivery"(uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."record_invitation_delivery"(uuid, text) TO "service_role";

REVOKE ALL ON SCHEMA "private" FROM "service_role";

GRANT USAGE ON SCHEMA "private" TO "service_role";

