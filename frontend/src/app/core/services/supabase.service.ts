import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export class SupabaseService {
  private static client: SupabaseClient;

  static getClient(): SupabaseClient {
    if (!SupabaseService.client) {
      SupabaseService.client = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // Disable URL session detection to reduce lock conflicts
            flowType: 'pkce'
          },
          global: {
            headers: {
              'x-client-info': 'zengineer-app'
            }
          }
        }
      );
    }
    return SupabaseService.client;
  }
}
