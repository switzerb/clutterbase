-- Run against a disposable database after the repository migrations. Rolls back fixtures.
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO public.organizations(id,name) VALUES
 ('10000000-0000-0000-0000-000000000001','Test A'),
 ('10000000-0000-0000-0000-000000000002','Test B');
INSERT INTO public.items(id,title,file_path,organization_id) VALUES
 ('20000000-0000-0000-0000-000000000001','Letter','test.pdf','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Other letter','other.pdf','10000000-0000-0000-0000-000000000002');
INSERT INTO public.tag_categories(id,name,organization_id) VALUES
 ('30000000-0000-0000-0000-000000000001','Test A','10000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002','Test B','10000000-0000-0000-0000-000000000002');
INSERT INTO public.tags(id,name,slug,category_id) VALUES
 ('40000000-0000-0000-0000-000000000001','Old','old','30000000-0000-0000-0000-000000000001'),
 ('40000000-0000-0000-0000-000000000002','New','new','30000000-0000-0000-0000-000000000001'),
 ('40000000-0000-0000-0000-000000000003','Foreign','foreign','30000000-0000-0000-0000-000000000002');
INSERT INTO public.people(id,full_name,organization_id) VALUES
 ('50000000-0000-0000-0000-000000000001','Child','10000000-0000-0000-0000-000000000001'),
 ('50000000-0000-0000-0000-000000000002','Parent','10000000-0000-0000-0000-000000000001'),
 ('50000000-0000-0000-0000-000000000003','Other parent','10000000-0000-0000-0000-000000000002');
CREATE FUNCTION public.test_fail_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('test.fail_insert',true) = 'yes' THEN RAISE EXCEPTION 'Simulated insert failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER test_fail_tags BEFORE INSERT ON public.item_tags FOR EACH ROW EXECUTE FUNCTION public.test_fail_insert();
CREATE TRIGGER test_fail_child BEFORE INSERT ON public.family_unit_children FOR EACH ROW EXECUTE FUNCTION public.test_fail_insert();
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","app_metadata":{"organization_id":"10000000-0000-0000-0000-000000000001"}}';
DO $$
DECLARE failed boolean; units_before int;
BEGIN
 ASSERT NOT has_function_privilege('anon','public.replace_item_tags(uuid,uuid[])','EXECUTE');
 ASSERT NOT has_function_privilege('anon','public.set_person_parents(uuid,uuid,uuid)','EXECUTE');
 PERFORM public.replace_item_tags('20000000-0000-0000-0000-000000000001',ARRAY['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001']::uuid[]);
 ASSERT (SELECT count(*) FROM public.item_tags) = 1, 'Duplicate tags were not deduplicated';
 PERFORM set_config('test.fail_insert','yes',true);
 failed := false;
 BEGIN
  PERFORM public.replace_item_tags('20000000-0000-0000-0000-000000000001',ARRAY['40000000-0000-0000-0000-000000000002']::uuid[]);
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 ASSERT failed, 'Expected insert failure';
 ASSERT EXISTS (SELECT 1 FROM public.item_tags WHERE tag_id='40000000-0000-0000-0000-000000000001'), 'Previous tags lost after insert failure';
 PERFORM set_config('test.fail_insert','no',true);
 failed := false;
 BEGIN
  PERFORM public.replace_item_tags('20000000-0000-0000-0000-000000000001',ARRAY['40000000-0000-0000-0000-000000000003']::uuid[]);
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 ASSERT failed, 'Cross-organization tag accepted';
 failed := false;
 BEGIN
  PERFORM public.replace_item_tags('20000000-0000-0000-0000-000000000002',ARRAY[]::uuid[]);
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 ASSERT failed, 'Cross-organization item accepted';
 PERFORM public.replace_item_tags('20000000-0000-0000-0000-000000000001',ARRAY[]::uuid[]);
 ASSERT (SELECT count(*) FROM public.item_tags) = 0, 'Clear tags failed';
 SELECT count(*) INTO units_before FROM public.family_units;
 PERFORM set_config('test.fail_insert','yes',true);
 failed := false;
 BEGIN
  PERFORM public.set_person_parents('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',NULL);
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 ASSERT failed, 'Expected child insert failure';
 ASSERT (SELECT count(*) FROM public.family_units) = units_before, 'Orphan family unit remained';
 PERFORM set_config('test.fail_insert','no',true);
 PERFORM public.set_person_parents('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',NULL);
 PERFORM public.set_person_parents('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',NULL);
 ASSERT (SELECT count(*) FROM public.family_units) = units_before + 1, 'Retry created duplicate family unit';
 failed := false;
 BEGIN
  PERFORM public.set_person_parents('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003',NULL);
 EXCEPTION WHEN OTHERS THEN failed := true; END;
 ASSERT failed, 'Cross-organization parent accepted';
END $$;
ROLLBACK;
