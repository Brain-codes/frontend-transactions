// Documentation Content Constants
// This file contains reusable content blocks for the API documentation

export const DOC_METADATA = {
  title: "Atmosfair Sales Management API Documentation",
  description: "Comprehensive API documentation for the Atmosfair Sales Management System",
  version: "1.0.0",
  lastUpdated: new Date().toISOString().split('T')[0]
};

export const INTRO_CONTENT = {
  overview: `
    The Atmosfair Sales Management System provides a comprehensive REST API for managing sales operations, 
    user management, and organizational data. The API is built on Supabase Edge Functions and provides 
    role-based access control for different user types.
  `,
  
  architecture: `
    The system is designed with a multi-tenant architecture supporting:
    - **Super Admins**: Full system access across all organizations
    - **Admins**: Organization-specific access and management
    - **Agents**: Limited access for sales creation and viewing
  `,

  baseUrl: "All API endpoints are served from your Supabase project URL under the `/functions/v1/` path.",
  
  authentication: `
    All API endpoints require authentication using Supabase JWT tokens. The system uses Bearer token 
    authentication with automatic token refresh capabilities.
  `
};

export const COMMON_SECTIONS = {
  authentication: {
    title: "Authentication",
    content: `
      All API requests must include a valid Supabase JWT token in the Authorization header:
      
      \`\`\`
      Authorization: Bearer <your_supabase_jwt_token>
      Content-Type: application/json
      \`\`\`
      
      **Token Management:**
      - Tokens are automatically managed by the \`tokenManager\` utility
      - Automatic token refresh is handled transparently
      - Token expiration is managed server-side by Supabase
    `
  },

  errorHandling: {
    title: "Error Handling",
    content: `
      All API responses follow a consistent structure:
      
      **Success Response:**
      \`\`\`json
      {
        "success": true,
        "data": {...},
        "message": "Optional success message"
      }
      \`\`\`
      
      **Error Response:**
      \`\`\`json
      {
        "success": false,
        "error": "Error type",
        "message": "Human-readable error message",
        "statusCode": 400
      }
      \`\`\`
      
      **Common Error Codes:**
      - \`401\`: Unauthorized - Invalid or missing authentication token
      - \`403\`: Forbidden - Insufficient permissions for the operation
      - \`404\`: Not Found - Requested resource doesn't exist
      - \`400\`: Bad Request - Invalid input parameters
      - \`500\`: Internal Server Error - Unexpected server error
    `
  },

  pagination: {
    title: "Pagination",
    content: `
      List endpoints support pagination with the following parameters:
      
      **Parameters:**
      - \`page\`: Page number (default: 1)
      - \`limit\`: Items per page (default varies by endpoint)
      
      **Response Structure:**
      \`\`\`json
      {
        "success": true,
        "data": [...],
        "pagination": {
          "currentPage": 1,
          "totalPages": 10,
          "totalCount": 250,
          "hasNextPage": true,
          "hasPreviousPage": false
        }
      }
      \`\`\`
    `
  },

  filtering: {
    title: "Filtering & Search",
    content: `
      Most list endpoints support filtering and search capabilities:
      
      **Common Filter Parameters:**
      - \`search\`: Text search across relevant fields
      - \`status\`: Filter by status (varies by endpoint)
      - \`date_from\`: Start date for date range filtering (ISO format)
      - \`date_to\`: End date for date range filtering (ISO format)
      - \`sort_by\`: Field to sort by (default: 'created_at')
      - \`sort_order\`: Sort direction ('asc' or 'desc', default: 'desc')
      
      **Location Filtering (where applicable):**
      - \`state\`: Filter by state
      - \`city\`: Filter by city
      - \`lga\`: Filter by Local Government Area
    `
  }
};

