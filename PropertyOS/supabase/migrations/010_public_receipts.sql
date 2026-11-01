-- 010: public receipts. Whoever holds a receipt link or QR can read that one receipt, and nothing else. Safe to re-run.
-- Every rent charge gets a random 128-bit token (existing rows are backfilled, each with its own value).
alter table public.charges add column if not exists receipt_token text not null unique default replace(gen_random_uuid()::text,'-','');

-- Accepts the new token, or the charge id that older printed QR codes (?verify=) already carry.
-- Returns only what a paper receipt shows: no tenant email or phone, no other tenants, no internal ids.
-- The workspace UPI ID is included only while a balance is still due, so the page can offer "Pay with UPI".
-- Amounts are in paise. Reversed payments are listed as reversed (reasons stay private).
create or replace function public.get_receipt(p_token text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare t text:=lower(trim(coalesce(p_token,'')));c charges;got bigint;
begin
 if t ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then select * into c from charges where id=t::uuid;
 elsif t ~ '^[0-9a-f]{32}$' then select * into c from charges where receipt_token=t;
 end if;
 if c.id is null then return null;end if;
 select coalesce(sum(amount),0) into got from payments where charge_id=c.id and reversed_at is null;
 return(select jsonb_build_object(
  'token',c.receipt_token,'no',upper(substr(c.id::text,1,8)),'org',o.name,'property',p.name,'unit',u.name,'tenant',tn.name,
  'month',to_char(c.month,'YYYY-MM'),'due_on',c.due_on,'rent',c.amount,'received',got,
  'upi',case when got<c.amount then o.upi_id else '' end,
  'payments',(select coalesce(jsonb_agg(jsonb_build_object('at',y.created_at,'amount',y.amount,'ref',y.reference,'method',y.method,'reversed',y.reversed_at is not null) order by y.created_at),'[]'::jsonb) from payments y where y.charge_id=c.id),
  'checked',now())
  from leases l join units u on u.id=l.unit_id join properties p on p.id=u.property_id join tenants tn on tn.id=l.tenant_id join organizations o on o.id=c.org_id where l.id=c.lease_id);
end$$;
revoke all on function public.get_receipt(text) from public;
grant execute on function public.get_receipt(text) to anon,authenticated;
