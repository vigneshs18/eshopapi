const { expressjwt: jwt } = require('express-jwt');

const tokenSecret = process.env.TOKEN_SECRET;
const apiUrl = process.env.API_URL;

function authJwt() {
  return jwt({
    secret: tokenSecret,
    algorithms: ['HS256'],
    isRevoked: isRevoked
  }).unless({
    path: [
      { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
      { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
      { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
      `${apiUrl}/users/login`,
      `${apiUrl}/users/register`
    ]
  })
}

async function isRevoked(req, token) {

  // console.log('tokenPayload: ', token.payload.isAdmin);

  if (!token.payload.isAdmin) {
    // Not an Admin, hence Cancel the request
    return true;
  }
  
  return false;
}

module.exports = authJwt;