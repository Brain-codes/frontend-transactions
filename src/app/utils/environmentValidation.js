/**
 * Environment Configuration Validation
 * Validates required environment variables and provides helpful error messages
 */

export const validateEnvironment = () => {
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const missing = [];
  const invalid = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    } else if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !value.startsWith('https://')) {
      invalid.push(`${key}: Must be a valid HTTPS URL`);
    } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && value.length < 100) {
      invalid.push(`${key}: Appears to be invalid (too short)`);
    }
  });

  if (missing.length > 0 || invalid.length > 0) {
    const errors = [];
    
    if (missing.length > 0) {
      errors.push(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    if (invalid.length > 0) {
      errors.push(`Invalid environment variables: ${invalid.join(', ')}`);
    }

    throw new Error(`Environment configuration error:\n${errors.join('\n')}`);
  }

  return {
    supabaseUrl: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
};

export const getSupabaseConfig = () => {
  try {
    return validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error.message);
    
    // In production, we should show a user-friendly error page
    // rather than crashing the app
    if (typeof window !== 'undefined') {
      // Client-side: Show error to user
      console.error('Configuration Error - Please contact support');
    }
    
    throw error;
  }
};

// Runtime check function for debugging
export const debugEnvironment = () => {
  console.group('🔧 Environment Debug Info');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('Build timestamp:', new Date().toISOString());
  console.groupEnd();
};
