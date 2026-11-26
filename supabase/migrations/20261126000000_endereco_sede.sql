-- Endereço da nova sede (troca o texto de exemplo; não mexe se a escola já salvou outro endereço no painel).
update public.site_settings
   set address = 'R. Joaquim Franco Silva, 80 - Vila Hab., Barra Bonita - SP, 17340-000',
       updated_at = now()
 where id = 1
   and (address is null or address = 'Rua Exemplo, Centro');
