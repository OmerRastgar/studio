local typedefs = require "kong.db.schema.typedefs"

return {
  name = "kratos-auth",
  fields = {
    { config = {
        type = "record",
        fields = {
          { kratos_url = {
              type = "string",
              default = "http://kratos:4433",
              required = true
          }},
        },
    }},
  },
}
