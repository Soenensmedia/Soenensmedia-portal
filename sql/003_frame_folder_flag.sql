-- SoenensMedia Portaal — kleine aanvulling: onderscheid map vs los bestand
-- bij Frame.io-links (mappen met meerdere items kunnen niet embedden).
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists frame_io_is_folder boolean not null default false;
