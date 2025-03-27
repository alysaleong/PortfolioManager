export async function isAuth(req, res, next) {
    if (!req.session.uid || !req.session.email) {
        res.status(401).json({ error: "Not logged in"});
        return;
    }
    next();
}
