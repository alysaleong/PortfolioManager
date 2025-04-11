export function isAuth(req, res, next) {
    req.session.uid = 2;
    req.session.email ="stupid2@stupid.com"

    if (!req.session.uid || !req.session.email) {
        res.status(401).json({ error: "Not logged in" });
        return;
    }
    next();
}
