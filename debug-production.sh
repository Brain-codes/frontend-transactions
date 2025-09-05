#!/bin/bash
# Production Environment Debug Script
# Run this script to verify your production deployment configuration

echo "🔍 PRODUCTION ENVIRONMENT DEBUG SCRIPT"
echo "========================================"

# Check Node.js environment
echo "📍 Environment Info:"
echo "NODE_ENV: ${NODE_ENV:-"not set"}"
echo "Build Date: $(date)"
echo ""

# Check required environment variables
echo "🔧 Environment Variables Check:"
echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:+✅ Set}${NEXT_PUBLIC_SUPABASE_URL:-❌ Missing}"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:+✅ Set}${NEXT_PUBLIC_SUPABASE_ANON_KEY:-❌ Missing}"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
    echo ""
    echo "❌ CRITICAL: Missing required environment variables!"
    echo ""
    echo "🛠️  To fix this:"
    echo "1. Set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "2. Set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
    echo "Platform-specific instructions:"
    echo "• Vercel: Project Settings > Environment Variables"
    echo "• Netlify: Site Settings > Environment Variables"
    echo "• Railway: Project > Variables"
    echo "• Custom: Export variables in your deployment script"
    exit 1
fi

# Validate Supabase URL format
if [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://[a-zA-Z0-9]+\.supabase\.co$ ]]; then
    echo "✅ Supabase URL format is valid"
else
    echo "⚠️  WARNING: Supabase URL format may be incorrect"
    echo "   Expected: https://project-id.supabase.co"
    echo "   Current:  $NEXT_PUBLIC_SUPABASE_URL"
fi

# Check if we're in a production build
if [[ "$NODE_ENV" == "production" ]]; then
    echo "✅ Running in production mode"
else
    echo "⚠️  WARNING: Not running in production mode (NODE_ENV=$NODE_ENV)"
fi

echo ""
echo "🌐 Network Connectivity Test:"

# Test Supabase connectivity
if command -v curl &> /dev/null; then
    echo "Testing Supabase API connectivity..."
    
    # Test basic connectivity
    if curl -s --max-time 10 "$NEXT_PUBLIC_SUPABASE_URL" > /dev/null; then
        echo "✅ Supabase API is reachable"
    else
        echo "❌ Cannot reach Supabase API"
        echo "   Check your network connection and Supabase URL"
    fi
    
    # Test auth endpoint specifically
    if curl -s --max-time 10 "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" > /dev/null; then
        echo "✅ Supabase Auth API is reachable"
    else
        echo "❌ Cannot reach Supabase Auth API"
        echo "   This may cause authentication issues"
    fi
else
    echo "ℹ️  curl not available - skipping connectivity tests"
fi

echo ""
echo "📋 Next Steps:"
echo "1. If environment variables are missing, set them in your deployment platform"
echo "2. Check Supabase dashboard for Site URL and Redirect URL settings"
echo "3. Verify your domain is added to Supabase's allowed origins"
echo "4. Check browser console for specific error messages"
echo "5. Test authentication flow in an incognito window"

echo ""
echo "🔗 Useful Links:"
echo "• Supabase Dashboard: https://supabase.com/dashboard"
echo "• Next.js Deployment: https://nextjs.org/docs/deployment"
echo "• Auth Debug Guide: https://supabase.com/docs/guides/auth/debugging"
