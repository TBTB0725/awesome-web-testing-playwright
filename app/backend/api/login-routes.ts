const jose = require('jose');
const jsonServer = require('json-server');
const app = jsonServer.create();

const JWKS = jose.createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

app.post('/', async (req, res, next) => {
  if (req.body.jwt) {
    try {
      const { payload, protectedHeader } = await jose.jwtVerify(
        req.body.jwt,
        JWKS,
        {
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
        }
      );
      const email = payload.email;
      const kid = protectedHeader.kid;
      if (kid && typeof email === 'string' && email) {
        req.body = { email, password: kid };
        next();
      } else {
        return res.status(401).jsonp('Invalid authorization');
      }
    } catch (_err) {
      return res.status(401).jsonp('Invalid authorization');
    }
  } else {
    next();
  }
});

export default app;
