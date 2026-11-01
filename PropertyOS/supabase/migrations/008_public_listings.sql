-- 008: public rentals for visitors + safe public inquiry form (rate-limited, validated). Safe to re-run.
create or replace view public.public_listings as
select u.id as unit_id,u.org_id,u.property_id,u.name as unit_name,u.bedrooms,u.rent,p.name as property_name,p.city,p.description,p.image_url,o.name as org_name,o.slug as org_slug
from public.units u join public.properties p on p.id=u.property_id join public.organizations o on o.id=u.org_id
where p.published and not p.archived and not u.archived and not exists(select 1 from public.leases l where l.unit_id=u.id and l.status='active' and l.starts_on<=(now() at time zone 'Asia/Kolkata')::date and l.ends_on>=(now() at time zone 'Asia/Kolkata')::date);
grant select on public.public_listings to anon,authenticated;
create or replace function public.submit_inquiry(p_property uuid,p_name text,p_email text,p_phone text,p_message text) returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid;v_key text;n integer;
begin
 select org_id into v_org from properties where id=p_property and published and not archived;
 if v_org is null then raise exception 'This property is not accepting inquiries';end if;
 if length(trim(coalesce(p_name,'')))<2 or length(p_name)>120 then raise exception 'Enter your name';end if;
 if coalesce(p_email,'') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email)>254 then raise exception 'Enter a valid email';end if;
 if length(regexp_replace(coalesce(p_phone,''),'\D','','g'))<7 or length(p_phone)>20 then raise exception 'Enter a valid phone number';end if;
 if length(trim(coalesce(p_message,'')))<2 or length(p_message)>1000 then raise exception 'Write a short message';end if;
 v_key:='inq:'||lower(trim(p_email));
 insert into rate_limits(key,hits,expires_at) values(v_key,1,now()+interval '1 hour') on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end,expires_at=case when rate_limits.expires_at<now() then now()+interval '1 hour' else rate_limits.expires_at end returning hits into n;
 if n>5 then raise exception 'Too many inquiries. Please try again later.';end if;
 insert into inquiries(org_id,property_id,name,email,phone,message) values(v_org,p_property,trim(p_name),lower(trim(p_email)),trim(p_phone),trim(p_message));
end$$;
revoke all on function public.submit_inquiry(uuid,text,text,text,text) from public;
grant execute on function public.submit_inquiry(uuid,text,text,text,text) to anon,authenticated;
