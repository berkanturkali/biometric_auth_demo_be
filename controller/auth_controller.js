const jwt = require("jsonwebtoken");
const pool = require("../db");
const AppError = require("../utils/app_error");
const i18n = require("../utils/localization");

const bcrypt = require("bcryptjs");
const SuccessResponse = require("../model/success_response");


exports.signup = async (req, res, next) => {
    try {
        const { email, password } = req.body;


        const checkIfTheTableExistsQuery = `
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        );
    `;

        const table = process.env.USERS_TABLE_NAME
        const result = await pool.query(checkIfTheTableExistsQuery, [table]);
        const tableExists = result.rows[0].exists;

        if (!tableExists) {
            await createUsersTable(table, next);
        }

        const checkIfTheUserExistsInTheUsersTableQuery = `SELECT * FROM ${process.env.USERS_TABLE_NAME} WHERE email = $1`;

        const userResult = await pool.query(checkIfTheUserExistsInTheUsersTableQuery, [email]);

        const user = userResult.rows[0];

        if (user) {
            next(new AppError(i18n.__("user_already_exists_error_message"), 409));
            return;
        }

        const hashedPw = await bcrypt.hash(password, 12);

        const saveUserQuery = `INSERT INTO ${process.env.USERS_TABLE_NAME} (
        email,
        password
        )
        VALUES
        (
        $1,
        $2
        )`;

        const values = [
            email,
            hashedPw
        ];

        await pool.query(saveUserQuery, values);
        console.log("User saved to the database");

        const response = new SuccessResponse(i18n.__("signup_success_message"), null).toJSON();

        res.status(201).json(
            response
        );

    } catch (err) {
        next(err);
    }
}

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const fetchUserQuery = `SELECT * FROM ${process.env.USERS_TABLE_NAME} WHERE email = $1`;
        const result = await pool.query(fetchUserQuery, [email]);
        const user = result.rows[0];
        if (!user) {
            next(new AppError(i18n.__("your_credentials_are_not_correct_message")));
            return
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            next(new AppError(i18n.__("your_credentials_are_not_correct_message")));
            return;
        }
        const token = jwt.sign(
            {
                email: email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "30d"
            }
        )

        const tokenResponse = {
            token: token
        }

        const response = new SuccessResponse(i18n.__("login_success_message"), tokenResponse).toJSON();

        res.status(200).json(
            response
        );

    } catch (e) {
        console.log(e);
        next(e);
    }
}

async function createUsersTable(table, next) {
    try {
        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS ${table} (
                id SERIAL PRIMARY KEY,
                email VARCHAR(50) UNIQUE,
                password TEXT
            );
        `;

        await pool.query(createUsersTableQuery);
        console.log(`Table ${table} created or already exists.`);
    } catch (err) {
        console.error('Error creating users table:', err);
        next(err);
    }
}

