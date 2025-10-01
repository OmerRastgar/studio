function extract_user_from_jwt(tag, timestamp, record)
    -- Extract JWT token from Authorization header
    local auth_header = record["request"]["headers"]["authorization"]
    if auth_header and string.match(auth_header, "Bearer ") then
        local token = string.gsub(auth_header, "Bearer ", "")
        
        -- Simple JWT payload extraction (base64 decode the middle part)
        local parts = {}
        for part in string.gmatch(token, "[^%.]+") do
            table.insert(parts, part)
        end
        
        if #parts >= 2 then
            -- Decode the payload (simplified - in production use proper JWT library)
            local payload = parts[2]
            -- Add padding if needed
            local padding = 4 - (#payload % 4)
            if padding ~= 4 then
                payload = payload .. string.rep("=", padding)
            end
            
            -- Store token info in record
            record["jwt_token"] = token
            record["user_authenticated"] = true
        end
    else
        record["user_authenticated"] = false
    end
    
    -- Add audit metadata
    record["audit_type"] = "api_access"
    record["source"] = "kong_gateway"
    
    return 1, timestamp, record
end