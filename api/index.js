const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');

dotenv.config();
mongoose.connect(process.env.MongoDb);
const jwtSecret = process.env.jwtSecret;
const bcSalt = bcrypt.genSaltSync(10);


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.ClientURL
}));

app.get('/profile', (req,res) => {
    const token = req.cookies?.token;
    if(token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if(err) {
                console.error(err)
            }
            res.json(userData)
        })

    } else {
        res.status(401).json('no token');
    }
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    try {
        const foundUser = await User.findOne({username});
        if(foundUser) {
            const passOk = bcrypt.compareSync(password, foundUser.password);
            if(passOk) {
                jwt.sign({userId:foundUser._id, username}, jwtSecret, {} , (err, userData) => {
                    res.cookie('token', token, {sameSite:'none', secure:true}).json({
                        id:foundUser._id
                    })
                })
            }
        }

        jwt.sign({userId: foundUser._id, username}, jwtSecret, {}, (err, token) => {
            if (err) {
                console.log('Error: ',err)
            }
            res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
                id: foundUser._id,
                username
                
            })
        }) 

    } catch(err) {
        console.error(err)
    }
    });

app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPW = bcrypt.hashSync(password, bcSalt);
        const user = await User.create({
            username: username, 
            password: hashedPW});
        jwt.sign({userId: user._id, username}, jwtSecret, {}, (err, token) => {
            if (err) {
                console.log('Error: ',err)
            }
            res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
                id: user._id,
                username
                
            })
        }) 

    } catch(err) {
        console.error(err)
    }
     
        
       
        
    

})
const server = app.listen(4040);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {
    // read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='))
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if(token) {
                jwt.verify(token, jwtSecret, {}, (err, userData)=> {
                    if(err) console.log(err)                    

                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;


                });
            }
        }
    }

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text} = messageData;
        if (recipient && text) {
            const messageDoc = await Message.cteate({
                sender: connection.userId,
                recipient,
                text
            });
            [...wss.clients].filter( c => c.userId === recipient)
            .forEach(c=>c.send(JSON.stringify({
                text, 
                sender:connection.userId,
                id: messageDoc._id
            })));
        }
    });

    // notify everyone about online users when someone connects
    [...wss.clients].forEach(client => {
        client.send(JSON.stringify( {
            onlineUserData: [...wss.clients].map( c => ( {
                userId: c.userId, username: c.username
                
            }))
    }));
    });
});
