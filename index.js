import { v2 as cloudinary } from "cloudinary";
import express, { response } from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
import mongoose from "mongoose";
import exp from "constants";
import { log, time } from "console";
import path from 'path';
import { spawn } from "child_process"; // Import the spawn function

//--

import session from 'express-session';
import bcrypt from 'bcrypt';
import MongoStore from 'connect-mongo';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//--
app.use(express.static("static"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const upload = multer({ dest: "uploads/" });
app.set("view engine", "ejs");


//--
app.use(
  session({
    secret: 'rarevyom',
    resave: true,
    saveUninitialized: true
  })
);

//[++++]
//--
const cloudinaryUrl =
  "cloudinary://952415125251862:GvZe59xuqSRbPFliL-kdYT9K6ac@dx6wbnk27";
const cloudinaryConfig = cloudinaryUrlParser(cloudinaryUrl);
cloudinary.config({
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key,
  api_secret: cloudinaryConfig.api_secret,
});

const mongodbUrl="mongodb+srv://theaspirants:Aspirants18@cluster0.8ncbvmd.mongodb.net/eventsDB";
const mongodbUrlforLocalhost = "mongodb://127.0.0.1:27017/eventsDB";
mongoose.connect(mongodbUrl, { useNewUrlParser: true });

const eventSchema = new mongoose.Schema({
  title: String,
  university: String,
  imageurl: String,
  description: String,
  rules: String,
  date: Date,
  time: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference the User model
  }
});

const eventModel = mongoose.model("events", eventSchema);


//-------------

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  type: String,
  email: String,
  eventsRegistered: Array
});

const User = mongoose.model('User', userSchema);

//---------------------------------------------------------------------------------------------
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/showdata');
  } else {
    return res.redirect('/login');
  }
  //res.sendFile(__dirname+"/index.html");
  //res.redirect("/showdata");
});

app.get('/login', (req, res) => {
  res.render('login'); // Renders the login.ejs view
});

app.get('/register', (req, res) => {
  res.render('register', { passwordAnswer: "" });

});
//---------------------------------------------------------------------------------------------


app.get("/form",function(req,res){
  res.sendFile(__dirname+"/index.html");
})

//-------------------------------------------
app.post('/register', async (req, res) => {
  const { username, email,password, passwordconfirm, ishost } = req.body;
  // console.log(ishost);
  var typeofUser="";
  if(ishost==="on"){
    typeofUser="host";
  } else{
    typeofUser="user";
  }

  // console.log(typeofUser);
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  if(password!==passwordconfirm){
    return res.render("register", { passwordAnswer: "Password Doesn't Match!" });
  } else{
    try {
      const newUser = new User({ username, email,password: hashedPassword, type: typeofUser});
      await newUser.save();
      req.session.userId = newUser._id;
      req.session.username = newUser.username; // Set the username in the session
      return res.redirect('/showdata');
    } catch (error) {
      console.error(error);
      return res.redirect('/register');
    }
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.userId = user._id;
      req.session.username = user.username; // Set the username in the session
      return res.redirect('/showdata');
    } else {
      return res.redirect('/login');
    }
  } catch (error) {
    console.error(error);
    return res.redirect('/login');
  }
});


//---------===================================+++++++++++++++

app.post("/", upload.single("myImage"), async function (req, res) {
  const imageFile = req.file;
  const exTitle = req.body.myTitle;
  const exUniversity = req.body.myUniversity;
  const exDesc = req.body.myDesc;
  const exRules = req.body.myRules;
  const exDate = req.body.myDate;
  const exTime = req.body.myTime;
  if (!imageFile) {
    return res.status(400).send("No image file uploaded.");
  }

  try {

    // meetlink=
    const result = await cloudinary.uploader.upload(imageFile.path);
    const exImgUrl = result.url;

    const newEvent = new eventModel({
      title: exTitle,
      university: exUniversity,
      imageurl: exImgUrl,
      description: exDesc,
      rules: exRules,
      date: exDate,
      time: exTime,
      
      createdBy: req.session.userId // Store the user's ID as the createdBy value
    });

    eventModel
      .find()
      .then((results) => {
        newEvent.save();
        res.redirect("/");
      })
      .catch((error) => {
        console.error(error);
      });
  } catch (error) {
    console.error("Error uploading image:", error);
    res
      .status(500)
      .send("An error occurred while uploading the image to Cloudinary");
  }
});

