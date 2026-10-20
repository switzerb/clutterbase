-- Invoker functions retain RLS. Lock the parent row to serialize competing saves.
CREATE OR REPLACE FUNCTION public.replace_item_tags(p_item_id uuid, p_tag_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.org_id() IS NULL THEN
    RAISE EXCEPTION 'Authentication and organization required';
  END IF;
  PERFORM 1 FROM public.items WHERE id = p_item_id AND organization_id = public.org_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item unavailable'; END IF;
  IF p_tag_ids IS NULL OR cardinality(p_tag_ids) > 1000 THEN RAISE EXCEPTION 'Invalid tags'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_tag_ids) AS requested(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags t JOIN public.tag_categories c ON c.id = t.category_id
      WHERE t.id = requested.id AND c.organization_id = public.org_id()
    )
  ) THEN RAISE EXCEPTION 'Tag unavailable'; END IF;

  DELETE FROM public.item_tags WHERE item_id = p_item_id;
  INSERT INTO public.item_tags (item_id, tag_id)
    SELECT p_item_id, id FROM (SELECT DISTINCT unnest(p_tag_ids) AS id) AS selected;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_item_tags(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_item_tags(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_person_parents(p_person_id uuid, p_parent1_id uuid, p_parent2_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE unit_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.org_id() IS NULL THEN RAISE EXCEPTION 'Authentication and organization required'; END IF;
  PERFORM 1 FROM public.people WHERE id = p_person_id AND organization_id = public.org_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person unavailable'; END IF;
  IF p_person_id IN (p_parent1_id, p_parent2_id) OR p_parent1_id = p_parent2_id THEN
    RAISE EXCEPTION 'Invalid parents';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[p_parent1_id, p_parent2_id]) AS requested(id)
    WHERE requested.id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.people WHERE id = requested.id AND organization_id = public.org_id()
    )
  ) THEN RAISE EXCEPTION 'Parent unavailable'; END IF;

  SELECT family_unit_id INTO unit_id FROM public.family_unit_children WHERE person_id = p_person_id;
  IF unit_id IS NULL THEN
    INSERT INTO public.family_units(parent_1_id, parent_2_id, organization_id)
      VALUES (p_parent1_id, p_parent2_id, public.org_id()) RETURNING id INTO unit_id;
    INSERT INTO public.family_unit_children(family_unit_id, person_id) VALUES (unit_id, p_person_id);
  ELSE
    UPDATE public.family_units SET parent_1_id = p_parent1_id, parent_2_id = p_parent2_id
      WHERE id = unit_id AND organization_id = public.org_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'Family unit unavailable'; END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_person_parents(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_person_parents(uuid, uuid, uuid) TO authenticated;
