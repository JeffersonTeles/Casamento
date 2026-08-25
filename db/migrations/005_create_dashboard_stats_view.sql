-- 005 — View resumo dashboard (busca única = fonte da verdade)
drop view if exists public.v_dashboard_stats;
create view public.v_dashboard_stats as
select
  count(*) as total_registros,
  sum(case when rsvp_status = 'confirmado' then 1 else 0 end) as registros_confirmados,
  sum(case when rsvp_status = 'aguardando' then 1 else 0 end) as registros_pendentes,
  sum(case when rsvp_status = 'recusado' then 1 else 0 end) as registros_recusados,

  -- Contagem de PESSAS (titular + parceiro + acompanhantes)
  sum(case
    when partner_name is not null and trim(partner_name) != '' then
      1 + 1 + coalesce(plus_ones, 0)  -- titular + parceiro + acompanhantes
    when plus_ones is not null and plus_ones > 0 then
      1 + coalesce(plus_ones, 0)       -- titular + acompanhantes (sem parceiro)
    else
      1                                                                -- somente titular
  end) as total_pessoas_estimadas,

  -- Pessoas confirmadas
  sum(case
    when rsvp_status = 'confirmado' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_confirmadas,

  -- Pessoas pendentes
  sum(case
    when rsvp_status = 'aguardando' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_pendentes,

  -- Pessoas recusadas
  sum(case
    when rsvp_status = 'recusado' then
      case
        when partner_name is not null and trim(partner_name) != '' then 1 + 1 + coalesce(plus_ones, 0)
        when plus_ones is not null and plus_ones > 0 then 1 + coalesce(plus_ones, 0)
        else 1
      end
    else 0
  end) as pessoas_recusadas
from public.guests;
