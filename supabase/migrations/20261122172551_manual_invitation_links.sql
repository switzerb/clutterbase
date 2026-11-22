SET local check_function_bodies = off;

ALTER TABLE "private"."archive_invitations"
  DROP CONSTRAINT "archive_invitations_delivery_check";

DROP FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text);

DROP FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text);

ALTER TABLE "private"."archive_invitations"
  ADD COLUMN "delivery_mode" text NOT NULL DEFAULT 'email'::text;

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
    'status', invitation.status, 'delivery', invitation.delivery, 'deliveryMode', invitation.delivery_mode
  )
$function$;

CREATE OR REPLACE FUNCTION private.issue_archive_invitation (
  verified_caller_id uuid,
  retry_id           uuid,
  target_archive_id  uuid,
  invited_email      text,
  invited_role       text,
  replaces_id        uuid,
  credential_digest  text,
  delivery_mode      text DEFAULT 'email'::text
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
    or delivery_mode is null or delivery_mode not in ('manual', 'email')
  then raise exception using errcode = '22023', message = 'invalid_request'; end if;
  request_data := jsonb_build_object(
    'archive', target_archive_id, 'email', normalized, 'role', invited_role,
    'replaces', replaces_id, 'deliveryMode', delivery_mode
  );
  perform pg_advisory_xact_lock(hashtextextended(verified_caller_id::text || retry_id::text, 0));
  perform 1 from public.archives where id = target_archive_id for update;
  if not exists (select 1 from public.archive_memberships where archive_id = target_archive_id
    and user_id = verified_caller_id and role = 'owner' and not blocked)
  then raise exception using errcode = '42501', message = 'owner_required'; end if;
  select * into previous from private.invitation_operations o
    where o.caller_id = verified_caller_id and o.retry_id = issue_archive_invitation.retry_id;
  if found then
    -- Old operations predate mode tracking and were always email operations.
    if (jsonb_build_object('deliveryMode', 'email') || previous.request) <> request_data then
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
    archive_id, email, role, token_digest, issued_at, expires_at, inviter_id, delivery_mode, delivery
  ) values (
    target_archive_id, normalized, invited_role, credential_digest, issued, issued + interval '7 days', verified_caller_id,
    delivery_mode, case when delivery_mode = 'manual' then 'not_requested' else 'unknown' end
  ) returning * into invitation;
  insert into private.invitation_operations(caller_id, retry_id, request, invitation_id)
    values (verified_caller_id, retry_id, request_data, invitation.id);
  return jsonb_build_object('created', true, 'invitation', private.invitation_summary(invitation));
end;
$function$;

CREATE OR REPLACE FUNCTION public.issue_archive_invitation (
  verified_caller_id uuid,
  retry_id           uuid,
  target_archive_id  uuid,
  invited_email      text,
  invited_role       text,
  replaces_id        uuid,
  credential_digest  text,
  delivery_mode      text DEFAULT 'email'::text
)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path TO ''
  AS $function$select private.issue_archive_invitation(verified_caller_id, retry_id, target_archive_id, invited_email, invited_role, replaces_id, credential_digest, delivery_mode)$function$;

REVOKE ALL ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "archive_invitations_delivery_check" CHECK ((delivery = ANY (ARRAY['unknown'::text, 'accepted'::text, 'rejected'::text, 'not_requested'::text])));

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "archive_invitations_delivery_mode_check" CHECK ((delivery_mode = ANY (ARRAY['manual'::text, 'email'::text])));

ALTER TABLE "private"."archive_invitations"
  ADD CONSTRAINT "invitation_delivery_mode_matches" CHECK (((delivery_mode = 'manual'::text) = (delivery = 'not_requested'::text)));

REVOKE ALL ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."issue_archive_invitation"(uuid, uuid, uuid, text, text, uuid, text, text) TO "service_role";

