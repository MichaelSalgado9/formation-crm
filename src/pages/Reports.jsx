update stage_history set stage = 'Lead / PNC'
  where stage = 'Lead / Inquiry';

update stage_history set stage = 'WIP'
  where stage in ('Document Collection', 'Entity Formation', 'Compliance / FICA');
