
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const UserModel = require('./Models/UserModel')
const PostModel = require('./Models/PostModel')
const dotenv = require('dotenv')




const app = express()

app.use(express.json())
app.use(cors({
    origin: ["https://blog-front-seven-kappa.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    credentials: true
}))
dotenv.config({path:"./.env"})
app.use(cookieParser())
app.use(express.static('public'))

const port= process.env.PORT || 1200

mongoose.connect(process.env.URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));



const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json("Token is missing")
    } else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if (err) {
                return res.json("Token is wrong")
            } else {
                req.email = decoded.email;
                req.username = decoded.username;
                next()
            }
        })
    }
}
app.get('/', verifyUser, (req, res) => {
    return res.json({ email: req.email, username: req.username })
})

app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    bcrypt.hash(password, 10).then(hash => {
        UserModel.create(
            { username, email, password: hash }
        ).then(user => res.json(user))
            .catch(err => res.json(err))
    }).catch(err => console.log(err))

})

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    UserModel.findOne({ email: email }).then(user => {
        if (user) {
            bcrypt.compare(password, user.password, (err, response) => {
                if (response) {
                    const token = jwt.sign({ email: user.email, username: user.username },
                        process.env.JWT_SECRET_KEY, { expiresIn: '1d' })
                    res.cookie('token', token)
                    return res.json("Success")
                } else {
                    return res.json("Password is incorrect")
                }
            })

        } else {
            return res.json("User Not Exist")
        }
    })
})



//create the storage
const storage = multer.diskStorage({
    //takes 2 parameters
    destination: (req, file, cb) => {
        //this is the path of img in backend
        cb(null, 'Public/Images')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }

})

//upload the file to storage
const upload = multer({
    storage: storage
})

app.post('/create', verifyUser, upload.single('file'), (req, res) => {
    PostModel.create({
        title: req.body.title,
        description: req.body.description,
        file: req.file.filename, 
        email: req.body.email
    }).then(result => res.json("Success"))
        .catch(err => res.json(err))
})
 
app.get('/getposts', (req, res) => {
    PostModel.find()
        .then(posts => res.json(posts))
        .catch(err => res.json(err))
})

app.get('/getpostbyid:id', (req, res) => {
    const id = req.params.id
    PostModel.findById({ _id: id }).then(
        post => res.json(post)).catch(err => console.log(err))
    
})

app.put('/editpost/:id', (req, res)=>{
    const id = req.params.id;
    PostModel.findByIdAndUpdate({_id:id},{
    title:req.body.title, 
    description:req.body.description})
    .then(result=>res.json("Success"))
    .catch(err=> res.json(err))
})

app.delete('/deletebyid:id', (req, res)=>{
    const id = req.params.id;
    PostModel.findByIdAndDelete({_id:id}).then(result=>res.json("Success"))
    .catch(err=>res.json(err))
})

app.get('/logout', (req, res) => {
    res.clearCookie('token')
    return res.json('Success')
})

app.listen(port, () => {
    console.log("Server is running" , port);
})