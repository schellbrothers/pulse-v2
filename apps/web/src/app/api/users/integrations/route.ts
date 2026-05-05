import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mrpxtbuezqrlxybnhyne.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { user_id, integration_type, credentials } = req.body;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user_id);

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id,
        integration_type,
        ...credentials,
        updated_at: new Date().toISOString()
      });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;