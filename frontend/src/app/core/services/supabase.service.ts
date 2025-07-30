import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export class SupabaseService {
  private static client: SupabaseClient;

  static getClient(): SupabaseClient {
    if (!SupabaseService.client) {
      SupabaseService.client = createClient(
        environment.supabaseUrl,
        environment.supabaseKey
      );
    }
    return SupabaseService.client;
  }
}
