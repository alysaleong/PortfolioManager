import express from "express";
import pg from "pg";
import session from "express-session";
import router from "./routes/index.js";

const { Pool } = pg;
const app = express()
const PORT = 4000;

// connect to postgresql
let pool;
async function connectToPG() {
    try {
        pool = new Pool({
            user: process.env.PG_USER,
            host: process.env.PG_HOST,
            database: process.env.PG_DATABASE,
            password: process.env.PG_PWD,
            port: process.env.PG_PORT,
        });
    } catch (error) {
        console.error("error connecting to postgresql :(", error);
    }
}
connectToPG();
// timestamps without a timezone are stored in utc and should be parsed as such
// (they are assumed to be in the local timezone when they are created and pg
// automatically converts thems but that makes the timestamps incorrect)
pg.types.setTypeParser(1114, function(stringValue) {
    return new Date(stringValue + 'Z');
});
export { pool };

// set up sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  cookie: {
      httpOnly: true // don't let frontend code access session cookie
  }
}));

// middleware to parse json
app.use(express.json());

// to display requests in console
app.use((req, res, next) => {
  console.log(`HTTP request ${req.method} ${req.path} ${req.body ? JSON.stringify(req.body) : ''}`);
  console.log(`HTTP request query: ${JSON.stringify(req.query)}`);
  //console.log(`HTTP request headers: ${JSON.stringify(req.headers)}`);
  next();
});

// routes
app.use("/api", router, (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(err.message);
  }
);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
