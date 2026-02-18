const securityMiddleware = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);

    next();
};

const requestCounts = new Map();

const rateLimitSimple = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!requestCounts.has(ip)) {
            requestCounts.set(ip, []);
        }

        const requests = requestCounts.get(ip);
        const validRequests = requests.filter(time => time > windowStart);
        requestCounts.set(ip, validRequests);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too Many Requests',
                mensaje: 'Demasiadas solicitudes. Intenta más tarde.'
            });
        }

        validRequests.push(now);
        next();
    };
};

module.exports = {
    securityMiddleware,
    rateLimitSimple
};
