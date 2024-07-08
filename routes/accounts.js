// EXPRESS
const express = require('express');
// EXPRESS SESSION
const session = require('express-session');
// MYSQL STORE
const MySQLStore = require('express-mysql-session')(session);
// INPUT VALIDATION
const { check, validationResult } = require('express-validator');
// PASSWORD HASHING
const bcrypt = require('bcrypt');

module.exports = function(pool) {
    const router = express.Router();
    // SESSION STORE CONFIGURATION
    const sessionStore = new MySQLStore({}, pool);
    // SESSION CONFIGURATION
    router.use(session({
        key: 'this_cookie_has_stored_important_session_data',
        secret: 'this_is_a_session_cookie_secret_and_is_undecodable_@_2024_%_gerald_agent_1_0_1',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            expires: 300000 // 5 MINUTES
        }
    }));
    // LOGIN
    router.post('/login', [
        check('username')
            .isLength({ min: 5 })
            .trim()
            .escape()
            .withMessage('Username should be at least 5 characters long'), 
        check('password')
            .isLength({ min: 8 })
            .trim()
            .withMessage('Password should be at least 8 characters long'),
    ], async (req, res) => {
        const { username, password } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            // QUERY DATABASE
            const query = 'SELECT * FROM accounts WHERE username = ?';
            pool.execute(query, [username], (error, results) => {
                if (error) {
                    console.error('Database error:', error);
                    return res.status(500).json({ error: 'An unexpeted error has occurred' });
                }
                // CHECK IF USERNAME IS CORRECT AND EXISTS
                if (results.length === 0) {
                    return res.status(401).json({ error: 'Invalid username or password' });
                }
                // INITIATING ACCOUNT VARIABLE AND STORING RESULTS FROM THE QUERY
                const account = results[0];
                // COMPARE INPUT PASSWORD WITH THE DATABASE PASSWORD
                bcrypt.compare(password, account.password, (error, isMatch) => {
                    if (error) {
                        console.error('Error comparing passwords:', error);
                        return res.status(500).json({ error: 'An error occurred during authentication' });
                    }
                    // START SESSION 
                    if (isMatch) {
                        req.session.accountID = account.accountID;
                        req.session.username = account.username;
                        req.session.loggedIn = true;
                        req.session.cookie.maxAge = 5 * 60 * 1000;
                        // LOGIN TO THE CORRECT ACCOUNT
                        if (account.is_active === 0) {
                            return res.status(200).json({ message: "Your account has been deactivated" });
                        } else if (account.is_confirmed === 0) {
                            return res.status(200).json({ message: "Your account is not yet confirmed by administrator" });
                        } else if (account.is_administrator === 1) {
                            return res.status(200).json({ message: "You have logged in successfully to the administrator account" });
                        } else if (account.is_educator === 1) {
                            return res.status(200).json({ message: "You have logged in successfully to the educator account" });
                        } else {
                            // Handle default case or other possible account types
                            return res.status(200).json({ message: "You have logged in but your is not confirmed or admin or educator" });
                        }
    
                    } else {
                        return res.status(401).json({ error: 'Invalid username or password' });
                    }
                });
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    });

    // REGISTER NEW ACCOUNT
    router.post('/register',[
        check('name')
            .isLength({ min: 5 })
            .trim()
            .escape()
            .withMessage('Name must be at least 5 characters long'),
        check('surname')
            .isLength({ min: 5 })
            .trim()
            .escape()
            .withMessage('Surname must be at least 5 characters long'),
        check('username')
            .isLength({ min: 5 })
            .trim()
            .escape()
            .withMessage('Username must be at least 5 characters long'),
        check('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please enter a valid email address'),
        check('password')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .trim()
            .withMessage('New password must be at least 8 characters and it must include a lowercase letter, an uppercase letter, a number, and a special character'),
        check('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .trim()
            .withMessage('Password and confirmation password do not match')
        ],
        async (req, res) => {
        // FORM DATA INPUTS
        const { name, surname, username, email, password } = req.body;
        // HANDLE THE REQUEST ONLY IF THERE ARE NO VALIDATION ERRORS
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            // CHECK IF THE USERNAME ALREADY EXISTS IN THE DATABASE
            const existingUsername = await checkIfUsed('username', username);
            if (existingUsername) {
                return res.status(409).json({ error: 'Username already exists, please try a different username' });
            }
            // CHECK IF THE EMAIL ALREADY EXISTS IN THE DATABASE
            const existingEmail = await checkIfUsed('email', email);
            if (existingEmail) {
                return res.status(409).json({ error: 'Email already exists, please use a different email' });
            }
            // HASH PASSWORD
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            // INSERT INTO THE DATABASE
            const query = 'INSERT INTO accounts (name, surname, username, email, password) VALUES (?, ?, ?, ?, ?)';
            pool.execute(query, [name, surname, username, email, hashedPassword], (error) => {
                if (error) {
                    console.error('Registration error:', error);
                    return res.status(500).json({ error: 'Your account registration was unsuccessful' });
                } else {
                    return res.status(201).json({ message: 'Your account has been registered successfully' });
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });
    // HELPER FUNCTION FOR THE REGISTER ROUTE TO CHECK FOR EXISTING VALUES IN DATABASE
    async function checkIfUsed(field, value) {
    return new Promise((resolve, reject) => {
        const query = `SELECT accountID FROM accounts WHERE ${field} = ?`;
        pool.execute(query, [value], (error, results) => {
            if (error) reject(error);
            resolve(results && results.length > 0);
        });
    });
    }

    // FETCH ALL ACCOUNTS
    router.get('/accounts', (req, res) => {
        try {
            const query = 'SELECT * FROM accounts';
            pool.execute(query, (error, results) => {
                if (error) {
                    console.error('Fetching all accounts error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to fetch accounts' });
                } else {
                    if (results.length === 0) {
                        return res.status(404).json({ error: 'There are currently no accounts' });
                    } else {
                        return res.json(results)
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });

    // FETCH A SINGLE ACCOUNT
    router.get('/account/:accountID', async (req, res) => {
        try {
            // INITIATING ACCOUNT ID VARIABLE
            const accountID = req.params.accountID;
            // CONSTRUCTING THE FTCHING QUERY
            const query = 'SELECT * FROM accounts WHERE accountID = ?';
            // EXECUTING THE FETCH QUERY
            pool.execute(query, [accountID], (error, results) => {
                if (error) {
                    console.error('Fetching an account error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to access the account' });
                } else {
                    if (results.length === 0) {
                        return res.status(404).json({ error: 'An account with this ID doesnt exist' });
                    } else {
                        return res.json(results)
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });

    // DELETE ACCOUNT
    router.delete('/account/delete/:accountID', async (req, res) => {
        try {
            // INITIATING ACCOUNT ID VARIABLE FROM THE DYNAMIC URL
            const  accountID  = req.params.accountID;
            // CONSTRUCTING DELETE QUERY
            const query = 'DELETE FROM accounts WHERE accountID = ?';
            // EXECUTING THE DELETE QUERY
            pool.execute(query, [accountID], (error, results) => {
                if (error) {
                    console.error('Account deletion error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to delete the account' });
                } else {
                    if (results.affectedRows === 0) {
                        return res.status(404).json({ error: 'The account you are trying to delete doesnt exist' });
                    } else {
                        return res.status(200).json({ message: 'The account has been deleted successfully' });
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });

    // UPDATE PASSWORD
    router.put('/account/update/password', [
        check('password')
            .exists()
            .trim()
            .withMessage('Your current password is required'),
        check('newPassword')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .trim()
            .withMessage('New password must be at least 8 characters and it must include a lowercase letter, an uppercase letter, a number, and a special character'),
        check('confirmPassword')
            .custom((value, { req }) => value === req.body.newPassword)
            .trim()
            .withMessage('New password and confirmation password do not match')
    ], (req, res) => {
        try {
            // HANDLE REQUEST IF THERE ARE NO VALIDATION ERRORS
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const accountID = 1008 // ASSUMING AUTH
            const { password, newPassword } = req.body;

            const query = 'SELECT password FROM accounts WHERE accountID = ?';
            pool.execute(query, [accountID], (error, results) => {
                if (error) {
                    console.error('Update password error:', error);
                    return res.status(500).json({ error: 'A fatal error has occured while trying to update your password' });
                }
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Account information is invalid' }); // ACCOUNT ID
                }
                // MATCH ENTERED PASSWORD WITH CURRENT PASSWORD
                const hashedPassword = results[0].password;
                bcrypt.compare(password, hashedPassword, (error, isMatch) => {
                    if (error) {
                        console.error('Password comparison error:', error);
                        return res.status(500).json({ error: 'An error occurred while trying to compare passwords'});
                    }
                    if (!isMatch) {
                        return res.status(401).json({ error: 'The password you entered doesnt match the current password' });
                    }
                    if (isMatch) {
                        return res.status(401).json({ error: 'Your new password can not be the same as the current password' });
                    }
                    // HASH NEW PASSWORD
                    bcrypt.hash(newPassword, 10, (error, newHashedPassword) => {
                        if (error) {
                            console.error('Error hashing password:', error);
                            return res.status(500).json({ error: 'An error occurred while  trying to secure your password' });
                        }
                        const updateQuery = 'UPDATE accounts SET password = ? WHERE accountID = ?';
                        pool.execute(updateQuery, [newHashedPassword, accountID], (error) => {
                            if (error) {
                                console.error('Error updating password:', error);
                                return res.status(500).json({ error: 'An error occurred while trying to update your password' })
                            } else {
                                return res.status(200).json({ message: 'Your password has been updated successfully' })
                            }
                        });
                    });
                });
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });

    // SEARCH ACCOUNT
    router.get('/search', (req, res) => {
        try {
            // INITIATING A SEARCH TERM VARIABLE
            const searchTerm = req.query.q;
            // CONSTRUCTING A SEARCH QUERY
            const query = 'SELECT * FROM accounts WHERE username LIKE ?';
            // EXECUTING THE SEARCH QUERY
            pool.execute(query, [`%${searchTerm}%`], (error, results) => {
                if (error) {
                    console.error('Search error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to perform your search' });
                } else {
                    if (results.length === 0) {
                        res.status(404).json({ error: `We could not find any account related to "${searchTerm}"` });
                    } else {
                        return res.json(results);
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An error occurred' });
        }
    });

    return router;
}