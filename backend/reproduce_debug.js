const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

// Force close connection after 10s to avoid hanging
setTimeout(() => {
    console.log('Timeout reached, exiting...');
    process.exit(1);
}, 10000);

console.log('Connecting to DB...');
mongoose.connect('mongodb://localhost:27017/instagram_clone')
    .then(async () => {
        console.log('Connected to DB.');
        // Check if models/User exists
        try {
            const User = require('./models/User'); // Adjust path if needed

            // Find a user
            let user = await User.findOne();
            if (!user) {
                console.log('No users found. Creating temporary debug user...');
                user = await User.create({
                    username: 'debug_test_user',
                    email: 'debug_test@example.com',
                    password: 'password123'
                });
            }

            console.log(`Using user: ${user.username} (${user._id})`);

            // Generate Token
            // HARDCODED SECRET from .env
            const token = jwt.sign({ id: user._id }, 'thisisasecretkey123', {
                expiresIn: '1d'
            });

            // Make request
            const postData = JSON.stringify({
                timeSpentToday: 5
            });

            const options = {
                hostname: 'localhost',
                port: 5001,
                path: '/api/users/settings',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${token}`
                }
            };

            console.log('Sending PUT request to http://localhost:5001/api/users/settings ...');
            const req = http.request(options, (res) => {
                console.log(`RESPONSE STATUS: ${res.statusCode}`);
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    const fs = require('fs');
                    fs.writeFileSync('debug_response.json', data);
                    console.log('Response written to debug_response.json');
                    mongoose.disconnect();
                    process.exit(0);
                });
            });

            req.on('error', (e) => {
                console.error(`Request Failed: ${e.message}`);
                mongoose.disconnect();
                process.exit(1);
            });

            req.write(postData);
            req.end();

        } catch (err) {
            console.error("Error inside script logic:", err);
            mongoose.disconnect();
        }

    }).catch(err => {
        console.error("DB Connection Error:", err);
        process.exit(1);
    });
