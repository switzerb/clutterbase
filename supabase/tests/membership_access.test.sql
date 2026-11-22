begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner-one@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'owner-two@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'contributor@example.test'),
  ('10000000-0000-0000-0000-000000000004', 'outsider@example.test');
insert into public.archives(id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Archive A'),
  ('20000000-0000-0000-0000-000000000002', 'Archive B');
insert into public.archive_memberships(archive_id, user_id, role, admission_email) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', 'owner-one@example.test'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'owner', 'owner-two@example.test'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'contributor', 'contributor@example.test'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'contributor', 'contributor@example.test');

select throws_ok($$insert into public.archive_memberships select * from public.archive_memberships limit 1$$, '23505', null, 'duplicate membership rejected');
select throws_ok($$update public.archive_memberships set role = 'admin'$$, '23514', null, 'roles are constrained');
select throws_ok($$update public.archive_memberships set blocked = true where role = 'owner'$$, '23514', null, 'owner blocking violates invariant');
select throws_ok($$update public.archive_memberships set admission_email = ' NOT-normalized@example.test '$$, '23514', null, 'admission email normalization required');

set local role anon;
select throws_ok($$select * from public.archives$$, '42501', null, 'signed-out archive reads denied');
select throws_ok($$select * from public.archive_memberships$$, '42501', null, 'signed-out membership reads denied');
select throws_ok($$insert into public.archives(name) values ('Forged')$$, '42501', null, 'signed-out archive creation denied');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', true)$$, '42501', null, 'signed-out mutation denied');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select is_empty($$select * from public.archives$$, 'nonmember sees no archive');
select is_empty($$select * from public.archive_memberships$$, 'nonmember sees no memberships');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select results_eq($$select name from public.archives order by name$$, array['Archive A', 'Archive B'], 'contributor accesses both memberships');
select is((select count(*) from public.archive_memberships), 2::bigint, 'contributor only sees own memberships');
select throws_ok($$update public.archive_memberships set role = 'owner'$$, '42501', null, 'direct promotion denied');
select throws_ok($$delete from public.archive_memberships$$, '42501', null, 'direct deletion denied');
select throws_ok($$insert into public.archive_memberships select * from public.archive_memberships$$, '42501', null, 'direct admission denied');
select throws_ok($$update public.archives set name = 'Forged'$$, '42501', null, 'direct archive mutation denied');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', true)$$, '42501', 'owner_required', 'contributor cannot block');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select results_eq($$select name from public.archives$$, array['Archive A'], 'owner sees only their archive');
select is((select count(*) from public.archive_memberships), 3::bigint, 'owner sees archive memberships');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', true)$$, '42501', 'owner_required', 'foreign archive substitution denied');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', true)$$, '42501', 'owner_protected', 'another owner protected');
select is((public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', true)).blocked, true, 'first owner blocks contributor');
select is((public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', true)).blocked, true, 'block retry remains blocked');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select results_eq($$select name from public.archives$$, array['Archive B'], 'block is live and isolated to A');
select is((select count(*) from public.archive_memberships), 1::bigint, 'blocked membership not readable');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', false)$$, '42501', 'owner_required', 'blocked user cannot restore themselves');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is((public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', false)).blocked, false, 'second owner can unblock');
select throws_ok($$select public.set_contributor_block('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', true)$$, '42501', 'owner_protected', 'self-blocking owner protected');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select results_eq($$select name from public.archives order by name$$, array['Archive A', 'Archive B'], 'unblocking restores without invitation');
reset role;
select is((select count(*) from public.archive_memberships), 4::bigint, 'all original memberships preserved');
select * from finish();
rollback;
