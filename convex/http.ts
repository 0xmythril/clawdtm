import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { Webhook } from 'svix'

const http = httpRouter()

// ============================================
// Helper: JSON Response
// ============================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// ============================================
// Helper: Extract Bearer Token
// ============================================

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

// ============================================
// CORS Preflight Handler
// ============================================

http.route({
  path: '/api/v1/agents/register',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

http.route({
  path: '/api/v1/agents/status',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

http.route({
  path: '/api/v1/agents/me',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

// ============================================
// Bot Agent API Routes
// ============================================

// POST /api/v1/agents/register - Self-register a new bot agent
http.route({
  path: '/api/v1/agents/register',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json() as { name?: string; description?: string; source?: string }

      if (!body.name) {
        return jsonResponse({
          success: false,
          error: 'Missing required field: name',
          hint: 'Provide a name for your agent',
        }, 400)
      }

      const result = await ctx.runMutation(api.botAgents.selfRegister, {
        name: body.name,
        description: body.description,
        source: body.source, // Attribution tracking
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      return jsonResponse(result, 201)
    } catch (error) {
      console.error('Agent registration error:', error)
      return jsonResponse({
        success: false,
        error: 'Registration failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// GET /api/v1/agents/status - Check agent status (requires API key)
http.route({
  path: '/api/v1/agents/status',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    const result = await ctx.runQuery(api.botAgents.getAgentStatus, { apiKey })
    
    if (!result.success) {
      return jsonResponse(result, 401)
    }

    return jsonResponse(result)
  }),
})

// GET /api/v1/agents/me - Get agent profile (alias for status)
http.route({
  path: '/api/v1/agents/me',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    const result = await ctx.runQuery(api.botAgents.getAgentStatus, { apiKey })
    
    if (!result.success) {
      return jsonResponse(result, 401)
    }

    return jsonResponse(result)
  }),
})

// ============================================
// Skills API Routes (Bot-friendly)
// ============================================


// GET /api/v1/skills/:slug - Get skill details with vote breakdown
http.route({
  path: '/api/v1/skills',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
    const sort = url.searchParams.get('sort') ?? 'votes'

    if (slug) {
      // Get single skill by slug
      const votes = await ctx.runQuery(api.voting.getSkillVoteCountsBySlug, { slug })
      
      if (!votes) {
        return jsonResponse({
          success: false,
          error: 'Skill not found',
          hint: `No skill with slug "${slug}"`,
        }, 404)
      }

      return jsonResponse({
        success: true,
        skill: votes,
      })
    }

    // List skills (simplified for now - just return count info)
    return jsonResponse({
      success: true,
      message: 'Skills list endpoint',
      hint: 'Use ?slug=skill-name to get a specific skill',
      params: { limit, sort },
    })
  }),
})

// POST /api/v1/skills/:slug/upvote - Upvote a skill (bot auth)
http.route({
  path: '/api/v1/skills/upvote',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    try {
      const body = await request.json() as { slug?: string; skill_id?: string }
      
      if (!body.slug && !body.skill_id) {
        return jsonResponse({
          success: false,
          error: 'Missing skill identifier',
          hint: 'Provide either slug or skill_id in request body',
        }, 400)
      }

      // Get skill ID from slug if needed
      let skillId = body.skill_id
      if (!skillId && body.slug) {
        const votes = await ctx.runQuery(api.voting.getSkillVoteCountsBySlug, { slug: body.slug })
        if (!votes) {
          return jsonResponse({
            success: false,
            error: 'Skill not found',
            hint: `No skill with slug "${body.slug}"`,
          }, 404)
        }
        skillId = votes.skill_id
      }

      const result = await ctx.runMutation(api.voting.botVote, {
        cachedSkillId: skillId as Id<"cachedSkills">,
        apiKey,
        vote: 'up',
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      return jsonResponse(result)
    } catch (error) {
      console.error('Upvote error:', error)
      return jsonResponse({
        success: false,
        error: 'Vote failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// POST /api/v1/skills/:slug/downvote - Downvote a skill (bot auth)
http.route({
  path: '/api/v1/skills/downvote',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    try {
      const body = await request.json() as { slug?: string; skill_id?: string }
      
      if (!body.slug && !body.skill_id) {
        return jsonResponse({
          success: false,
          error: 'Missing skill identifier',
          hint: 'Provide either slug or skill_id in request body',
        }, 400)
      }

      // Get skill ID from slug if needed
      let skillId = body.skill_id
      if (!skillId && body.slug) {
        const votes = await ctx.runQuery(api.voting.getSkillVoteCountsBySlug, { slug: body.slug })
        if (!votes) {
          return jsonResponse({
            success: false,
            error: 'Skill not found',
            hint: `No skill with slug "${body.slug}"`,
          }, 404)
        }
        skillId = votes.skill_id
      }

      const result = await ctx.runMutation(api.voting.botVote, {
        cachedSkillId: skillId as Id<"cachedSkills">,
        apiKey,
        vote: 'down',
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      return jsonResponse(result)
    } catch (error) {
      console.error('Downvote error:', error)
      return jsonResponse({
        success: false,
        error: 'Vote failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// DELETE /api/v1/skills/vote - Remove vote from a skill (bot auth)
http.route({
  path: '/api/v1/skills/vote',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    try {
      const body = await request.json() as { slug?: string; skill_id?: string }
      
      if (!body.slug && !body.skill_id) {
        return jsonResponse({
          success: false,
          error: 'Missing skill identifier',
          hint: 'Provide either slug or skill_id in request body',
        }, 400)
      }

      // Get skill ID from slug if needed
      let skillId = body.skill_id
      if (!skillId && body.slug) {
        const votes = await ctx.runQuery(api.voting.getSkillVoteCountsBySlug, { slug: body.slug })
        if (!votes) {
          return jsonResponse({
            success: false,
            error: 'Skill not found',
            hint: `No skill with slug "${body.slug}"`,
          }, 404)
        }
        skillId = votes.skill_id
      }

      const result = await ctx.runMutation(api.voting.botRemoveVote, {
        cachedSkillId: skillId as Id<"cachedSkills">,
        apiKey,
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      return jsonResponse(result)
    } catch (error) {
      console.error('Remove vote error:', error)
      return jsonResponse({
        success: false,
        error: 'Remove vote failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// CORS preflight for skills endpoints
http.route({
  path: '/api/v1/skills',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

http.route({
  path: '/api/v1/skills/upvote',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

http.route({
  path: '/api/v1/skills/downvote',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

http.route({
  path: '/api/v1/skills/vote',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

// ============================================
// Skills Reviews API Routes (Bot-friendly)
// ============================================

// GET /api/v1/skills/reviews - Get reviews for a skill
http.route({
  path: '/api/v1/skills/reviews',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('slug')
    const filter = url.searchParams.get('filter') as 'combined' | 'human' | 'bot' | null
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)

    if (!slug) {
      return jsonResponse({
        success: false,
        error: 'Missing required parameter: slug',
        hint: 'Provide ?slug=skill-slug',
      }, 400)
    }

    const result = await ctx.runQuery(api.reviews.getReviewsBySlug, {
      slug,
      filter: filter ?? 'combined',
      limit,
    })

    if (!result) {
      return jsonResponse({
        success: false,
        error: 'Skill not found',
        hint: `No skill with slug "${slug}"`,
      }, 404)
    }

    return jsonResponse({
      success: true,
      ...result,
    })
  }),
})

// POST /api/v1/skills/reviews - Add or update a review (bot auth)
http.route({
  path: '/api/v1/skills/reviews',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    try {
      const body = await request.json() as { 
        slug?: string
        rating?: number
        review_text?: string
      }
      
      if (!body.slug) {
        return jsonResponse({
          success: false,
          error: 'Missing required field: slug',
          hint: 'Provide the skill slug to review',
        }, 400)
      }

      if (body.rating === undefined) {
        return jsonResponse({
          success: false,
          error: 'Missing required field: rating',
          hint: 'Provide a rating between 1 and 5',
        }, 400)
      }

      if (!body.review_text) {
        return jsonResponse({
          success: false,
          error: 'Missing required field: review_text',
          hint: 'Provide review text (10-1000 characters)',
        }, 400)
      }

      const result = await ctx.runMutation(api.reviews.botAddReview, {
        skillSlug: body.slug,
        apiKey,
        rating: body.rating,
        reviewText: body.review_text,
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      // TypeScript doesn't narrow here, so check action safely
      const status = 'action' in result && result.action === 'created' ? 201 : 200
      return jsonResponse(result, status)
    } catch (error) {
      console.error('Add review error:', error)
      return jsonResponse({
        success: false,
        error: 'Add review failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// DELETE /api/v1/skills/reviews - Remove a review (bot auth)
http.route({
  path: '/api/v1/skills/reviews',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractBearerToken(request)

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Missing authorization',
        hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
      }, 401)
    }

    try {
      const body = await request.json() as { slug?: string }
      
      if (!body.slug) {
        return jsonResponse({
          success: false,
          error: 'Missing required field: slug',
          hint: 'Provide the skill slug to remove your review from',
        }, 400)
      }

      const result = await ctx.runMutation(api.reviews.botDeleteReview, {
        skillSlug: body.slug,
        apiKey,
      })

      if (!result.success) {
        return jsonResponse(result, 400)
      }

      return jsonResponse(result)
    } catch (error) {
      console.error('Delete review error:', error)
      return jsonResponse({
        success: false,
        error: 'Delete review failed',
        hint: 'Check your request body format',
      }, 500)
    }
  }),
})

// CORS preflight for reviews endpoint
http.route({
  path: '/api/v1/skills/reviews',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }),
})

// ============================================
// Clerk Webhook
// ============================================

// Clerk webhook handler - syncs users from Clerk to Convex
http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get headers for verification
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response('Missing svix headers', { status: 400 })
    }

    // Get and verify the webhook payload
    const payload = await request.text()
    const wh = new Webhook(webhookSecret)

    let event: {
      type: string
      data: {
        id: string
        email_addresses?: Array<{ email_address: string }>
        first_name?: string
        last_name?: string
        image_url?: string
      }
    }

    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as typeof event
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    // Handle different event types
    const { type, data } = event

    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined

      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: data.id,
        email,
        name,
        imageUrl: data.image_url,
      })

      console.log(`User ${type === 'user.created' ? 'created' : 'updated'}: ${data.id}`)
    } else if (type === 'user.deleted') {
      await ctx.runMutation(internal.users.deleteByClerkId, {
        clerkId: data.id,
      })

      console.log(`User deleted: ${data.id}`)
    }

    return new Response('OK', { status: 200 })
  }),
})

// ============================================
// Admin Routes (Bot Moderator/Admin Auth)
// ============================================

// CORS preflight for admin endpoints
http.route({
  path: '/api/v1/admin/hide-skill',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-API-Key',
      },
    })
  }),
})

http.route({
  path: '/api/v1/admin/unhide-skill',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-API-Key',
      },
    })
  }),
})

http.route({
  path: '/api/v1/admin/set-featured',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-API-Key',
      },
    })
  }),
})

http.route({
  path: '/api/v1/admin/set-verified',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-API-Key',
      },
    })
  }),
})

// Helper: Extract Admin API Key
function extractAdminApiKey(request: Request): string | null {
  // Check X-Admin-API-Key header first
  const adminKey = request.headers.get('X-Admin-API-Key')
  if (adminKey) {
    return adminKey
  }
  // Fall back to Bearer token
  return extractBearerToken(request)
}

// POST /api/v1/admin/hide-skill - Hide a skill (bot moderator+)
http.route({
  path: '/api/v1/admin/hide-skill',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractAdminApiKey(request)
    if (!apiKey) {
      return jsonResponse({ error: 'API key required' }, 401)
    }

    let body: { slug?: string; reason?: string }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.slug) {
      return jsonResponse({ error: 'slug is required' }, 400)
    }

    try {
      const result = await ctx.runMutation(api.admin.botHideSkill, {
        apiKey,
        slug: body.slug,
        reason: body.reason,
      })
      return jsonResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Unauthorized')) {
        return jsonResponse({ error: message }, 403)
      }
      return jsonResponse({ error: message }, 500)
    }
  }),
})

