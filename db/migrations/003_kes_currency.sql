update site_settings set value = 'KES', updated_at = now() where key = 'currency' and value = 'USD';

alter table billing_documents alter column currency set default 'KES';
