import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JPCARS_BASE = 'https://api.nl.jp.cars'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TOKEN = Deno.env.get('JPCARS_API_TOKEN')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const jpHeaders = { 'Authorization': `Bearer ${TOKEN}` }
    const allVehicles: any[] = []
    let page = 0

    // Fetch all online vehicles with pagination
    while (true) {
      const res = await fetch(
        `${JPCARS_BASE}/api/cars/list?page_size=100&page_index=${page}&extended=true`,
        { headers: jpHeaders }
      )
      if (!res.ok) {
        console.error(`JP Cars API error: ${res.status} ${res.statusText}`)
        break
      }
      const data = await res.json()
      const results = data.results ?? []
      if (!results.length) break
      allVehicles.push(...results)
      if (page >= (data.pageable?.page_count ?? 1) - 1) break
      page++
    }

    console.log(`Fetched ${allVehicles.length} vehicles from JP Cars API (raw)`)

    // Deduplicate: API returns overlapping pages
    const seen = new Map<string, any>()
    for (const v of allVehicles) {
      const key = v.reference_code
        ? String(v.reference_code)
        : `${v.license_plate}|${v.make}|${v.model}`
      seen.set(key, v) // last occurrence wins (most complete)
    }
    const uniqueVehicles = Array.from(seen.values())
    console.log(`Deduplicated to ${uniqueVehicles.length} unique vehicles`)

    // Map to database structure
    const rows = allVehicles.map(v => ({
      license_plate: v.license_plate ?? '',
      reference_code: v.reference_code,
      vin: v.vin,
      make: v.make,
      model: v.model,
      fuel: v.fuel,
      body: v.body,
      gear: v.gear,
      build: v.build,
      model_year: v.model_year,
      hp: v.hp,
      color: v.color,
      price_local: v.price_local,
      value: v.value,
      value_stock: v.value_stock,
      value_sold: v.value_sold,
      price_warning: v.price_warning,
      rank_current: v.rank_current,
      rank_target: v.rank_target,
      rank_target_perc: v.rank_target_perc,
      apr: v.apr,
      stock_days: v.stock_days,
      stock_days_average: v.stock_days_average,
      stock_days_average_in_stock: v.stock_days_average_in_stock,
      stat_leads: v.stat_leads,
      stat_sold_count: v.stat_sold_count,
      stat_stock_count: v.stat_stock_count,
      clicks: v.clicks,
      stat_discounts: v.stat_discounts,
      price_history_amount_1: v.price_history_amount_1,
      price_history_date_1: v.price_history_date_1,
      price_history_amount_2: v.price_history_amount_2,
      price_history_date_2: v.price_history_date_2,
      price_history_amount_3: v.price_history_amount_3,
      price_history_date_3: v.price_history_date_3,
      vvp_5: v.vvp_5,
      vvp_25: v.vvp_25,
      vvp_50: v.vvp_50,
      vvp_75: v.vvp_75,
      vvp_95: v.vvp_95,
      window_size: v.window_size,
      price_sensitivity: v.price_sensitivity,
      supply_type: v.supply_type,
      location_name: v.location_name,
      thumbs_down_days: v.thumbs_down_days,
      days_hidden: v.days_hidden,
      // New fields from Manus plan
      price_purchase: v.price_purchase,
      price_catalog: v.price_catalog,
      competitive_set_size: v.competitive_set_size ?? v.window_size,
      window_size_own: v.window_size_own,
      stat_turnover_int: v.stat_turnover_int,
      stat_turnover_ext: v.stat_turnover_ext,
      tdc: v.tdc,
      days_to_show: v.days_to_show,
      days_since_proposal: v.days_since_proposal,
      apr_breakdown: v.apr_breakdown ?? null,
      options: v.options ?? null,
      raw_data: v,
      synced_at: new Date().toISOString()
    }))

    // Full refresh: delete all then insert
    await supabase.from('jpcars_voorraad_monitor')
      .delete().neq('id', '00000000-0000-0000-0000-000000000000')

    let insertError = null
    if (rows.length > 0) {
      // Insert in batches of 50 to avoid payload limits
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error } = await supabase.from('jpcars_voorraad_monitor').insert(batch)
        if (error) {
          console.error(`Insert error at batch ${i}:`, error.message)
          insertError = error
          break
        }
      }
    }

    // Insert into jpcars_market_history for trend tracking
    if (rows.length > 0 && !insertError) {
      const historyRows = allVehicles.map(v => ({
        license_plate: v.license_plate ?? '',
        rank_current: v.rank_current,
        price_local: v.price_local,
        stock_days: v.stock_days,
        clicks: v.clicks,
        apr: v.apr,
        value: v.value,
        stat_leads: v.stat_leads,
        stat_sold_count: v.stat_sold_count,
      }));

      for (let i = 0; i < historyRows.length; i += 50) {
        const batch = historyRows.slice(i, i + 50);
        const { error: histErr } = await supabase.from('jpcars_market_history').insert(batch);
        if (histErr) {
          console.error(`History insert error at batch ${i}:`, histErr.message);
          break;
        }
      }
      console.log(`Inserted ${historyRows.length} history records`);
    }

    return new Response(JSON.stringify({
      success: !insertError,
      synced: allVehicles.length,
      error: insertError?.message ?? null,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: insertError ? 500 : 200,
    })
  } catch (err) {
    console.error('jpcars-sync error:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
