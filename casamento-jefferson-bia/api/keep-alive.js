import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({
      success: false,
      error: 'Supabase credentials are not configured in environment variables.'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Realiza uma consulta simples na tabela 'guests' para gerar atividade no banco de dados
    const { data, error } = await supabase.from('guests').select('id').limit(1);

    if (error) {
      throw error;
    }

    return response.status(200).json({
      success: true,
      message: 'Keep-alive query executed successfully.',
      data
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: error.message || error
    });
  }
}
