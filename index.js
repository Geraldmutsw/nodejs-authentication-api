// MYSQL
const mysql =  require('mysql2');
// EXPRESS
const express = require('express');
// MYSQL DATABASE CONNECTION
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'node-api'
});
pool.getConnection(function(error) {
    if (error) {
        console.log('An error occurred while trying to connect to the database:', error);
    } else {
        console.log('Successfully connected to the database');
    }
});
// INITIALISING EXPRESS
const app = express();
// MIDDLEWARE FOR PARSING JSON REQUESTS
app.use(express.json());




// ACCOUNTS ROUTER
const accountsRouter = require('./routes/accounts')(pool); 


//ROUTES
app.use('/accounts', accountsRouter);


// START THE SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});