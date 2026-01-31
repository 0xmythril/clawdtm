import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api, internal } from './_generated/api'
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
      const body = await request.json() as { name?: string; description?: string }

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

// Helper: Extract skill slug from path like /api/v1/skills/my-skill/upvote
function extractSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/v1\/skills\/([^/]+)/)
  return match ? match[1] : null
}

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
        cachedSkillId: skillId as any,
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
        cachedSkillId: skillId as any,
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
        cachedSkillId: skillId as any,
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

export default http
