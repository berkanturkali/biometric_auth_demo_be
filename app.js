const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const AppError = require("./utils/app_error");
const globalErrorHandler = require("./controller/error_controller");
const i18n = require("./utils/localization");

dotenv.config({ path: "./config.env" });
const authRoutes = require("./routes/auth_routes");
const app = express();
const port = process.env.PORT;

const pool = require("./db");
const database = process.env.DB_NAME;

const createDatabase = async () => {
    try {
        const res = await pool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [database]
        );
        if (res.rowCount == 0) {
            await pool.query(`CREATE DATABASE ${database}`);
            console.log(`Database ${database} created successfully`);
        } else {
            console.log(`Database already exists.`);
        }
    } catch (err) {
        console.log(`Error creating database: ${err}`);
    }
}

createDatabase().then(() => {
    app.listen(port, () =>
        console.log(`Server has started on port: ${port}`)
    );
}).catch(err => {
    console.log("Failed to initialize database", err);
    process.exit(1);
});

app.use(express.json());

if (process.env.NODE_ENV == "dev") {
    app.use(morgan("dev"));
}

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS, GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

app.use(i18n.init);

const setLocaleFromHeader = (req, res, next) => {

    const acceptLanguage = req.header('Accept-Language');

    if (acceptLanguage) {
        const preferredLanguages = acceptLanguage.split(',').map(language => {
            const parts = language.trim().split(';');
            return parts[0].toLowerCase();
        });
        const supportedLocales = i18n.getLocales();
        const matchedLocale = preferredLanguages.find(language => supportedLocales.includes(language));
        if (matchedLocale) {
            i18n.setLocale(matchedLocale);
        }
    }
    next();
}

app.use(setLocaleFromHeader);

app.use("/auth", authRoutes);

app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);