// POST /api/v1/admin/unhide-skill - Unhide a skill (bot moderator+)
http.route({
  path: '/api/v1/admin/unhide-skill',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractAdminApiKey(request)
    if (!apiKey) {
      return jsonResponse({ error: 'API key required' }, 401)
    }

    let body: { slug?: string }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.slug) {
      return jsonResponse({ error: 'slug is required' }, 400)
    }

    try {
      const result = await ctx.runMutation(api.admin.botUnhideSkill, {
        apiKey,
        slug: body.slug,
      })
      return jsonResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Unauthorized')) {
        return jsonResponse({ error: message }, 403)
      }
      return jsonResponse({ error: message }, 500)
    }
  }),
})

// POST /api/v1/admin/set-featured - Set skill featured status (bot moderator+)
http.route({
  path: '/api/v1/admin/set-featured',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractAdminApiKey(request)
    if (!apiKey) {
      return jsonResponse({ error: 'API key required' }, 401)
    }

    let body: { slug?: string; featured?: boolean }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.slug) {
      return jsonResponse({ error: 'slug is required' }, 400)
    }
    if (typeof body.featured !== 'boolean') {
      return jsonResponse({ error: 'featured must be a boolean' }, 400)
    }

    try {
      const result = await ctx.runMutation(api.admin.botSetSkillFeatured, {
        apiKey,
        slug: body.slug,
        featured: body.featured,
      })
      return jsonResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Unauthorized')) {
        return jsonResponse({ error: message }, 403)
      }
      return jsonResponse({ error: message }, 500)
    }
  }),
})

// POST /api/v1/admin/set-verified - Set skill verified status (bot moderator+)
http.route({
  path: '/api/v1/admin/set-verified',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const apiKey = extractAdminApiKey(request)
    if (!apiKey) {
      return jsonResponse({ error: 'API key required' }, 401)
    }

    let body: { slug?: string; verified?: boolean }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!body.slug) {
      return jsonResponse({ error: 'slug is required' }, 400)
    }
    if (typeof body.verified !== 'boolean') {
      return jsonResponse({ error: 'verified must be a boolean' }, 400)
    }

    try {
      const result = await ctx.runMutation(api.admin.botSetSkillVerified, {
        apiKey,
        slug: body.slug,
        verified: body.verified,
      })
      return jsonResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Unauthorized')) {
        return jsonResponse({ error: message }, 403)
      }
      return jsonResponse({ error: message }, 500)
    }
  }),
})

export default http
