// EXPRESS
const express = require('express');
// INPUT VALIDATION
const { check, validationResult } = require('express-validator');

module.exports = function(pool) {
    const router = express.Router();

    // FETCH ALL CLASSROOM
    router.get('/classrooms', (req, res) => {
        try {
            const query = 'SELECT * FROM classrooms';
            pool.execute(query, (error, results) => {
                if (error) {
                    console.error('Fetching all classrooms error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to fetch classrooms' });
                } else {
                    if (results.length === 0) {
                        return res.status(404).json({ error: 'There are currently no classrooms' });
                    } else {
                        return res.json(results)
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    });

    // FETCH A SINGLE CLASSROOM
    router.get('/classroom/:classroomID', async (req, res) => {
        try {
            // INITIATING CLASSROOM ID VARIABLE
            const accountID = req.params.accountID;
            // CONSTRUCTING THE FTCHING QUERY
            const query = 'SELECT * FROM classrooms WHERE classroomID = ?';
            // EXECUTING THE FETCH QUERY
            pool.execute(query, [accountID], (error, results) => {
                if (error) {
                    console.error('Fetching a classroom error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to access the classroom' });
                } else {
                    if (results.length === 0) {
                        return res.status(404).json({ error: 'A classroom with this ID doesnt exist' });
                    } else {
                        return res.json(results)
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    });

    // DELETE CLASSROOM
    router.delete('/classroom/delete/:classroomID', async (req, res) => {
        try {
            // INITIATING CLASSROOM ID VARIABLE FROM THE DYNAMIC URL
            const  classroomID  = req.params.classroomID;
            // CONSTRUCTING DELETE QUERY
            const query = 'DELETE FROM classrooms WHERE classroomID = ?';
            // EXECUTING THE DELETE QUERY
            pool.execute(query, [classroomID], (error, results) => {
                if (error) {
                    console.error('Classroom deletion error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to delete the classroom' });
                } else {
                    if (results.affectedRows === 0) {
                        return res.status(404).json({ error: 'The classroom you are trying to delete doesnt exist' });
                    } else {
                        return res.status(200).json({ message: 'The classroom has been deleted successfully' });
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    });

    // SEARCH ACCOUNT
    router.get('/search', (req, res) => {
        try {
            // INITIATING A SEARCH TERM VARIABLE
            const searchTerm = req.query.q;
            // CONSTRUCTING A SEARCH QUERY
            const query = 'SELECT * FROM classrooms WHERE name LIKE ?';
            // EXECUTING THE SEARCH QUERY
            pool.execute(query, [`%${searchTerm}%`], (error, results) => {
                if (error) {
                    console.error('Search error:', error);
                    return res.status(500).json({ error: 'An error occurred while trying to perform your search' });
                } else {
                    if (results.length === 0) {
                        res.status(404).json({ error: `We could not find any classroom related to "${searchTerm}"` });
                    } else {
                        return res.json(results);
                    }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    });

    return router;
}