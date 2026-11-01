-- 013: Agreement visibility and signing workflow.
-- - Tenants may only read sent or signed documents (not drafts).
-- - Managers may read all statuses for their org.
-- - sign_document requires status = 'sent' (or already partially signed while still 'sent').
-- - send_document moves draft -> sent (managers only).
-- Safe to re-run.

-- Read policy: managers see all; tenants only sent/signed on their lease
drop policy if exists doc_read on public.documents;
create policy doc_read on public.documents for select to authenticated using (
  is_manager(org_id)
  or (
    read_lease(org_id, lease_id)
    and status in ('sent', 'signed')
  )
);

-- Send draft to tenant
create or replace function public.send_document(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare d public.documents;
begin
  select * into d from public.documents where id = p_id for update;
  if not found then raise exception 'Document not found'; end if;
  if not is_manager(d.org_id) then raise exception 'Permission denied'; end if;
  if d.status <> 'draft' then raise exception 'Only draft agreements can be sent'; end if;
  if d.tenant_sig is not null or d.manager_sig is not null then
    raise exception 'Cannot send a document that already has signatures';
  end if;
  update public.documents set status = 'sent' where id = p_id;
  insert into public.activity(org_id, title, detail, kind)
    values (d.org_id, 'Agreement sent', left(d.title, 200), 'document');
end$$;

-- Harden sign_document: must be sent (not draft); signed content stays immutable via no UPDATE grant
create or replace function public.sign_document(p_id uuid, p_sig text) returns void
language plpgsql security definer set search_path=public as $$
declare d public.documents;
begin
  select * into d from public.documents where id = p_id for update;
  if not found or not read_lease(d.org_id, d.lease_id) then
    raise exception 'Permission denied';
  end if;
  if d.status = 'draft' then
    raise exception 'Send the agreement before signing';
  end if;
  if d.status = 'signed' then
    raise exception 'This agreement is already fully signed';
  end if;
  -- status must be 'sent' to accept signatures
  if d.status <> 'sent' then
    raise exception 'This agreement cannot be signed';
  end if;
  if p_sig is null or length(p_sig) < 40 or length(p_sig) >= 200000
     or p_sig !~ '^data:image/(png|jpeg|svg\+xml)[;,]' then
    raise exception 'Signature is not valid';
  end if;
  if is_manager(d.org_id) then
    if d.manager_sig is not null then raise exception 'Already signed by manager'; end if;
    update public.documents
      set manager_sig = p_sig, manager_signed_at = now(), manager_signer = auth.uid()
      where id = p_id;
  else
    if d.tenant_sig is not null then raise exception 'Already signed by tenant'; end if;
    update public.documents
      set tenant_sig = p_sig, tenant_signed_at = now()
      where id = p_id;
  end if;
  update public.documents
    set status = 'signed'
    where id = p_id
      and tenant_sig is not null
      and manager_sig is not null;
  insert into public.activity(org_id, title, detail, kind)
    values (
      d.org_id,
      'Agreement signed',
      left(d.title, 200),
      'document'
    );
end$$;

revoke all on function public.send_document(uuid) from public;
revoke all on function public.sign_document(uuid, text) from public;
grant execute on function public.send_document(uuid) to authenticated;
grant execute on function public.sign_document(uuid, text) to authenticated;
