export function isAuth(req, res, next) {
    req.session.uid = 1;
    req.session.email ="stupid1@stupid.com"

    if (!req.session.uid || !req.session.email) {
        res.status(401).json({ error: "Not logged in"});
        return;
    }
    next();
}
