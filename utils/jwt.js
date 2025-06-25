import jwt from "jsonwebtoken";

// signJwt: creates a JWT for the given payload, valid for 7 days
export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// verifyJwt: verifies a JWT and returns the decoded payload
export function verifyJwt(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