export const ROLE_DESCRIPTIONS = {
  admin: {
    title: "Admin Role",
    description: `
      Admins have access to manage their organization's data including:
      - Sales management within their organization
      - Agent management and creation
      - Branch management for their organization
      - Dashboard statistics for their organization
      - Sales reporting and analytics
    `,
    limitations: [
      "Cannot access other organizations' data",
      "Cannot manage super admin functions",
      "Cannot access cross-organization reports"
    ]
  },

  superAdmin: {
    title: "Super Admin Role",
    description: `
      Super Admins have system-wide access including:
      - All sales data across all organizations
      - Organization management (create, update, view all)
      - Cross-organization reporting and analytics
      - System-wide user management
      - Advanced filtering and export capabilities
    `,
    capabilities: [
      "Access all organizations' data",
      "Manage partner organizations",
      "View system-wide analytics",
      "Export comprehensive reports",
      "Manage system configurations"
    ]
  }
};

export const CODE_EXAMPLES = {
  javascript: {
    basicRequest: `
// Basic API request using fetch
const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // request parameters
  })
});

const result = await response.json();
if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.message);
}
    `,

    withTokenManager: `
// Using the tokenManager utility (recommended)
import tokenManager from '@/utils/tokenManager';

const token = await tokenManager.getValidToken();
const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // request parameters
  })
});
    `,

    serviceClass: `
// Using a service class (recommended pattern)
class ApiService {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.functionsUrl = \`\${this.baseUrl}/functions/v1\`;
  }

  async getHeaders() {
    const token = await tokenManager.getValidToken();
    return {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    };
  }

  async makeRequest(endpoint, data = {}) {
    const response = await fetch(\`\${this.functionsUrl}/\${endpoint}\`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });
    
    return await response.json();
  }
}
    `
  },

  flutter: `
// Flutter/Dart example
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'YOUR_SUPABASE_URL';
  static const String functionsPath = '/functions/v1';
  
  Future<Map<String, dynamic>> makeRequest(
    String endpoint,
    Map<String, dynamic> data,
    String token,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl$functionsPath/$endpoint'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );
    
    return jsonDecode(response.body);
  }
}
  `
};

export const BEST_PRACTICES = {
  title: "Best Practices",
  content: [
    {
      title: "Token Management",
      description: "Always use the tokenManager utility for automatic token refresh and error handling."
    },
    {
      title: "Error Handling",
      description: "Always check the 'success' field in API responses before processing data."
    },
    {
      title: "Pagination",
      description: "Use appropriate page sizes to avoid overwhelming the client or server."
    },
    {
      title: "Caching",
      description: "Implement client-side caching for frequently accessed data like user profiles."
    },
    {
      title: "Rate Limiting",
      description: "Be mindful of API rate limits and implement proper retry mechanisms."
    },
    {
      title: "Data Validation",
      description: "Always validate data on both client and server sides."
    }
  ]
};

export const TROUBLESHOOTING = {
  title: "Common Issues & Troubleshooting",
  issues: [
    {
      problem: "401 Unauthorized Error",
      solution: "Check if your authentication token is valid and not expired. Try refreshing the token."
    },
    {
      problem: "403 Forbidden Error",
      solution: "Verify that your user role has the necessary permissions for the requested operation."
    },
    {
      problem: "Network Timeout",
      solution: "Check your network connection and consider implementing retry logic with exponential backoff."
    },
    {
      problem: "Data Not Loading",
      solution: "Verify the API endpoint URL and check for any CORS issues if calling from a browser."
    },
    {
      problem: "Large Response Times",
      solution: "Consider implementing pagination, reducing the data requested, or adding appropriate filters."
    }
  ]
};

export const CHANGELOG = {
  title: "API Changelog",
  versions: [
    {
      version: "1.0.0",
      date: "2024-01-01",
      changes: [
        "Initial API release",
        "Basic CRUD operations for sales, agents, and organizations",
        "Authentication and authorization system",
        "Role-based access control"
      ]
    }
    // Add more versions as needed
  ]
};

export const FOOTER_CONTENT = {
  supportInfo: `
    For technical support or questions about this API, please contact:
    - Development Team: dev@atmosfair.com
    - Documentation Issues: Create an issue in the project repository
  `,
  
  disclaimer: `
    This documentation is maintained alongside the codebase. 
    If you notice any discrepancies, please report them to the development team.
  `
};
