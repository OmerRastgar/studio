-- Kong Auth Handler for Kratos Session Validation
-- Validates Ory Kratos session cookies and injects user headers for OPA

local http = require "resty.http"
local cjson = require "cjson.safe"

local KratosAuthHandler = {
  PRIORITY = 1005,  -- Run before OPA plugin (1000)
  VERSION = "1.0.0",
}

function KratosAuthHandler:access(conf)
  kong.log.debug("[kratos-auth] Starting Kratos session validation")
  
  -- 1. Extract Kratos session cookie
  local cookie_header = kong.request.get_header("Cookie")
  if not cookie_header then
    kong.log.debug("[kratos-auth] No cookie header found")
    return kong.response.exit(401, { message = "No session cookie found" })
  end

  -- Extract ory_kratos_session cookie
  local session_token = cookie_header:match("ory_kratos_session=([^;]+)")
  if not session_token then
    kong.log.debug("[kratos-auth] No Kratos session cookie found")
    return kong.response.exit(401, { message = "No Kratos session" })
  end

  kong.log.debug("[kratos-auth] Found Kratos session cookie")

  -- 2. Call Kratos to validate session
  local httpc = http.new()
  httpc:set_timeout(5000)  -- 5 second timeout

  local kratos_url = conf.kratos_url or "http://kratos:4433"
  local res, err = httpc:request_uri(kratos_url .. "/sessions/whoami", {
    method = "GET",
    headers = {
      ["Cookie"] = "ory_kratos_session=" .. session_token,
      ["Accept"] = "application/json"
    }
  })

  if not res then
    kong.log.err("[kratos-auth] Kratos request failed: ", err)
    return kong.response.exit(503, { message = "Authentication service unavailable" })
  end

  kong.log.debug("[kratos-auth] Kratos response status: ", res.status)

  if res.status ~= 200 then
    kong.log.warn("[kratos-auth] Kratos returned non-200: ", res.status)
    return kong.response.exit(401, { message = "Invalid or expired session" })
  end

  -- 3. Parse Kratos response
  local session, decode_err = cjson.decode(res.body)
  if not session then
    kong.log.err("[kratos-auth] Failed to decode Kratos response: ", decode_err)
    return kong.response.exit(500, { message = "Invalid session data" })
  end

  -- Check if session is active
  if not session.active then
    kong.log.warn("[kratos-auth] Session is not active")
    return kong.response.exit(401, { message = "Session inactive" })
  end

  -- 4. Extract user information from identity traits
  local identity = session.identity
  if not identity or not identity.id then
    kong.log.err("[kratos-auth] No identity in session")
    return kong.response.exit(500, { message = "Invalid identity data" })
  end

  local traits = identity.traits or {}
  local user_id = identity.id
  local user_email = traits.email or ""
  local user_role = traits.role or "customer"

  kong.log.info("[kratos-auth] Authenticated user: ", user_id, " (", user_role, ")")

  -- 5. Inject headers for downstream (OPA and backend)
  kong.service.request.set_header("X-User-Id", user_id)
  kong.service.request.set_header("X-User-Email", user_email)
  kong.service.request.set_header("X-User-Role", user_role)
  
  -- Also set for OPA plugin (it reads from request context)
  kong.ctx.shared.user_id = user_id
  kong.ctx.shared.user_email = user_email
  kong.ctx.shared.user_role = user_role

  kong.log.debug("[kratos-auth] Headers injected successfully")
end

return KratosAuthHandler
