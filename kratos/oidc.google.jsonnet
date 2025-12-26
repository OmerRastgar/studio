local claims = std.extVar('claims');

{
  identity: {
    traits: {
      email: claims.email,
      name: if std.objectHas(claims, 'name') then claims.name else 
            if std.objectHas(claims, 'given_name') && std.objectHas(claims, 'family_name') then claims.given_name + ' ' + claims.family_name
            else 'Unknown',
      // Default role for Google Sign-In users
      role: 'customer'
    },
  },
}
