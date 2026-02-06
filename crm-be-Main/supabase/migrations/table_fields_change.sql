alter table public.leads
  drop column if exists course_name,
  drop column if exists time_in_session,
  drop column if exists days_attended,
  drop column if exists bootcamp_attendee,
  drop column if exists utm_source,
  drop column if exists utm_campaign,
  drop column if exists utm_medium,
  drop column if exists profession,
  drop column if exists webinar_date;

