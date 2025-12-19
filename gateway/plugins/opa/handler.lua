local http = require "kong.plugins.opa.http"
local cjson = require "cjson.safe"

local OpaHandler = {
  PRIORITY = 850,
  VERSION = "1.0.0",
}

-- Base64 URL decode
local function base64_url_decode(input)
  local remainder = #input % 4
  if remainder > 0 then
    input = input .. string.rep("=", 4 - remainder)
  end
  input = input:gsub("-", "+"):gsub("_", "/")
  return ngx.decode_base64(input)
end

-- Extract and decode JWT payload (without verification - Kong is trusted)
local function decode_jwt_payload(token)
  if not token then
    return nil
  end
  
  -- JWT format: header.payload.signature
  local parts = {}
  for part in string.gmatch(token, "[^%.]+") do
    table.insert(parts, part)
  end
  
  if #parts ~= 3 then
    kong.log.warn("Invalid JWT format, expected 3 parts, got: ", #parts)
    return nil
  end
  
  -- Decode the payload (second part)
  local payload_json = base64_url_decode(parts[2])
  if not payload_json then
    kong.log.warn("Failed to base64 decode JWT payload")
    return nil
  end
  
  local payload, err = cjson.decode(payload_json)
  if not payload then
    kong.log.warn("Failed to JSON decode JWT payload: ", err)
    return nil
  end
  
  return payload
end

-- Extract Bearer token from Authorization header
local function extract_token(auth_header)
  if not auth_header then
    return nil
  end
  
  local token = auth_header:match("^[Bb]earer%s+(.+)$")
  return token
end

function OpaHandler:access(conf)
  -- Wrap in pcall to prevent worker crash
  local status, err = pcall(function()
    kong.log.debug("OPA Handler: Starting access phase")
    
    -- Try to get JWT claims from Kong's JWT plugin first
    local claims = kong.ctx.shared.authenticated_jwt_claims
    
    -- If no claims from JWT plugin, decode from Authorization header
    if not claims or not claims.role then
      local auth_header = kong.request.get_header("Authorization")
      local token = extract_token(auth_header)
      
      if token then
        claims = decode_jwt_payload(token)
        if claims then
          kong.log.debug("Decoded JWT claims: role=", claims.role, " userId=", claims.userId)
        end
      end
    end
    
    -- Default to empty claims if still no claims
    claims = claims or {}
    
    -- Build input for OPA
    local input = {
      input = {
        path = kong.request.get_path(),
        method = kong.request.get_method(),
        user = {
          id = claims.sub or claims.userId,
          role = claims.role,
          email = claims.email
        }
      }
    }
    
    kong.log.info("OPA input: path=", kong.request.get_path(), " role=", claims.role or "nil")
    
    -- Make request to OPA
    local httpc = http.new()
    httpc:set_timeout(conf.timeout or 5000)
    
    local opa_path = "/v1/data/" .. string.gsub(conf.policy, "%.", "/")
    local res, req_err = httpc:request_uri(conf.opa_url .. opa_path, {
      method = "POST",
      body = cjson.encode(input),
      headers = {
        ["Content-Type"] = "application/json",
      }
    })
    
    if not res then
      kong.log.err("OPA request failed: ", req_err)
      if conf.allow_on_error then
        return -- Allow request if OPA is unavailable
      end
      return kong.response.exit(500, { 
        message = "Authorization service unavailable",
        error = req_err
      })
    end
    
    local body, decode_err = cjson.decode(res.body)
    if not body then
      kong.log.err("OPA response decode failed: ", decode_err)
      return kong.response.exit(500, { message = "Invalid authorization response" })
    end
    
    -- Check authorization result
    if not body.result then
      kong.log.info("Access denied for role: ", claims.role or "nil", " path: ", kong.request.get_path())
      return kong.response.exit(403, { 
        message = "Access denied",
        details = {
          role = claims.role,
          path = kong.request.get_path(),
          method = kong.request.get_method()
        }
      })
    end
    
    -- Add user info headers for backend
    if claims.sub or claims.userId then
      kong.service.request.set_header("X-User-Id", claims.sub or claims.userId)
    end
    if claims.role then
      kong.service.request.set_header("X-User-Role", claims.role)
    end
    if claims.email then
      kong.service.request.set_header("X-User-Email", claims.email)
    end
  end)

  if not status then
    kong.log.err("CRITICAL ERROR IN OPA PLUGIN: ", err)
    return kong.response.exit(500, { message = "Internal Server Error (OPA Plugin Crash)" })
  end
end

return OpaHandler
