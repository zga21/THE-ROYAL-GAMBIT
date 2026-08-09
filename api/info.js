export default function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = process.env.PUBLIC_ORIGIN || (host ? `${protocol}://${host}` : '');

  res.status(200).json({
    server: true,
    port: null,
    lanOrigins: [],
    preferredOrigin: origin,
    transport: 'http-poll',
  });
}

