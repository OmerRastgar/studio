local typedefs = require "kong.db.schema.typedefs"

return {
  name = "opa",
  fields = {
    { consumer = typedefs.no_consumer },
    { protocols = typedefs.protocols_http },
    { config = {
        type = "record",
        fields = {
          { opa_url = { 
              type = "string", 
              required = true, 
              default = "http://opa:8181" 
          }},
          { policy = { 
              type = "string", 
              required = true, 
              default = "studio.authz.allow" 
          }},
          { timeout = { 
              type = "integer", 
              default = 5000 
          }},
          { allow_on_error = { 
              type = "boolean", 
              default = false 
          }},
        },
      },
    },
  },
}
