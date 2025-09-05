# Production Deployment Debug Checklist

## 🔍 Environment Variables Check

### Required Environment Variables
Your production environment MUST have these environment variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for server-side operations)
```

### Where to Check:
- **Vercel**: Project Settings > Environment Variables
- **Netlify**: Site Settings > Environment Variables  
- **Railway**: Project > Variables
- **Custom Server**: Check your deployment environment

## 🚨 Critical Issues Found

### 1. Missing Environment Configuration
```javascript
// Current code has fallback URLs that may be problematic:
const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  "https://your-supabase-project.supabase.co"; // ❌ PROBLEMATIC
```

### 2. Supabase Auth Configuration Issues
- Refresh token persistence across deployments
- Session storage configuration
- CORS/Domain settings in Supabase

### 3. React Error #130 Analysis
This typically indicates:
- Unhandled promise rejection in async operations
- Auth state changes during component unmounting
- Hydration mismatches between server and client

## 🛠️ Immediate Fixes Required

### Fix 1: Environment Variables
Set these in your production environment:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://oeiwnpngbnkhcismhpgs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
```

### Fix 2: Supabase Configuration
Check your Supabase dashboard:
1. **Authentication > Settings > Site URL**
2. **Authentication > URL Configuration > Redirect URLs**
3. Add your production domain to allowed origins

### Fix 3: Auth Error Handling
The AuthContext needs better error handling for refresh token failures.

## 📊 Debug Commands

### Check Environment Variables (Production)
```bash
# In your deployment platform console
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Local vs Production Comparison
```bash
# Local (works)
npm run build && npm run start
# Check if build works locally with production settings
```

### Browser Debug Steps
1. Open Browser Dev Tools > Network tab
2. Look for failed Supabase auth requests
3. Check Application > Local Storage for Supabase session data
4. Examine Console for unhandled promise rejections

## 🔧 Recommended Solutions

### Solution 1: Enhanced Error Handling
Update AuthContext with proper error boundaries and retry logic.

### Solution 2: Environment Validation
Add runtime environment variable validation.

### Solution 3: Auth State Management
Improve refresh token handling and storage persistence.

### Solution 4: Production Build Optimization
Ensure proper SSR/hydration handling for auth state.