//deleting particular card by its ID
app.post("/delete/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  try {
    await eventModel.findByIdAndDelete(eventId); // Delete the event by its ID
    res.redirect("/showdata"); // Redirect to the event list page
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while deleting the event.");
  }
});


app.get('/showdata', async (req, res) => {
  try {
    const eventData = await eventModel.find();
    const userData = await User.find();
    var isuserhost="";
    // const utype = req.session.type;
    //console.log("EventData: ",eventData,"User Data: ",userData);
    userData.forEach(data => {
      if(data.id===req.session.userId){
        isuserhost=data.type;
      }
    });
    res.render('showdata', { eventData, username: req.session.username,isuserhost}); // Pass the username
    console.log(req.session.username);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data from MongoDB');
  }
});

app.get("/event/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const selectedEvent = await eventModel.findById(eventId);
    
    // Check if the user is authenticated and get the userId from the session
    const userId = req.session.userId || null;
    const userarray = await User.findById(userId);
    const allEventsRegistered = userarray.eventsRegistered;
    var isregistered=0;
    allEventsRegistered.forEach((item) => {
      if(item===eventId){
        isregistered=1;
      }
    });
    
    res.render("customevent", { selectedEvent, userId, isregistered});
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching event details.");
  }
});


var imageUrlforUpdate = "";
app.get("/update/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const selectedEvent = await eventModel.findById(eventId);
    imageUrlforUpdate= selectedEvent.imageurl;
    res.render("update", { selectedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching event details.");
  }
});

app.post("/update/:eventId", upload.single("myImage") , async function(req, res){
  
  const eventId=req.params.eventId;
  const imageFile = req.file;
  if(imageFile){
    const result = await cloudinary.uploader.upload(imageFile.path); // Upload the image
    imageUrlforUpdate = result.url;
  }
  
  const updatedEventData = {
    title: req.body.myTitle,
    imageurl: imageUrlforUpdate,
    description: req.body.myDesc,
    rules: req.body.myRules,
    date: req.body.myDate,
    time: req.body.myTime,
    
  };

  try {
    await eventModel.findByIdAndUpdate(eventId, updatedEventData);
    res.redirect("/showdata");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while updating event details.");
  }
});

//--=-====================---------------------------

app.get('/dashboard' , async (req,res)=>{
  const eventData = await eventModel.find();
  const userId = req.session.userId || null;
  res.render('dashboard', { eventData, userId });
});

app.post("/regevents/:userId/:eventId" , async (req,res) =>{
  const eventid = req.params.eventId;
  const userData = await User.find();
  const eventDataforMail = await eventModel.findById(eventid);
  var to = "";
  var userName = "";


  try {
    await User.findOneAndUpdate(
      { _id: req.session.userId }, // Find the user by ID
      { $push: { eventsRegistered: eventid } } // Add the event ID to the array
    );
    userData.forEach((data) => {
      if (data.id === req.session.userId) {
        to = data.email;
        userName = data.username;
      }
    });

    const sub = "Registered Successfully";
    const msg =
      "Dear " + userName + " you have successfully registreted to "+eventDataforMail.title+" scheduled on "+eventDataforMail.date+" at "+eventDataforMail.time;
    const combinedArgs = [to, sub, msg].join(",");
    const pythonProcess = spawn("python", ["send_email.py", combinedArgs]);

    // Listen for data from the Python process (optional)
    pythonProcess.stdout.on("data", (data) => {
      console.log(`Python stdout: ${data}`);
    });

    // Listen for errors from the Python process (optional)
    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python stderr: ${data}`);
    });

    // When the Python process closes
    pythonProcess.on("close", (code) => {
      if(code!==0) {
        res.status(500).send("Error sending email");
      }
    });
  } catch (error) {
    console.error(error);
  }
  res.redirect("/event/"+eventid);
});

app.post("/joinevent", function(req,res){
  res.sendFile(__dirname+"/web.html");
});

app.get('/logout', (req, res) => {
  // Clear the user session
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    // Redirect the user to the login page after logout
    res.redirect('/login');
  });
});

//--=-====================---------------------------

function cloudinaryUrlParser(url) {
  const [, api_key, api_secret, cloud_name] = url.match(
    /cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/
  );
  return { cloud_name, api_key, api_secret };
}

app.listen(3000, (req, res) => {
  console.log("started on 3000");
});

