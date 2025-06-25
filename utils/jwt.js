import jwt from "jsonwebtoken";

// signJwt: creates a JWT for the given payload, valid for 7 days
export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// verifyJwt: verifies a JWT and returns the decoded payload
export function verifyJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Middleware for API routes (expects Bearer token in header)
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyJwt(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware for SSR routes (checks header or cookie, redirects if not authenticated)
export function requireAuthSSR(req, res, next) {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    req.flash('error', 'Please log in to access the dashboard 🔒');
    return res.redirect('/');
  }
  try {
    req.user = verifyJwt(token);
    next();
  } catch (err) {
    req.flash('error', 'Your session has expired. Please log in again 🔐');
    return res.redirect('/');
  }
}
